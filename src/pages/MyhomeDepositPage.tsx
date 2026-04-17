import { useState } from "react";
import { Button, TextButton } from "@toss/tds-mobile";
import { colors } from "@toss/tds-colors";
import { useAppStore } from "../store/useAppStore";
import type { Page } from "../App";

interface Props {
	onBack: () => void;
	nav: (p: Page) => void;
}

export function MyhomeDepositPage({ onBack, nav }: Props) {
	const { currentAddress } = useAppStore();
	const [deposit, setDeposit] = useState("");
	const [rent, setRent] = useState("");

	if (!currentAddress) { onBack(); return null; }

	const fmt = (v: string) => {
		const n = v.replace(/[^0-9]/g, "");
		return n.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	};
	const raw = parseInt(deposit.replace(/,/g, ""), 10);
	const valid = deposit.length > 0 && !isNaN(raw) && raw > 0;

	return (
		<>
			<div style={{ display: "flex", justifyContent: "space-between", padding: "14px 20px", alignItems: "center" }}>
				<TextButton size="medium" color={colors.grey600} onClick={onBack}>←</TextButton>
				<span style={{ fontSize: 14, color: "#5C6B66", fontWeight: 600 }}>1 / 2</span>
			</div>
			<div style={{ height: 3, backgroundColor: "#E5E7E3", margin: "0 20px", borderRadius: 2 }}>
				<div style={{ height: 3, width: "50%", backgroundColor: "#1B3D35", borderRadius: 2 }} />
			</div>

			<div style={{ padding: "28px 24px 0" }}>
				<h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>보증금이 얼마인가요?</h2>
				<p style={{ fontSize: 14, color: "#5C6B66", margin: 0 }}>반전세인 경우 월세도 함께 입력해주세요</p>
			</div>

			<div style={{ padding: "28px 24px 0", display: "flex", flexDirection: "column", gap: 20 }}>
				<div style={{ backgroundColor: "#E7EFEC", borderRadius: 12, padding: 14, borderLeft: "4px solid #1B3D35" }}>
					<div style={{ fontSize: 11, color: "#1B3D35", fontWeight: 600 }}>등록할 주소</div>
					<div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{currentAddress.roadAddress}</div>
					{currentAddress.buildingName && <div style={{ fontSize: 12, color: "#5C6B66" }}>{currentAddress.buildingName}</div>}
				</div>

				<div>
					<label style={{ fontSize: 15, fontWeight: 600, display: "block", marginBottom: 8 }}>
						보증금 <span style={{ color: "#F44336" }}>*</span>
					</label>
					<div style={{ display: "flex", alignItems: "center", border: "1.5px solid #E5E7E3", borderRadius: 12, backgroundColor: "#fff" }}>
						<input
							type="text"
							inputMode="numeric"
							value={deposit}
							onChange={(e) => setDeposit(fmt(e.target.value))}
							placeholder="예) 30,000"
							style={{ flex: 1, padding: 14, border: "none", outline: "none", fontSize: 16, borderRadius: 12 }}
						/>
						<span style={{ padding: "0 14px", color: "#5C6B66", fontSize: 14 }}>만원</span>
					</div>
					{valid && <div style={{ fontSize: 12, color: "#1B3D35", marginTop: 4 }}>= {(raw / 10000).toFixed(1)}억원</div>}
				</div>

				<div>
					<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
						<label style={{ fontSize: 15, fontWeight: 600 }}>월세</label>
						<span style={{ fontSize: 11, color: "#5C6B66", backgroundColor: "#FAF8F4", border: "1px solid #E5E7E3", borderRadius: 6, padding: "2px 8px" }}>
							선택
						</span>
					</div>
					<div style={{ display: "flex", alignItems: "center", border: "1.5px solid #E5E7E3", borderRadius: 12, backgroundColor: "#fff" }}>
						<input
							type="text"
							inputMode="numeric"
							value={rent}
							onChange={(e) => setRent(fmt(e.target.value))}
							placeholder="예) 50"
							style={{ flex: 1, padding: 14, border: "none", outline: "none", fontSize: 16, borderRadius: 12 }}
						/>
						<span style={{ padding: "0 14px", color: "#5C6B66", fontSize: 14 }}>만원/월</span>
					</div>
				</div>
			</div>

			<div style={{ padding: 24, position: "sticky", bottom: 0, backgroundColor: "#fff", borderTop: "1px solid #E5E7E3" }}>
				<Button
					color="dark"
					disabled={!valid}
					onClick={() =>
						nav({
							type: "myhome-period",
							deposit: deposit.replace(/,/g, ""),
							monthlyRent: rent.replace(/,/g, "") || "0",
						})
					}
				>
					다음
				</Button>
			</div>
		</>
	);
}
