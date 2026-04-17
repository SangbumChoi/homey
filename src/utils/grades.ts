export const GRADE_INFO: Record<
	string,
	{ label: string; color: string; description: string; detail: string }
> = {
	A: {
		label: "A등급",
		color: "#00B274",
		description: "매우 안전",
		detail: "선순위 채권이 낮고 전세가율이 안정적입니다. 전세보증보험 가입이 가능하며 리스크가 매우 낮은 물건입니다.",
	},
	B: {
		label: "B등급",
		color: "#4CAF50",
		description: "안전",
		detail: "전반적으로 안전한 물건입니다. 일부 지표에서 주의가 필요하지만 전세보증보험 가입이 가능한 수준입니다.",
	},
	C: {
		label: "C등급",
		color: "#FFC107",
		description: "보통 (주의 필요)",
		detail: "몇 가지 주의해야 할 지표가 있습니다. 계약 전 등기부등본을 통한 추가 확인을 권장합니다.",
	},
	D: {
		label: "D등급",
		color: "#FF9800",
		description: "위험 신호 존재",
		detail: "위험 신호가 감지됩니다. 전세보증보험 가입 가능 여부를 반드시 확인하고 전문가 상담을 권장합니다.",
	},
	E: {
		label: "E등급",
		color: "#F44336",
		description: "위험",
		detail: "복수의 위험 지표가 확인됩니다. 전세보증보험 가입이 어려울 수 있으며 신중한 검토가 필요합니다.",
	},
	F: {
		label: "F등급",
		color: "#B71C1C",
		description: "매우 위험",
		detail: "매우 높은 리스크가 확인됩니다. 전문 법률 상담 없이 계약을 진행하지 않도록 강력히 권고합니다.",
	},
};
