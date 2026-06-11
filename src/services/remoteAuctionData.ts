import { parseAuctionXlsx, type ParsedAuctionFile } from "../utils/auctionXlsx";

/**
 * 주간 경매 엑셀을 올려두는 공개 저장소의 raw URL이에요.
 *
 * 설정 방법 (1회):
 * 1. GitHub에서 공개(public) 저장소 `homey-data`를 만들어요
 * 2. 매주 받은 엑셀을 `latest.xlsx` 이름으로 업로드해요 (웹에서 드래그&드롭)
 * 3. 앱이 실행될 때 이 URL에서 새 데이터를 받아 자동으로 병합해요
 *
 * 저장소가 없거나 파일이 없으면 조용히 넘어가고,
 * 앱 안의 '엑셀 업로드' 버튼은 그대로 쓸 수 있어요.
 */
export const REMOTE_XLSX_URL =
	"https://raw.githubusercontent.com/SangbumChoi/homey-data/main/latest.xlsx";

/** 원격 저장소에서 최신 주간 엑셀을 받아 파싱해요 */
export async function fetchRemoteAuctionData(): Promise<ParsedAuctionFile> {
	const res = await fetch(REMOTE_XLSX_URL, { cache: "no-store" });
	if (!res.ok) {
		throw new Error(`원격 데이터를 받지 못했어요 (HTTP ${res.status})`);
	}
	const buffer = await res.arrayBuffer();
	return parseAuctionXlsx(buffer);
}
