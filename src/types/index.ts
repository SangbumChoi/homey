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
