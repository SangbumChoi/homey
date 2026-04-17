import { useRef, useState } from "react";
import { Button, Top, TextButton } from "@toss/tds-mobile";
import { colors } from "@toss/tds-colors";
import { useAppStore } from "../store/useAppStore";
import { calculateDiagnosis } from "../utils/diagnosis";
import { getRecentTrades, estimateRealTradePrice } from "../services/realEstateApi";
import { parseUploadedDoc } from "../services/registrationDoc";
import type { DiagnosisResult, ParsedRegistrationDoc } from "../types";
import type { Page } from "../App";

interface Props {
	deposit: string;
	monthlyRent: string;
	onBack: () => void;
	nav: (p: Page) => void;
}

export function DiagnosisDocPage({ deposit, monthlyRent, onBack, nav }: Props) {
	const { currentAddress, addDiagnosis } = useAppStore();
	const fileRef = useRef<HTMLInputElement>(null);
	const [fileName, setFileName] = useState<string | null>(null);
	const [ocrLoading, setOcrLoading] = useState(false);
	const [diagnosing, setDiagnosing] = useState(false);
	const [registrationDocData, setRegistrationDocData] = useState<ParsedRegistrationDoc | null>(null);

	if (!currentAddress) { onBack(); return null; }

	const depositNum = parseInt(deposit, 10);
	const rentNum = parseInt(monthlyRent, 10);

	const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const f = e.target.files?.[0];
		if (!f) return;

		setFileName(f.name);
		setOcrLoading(true);
		setRegistrationDocData(null);

		try {
			const parsed = await parseUploadedDoc(f);
			setRegistrationDocData(parsed);
		} catch (err) {
			console.error("OCR 파싱 실패:", err);
		} finally {
			setOcrLoading(false);
		}
	};

	const handleRemoveFile = () => {
		setFile(null);
		setFileName(null);
		setRegistrationDocData(null);
		if (fileRef.current) fileRef.current.value = "";
	};

	const handleDiagnose = async () => {
		setDiagnosing(true);
		try {
			const trades = await getRecentTrades();
			const realTradePrice = estimateRealTradePrice(trades);
			const seniorDebt = registrationDocData?.seniorDebt ?? 0;
			const result = calculateDiagnosis({
				address: currentAddress,
				depositAmount: depositNum,
				monthlyRent: rentNum,
				seniorDebt,
				hasRegistrationDoc: !!registrationDocData,
				registrationDocData: registrationDocData ?? undefined,
				realTradePrice,
			});
			const full: DiagnosisResult = {
				...result,
				address: currentAddress,
				id: Date.now().toString(),
				createdAt: new Date().toISOString(),
			};
			addDiagnosis(full);
			nav({ type: "diagnosis-result", id: full.id });
		} finally {
			setDiagnosing(false);
		}
	};

	const loading = ocrLoading || diagnosing;

	return (
		<>
			{/* Step header */}
			<div style={{ display: "flex", justifyContent: "space-between", padding: "14px 20px", alignItems: "center" }}>
				<TextButton size="medium" color={colors.grey600} onClick={onBack}>←</TextButton>
				<span style={{ fontSize: 14, color: "#5C6B66", fontWeight: 600 }}>2 / 2</span>
			</div>
			<div style={{ height: 3, backgroundColor: "#E5E7E3", margin: "0 20px", borderRadius: 2 }}>
				<div style={{ height: 3, width: "100%", backgroundColor: "#1B3D35", borderRadius: 2 }} />
			</div>

			<Top
				title={<Top.TitleParagraph size={22}>등기부등본이 있나요?</Top.TitleParagraph>}
				subtitleBottom={
					<Top.SubtitleParagraph size={17}>선순위 채권 정보를 자동으로 분석해요</Top.SubtitleParagraph>
				}
			/>

			<div style={{ padding: "0 24px", display: "flex", flexDirection: "column", gap: 16 }}>
				{/* File upload */}
				<input
					ref={fileRef}
					type="file"
					accept="application/pdf,image/*"
					style={{ display: "none" }}
					onChange={handleFile}
				/>

				{!fileName ? (
					<div
						onClick={() => fileRef.current?.click()}
						style={{
							border: "2px dashed #E5E7E3",
							borderRadius: 16,
							padding: "40px 24px",
							textAlign: "center",
							cursor: "pointer",
							backgroundColor: "#fff",
						}}
					>
						<div style={{ fontSize: 36, marginBottom: 8 }}>📁</div>
						<div style={{ fontSize: 16, fontWeight: 700 }}>등기부등본 업로드하기</div>
						<div style={{ fontSize: 13, color: "#5C6B66", marginTop: 4 }}>
							PDF 또는 이미지 파일을 선택해주세요
						</div>
					</div>
				) : ocrLoading ? (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 10,
							padding: 14,
							backgroundColor: "#FFF8E1",
							borderRadius: 12,
							border: "1.5px solid #F57F17",
						}}
					>
						<span style={{ fontSize: 20 }}>🔄</span>
						<div style={{ flex: 1 }}>
							<div style={{ fontSize: 13, fontWeight: 600 }}>{fileName}</div>
							<div style={{ fontSize: 11, color: "#F57F17", marginTop: 2 }}>
								OCR 분석 중...
							</div>
						</div>
					</div>
				) : registrationDocData ? (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 10,
							padding: 14,
							backgroundColor: "#F0FFF4",
							borderRadius: 12,
							border: "1.5px solid #48BB78",
						}}
					>
						<span style={{ fontSize: 20 }}>✅</span>
						<div style={{ flex: 1 }}>
							<div style={{ fontSize: 13, fontWeight: 600 }}>{fileName}</div>
							<div style={{ fontSize: 11, color: "#276749", marginTop: 2 }}>
								소유자: {registrationDocData.owner} · 선순위채권: {registrationDocData.seniorDebt.toLocaleString()}만원
							</div>
							{registrationDocData.warnings.length > 0 && (
								<div style={{ fontSize: 11, color: "#E53E3E", marginTop: 2 }}>
									⚠️ {registrationDocData.warnings[0]}
								</div>
							)}
						</div>
						<button
							onClick={handleRemoveFile}
							style={{ background: "none", border: "none", fontSize: 16, color: "#5C6B66", cursor: "pointer" }}
						>
							✕
						</button>
					</div>
				) : (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 10,
							padding: 14,
							backgroundColor: "#FED7D7",
							borderRadius: 12,
							border: "1.5px solid #E53E3E",
						}}
					>
						<span style={{ fontSize: 20 }}>⚠️</span>
						<div style={{ flex: 1 }}>
							<div style={{ fontSize: 13, fontWeight: 600 }}>{fileName}</div>
							<div style={{ fontSize: 11, color: "#E53E3E", marginTop: 2 }}>
								OCR 분석 실패
							</div>
						</div>
						<button
							onClick={handleRemoveFile}
							style={{ background: "none", border: "none", fontSize: 16, color: "#5C6B66", cursor: "pointer" }}
						>
							✕
						</button>
					</div>
				)}

				{/* Note */}
				<div style={{ backgroundColor: "#FFF8E1", borderRadius: 10, padding: 12 }}>
					<div style={{ fontSize: 12, color: "#F57F17", lineHeight: 1.5 }}>
						📌 등기부등본 없이도 진단할 수 있어요. 선순위 채권 항목은 중립값으로 처리돼요.
					</div>
				</div>
			</div>

			{/* CTA */}
			<div style={{ padding: "24px", position: "sticky", bottom: 0, backgroundColor: "#fff", borderTop: "1px solid #E5E7E3" }}>
				<Button color="dark" onClick={handleDiagnose} loading={loading}>
					{registrationDocData ? "진단 시작하기" : "등기부등본 없이 진단하기"}
				</Button>
			</div>
		</>
	);
}
