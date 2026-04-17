export interface TradeRecord {
	dealAmount: number;
	dealYear: number;
	dealMonth: number;
	dealDay: number;
	area: number;
	floor: number;
}

/**
 * 시/도 + 시군구 → 법정동코드(5자리) 매핑
 * 국토교통부 실거래가 API에서 LAWD_CD로 사용
 */
const SIGUNGU_CODE: Record<string, string> = {
	// 서울특별시
	"서울특별시 종로구": "11110",
	"서울특별시 중구": "11140",
	"서울특별시 용산구": "11170",
	"서울특별시 성동구": "11200",
	"서울특별시 광진구": "11215",
	"서울특별시 동대문구": "11230",
	"서울특별시 중랑구": "11260",
	"서울특별시 성북구": "11290",
	"서울특별시 강북구": "11305",
	"서울특별시 도봉구": "11320",
	"서울특별시 노원구": "11350",
	"서울특별시 은평구": "11380",
	"서울특별시 서대문구": "11410",
	"서울특별시 마포구": "11440",
	"서울특별시 양천구": "11470",
	"서울특별시 강서구": "11500",
	"서울특별시 구로구": "11530",
	"서울특별시 금천구": "11545",
	"서울특별시 영등포구": "11560",
	"서울특별시 동작구": "11590",
	"서울특별시 관악구": "11620",
	"서울특별시 서초구": "11650",
	"서울특별시 강남구": "11680",
	"서울특별시 송파구": "11710",
	"서울특별시 강동구": "11740",
	// 부산광역시
	"부산광역시 중구": "26110",
	"부산광역시 서구": "26140",
	"부산광역시 동구": "26170",
	"부산광역시 영도구": "26200",
	"부산광역시 부산진구": "26230",
	"부산광역시 동래구": "26260",
	"부산광역시 남구": "26290",
	"부산광역시 북구": "26320",
	"부산광역시 해운대구": "26350",
	"부산광역시 사하구": "26380",
	"부산광역시 금정구": "26410",
	"부산광역시 강서구": "26440",
	"부산광역시 연제구": "26470",
	"부산광역시 수영구": "26500",
	"부산광역시 사상구": "26530",
	// 인천광역시
	"인천광역시 중구": "28110",
	"인천광역시 동구": "28140",
	"인천광역시 미추홀구": "28177",
	"인천광역시 연수구": "28185",
	"인천광역시 남동구": "28200",
	"인천광역시 부평구": "28237",
	"인천광역시 계양구": "28245",
	"인천광역시 서구": "28260",
	// 대구광역시
	"대구광역시 중구": "27110",
	"대구광역시 동구": "27140",
	"대구광역시 서구": "27170",
	"대구광역시 남구": "27200",
	"대구광역시 북구": "27230",
	"대구광역시 수성구": "27260",
	"대구광역시 달서구": "27290",
	// 대전광역시
	"대전광역시 동구": "30110",
	"대전광역시 중구": "30140",
	"대전광역시 서구": "30170",
	"대전광역시 유성구": "30200",
	"대전광역시 대덕구": "30230",
	// 광주광역시
	"광주광역시 동구": "29110",
	"광주광역시 서구": "29140",
	"광주광역시 남구": "29155",
	"광주광역시 북구": "29170",
	"광주광역시 광산구": "29200",
	// 울산광역시
	"울산광역시 중구": "31110",
	"울산광역시 남구": "31140",
	"울산광역시 동구": "31170",
	"울산광역시 북구": "31200",
	// 경기도 주요
	"경기도 수원시 장안구": "41111",
	"경기도 수원시 권선구": "41113",
	"경기도 수원시 팔달구": "41115",
	"경기도 수원시 영통구": "41117",
	"경기도 성남시 수정구": "41131",
	"경기도 성남시 중원구": "41133",
	"경기도 성남시 분당구": "41135",
	"경기도 의정부시": "41150",
	"경기도 안양시 만안구": "41171",
	"경기도 안양시 동안구": "41173",
	"경기도 부천시": "41190",
	"경기도 광명시": "41210",
	"경기도 평택시": "41220",
	"경기도 안산시 상록구": "41271",
	"경기도 안산시 단원구": "41273",
	"경기도 고양시 덕양구": "41281",
	"경기도 고양시 일산동구": "41285",
	"경기도 고양시 일산서구": "41287",
	"경기도 과천시": "41290",
	"경기도 구리시": "41310",
	"경기도 남양주시": "41360",
	"경기도 하남시": "41450",
	"경기도 용인시 처인구": "41461",
	"경기도 용인시 기흥구": "41463",
	"경기도 용인시 수지구": "41465",
	"경기도 파주시": "41480",
	"경기도 화성시": "41590",
	"경기도 광주시": "41610",
	"경기도 양주시": "41630",
	"경기도 김포시": "41570",
	"경기도 시흥시": "41390",
};

function getSigunguCode(sido: string, sigungu: string): string | null {
	const key = `${sido} ${sigungu}`;
	return SIGUNGU_CODE[key] ?? null;
}

function getRecentMonths(count: number): string[] {
	const months: string[] = [];
	const now = new Date();
	for (let i = 0; i < count; i++) {
		const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, "0");
		months.push(`${y}${m}`);
	}
	return months;
}

interface MolitItem {
	거래금액: string;
	년: string;
	월: string;
	일: string;
	전용면적: string;
	층: string;
}

async function fetchMolitMonth(
	lawdCd: string,
	dealYmd: string,
	serviceKey: string,
): Promise<TradeRecord[]> {
	const url =
		`https://openapi.molit.go.kr/OpenAPI_ToolInstallPackage/service/rest/RTMSOBJSvc/getRTMSDataSvcAptTrade` +
		`?serviceKey=${serviceKey}&LAWD_CD=${lawdCd}&DEAL_YMD=${dealYmd}&numOfRows=20&pageNo=1&_type=json`;

	const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
	if (!res.ok) throw new Error(`MOLIT API ${res.status}`);

	const json = await res.json();
	const items: MolitItem[] | MolitItem =
		json?.response?.body?.items?.item ?? [];
	const list = Array.isArray(items) ? items : [items];

	return list.map((item) => ({
		dealAmount: parseInt(item.거래금액.replace(/[^0-9]/g, ""), 10),
		dealYear: parseInt(item.년, 10),
		dealMonth: parseInt(item.월, 10),
		dealDay: parseInt(item.일, 10),
		area: parseFloat(item.전용면적),
		floor: parseInt(item.층, 10),
	}));
}

const MOCK_TRADES: TradeRecord[] = [
	{ dealAmount: 71000, dealYear: 2025, dealMonth: 1, dealDay: 15, area: 59.9, floor: 5 },
	{ dealAmount: 68000, dealYear: 2024, dealMonth: 11, dealDay: 22, area: 59.9, floor: 3 },
	{ dealAmount: 72000, dealYear: 2024, dealMonth: 9, dealDay: 8, area: 59.9, floor: 7 },
];

export async function getRecentTrades(
	address?: { sido: string; sigungu: string },
): Promise<TradeRecord[]> {
	const apiKey = import.meta.env.VITE_MOLIT_API_KEY as string | undefined;

	if (!apiKey || !address) return MOCK_TRADES;

	const lawdCd = getSigunguCode(address.sido, address.sigungu);
	if (!lawdCd) {
		console.warn(`[realEstateApi] 지원하지 않는 지역: ${address.sido} ${address.sigungu} → 목업 사용`);
		return MOCK_TRADES;
	}

	const months = getRecentMonths(3);
	const results: TradeRecord[] = [];

	for (const ym of months) {
		try {
			const trades = await fetchMolitMonth(lawdCd, ym, apiKey);
			results.push(...trades);
		} catch (e) {
			console.warn(`[realEstateApi] ${ym} 조회 실패:`, e);
		}
	}

	return results.length > 0 ? results : MOCK_TRADES;
}

export function estimateRealTradePrice(trades: TradeRecord[]): number {
	if (trades.length === 0) return 0;
	const recent = trades.slice(0, 5);
	return Math.round(recent.reduce((s, t) => s + t.dealAmount, 0) / recent.length);
}
