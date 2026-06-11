import type { AuctionItem } from "../types";

export interface ParsedAuctionFile {
	items: AuctionItem[];
	/** 요약 시트의 작성일 (없으면 null) */
	dataDate: string | null;
}

/** 물건 고유 키 — 사건번호 + 물건번호 */
export function auctionKey(item: Pick<AuctionItem, "caseNo" | "itemNo">) {
	return `${item.caseNo}|${item.itemNo}`;
}

/** "유찰 1회" / "신건" → 횟수 */
function parseFailCount(value: unknown): number {
	const s = String(value ?? "");
	if (!s || s.includes("신건")) return 0;
	const m = s.match(/(\d+)/);
	return m ? parseInt(m[1], 10) : 0;
}

/** "2026.06.01" → "2026-06-01" */
function normalizeDate(value: unknown): string {
	if (value instanceof Date) {
		const y = value.getFullYear();
		const m = String(value.getMonth() + 1).padStart(2, "0");
		const d = String(value.getDate()).padStart(2, "0");
		return `${y}-${m}-${d}`;
	}
	return String(value ?? "")
		.trim()
		.replace(/\./g, "-");
}

function toNumber(value: unknown): number {
	if (typeof value === "number") return value;
	const n = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
	return isNaN(n) ? 0 : n;
}

/** 헤더 행에 이 컬럼들이 모두 있으면 경매목록 시트로 판단해요 */
const REQUIRED_COLUMNS = ["사건번호", "주소/건물", "최저가_원", "매각기일"];

/**
 * 주간 업데이트 엑셀 파일을 파싱해요.
 * "사건번호 / 최저가_원" 헤더가 있는 시트를 자동으로 찾아서,
 * 컬럼 순서가 바뀌어도 헤더 이름으로 매핑해요.
 */
export async function parseAuctionXlsx(
	buffer: ArrayBuffer,
): Promise<ParsedAuctionFile> {
	// xlsx는 용량이 커서 업로드할 때만 동적으로 불러와요
	const XLSX = await import("xlsx");
	const wb = XLSX.read(buffer, { type: "array" });

	let items: AuctionItem[] | null = null;
	for (const sheetName of wb.SheetNames) {
		const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
			header: 1,
			defval: null,
		});
		if (rows.length < 2) continue;
		const header = (rows[0] ?? []).map((c) => String(c ?? "").trim());
		if (!REQUIRED_COLUMNS.every((c) => header.includes(c))) continue;

		const col = (name: string) => header.indexOf(name);
		items = rows
			.slice(1)
			.filter((r) => r && r[col("사건번호")])
			.map((r) => ({
				region: String(r[col("지역")] ?? "").trim(),
				court: String(r[col("법원")] ?? "").trim(),
				caseNo: String(r[col("사건번호")] ?? "").trim(),
				itemNo: String(r[col("물건번호")] ?? "1").trim(),
				address: String(r[col("주소/건물")] ?? "").trim(),
				areaM2: toNumber(r[col("면적㎡")]),
				areaPyeong: toNumber(r[col("평")]),
				appraisal: toNumber(r[col("감정가_원")]),
				minPrice: toNumber(r[col("최저가_원")]),
				minRate: toNumber(r[col("최저가율")]),
				failCount: parseFailCount(r[col("유찰")]),
				saleDate: normalizeDate(r[col("매각기일")]),
				note: r[col("비고")] ? String(r[col("비고")]).trim() : null,
			}));
		break;
	}

	if (!items) {
		throw new Error(
			"경매목록 시트를 찾지 못했어요. 헤더에 사건번호·주소/건물·최저가_원·매각기일 컬럼이 필요해요.",
		);
	}

	// 요약 시트에서 작성일 추출 (YYYY-MM-DD 형식 셀 탐색)
	let dataDate: string | null = null;
	const summarySheet = wb.SheetNames.find((n) => n.includes("요약"));
	if (summarySheet) {
		const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[summarySheet], {
			header: 1,
			defval: null,
		});
		outer: for (const row of rows) {
			for (const cell of row ?? []) {
				if (cell instanceof Date) {
					dataDate = normalizeDate(cell);
					break outer;
				}
				const m = String(cell ?? "").match(/20\d{2}-\d{2}-\d{2}/);
				if (m) {
					dataDate = m[0];
					break outer;
				}
			}
		}
	}

	return { items, dataDate };
}

/** 원 → "5억 9,800만" 표기 */
export function formatKRW(won: number): string {
	const eok = Math.floor(won / 100_000_000);
	const man = Math.round((won % 100_000_000) / 10_000);
	if (eok > 0 && man > 0) return `${eok}억 ${man.toLocaleString()}만`;
	if (eok > 0) return `${eok}억`;
	return `${man.toLocaleString()}만`;
}

/** 평당가 (원/평) */
export function pricePerPyeong(item: AuctionItem): number {
	return item.areaPyeong > 0 ? item.minPrice / item.areaPyeong : 0;
}
