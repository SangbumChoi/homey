import type { SafetyGrade } from "../types";

export const GRADE_INFO: Record<
	SafetyGrade,
	{ label: string; color: string; description: string; detail: string }
> = {
	A: {
		label: "A등급",
		color: "#00B274",
		description: "매우 안전",
		detail:
			"선순위 채권이 낮고 전세가율이 안정적이에요. 전세보증보험 가입이 가능하며 임대인 리스크도 낮아 매우 안전한 물건이에요.",
	},
	B: {
		label: "B등급",
		color: "#4CAF50",
		description: "안전",
		detail:
			"전반적으로 안전한 물건이에요. 일부 지표에서 주의가 필요하지만 전세보증보험 가입이 가능한 수준이에요.",
	},
	C: {
		label: "C등급",
		color: "#FFC107",
		description: "보통 (주의 필요)",
		detail:
			"몇 가지 주의해야 할 지표가 있어요. 계약 전 등기부등본과 임대인 정보를 추가로 확인하는 것을 권장해요.",
	},
	D: {
		label: "D등급",
		color: "#FF9800",
		description: "위험 신호 존재",
		detail:
			"위험 신호가 감지돼요. 전세보증보험 가입 가능 여부를 반드시 확인하고 전문가 상담을 권장해요.",
	},
	E: {
		label: "E등급",
		color: "#F44336",
		description: "위험",
		detail:
			"복수의 위험 지표가 확인돼요. 전세보증보험 가입이 어려울 수 있으며 신중한 검토가 필요해요.",
	},
	F: {
		label: "F등급",
		color: "#B71C1C",
		description: "매우 위험",
		detail:
			"매우 높은 리스크가 확인돼요. 전문 법률 상담 없이 계약을 진행하지 않도록 강력히 권고해요.",
	},
};

/**
 * A' 표기 설명
 * 보증보험 가입 가능하지만 미가입 상태일 때 등급 뒤에 ' 붙임
 */
export const PRIME_GRADE_NOTE =
	"' (프라임) 표시는 전세보증보험 가입이 가능하지만 아직 가입하지 않은 상태예요.\n보증보험에 가입하면 ' 표시가 없어져요.";

/**
 * 화면에 표시할 등급 문자 반환
 * insuranceAvailable이 true이고 insuranceEnrolled가 false이면 등급 뒤에 ' 붙임
 */
export function getDisplayGrade(
	grade: SafetyGrade,
	insuranceAvailable: boolean,
	insuranceEnrolled: boolean,
): string {
	if (insuranceAvailable && !insuranceEnrolled) {
		return `${grade}'`;
	}
	return grade;
}
