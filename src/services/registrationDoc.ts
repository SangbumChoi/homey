/**
 * 등기부등본 관련 서비스
 *
 * - 발급 API (TBD): 등기부등본을 자동 발급받아 파싱
 * - 업로드 파싱: 사용자가 올린 PDF/이미지를 OCR로 파싱
 */

/** 등기부등본에서 추출하는 정보 */
export interface ParsedRegistrationDoc {
	/** 소유자 이름 */
	owner: string;
	/** 선순위 채권 총액 (만원) */
	seniorDebt: number;
	/** 근저당권 채권자별 내역 */
	mortgages: { creditor: string; amount: number }[];
	/** 압류/가압류 여부 */
	hasSeizure: boolean;
	/** 경매 개시 여부 */
	hasAuction: boolean;
	/** 최근 소유권 이전 횟수 (최근 5년) */
	ownershipTransferCount: number;
	/** 경고 사항 목록 */
	warnings: string[];
}

/**
 * 등기부등본 자동 발급 API (TBD)
 *
 * 실제 구현 시:
 * - 인터넷등기소(IROS) 또는 프록시 서비스(등기24, 씨리얼 등) 연동
 * - 주소 기반으로 등기부등본을 자동 발급 → OCR 파싱 → 결과 반환
 *
 * @param address 도로명 주소
 * @returns 파싱된 등기부등본 정보
 */
export async function fetchRegistrationDoc(
	address: string,
): Promise<ParsedRegistrationDoc> {
	// TODO: 실제 API 연동 시 이 부분을 교체
	// const res = await fetch(`${API_BASE}/registration-doc`, {
	//   method: "POST",
	//   headers: { "Content-Type": "application/json" },
	//   body: JSON.stringify({ address }),
	// });
	// return res.json();

	// Mock: 주소 기반 시뮬레이션 데이터
	await new Promise((r) => setTimeout(r, 1500)); // API 호출 시뮬레이션

	// 강남/서초 → 높은 근저당, 나머지 → 낮은 근저당
	const isHighRisk =
		address.includes("강남") || address.includes("서초");

	if (isHighRisk) {
		return {
			owner: "김OO",
			seniorDebt: 42000,
			mortgages: [
				{ creditor: "국민은행", amount: 30000 },
				{ creditor: "신한은행", amount: 12000 },
			],
			hasSeizure: false,
			hasAuction: false,
			ownershipTransferCount: 1,
			warnings: ["근저당 설정 금액이 높아요"],
		};
	}

	return {
		owner: "박OO",
		seniorDebt: 4200,
		mortgages: [{ creditor: "우리은행", amount: 4200 }],
		hasSeizure: false,
		hasAuction: false,
		ownershipTransferCount: 0,
		warnings: [],
	};
}

/**
 * 업로드된 등기부등본 파일 파싱 (TBD)
 *
 * 실제 구현 시:
 * - Supabase Edge Function + CLOVA OCR 호출
 * - PDF/이미지 → 텍스트 추출 → 구조화된 데이터 반환
 */
export async function parseUploadedDoc(
	_file: File,
): Promise<ParsedRegistrationDoc> {
	// TODO: 실제 OCR API 연동 시 교체
	// const formData = new FormData();
	// formData.append("file", file);
	// const res = await fetch(`${SUPABASE_URL}/functions/v1/parse-registration-doc`, {
	//   method: "POST",
	//   headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
	//   body: formData,
	// });
	// return res.json();

	await new Promise((r) => setTimeout(r, 2000));

	return {
		owner: "이OO",
		seniorDebt: 8500,
		mortgages: [
			{ creditor: "하나은행", amount: 5500 },
			{ creditor: "농협", amount: 3000 },
		],
		hasSeizure: false,
		hasAuction: false,
		ownershipTransferCount: 1,
		warnings: [],
	};
}
