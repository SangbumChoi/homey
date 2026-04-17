import type {
	DiagnosisInput,
	DiagnosisResult,
	DiagnosisScore,
	SafetyGrade,
	ScoreReasons,
} from "../types";

const pct = (r: number) => `${Math.round(r * 100)}%`;
const fmt = (n: number) => n.toLocaleString();

function scoreSeniorDebtRatio(
	depositAmount: number,
	seniorDebt: number,
	realTradePrice: number,
): { score: number; reason: string } {
	if (realTradePrice === 0)
		return {
			score: 50,
			reason:
				"실거래가 데이터가 없어 중립값(50점)으로 처리됩니다.\n실거래가가 확인되면 더 정확한 분석이 가능합니다.",
		};
	const total = seniorDebt + depositAmount;
	const ratio = total / realTradePrice;
	const base = `선순위채권 ${fmt(seniorDebt)}만원 + 보증금 ${fmt(depositAmount)}만원 = ${fmt(total)}만원\n실거래가 ${fmt(realTradePrice)}만원 대비 ${pct(ratio)}`;
	const guide =
		"기준: 50% 이하 100점 · 60% 이하 80점 · 70% 이하 60점 · 80% 이하 40점";
	let score: number, judgement: string;
	if (ratio <= 0.5) {
		score = 100;
		judgement = "✅ 선순위 부담이 낮아 매우 안전합니다.";
	} else if (ratio <= 0.6) {
		score = 80;
		judgement = "🟡 선순위 부담이 다소 있으나 양호한 수준입니다.";
	} else if (ratio <= 0.7) {
		score = 60;
		judgement = "🟠 선순위 부담이 있습니다. 주의가 필요합니다.";
	} else if (ratio <= 0.8) {
		score = 40;
		judgement = "🔴 선순위 부담이 높습니다. 위험 수준입니다.";
	} else if (ratio <= 0.9) {
		score = 20;
		judgement = "🔴 선순위 부담이 매우 높습니다. 계약을 재고하세요.";
	} else {
		score = 0;
		judgement =
			"🚨 실거래가 대비 합산 금액이 90%를 초과합니다. 매우 위험합니다.";
	}
	return { score, reason: `${base}\n${guide}\n${judgement}` };
}

function scoreDepositRatio(
	depositAmount: number,
	realTradePrice: number,
): { score: number; reason: string } {
	if (realTradePrice === 0)
		return {
			score: 50,
			reason:
				"실거래가 데이터가 없어 중립값(50점)으로 처리됩니다.\n실거래가가 확인되면 더 정확한 전세가율 분석이 가능합니다.",
		};
	const ratio = depositAmount / realTradePrice;
	const base = `보증금 ${fmt(depositAmount)}만원 ÷ 실거래가 ${fmt(realTradePrice)}만원 = ${pct(ratio)}`;
	const guide =
		"기준: 50% 이하 100점 · 60% 이하 80점 · 70% 이하 60점 · 80% 이하 30점";
	let score: number, judgement: string;
	if (ratio <= 0.5) {
		score = 100;
		judgement = "✅ 전세가율이 낮아 매우 안전합니다.";
	} else if (ratio <= 0.6) {
		score = 80;
		judgement = "🟡 전세가율이 양호한 수준입니다.";
	} else if (ratio <= 0.7) {
		score = 60;
		judgement = "🟠 전세가율이 다소 높습니다. 주의가 필요합니다.";
	} else if (ratio <= 0.8) {
		score = 30;
		judgement = "🔴 전세가율이 높습니다. 역전세 위험이 있습니다.";
	} else if (ratio <= 0.9) {
		score = 10;
		judgement = "🔴 전세가율이 매우 높습니다. 계약을 재고하세요.";
	} else {
		score = 0;
		judgement = "🚨 전세가율이 90%를 초과합니다. 매우 위험합니다.";
	}
	return { score, reason: `${base}\n${guide}\n${judgement}` };
}

function scoreInsurance(
	depositAmount: number,
	realTradePrice: number,
): { score: number; available: boolean; reason: string } {
	if (realTradePrice === 0)
		return {
			score: 50,
			available: false,
			reason:
				"실거래가 데이터가 없어 보증보험 가입 가능 여부를 판단할 수 없습니다.",
		};
	const ratio = depositAmount / realTradePrice;
	const available = ratio <= 0.9 && depositAmount <= 70000;
	if (available)
		return {
			score: 100,
			available: true,
			reason: `전세가율 ${pct(ratio)} (90% 이하 충족)\n보증금 ${fmt(depositAmount)}만원 (7억 이하 충족)\n✅ HUG/SGI 전세보증보험 가입 가능 조건을 충족합니다.`,
		};
	const reasons: string[] = [];
	if (ratio > 0.9) reasons.push(`전세가율 ${pct(ratio)}로 90% 초과`);
	if (depositAmount > 70000)
		reasons.push(`보증금 ${fmt(depositAmount)}만원으로 7억 초과`);
	return {
		score: 0,
		available: false,
		reason: `🔴 가입 불가 조건: ${reasons.join(", ")}\nHUG/SGI 전세보증보험 가입 가능성이 낮습니다.`,
	};
}

function scoreLandlordRisk(hasRegistrationDoc: boolean) {
	if (hasRegistrationDoc)
		return {
			score: 70,
			reason:
				"등기부등본 업로드 기반 기본값 70점\n현재 버전에서는 임대인 정보를 자동 조회하지 않아 기본값이 적용됩니다.",
		};
	return {
		score: 50,
		reason:
			"등기부등본 미업로드 시 중립값(50점) 처리\n등기부등본을 업로드하면 이 항목이 70점으로 상향돼요.",
	};
}

function scoreToGrade(score: number): SafetyGrade {
	if (score >= 85) return "A";
	if (score >= 70) return "B";
	if (score >= 55) return "C";
	if (score >= 40) return "D";
	if (score >= 25) return "E";
	return "F";
}

export function calculateDiagnosis(
	input: DiagnosisInput,
): Omit<DiagnosisResult, "id" | "createdAt"> {
	const {
		address,
		depositAmount,
		monthlyRent = 0,
		hasRegistrationDoc,
		seniorDebt = 0,
		realTradePrice = 0,
	} = input;
	const s1 = scoreSeniorDebtRatio(depositAmount, seniorDebt, realTradePrice);
	const s2 = scoreDepositRatio(depositAmount, realTradePrice);
	const s3 = scoreInsurance(depositAmount, realTradePrice);
	const s4 = scoreLandlordRisk(hasRegistrationDoc);
	let totalScore = Math.round(
		s1.score * 0.35 + s2.score * 0.3 + s3.score * 0.25 + s4.score * 0.1,
	);
	if (monthlyRent > 0)
		totalScore = Math.min(100, totalScore + Math.min(5, Math.floor(monthlyRent / 20)));
	const grade = scoreToGrade(totalScore);
	const scores: DiagnosisScore = {
		seniorDebtRatio: s1.score,
		landlordRisk: s4.score,
		depositRatio: s2.score,
		insuranceAvailable: s3.available,
	};
	const scoreReasons: ScoreReasons = {
		seniorDebtRatio: s1.reason,
		depositRatio: s2.reason,
		insurance: s3.reason,
		landlordRisk: s4.reason,
	};
	return {
		address,
		depositAmount,
		monthlyRent: monthlyRent > 0 ? monthlyRent : undefined,
		grade,
		score: totalScore,
		scores,
		scoreReasons,
		hasRegistrationDoc,
		realTradePrice,
		seniorDebt,
	};
}
