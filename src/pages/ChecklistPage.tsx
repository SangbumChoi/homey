import { useState } from "react";
import { Button, TextButton, Top } from "@toss/tds-mobile";
import { colors } from "@toss/tds-colors";
import { useAppStore } from "../store/useAppStore";

interface Props {
	diagnosisId?: string;
	onBack: () => void;
}

interface CheckItem {
	id: string;
	category: string;
	text: string;
	detail: string;
}

const CHECKLIST_ITEMS: CheckItem[] = [
	{
		id: "c1",
		category: "등기부등본 확인",
		text: "등기부등본을 직접 발급받아 확인했나요?",
		detail: "인터넷등기소(iros.go.kr)에서 발급 가능해요. 계약 당일 기준으로 발급받는 게 가장 정확해요.",
	},
	{
		id: "c2",
		category: "등기부등본 확인",
		text: "근저당권 설정 금액을 확인했나요?",
		detail: "을구에서 근저당권 설정 금액을 확인하세요. (선순위 채권 + 보증금)이 집값의 80%를 넘으면 위험해요.",
	},
	{
		id: "c3",
		category: "등기부등본 확인",
		text: "소유자와 임대인이 동일인인지 확인했나요?",
		detail: "갑구에서 현재 소유자를 확인하고, 임대인의 신분증과 대조하세요.",
	},
	{
		id: "c4",
		category: "전세보증보험",
		text: "전세보증보험 가입 가능 여부를 확인했나요?",
		detail: "HUG(1566-9009) 또는 SGI(1670-7000)에 전화하면 사전 조회가 가능해요.",
	},
	{
		id: "c5",
		category: "전세보증보험",
		text: "전세보증보험에 실제로 가입했나요?",
		detail: "계약 후 3개월 이내에 가입해야 해요. 보증보험이 가장 확실한 보호장치예요.",
	},
	{
		id: "c6",
		category: "임대인 확인",
		text: "임대인의 세금 체납 여부를 확인했나요?",
		detail: "2023년 4월부터 계약 전 임대인 동의 없이도 미납 국세 열람이 가능해요 (세무서 방문).",
	},
	{
		id: "c7",
		category: "임대인 확인",
		text: "임대인이 다주택자인지 확인했나요?",
		detail: "다주택 임대인의 경우 전세사기 위험이 상대적으로 높아요. HUG 전세안심 앱에서 조회 가능해요.",
	},
	{
		id: "c8",
		category: "계약서 확인",
		text: "특약사항에 보증금 반환 관련 내용을 넣었나요?",
		detail: "'보증금 반환 시 선순위 채권을 초과하는 근저당이 설정되지 않을 것' 등의 특약을 추가하세요.",
	},
	{
		id: "c9",
		category: "계약서 확인",
		text: "확정일자를 받았나요?",
		detail: "전입신고와 함께 확정일자를 받아야 우선변제권이 생겨요. 주민센터 또는 온라인으로 가능해요.",
	},
	{
		id: "c10",
		category: "입주 후",
		text: "전입신고를 했나요?",
		detail: "입주 후 14일 이내에 전입신고를 해야 해요. 정부24 또는 주민센터에서 가능해요.",
	},
];

export function ChecklistPage({ diagnosisId, onBack }: Props) {
	const { diagnosisHistory } = useAppStore();
	const diagnosis = diagnosisId
		? diagnosisHistory.find((d) => d.id === diagnosisId)
		: null;

	const [checked, setChecked] = useState<Set<string>>(new Set());
	const [expandedId, setExpandedId] = useState<string | null>(null);

	const toggle = (id: string) => {
		setChecked((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const categories = [...new Set(CHECKLIST_ITEMS.map((i) => i.category))];
	const progress = Math.round((checked.size / CHECKLIST_ITEMS.length) * 100);

	return (
		<div style={{ minHeight: "100vh", backgroundColor: "#FAF8F4" }}>
			{/* Header */}
			<div style={{ display: "flex", alignItems: "center", padding: "14px 20px", backgroundColor: "#fff", borderBottom: "1px solid #E5E7E3" }}>
				<TextButton size="medium" color={colors.grey600} onClick={onBack}>←</TextButton>
				<span style={{ flex: 1, textAlign: "center", fontWeight: 700, fontSize: 16 }}>계약 전 체크리스트</span>
				<span style={{ width: 40 }} />
			</div>

			{/* Diagnosis context */}
			{diagnosis && (
				<div style={{ margin: "16px 20px 0", padding: 12, backgroundColor: "#E7EFEC", borderRadius: 10, borderLeft: "4px solid #1B3D35" }}>
					<div style={{ fontSize: 12, color: "#1B3D35", fontWeight: 600 }}>{diagnosis.address.buildingName || "진단 물건"}</div>
					<div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{diagnosis.address.roadAddress}</div>
				</div>
			)}

			{/* Progress */}
			<div style={{ padding: "16px 20px" }}>
				<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
					<span style={{ fontSize: 13, fontWeight: 600, color: "#1B3D35" }}>진행률</span>
					<span style={{ fontSize: 13, fontWeight: 700, color: "#1B3D35" }}>{checked.size}/{CHECKLIST_ITEMS.length}</span>
				</div>
				<div style={{ height: 8, backgroundColor: "#E5E7E3", borderRadius: 4, overflow: "hidden" }}>
					<div style={{ height: 8, width: `${progress}%`, backgroundColor: "#1B3D35", borderRadius: 4, transition: "width 0.3s" }} />
				</div>
			</div>

			{/* Checklist by category */}
			{categories.map((cat) => (
				<div key={cat} style={{ padding: "0 20px", marginBottom: 16 }}>
					<div style={{ fontSize: 14, fontWeight: 700, color: "#1B3D35", marginBottom: 8 }}>{cat}</div>
					{CHECKLIST_ITEMS.filter((i) => i.category === cat).map((item) => {
						const isChecked = checked.has(item.id);
						const isExpanded = expandedId === item.id;
						return (
							<div key={item.id} style={{ marginBottom: 6 }}>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: 10,
										padding: 12,
										backgroundColor: "#fff",
										borderRadius: isExpanded ? "10px 10px 0 0" : 10,
										border: `1px solid ${isChecked ? "#1B3D35" : "#E5E7E3"}`,
										borderBottom: isExpanded ? "none" : undefined,
										cursor: "pointer",
									}}
									onClick={() => setExpandedId(isExpanded ? null : item.id)}
								>
									<div
										onClick={(e) => { e.stopPropagation(); toggle(item.id); }}
										style={{
											width: 22,
											height: 22,
											borderRadius: 6,
											border: `2px solid ${isChecked ? "#1B3D35" : "#CCC"}`,
											backgroundColor: isChecked ? "#1B3D35" : "transparent",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											color: "#fff",
											fontSize: 14,
											fontWeight: 700,
											flexShrink: 0,
											cursor: "pointer",
										}}
									>
										{isChecked && "✓"}
									</div>
									<span style={{
										flex: 1,
										fontSize: 13,
										fontWeight: 500,
										color: isChecked ? "#9BA6A2" : "#1B3D35",
										textDecoration: isChecked ? "line-through" : "none",
									}}>
										{item.text}
									</span>
									<span style={{ fontSize: 12, color: "#9BA6A2", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
								</div>
								{isExpanded && (
									<div style={{ padding: 12, backgroundColor: "#F8FAFF", border: "1px solid #E5E7E3", borderTop: "none", borderRadius: "0 0 10px 10px" }}>
										<div style={{ fontSize: 12, color: "#5C6B66", lineHeight: 1.6 }}>{item.detail}</div>
									</div>
								)}
							</div>
						);
					})}
				</div>
			))}

			{/* Completion message */}
			{checked.size === CHECKLIST_ITEMS.length && (
				<div style={{ margin: "0 20px 16px", padding: 16, backgroundColor: "#E7EFEC", borderRadius: 14, textAlign: "center" }}>
					<div style={{ fontSize: 24, marginBottom: 8 }}>🎉</div>
					<div style={{ fontSize: 15, fontWeight: 700, color: "#1B3D35" }}>모든 항목을 확인했어요</div>
					<div style={{ fontSize: 13, color: "#5C6B66", marginTop: 4 }}>안전한 전세 계약을 위한 준비가 완료됐어요</div>
				</div>
			)}

			<div style={{ padding: "8px 20px 32px" }}>
				<Button variant="weak" onClick={onBack}>돌아가기</Button>
			</div>
		</div>
	);
}
