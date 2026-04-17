import { useState } from "react";
import { Button, Top, TextButton } from "@toss/tds-mobile";
import { colors } from "@toss/tds-colors";
import { useAppStore } from "../store/useAppStore";
import { GRADE_INFO } from "../utils/grades";
import type { Page } from "../App";

interface Props {
	id: string;
	onBack: () => void;
	nav: (p: Page) => void;
}

function ActionItem({ icon, text, sub, color }: { icon: string; text: string; sub: string; color?: string }) {
	return (
		<div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
			<span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>{icon}</span>
			<div>
				<div style={{ fontSize: 13, fontWeight: 600, color: color || "#1B3D35" }}>{text}</div>
				<div style={{ fontSize: 12, color: "#5C6B66", marginTop: 2 }}>{sub}</div>
			</div>
		</div>
	);
}

export function DiagnosisResultPage({ id, onBack, nav }: Props) {
	const { diagnosisHistory } = useAppStore();
	const result = diagnosisHistory.find((d) => d.id === id);
	const [expanded, setExpanded] = useState<number | null>(null);

	if (!result) { onBack(); return null; }

	const gradeInfo = GRADE_INFO[result.grade];
	const { scores, scoreReasons } = result;

	const items = [
		{ label: "선순위 채권 비율", score: scores.seniorDebtRatio, icon: "📊", weight: "35%", reason: scoreReasons?.seniorDebtRatio ?? "-" },
		{ label: "전세가율", score: scores.depositRatio, icon: "📈", weight: "30%", reason: scoreReasons?.depositRatio ?? "-" },
		{ label: "전세보증보험", score: scores.insuranceAvailable ? 100 : 0, icon: "🛡️", weight: "25%", reason: scoreReasons?.insurance ?? "-" },
		{ label: "임대인 이력", score: scores.landlordRisk, icon: "👤", weight: "10%", reason: scoreReasons?.landlordRisk ?? "-" },
	];

	const scoreColor = (s: number) =>
		s >= 80 ? "#00B274" : s >= 60 ? "#FFC107" : s >= 40 ? "#FF9800" : "#F44336";

	return (
		<div style={{ minHeight: "100vh" }}>
			{/* Grade header */}
			<div
				style={{
					backgroundColor: gradeInfo.color,
					padding: "24px 24px 40px",
					textAlign: "center",
					color: "#fff",
				}}
			>
				<div style={{ display: "flex", justifyContent: "flex-start" }}>
					<TextButton size="medium" color="rgba(255,255,255,0.8)" onClick={onBack}>
						← 홈
					</TextButton>
				</div>
				<div
					style={{
						width: 80,
						height: 80,
						borderRadius: "50%",
						backgroundColor: "rgba(255,255,255,0.25)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						margin: "16px auto 12px",
						border: "3px solid rgba(255,255,255,0.5)",
						fontSize: 40,
						fontWeight: 900,
					}}
				>
					{result.grade}
				</div>
				<div style={{ fontSize: 20, fontWeight: 700 }}>{gradeInfo.description}</div>
				<div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
					종합 점수 {result.score}점 / 100점
				</div>
			</div>

			{/* Summary card */}
			<div
				style={{
					margin: "-16px 20px 0",
					backgroundColor: "#fff",
					borderRadius: 14,
					padding: 16,
					boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
				}}
			>
				{result.address.buildingName && (
					<div style={{ fontSize: 12, fontWeight: 600, color: "#1B3D35", marginBottom: 4 }}>
						{result.address.buildingName}
					</div>
				)}
				<div style={{ fontSize: 14, fontWeight: 600 }}>
					{result.address.roadAddress}
					{result.address.detailAddress && ` ${result.address.detailAddress}`}
				</div>
				<div style={{ fontSize: 13, color: "#5C6B66", marginTop: 4 }}>
					보증금 {result.depositAmount.toLocaleString()}만원
					{result.monthlyRent ? ` + 월세 ${result.monthlyRent.toLocaleString()}만원` : ""}
				</div>
			</div>

			{/* Grade explain */}
			<div
				style={{
					margin: "16px 20px",
					padding: 16,
					backgroundColor: "#fff",
					borderRadius: 14,
					borderLeft: `4px solid ${gradeInfo.color}`,
				}}
			>
				<div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
					<span style={{ color: gradeInfo.color }}>{gradeInfo.label}</span>이란?
				</div>
				<div style={{ fontSize: 13, color: "#5C6B66", lineHeight: 1.6 }}>
					{gradeInfo.detail}
				</div>
			</div>

			{/* Score items */}
			<div style={{ padding: "0 20px" }}>
				<Top
					title={<Top.TitleParagraph size={17}>세부 진단 결과</Top.TitleParagraph>}
					subtitleBottom={
						<Top.SubtitleParagraph size={13}>
							각 항목을 탭하면 산정 근거를 확인할 수 있어요
						</Top.SubtitleParagraph>
					}
				/>
				{items.map((item, i) => {
					const isOpen = expanded === i;
					const c = scoreColor(item.score);
					return (
						<div key={i} style={{ marginBottom: 8 }}>
							<div
								onClick={() => setExpanded(isOpen ? null : i)}
								style={{
									display: "flex",
									alignItems: "center",
									gap: 12,
									padding: 14,
									backgroundColor: "#fff",
									borderRadius: isOpen ? "12px 12px 0 0" : 12,
									border: "1px solid #E5E7E3",
									borderBottom: isOpen ? "none" : "1px solid #E5E7E3",
									cursor: "pointer",
								}}
							>
								<span style={{ fontSize: 22 }}>{item.icon}</span>
								<div style={{ flex: 1 }}>
									<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
										<span style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</span>
										<span style={{ fontSize: 10, fontWeight: 600, color: c, border: `1px solid ${c}`, borderRadius: 6, padding: "1px 6px" }}>
											가중치 {item.weight}
										</span>
									</div>
									<div style={{ height: 4, backgroundColor: "#E5E7E3", borderRadius: 2, overflow: "hidden" }}>
										<div style={{ height: 4, width: `${item.score}%`, backgroundColor: c, borderRadius: 2 }} />
									</div>
								</div>
								<div style={{ textAlign: "right" }}>
									<span style={{ fontSize: 20, fontWeight: 800, color: c }}>{item.score}</span>
									<span style={{ fontSize: 12, color: "#5C6B66" }}>/100</span>
								</div>
							</div>
							{isOpen && (
								<div style={{ backgroundColor: "#F8FAFF", border: "1px solid #E5E7E3", borderTop: "none", borderRadius: "0 0 12px 12px", padding: 14 }}>
									<div style={{ fontSize: 13, color: "#1B3D35", lineHeight: 1.6, whiteSpace: "pre-line" }}>
										{item.reason}
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>

			{/* Upsell if no doc */}
			{!result.hasRegistrationDoc && (
				<div style={{ margin: "16px 20px", padding: 18, backgroundColor: "#E7EFEC", borderRadius: 14, border: "1.5px solid #1B3D35" }}>
					<div style={{ fontSize: 15, fontWeight: 700, color: "#1B3D35", marginBottom: 8 }}>
						📄 더 정확한 진단을 원하시나요?
					</div>
					<div style={{ fontSize: 13, color: "#5C6B66", lineHeight: 1.6 }}>
						등기부등본을 업로드하면 실제 근저당 금액과 임대인 이력을 포함한 정밀 진단이 가능해요
					</div>
				</div>
			)}

			{/* Insurance warning with detailed guidance */}
			{!scores.insuranceAvailable && (
				<div style={{ margin: "0 20px 16px", padding: 16, backgroundColor: "#FFF3E0", borderRadius: 14, borderLeft: "4px solid #FFC107" }}>
					<div style={{ fontSize: 14, fontWeight: 700, color: "#E65100", marginBottom: 8 }}>
						⚠️ 전세보증보험 가입 불가 가능성
					</div>
					<div style={{ fontSize: 13, color: "#BF360C", lineHeight: 1.6, marginBottom: 12 }}>
						전세가율이 HUG/SGI 기준을 초과할 수 있어요. 보증보험 없이 계약하면 보증금 미반환 시 보호받기 어려워요.
					</div>
					<div style={{ fontSize: 13, fontWeight: 600, color: "#E65100", marginBottom: 8 }}>가입 불가 예상 사유</div>
					{result.realTradePrice && result.realTradePrice > 0 && (result.depositAmount / result.realTradePrice) > 0.9 && (
						<div style={{ fontSize: 12, color: "#BF360C", marginBottom: 4 }}>
							• 전세가율 {Math.round((result.depositAmount / result.realTradePrice) * 100)}% — HUG 기준 90% 초과
						</div>
					)}
					{result.depositAmount > 70000 && (
						<div style={{ fontSize: 12, color: "#BF360C", marginBottom: 4 }}>
							• 보증금 {result.depositAmount.toLocaleString()}만원 — 7억원 초과
						</div>
					)}
					<div style={{ marginTop: 12, padding: 12, backgroundColor: "#FFF8E1", borderRadius: 10 }}>
						<div style={{ fontSize: 12, fontWeight: 600, color: "#E65100", marginBottom: 6 }}>그래도 확인해볼 수 있어요</div>
						<div style={{ fontSize: 12, color: "#5C6B66", lineHeight: 1.6 }}>
							1. HUG 전세보증보험: 1566-9009{"\n"}
							2. SGI서울보증: 1670-7000{"\n"}
							3. HF 한국주택금융공사: 1688-8114{"\n"}
							4. 전세안심 앱에서 사전 조회 가능
						</div>
					</div>
				</div>
			)}

			{/* Worst-case recovery estimate */}
			{result.seniorDebt !== undefined && result.seniorDebt > 0 && (
				<div style={{ margin: "0 20px 16px", padding: 16, backgroundColor: "#fff", borderRadius: 14, border: "1px solid #E5E7E3" }}>
					<div style={{ fontSize: 14, fontWeight: 700, color: "#1B3D35", marginBottom: 12 }}>
						💰 최악의 경우 보증금 회수 예상
					</div>
					<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
						<span style={{ fontSize: 13, color: "#5C6B66" }}>보증금</span>
						<span style={{ fontSize: 13, fontWeight: 600 }}>{result.depositAmount.toLocaleString()}만원</span>
					</div>
					<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
						<span style={{ fontSize: 13, color: "#5C6B66" }}>선순위 채권</span>
						<span style={{ fontSize: 13, fontWeight: 600, color: "#F44336" }}>-{result.seniorDebt.toLocaleString()}만원</span>
					</div>
					<div style={{ height: 1, backgroundColor: "#E5E7E3", margin: "8px 0" }} />
					{(() => {
						const recovery = Math.max(0, (result.realTradePrice || result.depositAmount) - (result.seniorDebt || 0));
						const lossAmount = Math.max(0, result.depositAmount - recovery);
						const recoveryRate = Math.min(100, Math.round((recovery / result.depositAmount) * 100));
						return (
							<>
								<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
									<span style={{ fontSize: 14, fontWeight: 700 }}>예상 회수액</span>
									<span style={{ fontSize: 16, fontWeight: 800, color: recoveryRate >= 80 ? "#00B274" : recoveryRate >= 50 ? "#FF9800" : "#F44336" }}>
										{Math.min(recovery, result.depositAmount).toLocaleString()}만원
									</span>
								</div>
								{lossAmount > 0 && (
									<div style={{ display: "flex", justifyContent: "space-between" }}>
										<span style={{ fontSize: 12, color: "#F44336" }}>예상 손실액</span>
										<span style={{ fontSize: 12, fontWeight: 600, color: "#F44336" }}>-{lossAmount.toLocaleString()}만원</span>
									</div>
								)}
								<div style={{ marginTop: 8, height: 6, backgroundColor: "#E5E7E3", borderRadius: 3, overflow: "hidden" }}>
									<div style={{ height: 6, width: `${recoveryRate}%`, backgroundColor: recoveryRate >= 80 ? "#00B274" : recoveryRate >= 50 ? "#FF9800" : "#F44336", borderRadius: 3 }} />
								</div>
								<div style={{ fontSize: 11, color: "#5C6B66", marginTop: 4, textAlign: "right" }}>
									회수율 {recoveryRate}%
								</div>
							</>
						);
					})()}
					<div style={{ fontSize: 11, color: "#9BA6A2", marginTop: 8, lineHeight: 1.5 }}>
						* 경매 시 실거래가 기준 예상치이며, 실제 낙찰가에 따라 달라질 수 있어요
					</div>
				</div>
			)}

			{/* What to do next — contextual action cards */}
			<div style={{ margin: "0 20px 16px", padding: 16, backgroundColor: "#fff", borderRadius: 14, border: "1px solid #E5E7E3" }}>
				<div style={{ fontSize: 14, fontWeight: 700, color: "#1B3D35", marginBottom: 12 }}>
					📋 다음에 할 일
				</div>
				{(result.grade === "A" || result.grade === "B") && (
					<>
						<ActionItem icon="✅" text="안심하고 계약을 진행해도 돼요" sub="전세보증보험 가입도 함께 진행하세요" />
						<ActionItem icon="🛡️" text="전세보증보험 가입 신청하기" sub="HUG 또는 SGI서울보증 홈페이지에서 신청" />
						<ActionItem icon="📝" text="특약사항 확인하기" sub="계약서에 보증금 반환 관련 특약이 있는지 확인" />
					</>
				)}
				{(result.grade === "C" || result.grade === "D") && (
					<>
						<ActionItem icon="🔍" text="등기부등본을 직접 확인하세요" sub="인터넷등기소(iros.go.kr)에서 발급 가능" />
						<ActionItem icon="🛡️" text="전세보증보험 가입 가능 여부 확인" sub="HUG 1566-9009로 전화 문의" />
						<ActionItem icon="👤" text="임대인 세금 체납 여부 확인" sub="계약 전 임대인에게 납세증명서 요청" />
						<ActionItem icon="⚖️" text="전문가 상담 고려하기" sub="법률구조공단 132, 전세피해상담 1533-8119" />
					</>
				)}
				{(result.grade === "E" || result.grade === "F") && (
					<>
						<ActionItem icon="🚨" text="이 물건은 계약을 재고해보세요" sub="복수의 위험 지표가 확인됐어요" color="#F44336" />
						<ActionItem icon="⚖️" text="반드시 전문가 상담을 받으세요" sub="법률구조공단 132, 전세피해상담 1533-8119" />
						<ActionItem icon="🔍" text="다른 물건을 진단해보세요" sub="비슷한 지역의 더 안전한 물건을 찾아보세요" />
					</>
				)}
			</div>

			{/* Actions */}
			<div style={{ padding: "0 20px 16px", display: "flex", gap: 8 }}>
				<Button variant="weak" onClick={() => nav({ type: "checklist", diagnosisId: result.id })}>
					📋 계약 전 체크리스트
				</Button>
			</div>
			<div style={{ padding: "0 20px 32px" }}>
				<Button color="dark" onClick={() => nav({ type: "diagnosis-search" })}>
					🔍 다른 물건 진단하기
				</Button>
			</div>

			<div style={{ textAlign: "center", padding: "0 24px 32px", fontSize: 11, color: "#9BA6A2", lineHeight: 1.6 }}>
				본 진단 결과는 공공 데이터를 기반으로 한 참고용 정보이며, 법적 효력이 없습니다.
			</div>
		</div>
	);
}
