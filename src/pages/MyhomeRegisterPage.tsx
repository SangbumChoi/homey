import { useState } from "react";
import { TextButton, useToast } from "@toss/tds-mobile";
import { colors } from "@toss/tds-colors";
import { useAppStore } from "../store/useAppStore";
import type { MyHome } from "../types";

interface Props {
	onBack: () => void;
	onDone: () => void;
}

export function MyhomeRegisterPage({ onBack, onDone }: Props) {
	const toast = useToast();
	const { currentAddress, setMyHome, diagnosisHistory } = useAppStore();
	const [deposit, setDeposit] = useState("");
	const [rent, setRent] = useState("");
	const [start, setStart] = useState("");
	const [end, setEnd] = useState("");

	if (!currentAddress) {
		onBack();
		return null;
	}

	const fmt = (v: string) => {
		const n = v.replace(/[^0-9]/g, "");
		return n.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	};
	const depositRaw = parseInt(deposit.replace(/,/g, ""), 10);
	const rentRaw = parseInt(rent.replace(/,/g, ""), 10);
	const depositValid =
		deposit.length > 0 && !isNaN(depositRaw) && depositRaw > 0;
	const dateValid = !!start && !!end && new Date(end) > new Date(start);
	const allValid = depositValid && dateValid;

	const handleRegister = () => {
		if (!allValid) return;
		const matched = diagnosisHistory.find(
			(d) => d.address.roadAddress === currentAddress.roadAddress,
		);
		const home: MyHome = {
			id: Date.now().toString(),
			address: currentAddress,
			depositAmount: depositRaw,
			monthlyRent: rentRaw || undefined,
			contractStartDate: start,
			contractEndDate: end,
			grade: matched?.grade,
			alerts: [],
		};
		setMyHome(home);
		onDone();
		toast.openToast("내 집이 등록됐어요", {
			icon: "icon-check",
			iconType: "circle",
		});
	};

	return (
		<>
			{/* Header */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 8,
					padding: "14px 20px",
				}}
			>
				<TextButton size="medium" color={colors.grey600} onClick={onBack}>
					←
				</TextButton>
				<span style={{ fontSize: 17, fontWeight: 700 }}>내 집 등록</span>
			</div>

			{/* Scrollable content, padded-bottom to avoid CTA overlap */}
			<div style={{ padding: "8px 24px 140px", display: "flex", flexDirection: "column", gap: 24 }}>
				{/* Address context — fixed summary at top of content */}
				<div
					style={{
						backgroundColor: "#E7EFEC",
						borderRadius: 12,
						padding: 14,
						borderLeft: "4px solid #1B3D35",
					}}
				>
					<div style={{ fontSize: 11, color: "#1B3D35", fontWeight: 600 }}>
						등록할 주소
					</div>
					<div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
						{currentAddress.roadAddress}
					</div>
					{currentAddress.buildingName && (
						<div style={{ fontSize: 12, color: "#5C6B66" }}>
							{currentAddress.buildingName}
						</div>
					)}
				</div>

				{/* Section 1: 보증금 / 월세 */}
				<section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
					<div>
						<h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 4px" }}>
							보증금이 얼마인가요?
						</h3>
						<p style={{ fontSize: 13, color: "#5C6B66", margin: 0 }}>
							반전세인 경우 월세도 함께 입력해주세요
						</p>
					</div>

					<div>
						<label
							style={{
								fontSize: 15,
								fontWeight: 600,
								display: "block",
								marginBottom: 8,
							}}
						>
							보증금 <span style={{ color: "#F44336" }}>*</span>
						</label>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								border: "1.5px solid #E5E7E3",
								borderRadius: 12,
								backgroundColor: "#fff",
							}}
						>
							<input
								type="text"
								inputMode="numeric"
								value={deposit}
								onChange={(e) => setDeposit(fmt(e.target.value))}
								placeholder="예) 30,000"
								style={{
									flex: 1,
									padding: 14,
									border: "none",
									outline: "none",
									fontSize: 16,
									borderRadius: 12,
								}}
							/>
							<span style={{ padding: "0 14px", color: "#5C6B66", fontSize: 14 }}>
								만원
							</span>
						</div>
						{depositValid && (
							<div style={{ fontSize: 12, color: "#1B3D35", marginTop: 4 }}>
								= {(depositRaw / 10000).toFixed(1)}억원
							</div>
						)}
					</div>

					<div>
						<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
							<label style={{ fontSize: 15, fontWeight: 600 }}>월세</label>
							<span
								style={{
									fontSize: 11,
									color: "#5C6B66",
									backgroundColor: "#FAF8F4",
									border: "1px solid #E5E7E3",
									borderRadius: 6,
									padding: "2px 8px",
								}}
							>
								선택
							</span>
						</div>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								border: "1.5px solid #E5E7E3",
								borderRadius: 12,
								backgroundColor: "#fff",
							}}
						>
							<input
								type="text"
								inputMode="numeric"
								value={rent}
								onChange={(e) => setRent(fmt(e.target.value))}
								placeholder="예) 50"
								style={{
									flex: 1,
									padding: 14,
									border: "none",
									outline: "none",
									fontSize: 16,
									borderRadius: 12,
								}}
							/>
							<span style={{ padding: "0 14px", color: "#5C6B66", fontSize: 14 }}>
								만원/월
							</span>
						</div>
					</div>
				</section>

				{/* Divider */}
				<div style={{ height: 1, backgroundColor: "#E5E7E3" }} />

				{/* Section 2: 계약 기간 */}
				<section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
					<div>
						<h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 4px" }}>
							계약 기간을 알려주세요
						</h3>
						<p style={{ fontSize: 13, color: "#5C6B66", margin: 0 }}>
							만료일이 가까워지면 미리 알려드려요
						</p>
					</div>

					<div>
						<label
							style={{
								fontSize: 15,
								fontWeight: 600,
								display: "block",
								marginBottom: 8,
							}}
						>
							계약 시작일 <span style={{ color: "#F44336" }}>*</span>
						</label>
						<input
							type="date"
							value={start}
							onChange={(e) => setStart(e.target.value)}
							style={{
								width: "100%",
								padding: 14,
								borderRadius: 12,
								border: "1.5px solid #E5E7E3",
								fontSize: 15,
								outline: "none",
								boxSizing: "border-box",
							}}
						/>
					</div>

					<div>
						<label
							style={{
								fontSize: 15,
								fontWeight: 600,
								display: "block",
								marginBottom: 8,
							}}
						>
							계약 만료일 <span style={{ color: "#F44336" }}>*</span>
						</label>
						<input
							type="date"
							value={end}
							onChange={(e) => setEnd(e.target.value)}
							style={{
								width: "100%",
								padding: 14,
								borderRadius: 12,
								border: "1.5px solid #E5E7E3",
								fontSize: 15,
								outline: "none",
								boxSizing: "border-box",
							}}
						/>
						{start && end && new Date(end) <= new Date(start) && (
							<div style={{ fontSize: 12, color: "#F44336", marginTop: 4 }}>
								만료일은 시작일 이후여야 해요
							</div>
						)}
					</div>
				</section>

				{/* Monitoring info */}
				<div style={{ backgroundColor: "#F0F4FF", borderRadius: 12, padding: 14 }}>
					<div style={{ fontSize: 13, fontWeight: 700, color: "#1B3D35", marginBottom: 8 }}>
						📡 등록 후 모니터링 항목
					</div>
					{["근저당권 추가 설정", "임대인 세금 체납", "소유자 변경", "경매 개시"].map((t) => (
						<div key={t} style={{ fontSize: 13, color: "#5C6B66", marginBottom: 2 }}>
							• {t}
						</div>
					))}
				</div>
			</div>

			{/* Fixed bottom CTA with safe-area */}
			<div
				style={{
					position: "fixed",
					left: 0,
					right: 0,
					bottom: 0,
					backgroundColor: "#fff",
					borderTop: "1px solid #E5E7E3",
					padding: "12px 20px calc(12px + env(safe-area-inset-bottom))",
					maxWidth: 480,
					margin: "0 auto",
					zIndex: 10,
				}}
			>
				<button
					type="button"
					disabled={!allValid}
					onClick={handleRegister}
					style={{
						width: "100%",
						padding: "16px",
						borderRadius: 12,
						border: "none",
						backgroundColor: allValid ? "#1B3D35" : "#C8CDCA",
						color: "#fff",
						fontSize: 16,
						fontWeight: 700,
						cursor: allValid ? "pointer" : "not-allowed",
						transition: "background-color 0.15s",
					}}
				>
					등록 완료하기
				</button>
			</div>
		</>
	);
}
