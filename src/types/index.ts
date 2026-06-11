export type SafetyGrade = "A" | "B" | "C" | "D" | "E" | "F";

export type UserType = "seeker" | "resident";

export interface ParsedRegistrationDoc {
	owner: string;
	seniorDebt: number;
	mortgages: { creditor: string; amount: number }[];
	hasSeizure: boolean;
	hasAuction: boolean;
	ownershipTransferCount: number;
	warnings: string[];
}

export interface Address {
	roadAddress: string;
	jibunAddress: string;
	buildingName?: string;
	detailAddress?: string;
	zipCode: string;
	sido: string;
	sigungu: string;
}

/** 임대인 리스크 입력값 (등기부등본은 항상 확인 전제) */
export interface LandlordRiskInput {
	/** 등기부등본 — 압류/가압류 여부 */
	hasSeizure: boolean;
	/** 등기부등본 — 경매 개시 여부 */
	hasAuction: boolean;
	/** 세금 체납 여부 (납세증명서 업로드 후 확인) */
	taxDelinquency: "none" | "exists" | "unchecked";
	/** HUG 보증사고 이력 여부 */
	guaranteeAccident: "none" | "exists" | "unchecked";
	/** 임대인 보유 주택 수 */
	propertyCount: "one_two" | "three_five" | "six_plus" | "unknown";
}

export interface DiagnosisInput {
	address: Address;
	depositAmount: number;
	monthlyRent?: number;
	hasRegistrationDoc: boolean;
	registrationDocData?: ParsedRegistrationDoc;
	seniorDebt?: number;
	realTradePrice?: number;
	landlordRiskData?: LandlordRiskInput;
	/** 전세보증보험 실제 가입 여부 (A vs A' 구분) */
	insuranceEnrolled?: boolean;
}

export interface DiagnosisScore {
	seniorDebtRatio: number;
	landlordRisk: number;
	depositRatio: number;
	insuranceAvailable: boolean;
}

export interface ScoreReasons {
	seniorDebtRatio: string;
	depositRatio: string;
	insurance: string;
	landlordRisk: string;
	landlordDetail?: {
		isCorporation: boolean;
		seniorDebt: number;
		mortgageCount: number;
		warnings: string[];
	};
}

export interface DiagnosisResult {
	id: string;
	address: Address;
	depositAmount: number;
	monthlyRent?: number;
	grade: SafetyGrade;
	score: number;
	scores: DiagnosisScore;
	scoreReasons?: ScoreReasons;
	createdAt: string;
	hasRegistrationDoc: boolean;
	realTradePrice?: number;
	seniorDebt?: number;
	landlordRiskData?: LandlordRiskInput;
	/** 보증보험 가입 가능하지만 미가입이면 등급 뒤에 ' 표시 */
	insuranceEnrolled?: boolean;
}

export interface MonitoringAlert {
	id: string;
	type:
		| "mortgage_added"
		| "tax_delinquent"
		| "ownership_change"
		| "auction_started";
	title: string;
	description: string;
	severity: "low" | "medium" | "high";
	createdAt: string;
	isRead: boolean;
}

/** 법원경매 물건 (주간 엑셀 업로드 데이터) */
export interface AuctionItem {
	/** 지역 (예: 서울, 성남 분당구) */
	region: string;
	/** 관할 법원 (예: 서울동부지방법원) */
	court: string;
	/** 사건번호 (예: 서울동부지방법원 2024타경61725) */
	caseNo: string;
	/** 물건번호 */
	itemNo: string;
	/** 주소/건물 */
	address: string;
	/** 전용면적 ㎡ */
	areaM2: number;
	/** 전용면적 평 */
	areaPyeong: number;
	/** 감정가 (원) */
	appraisal: number;
	/** 최저매각가 (원) */
	minPrice: number;
	/** 최저가율 (%) — 감정가 대비 최저가 */
	minRate: number;
	/** 유찰 횟수 (신건 = 0) */
	failCount: number;
	/** 매각기일 (YYYY-MM-DD) */
	saleDate: string;
	/** 비고 (지분매각, 특별매각조건 등) */
	note: string | null;
}

/** 경매 물건에 남기는 임장/입찰 기록 */
export interface AuctionRecord {
	/** 임장 메모 */
	memo: string;
	/** 내 입찰가 (원) — 입찰 안 했으면 null */
	bidAmount: number | null;
	/** 입찰 결과 */
	result: "none" | "won" | "lost";
	/** 실제 낙찰가 (원) — 모르면 null */
	winningPrice: number | null;
	/** 물건이 목록에서 사라져도 보여줄 주소 스냅샷 */
	addressSnapshot: string;
	updatedAt: string;
}

export interface MyHome {
	id: string;
	address: Address;
	depositAmount: number;
	monthlyRent?: number;
	contractStartDate: string;
	contractEndDate: string;
	grade?: SafetyGrade;
	alerts: MonitoringAlert[];
}
