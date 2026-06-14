// 법원경매 원본 행(row) → 호미 엑셀 형식 변환 로직.
// crawl-court-auctions.mjs(라이브 크롤)와 raw-to-xlsx.mjs(캡처본 재생성)가
// 같은 매핑을 쓰도록 한 곳에 모았어요. 컬럼/형식 변경은 여기만 고치면 돼요.
import * as XLSX from "xlsx";

/** "20260615" → "2026-06-15" */
export function isoDate(value) {
	const digits = String(value || "").replace(/\D/g, "");
	if (digits.length !== 8) return String(value || "");
	return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

/** Date → "2026.06.15" */
export function dotDate(date) {
	return [
		date.getFullYear(),
		String(date.getMonth() + 1).padStart(2, "0"),
		String(date.getDate()).padStart(2, "0"),
	].join(".");
}

/** 시작~끝(포함) 사이 ISO 날짜 배열 */
export function dateRange(start, end) {
	const dates = [];
	const [sy, sm, sd] = isoDate(start).split("-").map(Number);
	const [ey, em, ed] = isoDate(end).split("-").map(Number);
	const cursor = new Date(Date.UTC(sy, sm - 1, sd));
	const last = new Date(Date.UTC(ey, em - 1, ed));
	while (cursor <= last) {
		dates.push(cursor.toISOString().slice(0, 10));
		cursor.setUTCDate(cursor.getUTCDate() + 1);
	}
	return dates;
}

/** 면적 텍스트에서 첫 ㎡ 값 추출 */
export function areaFromRow(row) {
	const text = [row.areaList, row.pjbBuldList, row.convAddr]
		.filter(Boolean)
		.join(" ");
	const match = text.replaceAll(",", "").match(/(\d+(?:\.\d+)?)\s*㎡/);
	return match ? Number(match[1]) : 0;
}

/** 지번/도로명 + 건물명으로 주소 문자열 구성 */
export function buildAddress(row) {
	const lot = [row.hjguSido, row.hjguSigu, row.hjguDong, row.srchHjguLotno]
		.filter(Boolean)
		.join(" ");
	const road = [row.rd1Nm, row.rd2Nm, row.rdNm, row.buldNo]
		.filter(Boolean)
		.join(" ");
	const base =
		row.addrGbncd === "R" && road
			? `${road} ${row.rdAddrSub || ""}`.trim()
			: [lot, row.buldNm].filter(Boolean).join(" ");
	return [base, row.buldList]
		.filter(Boolean)
		.join(" ")
		.replace(/\s+/g, " ")
		.trim();
}

/** 지역 라벨 (서울 / 성남 OO구) */
export function regionFor(row) {
	if (row.hjguSido === "서울특별시") return "서울";
	const district = String(row.hjguSigu || "").replace("성남시 ", "");
	return district ? `성남 ${district}` : "성남";
}

/** 원본 행 → 호미 13컬럼 행 */
export function toHomeyRow(row) {
	const area = areaFromRow(row);
	const appraisal = Number(row.gamevalAmt || 0);
	const minPrice = Number(row.minmaePrice || 0);
	const failCount = Number(row.yuchalCnt || 0);
	return {
		지역: regionFor(row),
		법원: row.jiwonNm || "",
		사건번호: `${row.jiwonNm || ""} ${row.srnSaNo || ""}`.trim(),
		물건번호: String(row.maemulSer || "1"),
		"주소/건물": buildAddress(row),
		"면적㎡": area,
		평: area ? Math.round((area / 3.305785) * 10) / 10 : 0,
		감정가_원: appraisal,
		최저가_원: minPrice,
		최저가율: appraisal ? Math.round((minPrice / appraisal) * 1000) / 10 : 0,
		유찰: failCount ? `유찰 ${failCount}회` : "신건",
		매각기일: isoDate(row.maeGiil),
		비고: row.mulBigo || "",
	};
}

/** 서울/성남 건수 집계 */
export function countRegions(rows) {
	const counts = { seoul: 0, seongnam: 0, seongnamDistricts: {} };
	for (const row of rows) {
		if (row.hjguSido === "서울특별시") counts.seoul += 1;
		if (row.hjguSido === "경기도" && String(row.hjguSigu).startsWith("성남시")) {
			counts.seongnam += 1;
			counts.seongnamDistricts[row.hjguSigu] =
				(counts.seongnamDistricts[row.hjguSigu] || 0) + 1;
		}
	}
	return counts;
}

/** 원본 행 중복 제거 키 */
export function rowKey(row) {
	return row.docid || `${row.jiwonNm}|${row.srnSaNo}|${row.maemulSer}`;
}

export const detailHeaders = [
	"지역", "법원", "사건번호", "물건번호", "주소/건물", "면적㎡", "평",
	"감정가_원", "최저가_원", "최저가율", "유찰", "매각기일", "비고",
];

/** 경매목록 + 요약 2시트 워크북 생성 */
export function buildWorkbook(rows, summaryRows) {
	const detail = XLSX.utils.json_to_sheet(rows.map(toHomeyRow), {
		header: detailHeaders,
	});
	detail["!autofilter"] = { ref: detail["!ref"] };
	detail["!cols"] = [
		{ wch: 12 }, { wch: 20 }, { wch: 32 }, { wch: 10 }, { wch: 70 },
		{ wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 12 },
		{ wch: 12 }, { wch: 14 }, { wch: 45 },
	];
	const summary = XLSX.utils.aoa_to_sheet([
		["항목", "값", "비고", "작성일"],
		...summaryRows,
	]);
	summary["!cols"] = [{ wch: 16 }, { wch: 28 }, { wch: 48 }, { wch: 14 }];
	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, detail, "경매목록");
	XLSX.utils.book_append_sheet(workbook, summary, "요약");
	return workbook;
}
