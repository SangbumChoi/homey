// 법원경매 원본 행 → auction-data/ 발행 (매각기일별 캐시 구조).
//
// 구조 (크롤 날짜 폴더 없음, 매각기일이 1급 키):
//   auction-data/
//     by-sale-date/2026-06-15.xlsx   ← 매각기일별 파일 (캐시 단위)
//     by-sale-date/index.json        ← 날짜별 건수·해시 매니페스트
//     latest.xlsx                    ← 이번 수집 전체 (앱이 읽는 파일)
//     latest-metadata.json
//     latest.json.gz                 ← 원본 응답(오프라인 재생성용)
//
// 캐시: 매각기일 파일의 데이터 해시를 index.json과 비교해, 바뀐 날짜만 다시 써요.
// 같으면 cache hit(건너뜀) → 매일 돌려도 git diff·쓰기가 최소화돼요.
// 수집 윈도우 밖(지난) 날짜의 파일은 그대로 남아 과거 캐시로 누적돼요.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { gzipSync } from "node:zlib";
import * as XLSX from "xlsx";
import {
	buildWorkbook,
	countRegions,
	isoDate,
	rowKey,
	toHomeyRow,
} from "./court-rows.mjs";

const SALE_DATE_RE = /^20\d{2}-\d{2}-\d{2}$/;

function hashRows(nativeRows) {
	const homey = nativeRows
		.map(toHomeyRow)
		.sort((a, b) =>
			`${a.사건번호}|${a.물건번호}`.localeCompare(`${b.사건번호}|${b.물건번호}`),
		);
	return crypto
		.createHash("sha1")
		.update(JSON.stringify(homey))
		.digest("hex")
		.slice(0, 16);
}

/**
 * 원본 행을 매각기일별 캐시 + latest로 발행해요.
 * @param {object[]} rows  중복 제거된 원본 법원경매 행
 * @param {object} opts  { outDir, collectedAt, query, rawPayload }
 * @returns {{written:string[], cached:string[], total:number}}
 */
export function publishAuctionData(rows, opts = {}) {
	const outDir = opts.outDir || "auction-data";
	const bySaleDir = path.join(outDir, "by-sale-date");
	const collectedAt = opts.collectedAt || new Date().toISOString();
	const crawlDate = collectedAt.slice(0, 10);
	const query = opts.query || {};
	fs.mkdirSync(bySaleDir, { recursive: true });

	// 매각기일별 그룹
	const groups = new Map();
	for (const row of rows) {
		const d = isoDate(row.maeGiil);
		if (!SALE_DATE_RE.test(d)) continue;
		(groups.get(d) ?? groups.set(d, []).get(d)).push(row);
	}

	// 기존 매니페스트 로드 (캐시 비교용)
	const indexPath = path.join(bySaleDir, "index.json");
	const prevIndex = {};
	try {
		const parsed = JSON.parse(fs.readFileSync(indexPath, "utf8"));
		for (const e of parsed.saleDates || []) prevIndex[e.saleDate] = e;
	} catch {
		/* 최초 실행 */
	}

	const written = [];
	const cached = [];
	const index = { ...prevIndex };

	for (const saleDate of [...groups.keys()].sort()) {
		const saleRows = groups.get(saleDate);
		const hash = hashRows(saleRows);
		const file = `by-sale-date/${saleDate}.xlsx`;
		const filePath = path.join(outDir, file);
		const prev = prevIndex[saleDate];

		if (prev && prev.hash === hash && fs.existsSync(filePath)) {
			cached.push(saleDate); // 캐시 히트 — 다시 쓰지 않아요
		} else {
			const wb = buildWorkbook(saleRows, [
				["매각기일", saleDate, "해당 날짜에 예정된 물건", crawlDate],
				["조회 지역", "서울특별시 + 성남시", "서울 25개 구, 성남 3개 구", ""],
				["필터", "지역만 적용", "가격·면적·물건종류 제한 없음", ""],
				["총 물건 수", saleRows.length, "중복 제거 후", ""],
			]);
			XLSX.writeFile(wb, filePath);
			written.push(saleDate);
		}

		index[saleDate] = {
			saleDate,
			count: saleRows.length,
			...countRegions(saleRows),
			hash,
			file,
			updatedAt: written.includes(saleDate)
				? collectedAt
				: (prev?.updatedAt ?? collectedAt),
		};
	}

	// 매니페스트 (날짜순)
	const saleDates = Object.values(index).sort((a, b) =>
		a.saleDate.localeCompare(b.saleDate),
	);
	fs.writeFileSync(
		indexPath,
		`${JSON.stringify({ updatedAt: collectedAt, saleDates }, null, 2)}\n`,
	);

	// latest.xlsx = 이번 수집 전체 (앱이 읽는 파일)
	const latestWb = buildWorkbook(rows, [
		["조회 지역", "서울특별시 + 성남시", "서울 25개 구, 성남 3개 구", crawlDate],
		[
			"조회 기간",
			`${query.startDate ?? ""} ~ ${query.endDate ?? ""}`,
			"법원 사이트가 허용하는 rolling window",
			"",
		],
		["필터", "지역만 적용", "가격·면적·물건종류 제한 없음", ""],
		["총 물건 수", rows.length, "중복 제거 후", ""],
	]);
	XLSX.writeFile(latestWb, path.join(outDir, "latest.xlsx"));

	// latest-metadata.json
	const meta = {
		collectedAt,
		crawlDate,
		queryStartDate: query.startDate ?? null,
		queryEndDate: query.endDate ?? null,
		total: rows.length,
		...countRegions(rows),
		saleDates: saleDates.map(({ hash: _h, file: _f, ...rest }) => rest),
	};
	fs.writeFileSync(
		path.join(outDir, "latest-metadata.json"),
		`${JSON.stringify(meta, null, 2)}\n`,
	);

	// latest.json.gz (원본 — 오프라인 재생성용)
	if (opts.rawPayload) {
		fs.writeFileSync(
			path.join(outDir, "latest.json.gz"),
			gzipSync(JSON.stringify(opts.rawPayload), { level: 9 }),
		);
	}

	return { written, cached, total: rows.length };
}

/** 원본 행 중복 제거 (사건번호+물건번호) */
export function dedupeRows(rawRows) {
	const uniq = new Map();
	for (const row of rawRows) uniq.set(rowKey(row), row);
	return [...uniq.values()].sort(
		(a, b) =>
			String(a.maeGiil).localeCompare(String(b.maeGiil)) ||
			rowKey(a).localeCompare(rowKey(b)),
	);
}
