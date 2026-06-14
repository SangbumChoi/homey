import { Analytics } from "@apps-in-toss/web-framework";
import type { AuctionItem } from "../types";
import { pricePerPyeong } from "../utils/auctionXlsx";

/**
 * 사용자 행동 로깅 추상화예요.
 *
 * - 앱인토스 네이티브 Analytics(screen/impression/click)로 보내요.
 *   네이티브는 https 토스 웹뷰에서만 전송되고, 로컬(http)·웹에서는 조용히 no-op이에요.
 * - 어떤 파이프라인을 붙이든 화면 쪽 코드는 이 `track*` 함수만 부르면 되도록
 *   한 겹 감쌌어요. (나중에 Amplitude 등으로 바꿔도 이 파일만 고치면 돼요.)
 * - 개발 중 눈으로 확인하려고 최근 이벤트를 localStorage 버퍼에 남겨요.
 */

type Props = Record<string, string | number | boolean | null>;

const BUFFER_KEY = "homey-events";
const MAX_BUFFER = 200;

/** 검증·디버그용 로컬 버퍼 (window.__homeyEvents 로도 확인 가능) */
function pushBuffer(name: string, props: Props) {
	try {
		const raw = localStorage.getItem(BUFFER_KEY);
		const buf: unknown[] = raw ? JSON.parse(raw) : [];
		buf.push({ at: new Date().toISOString(), name, ...props });
		localStorage.setItem(
			BUFFER_KEY,
			JSON.stringify(buf.slice(-MAX_BUFFER)),
		);
	} catch {
		/* 저장 실패는 무시해요 */
	}
}

function send(
	kind: "screen" | "impression" | "click",
	logName: string,
	props: Props = {},
) {
	pushBuffer(logName, props);
	if (import.meta.env.DEV) {
		// eslint-disable-next-line no-console
		console.debug("[track]", kind, logName, props);
	}
	try {
		Analytics[kind]({ log_name: logName, ...props });
	} catch {
		/* 토스 웹뷰가 아니면 조용히 넘어가요 */
	}
}

/* ────────────────── 버킷 헬퍼 ────────────────── */
/** 최저가(원) → 억 단위 구간 라벨 */
export function priceBucket(won: number): string {
	const eok = won / 100_000_000;
	if (eok < 3) return "3억 미만";
	if (eok < 5) return "3~5억";
	if (eok < 7) return "5~7억";
	if (eok < 9) return "7~9억";
	if (eok < 12) return "9~12억";
	if (eok < 15) return "12~15억";
	return "15억+";
}

/** 전용면적(평) → 구간 라벨 */
export function areaBucket(pyeong: number): string {
	if (pyeong < 15) return "15평 미만";
	if (pyeong < 20) return "15~20평";
	if (pyeong < 25) return "20~25평";
	if (pyeong < 30) return "25~30평";
	if (pyeong < 35) return "30~35평";
	if (pyeong < 40) return "35~40평";
	return "40평+";
}

/** [min, max] 범위를 사람이 읽는 라벨로 (단위 포함) */
function rangeLabel(
	[min, max]: [number | null, number | null],
	unit: string,
): string {
	if (min === null && max === null) return "전체";
	if (min === null) return `${max}${unit} 이하`;
	if (max === null) return `${min}${unit} 이상`;
	return `${min}~${max}${unit}`;
}

/* ────────────────── 이벤트 ────────────────── */
/** 화면 진입 */
export function trackScreen(screen: string) {
	send("screen", `${screen}::screen`, { screen });
}

/** 화면 체류 시간 (탭/시트를 벗어날 때) */
export function trackScreenDwell(screen: string, ms: number) {
	send("impression", "screen_dwell", { screen, dwell_ms: ms });
}

/** 가격·면적 범위 필터 적용 */
export function trackRangeFilter(
	type: "price" | "area",
	range: [number | null, number | null],
	source: "sheet" | "quickfilter" = "sheet",
) {
	send("click", "filter_apply", {
		filter: type,
		range: rangeLabel(range, type === "price" ? "억" : "평"),
		min: range[0],
		max: range[1],
		source,
	});
}

/** 지역 필터 적용 */
export function trackRegionFilter(region: string | null) {
	send("click", "filter_apply", { filter: "region", value: region ?? "전체" });
}

/** 법원 필터 적용 (복수 선택) */
export function trackCourtFilter(courts: string[]) {
	send("click", "filter_apply", {
		filter: "court",
		count: courts.length,
		value: courts.length === 0 ? "전체" : courts.join(","),
	});
}

/** 조건 필터(신건/유찰, 지분 제외, 지난 기일) */
export function trackConditionFilter(key: string, value: string | boolean) {
	send("click", "filter_apply", { filter: "condition", key, value });
}

/** 정렬 변경 */
export function trackSort(sortKey: string) {
	send("click", "sort_change", { sort: sortKey });
}

/** 대시보드 빠른 필터 탭 */
export function trackQuickFilter(label: string) {
	send("click", "quickfilter_tap", { label });
}

/** 물건 상세 열람 */
export function trackListingOpen(item: AuctionItem, source: string) {
	send("impression", "listing_open", {
		region: item.region,
		court: item.court,
		price_bucket: priceBucket(item.minPrice),
		area_bucket: areaBucket(item.areaPyeong),
		per_pyeong: Math.round(pricePerPyeong(item)),
		min_rate: item.minRate,
		fail_count: item.failCount,
		source,
	});
}

/** 물건 상세 체류 시간 */
export function trackListingDwell(item: AuctionItem, ms: number) {
	send("impression", "listing_dwell", {
		region: item.region,
		price_bucket: priceBucket(item.minPrice),
		dwell_ms: ms,
	});
}

/** 관심 등록/해제 */
export function trackFavorite(item: AuctionItem, on: boolean) {
	send("click", "favorite_toggle", {
		on,
		region: item.region,
		price_bucket: priceBucket(item.minPrice),
		area_bucket: areaBucket(item.areaPyeong),
	});
}

/** 임장·입찰 기록 저장 */
export function trackRecordSave(result: string, hasBid: boolean) {
	send("click", "record_save", { result, has_bid: hasBid });
}
