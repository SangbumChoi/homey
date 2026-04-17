import type { Address, DiagnosisResult, MyHome, MonitoringAlert } from "../types";

const mapoAddress: Address = {
	roadAddress: "서울특별시 마포구 포은로 143",
	jibunAddress: "서울특별시 마포구 망원동 414-27",
	buildingName: "뉴성신아파트",
	detailAddress: "202호",
	zipCode: "04011",
	sido: "서울특별시",
	sigungu: "마포구",
};

const gangnamAddress: Address = {
	roadAddress: "서울특별시 강남구 테헤란로 142",
	jibunAddress: "서울특별시 강남구 역삼동 701-2",
	buildingName: "캐피탈타워",
	detailAddress: "1503호",
	zipCode: "06236",
	sido: "서울특별시",
	sigungu: "강남구",
};

export const mockDiagnoses: DiagnosisResult[] = [
	{
		id: "diag-001",
		address: mapoAddress,
		depositAmount: 35000,
		grade: "B",
		score: 78,
		scores: {
			seniorDebtRatio: 85,
			depositRatio: 72,
			insuranceAvailable: true,
			landlordRisk: 70,
		},
		scoreReasons: {
			seniorDebtRatio: "선순위 채권 비율 12% (기준 30% 이하 — 안전)",
			depositRatio: "전세가율 78% (기준 80% 이하 — 양호)",
			insurance: "HUG 전세보증보험 가입 가능",
			landlordRisk: "등기부등본 기반 임대인 이력 양호",
		},
		hasRegistrationDoc: true,
		realTradePrice: 45000,
		seniorDebt: 4200,
		createdAt: "2026-03-28T09:12:00.000Z",
	},
	{
		id: "diag-002",
		address: gangnamAddress,
		depositAmount: 72000,
		grade: "D",
		score: 52,
		scores: {
			seniorDebtRatio: 40,
			depositRatio: 35,
			insuranceAvailable: false,
			landlordRisk: 50,
		},
		hasRegistrationDoc: false,
		createdAt: "2026-04-02T15:30:00.000Z",
	},
];

export const mockAlerts: MonitoringAlert[] = [
	{
		id: "alert-001",
		type: "mortgage_added",
		title: "새 근저당 설정 감지",
		description: "2026-04-05 기준 신규 근저당 5천만원이 설정되었습니다.",
		severity: "high",
		createdAt: "2026-04-05T08:00:00.000Z",
		isRead: false,
	},
	{
		id: "alert-002",
		type: "ownership_change",
		title: "소유자 변경 이력",
		description: "등기부등본 상 소유권 이전이 감지되었습니다.",
		severity: "medium",
		createdAt: "2026-03-18T12:00:00.000Z",
		isRead: true,
	},
];

export const mockMyHome: MyHome = {
	id: "home-001",
	address: mapoAddress,
	depositAmount: 35000,
	contractStartDate: "2025-02-01",
	contractEndDate: "2027-02-01",
	grade: "B",
	alerts: [],
};

export function seedMockData(store: {
	diagnosisHistory: DiagnosisResult[];
	addDiagnosis: (r: DiagnosisResult) => void;
	myHome: MyHome | null;
	setMyHome: (h: MyHome) => void;
	userType: string | null;
	setUserType: (t: "seeker" | "resident") => void;
}) {
	if (store.diagnosisHistory.length === 0)
		mockDiagnoses.forEach((d) => store.addDiagnosis(d));
	if (!store.myHome) store.setMyHome({ ...mockMyHome, alerts: mockAlerts });
	if (!store.userType) store.setUserType("resident");
}
