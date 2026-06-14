// 캡처된 법원경매 원본 응답(raw.json[.gz]) → 호미 엑셀(경매목록+요약) 변환기.
//
// 라이브 크롤(크롬 필요)을 돌릴 수 없는 환경에서도, 이미 수집해 둔 raw 응답으로
// 동일한 형식의 엑셀을 다시 만들 수 있어요. 크롤러와 같은 매핑(lib/court-rows)을 써요.
//
// 사용법:
//   node scripts/raw-to-xlsx.mjs [입력 raw.json(.gz)] [출력.xlsx]
//   예) node scripts/raw-to-xlsx.mjs auction-data/latest.json.gz auction-data/latest.xlsx
import fs from "node:fs";
import zlib from "node:zlib";
import * as XLSX from "xlsx";
import {
	buildWorkbook,
	countRegions,
	isoDate,
	rowKey,
} from "./lib/court-rows.mjs";

const input = process.argv[2] || "auction-data/latest.json.gz";
const output = process.argv[3] || "auction-data/latest.xlsx";

const fileBuf = fs.readFileSync(input);
const text = input.endsWith(".gz")
	? zlib.gunzipSync(fileBuf).toString("utf8")
	: fileBuf.toString("utf8");
const payload = JSON.parse(text);

// payload.rows(권장) 없으면 results[].rows를 펼쳐서 사용
const rawRows =
	payload.rows ??
	(payload.results || []).flatMap((r) => r.rows || []);

// 중복 제거 (사건번호+물건번호)
const uniq = new Map();
for (const row of rawRows) uniq.set(rowKey(row), row);
const rows = [...uniq.values()].sort(
	(a, b) =>
		String(a.maeGiil).localeCompare(String(b.maeGiil)) ||
		rowKey(a).localeCompare(rowKey(b)),
);

const collected = payload.collectedAt
	? isoDate(payload.collectedAt.slice(0, 10).replace(/-/g, ""))
	: "";
const counts = countRegions(rows);

const workbook = buildWorkbook(rows, [
	["조회 지역", "서울특별시 + 성남시", "서울 25개 구, 성남 3개 구", collected],
	[
		"조회 기간",
		`${payload.query?.startDate ?? ""} ~ ${payload.query?.endDate ?? ""}`,
		"법원 사이트가 허용하는 rolling window",
		"",
	],
	["필터", "지역만 적용", "가격·면적·물건종류 제한 없음", ""],
	[
		"총 물건 수",
		rows.length,
		`서울 ${counts.seoul} · 성남 ${counts.seongnam} (중복 제거 후)`,
		"",
	],
]);

XLSX.writeFile(workbook, output);
console.log(
	`✓ ${rows.length}건 (원본 ${rawRows.length}, 중복 ${rawRows.length - rows.length} 제거) → ${output}`,
);
console.log(
	`  서울 ${counts.seoul} · 성남 ${counts.seongnam} ${JSON.stringify(counts.seongnamDistricts)}`,
);
