export type SafetyGrade = "A" | "B" | "C" | "D" | "E" | "F";

export type UserType = "seeker" | "resident";

export interface Address {
	roadAddress: string;
	jibunAddress: string;
	buildingName?: string;
	detailAddress?: string;
	zipCode: string;
	sido: string;
	sigungu: string;
}

export interface DiagnosisInput {
	address: Address;
	depositAmount: number;
	monthlyRent?: number;
	hasRegistrationDoc: boolean;
	seniorDebt?: number;
	realTradePrice?: number;
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
