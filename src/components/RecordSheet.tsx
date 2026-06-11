import { useEffect, useState } from "react";
import { BottomSheet, TextButton } from "@toss/tds-mobile";
import { colors } from "@toss/tds-colors";
import { useAuctionStore } from "../store/useAuctionStore";
import { formatKRW } from "../utils/auctionXlsx";
import type { AuctionRecord } from "../types";

interface Props {
	/** auctionKey — null이면 닫힘 */
	itemKey: string | null;
	/** 기록에 저장할 주소 스냅샷 */
	address: string;
	onClose: () => void;
}

/** 만원 단위 입력값 → 원, 빈 값이면 null */
function manToWon(v: string): number | null {
	const n = Number(v.replace(/[^0-9.]/g, ""));
	return v.trim() === "" || Number.isNaN(n) || n <= 0 ? null : Math.round(n * 10_000);
}

function wonToMan(won: number | null): string {
	return won === null ? "" : String(Math.round(won / 10_000));
}

/** 물건에 임장 메모·입찰 결과를 남기는 시트예요 */
export function RecordSheet({ itemKey, address, onClose }: Props) {
	const { records, saveRecord, deleteRecord } = useAuctionStore();
	const existing = itemKey ? records[itemKey] : undefined;

	const [memo, setMemo] = useState("");
	const [bid, setBid] = useState("");
	const [result, setResult] = useState<AuctionRecord["result"]>("none");
	const [winning, setWinning] = useState("");

	// 시트가 열릴 때마다 기존 기록을 불러와요
	useEffect(() => {
		if (!itemKey) return;
		const r = records[itemKey];
		setMemo(r?.memo ?? "");
		setBid(wonToMan(r?.bidAmount ?? null));
		setResult(r?.result ?? "none");
		setWinning(wonToMan(r?.winningPrice ?? null));
		// records는 저장 시에도 바뀌므로 의존성에서 제외해요 (열림 시점 1회만)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [itemKey]);

	const save = () => {
		if (!itemKey) return;
		saveRecord(itemKey, {
			memo: memo.trim(),
			bidAmount: manToWon(bid),
			result,
			winningPrice: manToWon(winning),
			addressSnapshot: address,
			updatedAt: new Date().toISOString(),
		});
		onClose();
	};

	const bidWon = manToWon(bid);
	const winningWon = manToWon(winning);

	const inputStyle: React.CSSProperties = {
		width: "100%",
		padding: "11px 12px",
		borderRadius: 10,
		border: "1.5px solid #C9C2AE",
		fontSize: 15,
		color: "#111",
		outline: "none",
		boxSizing: "border-box",
	};

	return (
		<BottomSheet
			open={!!itemKey}
			onClose={onClose}
			hasTextField
			header={<BottomSheet.Header>임장·입찰 기록</BottomSheet.Header>}
			cta={<BottomSheet.CTA onClick={save}>저장</BottomSheet.CTA>}
		>
			<div style={{ padding: "0 24px 8px" }}>
				{/* 임장 메모 */}
				<FieldLabel>임장 메모</FieldLabel>
				<textarea
					value={memo}
					onChange={(e) => setMemo(e.target.value)}
					placeholder="현장 상태, 점유자, 주변 환경 등을 적어두세요"
					rows={4}
					style={{ ...inputStyle, resize: "none", lineHeight: 1.5, fontFamily: "inherit" }}
				/>

				{/* 입찰 결과 */}
				<FieldLabel style={{ marginTop: 16 }}>입찰 결과</FieldLabel>
				<div style={{ display: "flex", gap: 6 }}>
					{(
						[
							["none", "미입찰"],
							["won", "낙찰"],
							["lost", "패찰"],
						] as const
					).map(([key, label]) => (
						<button
							key={key}
							onClick={() => setResult(key)}
							style={{
								flex: 1,
								padding: "9px 0",
								borderRadius: 10,
								border:
									result === key ? "2.5px solid #111" : "1.5px solid #C9C2AE",
								backgroundColor: result === key ? "#FFD43B" : "#fff",
								color: "#111",
								boxShadow: result === key ? "3px 3px 0 #111" : "none",
								fontSize: 14,
								fontWeight: result === key ? 900 : 600,
								cursor: "pointer",
							}}
						>
							{label}
						</button>
					))}
				</div>

				{/* 입찰가 */}
				{result !== "none" && (
					<>
						<FieldLabel style={{ marginTop: 16 }}>
							내 입찰가 (만원)
						</FieldLabel>
						<input
							type="number"
							inputMode="numeric"
							value={bid}
							onChange={(e) => setBid(e.target.value)}
							placeholder="예: 52000"
							style={inputStyle}
						/>
						{bidWon !== null && (
							<HintText>= {formatKRW(bidWon)}</HintText>
						)}

						<FieldLabel style={{ marginTop: 16 }}>
							실제 낙찰가 (만원){result === "won" ? "" : " — 알게 되면 적어두세요"}
						</FieldLabel>
						<input
							type="number"
							inputMode="numeric"
							value={winning}
							onChange={(e) => setWinning(e.target.value)}
							placeholder="예: 54500"
							style={inputStyle}
						/>
						{winningWon !== null && (
							<HintText>
								= {formatKRW(winningWon)}
								{result === "lost" && bidWon !== null && winningWon > bidWon
									? ` (내 입찰가보다 ${formatKRW(winningWon - bidWon)} 높았어요)`
									: ""}
							</HintText>
						)}
					</>
				)}

				{/* 기록 삭제 */}
				{existing && (
					<div style={{ textAlign: "center", marginTop: 20 }}>
						<TextButton
							size="small"
							color={colors.red500}
							onClick={() => {
								if (itemKey && confirm("이 기록을 삭제할까요?")) {
									deleteRecord(itemKey);
									onClose();
								}
							}}
						>
							기록 삭제
						</TextButton>
					</div>
				)}
			</div>
		</BottomSheet>
	);
}

function FieldLabel({
	children,
	style,
}: {
	children: React.ReactNode;
	style?: React.CSSProperties;
}) {
	return (
		<div
			style={{
				fontSize: 12,
				fontWeight: 700,
				color: "#555",
				marginBottom: 6,
				...style,
			}}
		>
			{children}
		</div>
	);
}

function HintText({ children }: { children: React.ReactNode }) {
	return (
		<div style={{ fontSize: 12, color: "#8C8576", marginTop: 4 }}>
			{children}
		</div>
	);
}
