// 크롤링된 auction-data/latest.xlsx → src/data/auctionSeed.json 변환
// 사용법: node scripts/xlsx-to-seed.mjs [xlsx경로]
import * as XLSX from "xlsx";
import { readFileSync, writeFileSync } from "fs";

const src = process.argv[2] ?? "auction-data/latest.xlsx";
const wb = XLSX.read(readFileSync(src), { type: "buffer" });

const sheetName = wb.SheetNames.find((n) => {
	const rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1 });
	const header = (rows[0] ?? []).map((c) => String(c ?? "").trim());
	return ["사건번호", "주소/건물", "최저가_원", "매각기일"].every((c) =>
		header.includes(c),
	);
});
if (!sheetName) throw new Error("경매목록 시트를 찾지 못했어요");

const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
	header: 1,
	defval: null,
});
const header = rows[0].map((c) => String(c ?? "").trim());
const col = (name) => header.indexOf(name);

const parseFail = (v) => {
	const s = String(v ?? "");
	if (!s || s.includes("신건")) return 0;
	const m = s.match(/(\d+)/);
	return m ? parseInt(m[1], 10) : 0;
};
const num = (v) => {
	if (typeof v === "number") return v;
	const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
	return isNaN(n) ? 0 : n;
};
const date = (v) => {
	if (v instanceof Date)
		return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
	return String(v ?? "").trim().replace(/\./g, "-");
};

const items = rows
	.slice(1)
	.filter((r) => r && r[col("사건번호")])
	.map((r) => ({
		region: String(r[col("지역")] ?? "").trim(),
		court: String(r[col("법원")] ?? "").trim(),
		caseNo: String(r[col("사건번호")] ?? "").trim(),
		itemNo: String(r[col("물건번호")] ?? "1").trim(),
		address: String(r[col("주소/건물")] ?? "").trim(),
		areaM2: num(r[col("면적㎡")]),
		areaPyeong: num(r[col("평")]),
		appraisal: num(r[col("감정가_원")]),
		minPrice: num(r[col("최저가_원")]),
		minRate: num(r[col("최저가율")]),
		failCount: parseFail(r[col("유찰")]),
		saleDate: date(r[col("매각기일")]),
		note: r[col("비고")] ? String(r[col("비고")]).trim() : null,
	}));

// 요약 시트에서 작성일 찾기
let dataDate = null;
const summary = wb.SheetNames.find((n) => n.includes("요약"));
if (summary) {
	const srows = XLSX.utils.sheet_to_json(wb.Sheets[summary], {
		header: 1,
		defval: null,
	});
	outer: for (const row of srows) {
		for (const cell of row ?? []) {
			const m = String(cell ?? "").match(/20\d{2}-\d{2}-\d{2}/);
			if (m) {
				dataDate = m[0];
				break outer;
			}
		}
	}
}

// 같은 사건번호+물건번호가 여러 행으로 나오는 경우(다필지 매각)가 있어요.
// 키가 겹치면 React 리스트가 깨지므로 첫 행만 남겨요.
const seen = new Set();
const deduped = items.filter((i) => {
	const key = `${i.caseNo}|${i.itemNo}`;
	if (seen.has(key)) return false;
	seen.add(key);
	return true;
});

writeFileSync(
	"src/data/auctionSeed.json",
	JSON.stringify({ dataDate, items: deduped }),
);
const regions = [...new Set(deduped.map((i) => i.region))];
console.log(
	`✓ ${deduped.length}건 (중복 ${items.length - deduped.length}건 제거) → src/data/auctionSeed.json (기준일 ${dataDate})`,
);
console.log(`  지역: ${regions.join(", ")}`);
