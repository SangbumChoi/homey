import { useState } from "react";
import { Button, TextButton } from "@toss/tds-mobile";
import { useDialog } from "@toss/tds-mobile";
import { colors } from "@toss/tds-colors";
import { useAppStore } from "../store/useAppStore";
import type { MyHome } from "../types";

interface Props {
	deposit: string;
	monthlyRent: string;
	onBack: () => void;
	onDone: () => void;
}

export function MyhomePeriodPage({ deposit, monthlyRent, onBack, onDone }: Props) {
	const dialog = useDialog();
	const { currentAddress, setMyHome, diagnosisHistory } = useAppStore();
	const [start, setStart] = useState("");
	const [end, setEnd] = useState("");

	if (!currentAddress) { onBack(); return null; }

	const depositNum = parseInt(deposit, 10);
	const rentNum = parseInt(monthlyRent, 10);
	const valid = !!start && !!end && new Date(end) > new Date(start);

	const handleRegister = () => {
		if (!start || !end) return;
		if (new Date(end) <= new Date(start)) {
			dialog.openAlert({
				title: "입력 오류",
				description: "계약 만료일이 시작일보다 이후여야 해요",
			});
			return;
		}
		const matched = diagnosisHistory.find(
			(d) => d.address.roadAddress === currentAddress.roadAddress,
		);
		const home: MyHome = {
			id: Date.now().toString(),
			address: currentAddress,
			depositAmount: depositNum,
			monthlyRent: rentNum || undefined,
			contractStartDate: start,
			contractEndDate: end,
			grade: matched?.grade,
			alerts: [],
		};
		setMyHome(home);
		dialog.openAlert({
			title: "등록 완료",
			description: "내 집이 등록됐어요.\n이상 징후 감지 시 알려드릴게요.",
			onClose: onDone,
		});
	};

	return (
		<>
			<div style={{ display: "flex", justifyContent: "space-between", padding: "14px 20px", alignItems: "center" }}>
				<TextButton size="medium" color={colors.grey600} onClick={onBack}>←</TextButton>
				<span style={{ fontSize: 14, color: "#5C6B66", fontWeight: 600 }}>2 / 2</span>
			</div>
			<div style={{ height: 3, backgroundColor: "#E5E7E3", margin: "0 20px", borderRadius: 2 }}>
				<div style={{ height: 3, width: "100%", backgroundColor: "#1B3D35", borderRadius: 2 }} />
			</div>

			<div style={{ padding: "28px 24px 0" }}>
				<h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>계약 기간을 알려주세요</h2>
				<p style={{ fontSize: 14, color: "#5C6B66", margin: 0 }}>만료일이 가까워지면 미리 알려드려요</p>
			</div>

			<div style={{ padding: "28px 24px 0", display: "flex", flexDirection: "column", gap: 20 }}>
				<div>
					<label style={{ fontSize: 15, fontWeight: 600, display: "block", marginBottom: 8 }}>
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
					<label style={{ fontSize: 15, fontWeight: 600, display: "block", marginBottom: 8 }}>
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

				{/* Monitoring info */}
				<div style={{ backgroundColor: "#F0F4FF", borderRadius: 12, padding: 14 }}>
					<div style={{ fontSize: 13, fontWeight: 700, color: "#1B3D35", marginBottom: 8 }}>
						📡 등록 후 모니터링 항목
					</div>
					{["근저당권 추가 설정", "임대인 세금 체납", "소유자 변경", "경매 개시"].map((t) => (
						<div key={t} style={{ fontSize: 13, color: "#5C6B66", marginBottom: 2 }}>• {t}</div>
					))}
				</div>
			</div>

			<div style={{ padding: 24, position: "sticky", bottom: 0, backgroundColor: "#fff", borderTop: "1px solid #E5E7E3" }}>
				<Button color="dark" disabled={!valid} onClick={handleRegister}>
					등록 완료하기
				</Button>
			</div>
		</>
	);
}
