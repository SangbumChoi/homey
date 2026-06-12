import { parseAuctionXlsx, type ParsedAuctionFile } from "../utils/auctionXlsx";

/**
 * 매일 수집한 경매 엑셀을 올려두는 공개 저장소의 raw URL이에요.
 *
 * 설정 방법 (1회):
 * 이 저장소를 public으로 전환하면, 매일 생성되는 auction-data/latest.xlsx를
 * 앱이 실행될 때 받아 자동으로 병합해요.
 *
 * 저장소가 없거나 파일이 없으면 조용히 넘어가고,
 * 앱 안의 '엑셀 업로드' 버튼은 그대로 쓸 수 있어요.
 */
export const REMOTE_XLSX_URL =
	"https://raw.githubusercontent.com/SangbumChoi/homey/main/auction-data/latest.xlsx";

/** 원격 저장소에서 최신 주간 엑셀을 받아 파싱해요 */
export async function fetchRemoteAuctionData(): Promise<ParsedAuctionFile> {
	const res = await fetch(REMOTE_XLSX_URL, { cache: "no-store" });
	if (!res.ok) {
		throw new Error(`원격 데이터를 받지 못했어요 (HTTP ${res.status})`);
	}
	const buffer = await res.arrayBuffer();
	return parseAuctionXlsx(buffer);
}
