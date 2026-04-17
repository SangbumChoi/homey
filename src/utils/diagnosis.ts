import type {
	DiagnosisInput,
	DiagnosisResult,
	DiagnosisScore,
	LandlordRiskInput,
	SafetyGrade,
	ScoreReasons,
	ParsedRegistrationDoc,
} from "../types";

const pct = (r: number) => `${Math.round(r * 100)}%`;
const fmt = (n: number) => n.toLocaleString();

// ── 1. 집값 여유 확인 — 선순위 채권 비율 (가중치 30%) ──────────────────────────
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
		"기준: 50% 이하 100점 · 60% 이하 80점 · 70% 이하 60점 · 80% 이하 40점 · 90% 이하 20점 · 90% 초과 0점";
	let score: number, judgement: string;
	if (ratio <= 0.5) {
		score = 100;
		judgement = "✅ 경매 발생해도 보증금 회수 가능성이 매우 높아요.";
	} else if (ratio <= 0.6) {
		score = 80;
		judgement = "🟡 선순위 부담이 다소 있으나 양호한 수준이에요.";
	} else if (ratio <= 0.7) {
		score = 60;
		judgement = "🟠 선순위 부담이 있어요. 추가 확인이 필요해요.";
	} else if (ratio <= 0.8) {
		score = 40;
		judgement = "🔴 선순위 부담이 높아요. 위험 수준이에요.";
	} else if (ratio <= 0.9) {
		score = 20;
		judgement = "🔴 선순위 부담이 매우 높아요. 계약을 재고하세요.";
	} else {
		score = 0;
		judgement = "🚨 집값 대비 채권 합산이 90%를 초과해요. 매우 위험해요.";
	}
	return { score, reason: `${base}\n${guide}\n${judgement}` };
}

// ── 2. 역전세 위험 확인 — 전세가율 (가중치 20%) ────────────────────────────────
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
		"기준: 50% 이하 100점 · 60% 이하 80점 · 70% 이하 60점 · 80% 이하 30점 · 90% 이하 10점 · 90% 초과 0점";
	let score: number, judgement: string;
	if (ratio <= 0.5) {
		score = 100;
		judgement = "✅ 전세가율이 낮아 집주인이 보증금 돌려줄 여력이 충분해요.";
	} else if (ratio <= 0.6) {
		score = 80;
		judgement = "🟡 전세가율이 양호한 수준이에요.";
	} else if (ratio <= 0.7) {
		score = 60;
		judgement = "🟠 전세가율이 다소 높아요. 집값 하락 시 역전세 위험이 있어요.";
	} else if (ratio <= 0.8) {
		score = 30;
		judgement = "🔴 전세가율이 높아요. 역전세 발생 시 보증금 반환이 어려울 수 있어요.";
	} else if (ratio <= 0.9) {
		score = 10;
		judgement = "🔴 전세가율이 매우 높아요. 계약을 재고하세요.";
	} else {
		score = 0;
		judgement = "🚨 전세가율이 90%를 초과해요. 매우 위험해요.";
	}
	return { score, reason: `${base}\n${guide}\n${judgement}` };
}

// ── 3. 안전망 확인 — 보증보험 가입 가능 여부 (가중치 25%) ──────────────────────
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
			reason:
				`전세가율 ${pct(ratio)} (90% 이하 ✅)\n` +
				`보증금 ${fmt(depositAmount)}만원 (7억 이하 ✅)\n` +
				"HUG/SGI 전세보증보험 가입 가능 조건을 충족해요.\n" +
				"단, 실제 가입 가능 여부는 보증기관에서 최종 확인이 필요해요.",
		};
	const reasons: string[] = [];
	if (ratio > 0.9) reasons.push(`전세가율 ${pct(ratio)}로 90% 초과`);
	if (depositAmount > 70000)
		reasons.push(`보증금 ${fmt(depositAmount)}만원으로 7억 초과`);
	return {
		score: 0,
		available: false,
		reason:
			`🔴 가입 불가 조건: ${reasons.join(", ")}\n` +
			"HUG/SGI 전세보증보험 가입 가능성이 낮아요.\n" +
			"계약 전 반드시 보증기관에 직접 확인하세요.",
	};
}

// ── 4. 집주인 신뢰도 확인 — 임대인 리스크 (가중치 25%) ────────────────────────
interface LandlordRiskResult {
	score: number;
	reason: string;
	detail: {
		isCorporation: boolean;
		seniorDebt: number;
		mortgageCount: number;
		warnings: string[];
	};
}

/**
 * 임대인 신뢰도 점수 산정
 * - docData: 등기부등본 파싱 결과 (법인 여부, 근저당, 소유권 이전 횟수 등)
 * - riskInput: 사용자 확인 항목 (세금 체납, 보증사고 이력, 다주택 여부)
 * 두 데이터를 결합하여 종합 신뢰도를 산정합니다.
 */
function scoreLandlordRisk(
	hasRegistrationDoc: boolean,
	docData?: ParsedRegistrationDoc,
	riskInput?: LandlordRiskInput,
): LandlordRiskResult {
	if (!hasRegistrationDoc || !docData) {
		return {
			score: 50,
			reason:
				"등기부등본 미업로드 시 중립값(50점) 처리\n등기부등본을 업로드하면 더 정확한 분석이 가능해요.",
			detail: {
				isCorporation: false,
				seniorDebt: 0,
				mortgageCount: 0,
				warnings: [],
			},
		};
	}

	let score = 100;
	const warnings: string[] = [...docData.warnings];
	const details: string[] = [];

	// ── 등기부등본 기반 감점 ──────────────────────────────────────────────────────

	// 법인 소유 여부
	const isCorporation =
		docData.owner.includes("주식회사") ||
		docData.owner.includes("유한책임") ||
		docData.owner.includes("합자회사") ||
		docData.owner.includes("사단법인") ||
		docData.owner.includes("학교법인") ||
		docData.owner.includes("의료법인") ||
		docData.owner.includes("농업법인");

	if (isCorporation) {
		score -= 15;
		details.push(`법인 소유 (${docData.owner})`);
	} else {
		details.push(`개인 소유 (${docData.owner})`);
	}

	// 근저당 건수
	const mortgageCount = docData.mortgages.length;
	if (mortgageCount >= 5) {
		score -= 25;
		warnings.push(`근저당 ${mortgageCount}건 설정`);
		details.push(`근저당 ${mortgageCount}건`);
	} else if (mortgageCount >= 3) {
		score -= 15;
		warnings.push(`근저당 ${mortgageCount}건 설정`);
		details.push(`근저당 ${mortgageCount}건`);
	} else if (mortgageCount >= 1) {
		score -= 5;
		details.push(`근저당 ${mortgageCount}건`);
	}

	// 경매/압류
	if (docData.hasAuction) {
		score -= 40;
		warnings.push("🚨 경매 개시 결정이 있습니다");
	}
	if (docData.hasSeizure) {
		score -= 25;
		warnings.push("🔴 압류/가압류 등기가 있습니다");
	}

	// 소유권 이전 횟수
	if (docData.ownershipTransferCount >= 3) {
		score -= 15;
		warnings.push(`최근 소유권 이전 ${docData.ownershipTransferCount}회`);
	} else if (docData.ownershipTransferCount >= 2) {
		score -= 8;
	}

	// 선순위 채권 (등기부등본 기준)
	const seniorDebt = docData.seniorDebt;
	if (seniorDebt > 50000) {
		score -= 20;
		details.push(`선순위채권 ${fmt(seniorDebt)}만원 (높음)`);
	} else if (seniorDebt > 30000) {
		score -= 10;
		details.push(`선순위채권 ${fmt(seniorDebt)}만원 (중간)`);
	} else if (seniorDebt > 10000) {
		score -= 5;
		details.push(`선순위채권 ${fmt(seniorDebt)}만원`);
	}

	// ── 사용자 확인 항목 기반 감점 ────────────────────────────────────────────────

	if (riskInput) {
		// 세금 체납 — 체납 확인 시 즉시 0점
		if (riskInput.taxDelinquency === "exists") {
			return {
				score: 0,
				reason:
					"🚨 세금 체납이 확인됐어요.\n" +
					"체납 세금은 보증금보다 우선 변제되어 보증금 회수가 불가능할 수 있어요.",
				detail: {
					isCorporation,
					seniorDebt,
					mortgageCount,
					warnings: [...warnings, "세금 체납 확인됨"],
				},
			};
		}
		if (riskInput.taxDelinquency === "unchecked") {
			score -= 30;
			details.push("세금 체납 미확인 (-30점)");
		}

		// HUG 보증사고 이력
		if (riskInput.guaranteeAccident === "exists") {
			score -= 50;
			warnings.push("보증사고 이력 있음");
			details.push("보증사고 이력 있음 (-50점)");
		} else if (riskInput.guaranteeAccident === "unchecked") {
			score -= 15;
			details.push("보증사고 이력 미확인 (-15점)");
		}

		// 다주택 여부
		if (riskInput.propertyCount === "six_plus") {
			score -= 30;
			details.push("다주택 6채 이상 (-30점)");
		} else if (riskInput.propertyCount === "three_five") {
			score -= 15;
			details.push("다주택 3~5채 (-15점)");
		} else if (riskInput.propertyCount === "unknown") {
			score -= 10;
			details.push("보유 주택 수 미확인 (-10점)");
		}
	}

	score = Math.max(0, Math.min(100, score));

	let judgement: string;
	if (score >= 85) {
		judgement = "✅ 임대인 신뢰도 매우 높아요.";
	} else if (score >= 70) {
		judgement = "🟡 임대인 신뢰도 양호해요.";
	} else if (score >= 55) {
		judgement = "🟠 일부 주의가 필요해요.";
	} else if (score >= 35) {
		judgement = "🔴 위험 요소가 확인됐어요.";
	} else {
		judgement = "🚨 계약 전 전문가 상담이 필요해요.";
	}

	return {
		score,
		reason: `소유자: ${docData.owner}\n${details.join("\n")}${warnings.length > 0 ? "\n⚠️ " + warnings.join("\n⚠️ ") : ""}\n\n${judgement}`,
		detail: {
			isCorporation,
			seniorDebt,
			mortgageCount,
			warnings,
		},
	};
}

// ── 등급 산정 ──────────────────────────────────────────────────────────────────
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
		registrationDocData,
		seniorDebt = 0,
		realTradePrice = 0,
		landlordRiskData,
		insuranceEnrolled = false,
	} = input;

	const s1 = scoreSeniorDebtRatio(depositAmount, seniorDebt, realTradePrice);
	const s2 = scoreDepositRatio(depositAmount, realTradePrice);
	const s3 = scoreInsurance(depositAmount, realTradePrice);
	// 가중치: 선순위채권 30%, 전세가율 20%, 보증보험 25%, 임대인 25%
	const s4 = scoreLandlordRisk(hasRegistrationDoc, registrationDocData, landlordRiskData);

	let totalScore = Math.round(
		s1.score * 0.30 +
		s2.score * 0.20 +
		s3.score * 0.25 +
		s4.score * 0.25,
	);

	// 반전세 보정: 월세가 있으면 최대 +5점
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
		landlordDetail: s4.detail,
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
		landlordRiskData,
		insuranceEnrolled,
	};
}
