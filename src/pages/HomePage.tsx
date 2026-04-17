import { useCallback, useRef, useState } from "react";
import { Button, List, ListRow, Top, Text, TextButton } from "@toss/tds-mobile";
import { colors } from "@toss/tds-colors";
import { useAppStore } from "../store/useAppStore";
import { GRADE_INFO, getDisplayGrade, PRIME_GRADE_NOTE } from "../utils/grades";
import { searchAddress } from "../services/addressSearch";
import { calculateDiagnosis } from "../utils/diagnosis";
import { getRecentTrades, estimateRealTradePrice } from "../services/realEstateApi";
import { fetchRegistrationDoc, parseUploadedDoc, type ParsedRegistrationDoc } from "../services/registrationDoc";
import type { Address, DiagnosisResult, LandlordRiskInput } from "../types";
import type { Page } from "../App";

interface Props {
	nav: (p: Page) => void;
	activeTab?: "diagnosis" | "myhome" | "history";
}

export function HomePage({ nav, activeTab }: Props) {
	const [tab, setTab] = useState<"diagnosis" | "myhome" | "history">(
		activeTab ?? "diagnosis",
	);

	return (
		<div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
			<div style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
				{tab === "diagnosis" && <DiagnosisTab nav={nav} />}
				{tab === "myhome" && <MyhomeTab nav={nav} />}
				{tab === "history" && <HistoryTab nav={nav} />}
			</div>

			{/* Bottom tab bar */}
			<div
				style={{
					display: "flex",
					borderTop: "1px solid #E5E7E3",
					backgroundColor: "#fff",
					flexShrink: 0,
					paddingBottom: "env(safe-area-inset-bottom, 0px)",
				}}
			>
				{(
					[
						["diagnosis", "홈"],
						["myhome", "내 집"],
						["history", "기록"],
					] as const
				).map(([key, label]) => {
					const active = tab === key;
					const color = active ? "#1B3D35" : "#9BA6A2";
					return (
						<button
							key={key}
							onClick={() => setTab(key)}
							style={{
								flex: 1,
								padding: "10px 0 8px",
								border: "none",
								background: "none",
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								gap: 3,
								cursor: "pointer",
							}}
						>
							<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
								{key === "diagnosis" && (
									<>
										<path d="M3 9.5L12 4l9 5.5v9L12 24l-9-5.5z" fill="none" />
										<path d="M3 9l9 5.5L21 9" />
										<path d="M12 14.5V24" />
										<circle cx="12" cy="11" r="2" fill={active ? color : "none"} />
									</>
								)}
								{key === "myhome" && (
									<>
										<path d="M4 10L12 4l8 6v9a1 1 0 01-1 1H5a1 1 0 01-1-1z" />
										<path d="M9 20v-6h6v6" />
										<path d="M2 12l10-8 10 8" />
									</>
								)}
								{key === "history" && (
									<>
										<rect x="5" y="3" width="14" height="18" rx="1.5" />
										<line x1="9" y1="8" x2="15" y2="8" />
										<line x1="9" y1="12" x2="15" y2="12" />
										<line x1="9" y1="16" x2="13" y2="16" />
									</>
								)}
							</svg>
							<span style={{ fontSize: 11, fontWeight: active ? 700 : 400, color }}>
								{label}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}

/* ────────────────── Grade Criteria Section ────────────────── */
const CRITERIA = [
	{
		icon: "📊",
		name: "집값 여유 확인",
		sub: "선순위 채권 비율",
		weight: "30%",
		desc: "경매가 나더라도 내 보증금을 돌려받을 수 있는지 확인해요.",
		calc: "(선순위채권 + 보증금) ÷ 실거래가",
		table: [
			["50% 이하", "100점", "매우 안전"],
			["60% 이하", "80점", "양호"],
			["70% 이하", "60점", "주의 필요"],
			["80% 이하", "40점", "위험"],
			["90% 이하", "20점", "매우 위험"],
			["90% 초과", "0점", "계약 재고"],
		],
	},
	{
		icon: "📈",
		name: "역전세 위험 확인",
		sub: "전세가율",
		weight: "20%",
		desc: "계약이 끝났을 때 집주인이 내 보증금을 돌려줄 여력이 있는지 확인해요.",
		calc: "보증금 ÷ 실거래가",
		table: [
			["50% 이하", "100점", "매우 안전"],
			["60% 이하", "80점", "양호"],
			["70% 이하", "60점", "주의 필요"],
			["80% 이하", "30점", "위험"],
			["90% 이하", "10점", "매우 위험"],
			["90% 초과", "0점", "계약 재고"],
		],
	},
	{
		icon: "🛡️",
		name: "안전망 확인",
		sub: "보증보험 가입 가능 여부",
		weight: "25%",
		desc: "최악의 경우 국가 보증기관에서 내 보증금을 대신 돌려받을 수 있는지 확인해요.",
		calc: "전세가율 90% 이하 + 보증금 7억 이하 → 가입 가능",
		table: [
			["두 조건 모두 충족", "100점", "보험 가입 가능"],
			["하나라도 미충족", "0점", "보험 가입 불가"],
		],
	},
	{
		icon: "👤",
		name: "집주인 신뢰도 확인",
		sub: "임대인 리스크",
		weight: "25%",
		desc: "집주인에게 숨겨진 문제가 없는지 확인해요.",
		calc: "등기부 이상 + 세금 체납 + 보증사고 이력 + 다주택 여부",
		table: [
			["모든 항목 이상 없음", "100점", "신뢰 가능"],
			["세금 체납 미확인", "-30점", "확인 필요"],
			["보증사고 이력 있음", "-50점", "주의"],
			["보증사고 미확인", "-15점", "확인 필요"],
			["다주택 3~5채", "-15점", "주의"],
			["다주택 6채 이상", "-30점", "위험"],
			["압류/경매 개시", "0점", "즉시 중단"],
			["세금 체납 확인됨", "0점", "즉시 중단"],
		],
	},
];

function GradeCriteriaSection() {
	const [expanded, setExpanded] = useState(false);
	const [openIdx, setOpenIdx] = useState<number | null>(null);

	return (
		<div style={{ padding: 16, backgroundColor: "#fff", borderRadius: 14, border: "1px solid #E5E7E3" }}>
			{/* 헤더 */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
				<div style={{ fontSize: 14, fontWeight: 700, color: "#1B3D35" }}>안전 등급 기준</div>
				<button
					onClick={() => setExpanded(!expanded)}
					style={{ background: "none", border: "1px solid #1B3D35", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 600, color: "#1B3D35", cursor: "pointer" }}
				>
					{expanded ? "접기" : "더보기"}
				</button>
			</div>

			{/* 등급 배지 요약 */}
			<div style={{ display: "flex", gap: 6, justifyContent: "space-between", marginBottom: expanded ? 16 : 0 }}>
				{Object.entries(GRADE_INFO).map(([g, info]) => (
					<div key={g} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
						<div style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: info.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 15 }}>{g}</div>
						<span style={{ fontSize: 9, color: "#5C6B66", textAlign: "center" }}>{info.description}</span>
					</div>
				))}
			</div>

			{/* 상세 기준 (더보기 클릭 시) */}
			{expanded && (
				<>
					{/* A' 설명 */}
					<div style={{ padding: "8px 12px", backgroundColor: "#E7EFEC", borderRadius: 8, marginBottom: 12, fontSize: 12, color: "#1B3D35", lineHeight: 1.6 }}>
						💡 <strong>A' (프라임) 등급</strong>: {PRIME_GRADE_NOTE}
					</div>

					{/* 4가지 기준 아코디언 */}
					{CRITERIA.map((c, i) => {
						const isOpen = openIdx === i;
						return (
							<div key={i} style={{ marginBottom: 8 }}>
								<div
									onClick={() => setOpenIdx(isOpen ? null : i)}
									style={{
										display: "flex",
										alignItems: "center",
										gap: 10,
										padding: "12px 14px",
										backgroundColor: "#FAF8F4",
										borderRadius: isOpen ? "10px 10px 0 0" : 10,
										border: "1px solid #E5E7E3",
										borderBottom: isOpen ? "none" : "1px solid #E5E7E3",
										cursor: "pointer",
									}}
								>
									<span style={{ fontSize: 20 }}>{c.icon}</span>
									<div style={{ flex: 1 }}>
										<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
											<span style={{ fontSize: 13, fontWeight: 700, color: "#1B3D35" }}>{c.name}</span>
											<span style={{ fontSize: 10, color: "#5C6B66", backgroundColor: "#E5E7E3", borderRadius: 4, padding: "1px 6px" }}>가중치 {c.weight}</span>
										</div>
										<div style={{ fontSize: 11, color: "#5C6B66", marginTop: 2 }}>{c.sub}</div>
									</div>
									<span style={{ color: "#9BA6A2", fontSize: 14 }}>{isOpen ? "▲" : "▼"}</span>
								</div>

								{isOpen && (
									<div style={{ border: "1px solid #E5E7E3", borderTop: "none", borderRadius: "0 0 10px 10px", padding: 14, backgroundColor: "#fff" }}>
										<div style={{ fontSize: 12, color: "#1B3D35", marginBottom: 8, lineHeight: 1.6 }}>{c.desc}</div>
										<div style={{ fontSize: 11, color: "#5C6B66", backgroundColor: "#F8FAFF", borderRadius: 6, padding: "6px 10px", marginBottom: 10 }}>
											계산: <strong>{c.calc}</strong>
										</div>
										<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
											<thead>
												<tr style={{ backgroundColor: "#F8FAFF" }}>
													<th style={{ padding: "6px 8px", textAlign: "left", color: "#5C6B66", fontWeight: 600, border: "1px solid #E5E7E3" }}>기준</th>
													<th style={{ padding: "6px 8px", textAlign: "center", color: "#5C6B66", fontWeight: 600, border: "1px solid #E5E7E3" }}>점수</th>
													<th style={{ padding: "6px 8px", textAlign: "left", color: "#5C6B66", fontWeight: 600, border: "1px solid #E5E7E3" }}>의미</th>
												</tr>
											</thead>
											<tbody>
												{c.table.map(([criterion, score, meaning], j) => (
													<tr key={j} style={{ backgroundColor: j % 2 === 0 ? "#fff" : "#FAF8F4" }}>
														<td style={{ padding: "6px 8px", border: "1px solid #E5E7E3", color: "#1B3D35" }}>{criterion}</td>
														<td style={{ padding: "6px 8px", textAlign: "center", border: "1px solid #E5E7E3", fontWeight: 700, color: score === "100점" ? "#00B274" : score.startsWith("-") ? "#F44336" : score === "0점" ? "#F44336" : "#FF9800" }}>{score}</td>
														<td style={{ padding: "6px 8px", border: "1px solid #E5E7E3", color: "#5C6B66" }}>{meaning}</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								)}
							</div>
						);
					})}
				</>
			)}
		</div>
	);
}

/* ────────────────── Diagnosis Tab ────────────────── */
function DiagnosisTab({ nav }: { nav: (p: Page) => void }) {
	const { diagnosisHistory, currentAddress, setCurrentAddress, addDiagnosis } = useAppStore();
	const recent = diagnosisHistory.slice(0, 3);

	// Step 1: Address
	const [keyword, setKeyword] = useState("");
	const [searchResults, setSearchResults] = useState<Address[]>([]);
	const [searching, setSearching] = useState(false);
	const [searched, setSearched] = useState(false);
	const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
	const [detail, setDetail] = useState("");

	// Step 2: Deposit
	const [deposit, setDeposit] = useState("");
	const [rent, setRent] = useState("");

	// Step 3: Registration doc
	const fileRef = useRef<HTMLInputElement>(null);
	const [fileName, setFileName] = useState<string | null>(null);
	const [parsedDoc, setParsedDoc] = useState<ParsedRegistrationDoc | null>(null);
	const [docLoading, setDocLoading] = useState(false);

	// Step 4: Landlord risk
	const taxFileRef = useRef<HTMLInputElement>(null);
	const guaranteeFileRef = useRef<HTMLInputElement>(null);
	const [taxFileName, setTaxFileName] = useState<string | null>(null);
	const [taxResult, setTaxResult] = useState<"none" | "exists" | "unchecked">("unchecked");
	const [guaranteeFileName, setGuaranteeFileName] = useState<string | null>(null);
	const [guaranteeResult, setGuaranteeResult] = useState<"none" | "exists" | "unchecked">("unchecked");
	const [propertyCount, setPropertyCount] = useState<LandlordRiskInput["propertyCount"]>("unknown");
	const [landlordSkipped, setLandlordSkipped] = useState(false);

	const [diagnosing, setDiagnosing] = useState(false);

	// Derived
	const addressConfirmed = !!selectedAddress && !!currentAddress;
	const fmtNum = (v: string) => {
		const n = v.replace(/[^0-9]/g, "");
		return n.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	};
	const rawDeposit = parseInt(deposit.replace(/,/g, ""), 10);
	const depositValid = deposit.length > 0 && !isNaN(rawDeposit) && rawDeposit > 0;
	const docDone = !!fileName;
	const landlordDone =
		landlordSkipped ||
		(taxResult !== "unchecked" && guaranteeResult !== "unchecked" && propertyCount !== "unknown");

	const depositRef = useRef<HTMLDivElement>(null);
	const docRef = useRef<HTMLDivElement>(null);
	const landlordRef = useRef<HTMLDivElement>(null);

	const handleSearch = useCallback(async () => {
		const q = keyword.trim();
		if (!q || q.length < 2) return;
		setSelectedAddress(null);
		setDetail("");
		setCurrentAddress(null);
		setDeposit("");
		setRent("");
		setFileName(null);
		setParsedDoc(null);
		resetLandlord();
		setSearching(true);
		setSearched(true);
		try {
			setSearchResults(await searchAddress(q));
		} catch {
			setSearchResults([]);
		} finally {
			setSearching(false);
		}
	}, [keyword, setCurrentAddress]);

	const resetLandlord = () => {
		setTaxFileName(null);
		setTaxResult("unchecked");
		setGuaranteeFileName(null);
		setGuaranteeResult("unchecked");
		setPropertyCount("unknown");
		setLandlordSkipped(false);
	};

	const handleSelectAddress = (addr: Address) => {
		setSelectedAddress(addr);
		setSearchResults([]);
	};

	const handleConfirmAddress = () => {
		if (!selectedAddress) return;
		setCurrentAddress({ ...selectedAddress, detailAddress: detail.trim() || undefined });
		setTimeout(() => depositRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
	};

	const handleDepositNext = () => {
		setTimeout(() => docRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
	};

	const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const f = e.target.files?.[0];
		if (!f) return;
		setFileName(f.name);
		setDocLoading(true);
		try {
			const parsed = await parseUploadedDoc(f);
			setParsedDoc(parsed);
		} catch {
			setParsedDoc(null);
		} finally {
			setDocLoading(false);
			setTimeout(() => landlordRef.current?.scrollIntoView({ behavior: "smooth" }), 300);
		}
	};

	const handleFetchDoc = async () => {
		if (!currentAddress) return;
		setDocLoading(true);
		try {
			const parsed = await fetchRegistrationDoc(currentAddress.roadAddress);
			setParsedDoc(parsed);
			setFileName("자동 발급");
		} catch {
			setParsedDoc(null);
		} finally {
			setDocLoading(false);
			setTimeout(() => landlordRef.current?.scrollIntoView({ behavior: "smooth" }), 300);
		}
	};

	const handleSkipDoc = () => {
		setFileName("건너뜀");
		setTimeout(() => landlordRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
	};

	const handleTaxFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const f = e.target.files?.[0];
		if (!f) return;
		setTaxFileName(f.name);
		// MVP: 파일 업로드 후 사용자가 결과 직접 선택
	};

	const handleGuaranteeFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const f = e.target.files?.[0];
		if (!f) return;
		setGuaranteeFileName(f.name);
	};

	const handleDiagnose = async () => {
		if (!currentAddress) return;
		setDiagnosing(true);
		try {
			const trades = await getRecentTrades({
				sido: currentAddress.sido,
				sigungu: currentAddress.sigungu,
			});
			const realTradePrice = estimateRealTradePrice(trades);
			const rentNum = parseInt(rent.replace(/,/g, ""), 10);

			const landlordRiskData: LandlordRiskInput = {
				hasSeizure: parsedDoc?.hasSeizure ?? false,
				hasAuction: parsedDoc?.hasAuction ?? false,
				taxDelinquency: landlordSkipped ? "unchecked" : taxResult,
				guaranteeAccident: landlordSkipped ? "unchecked" : guaranteeResult,
				propertyCount: landlordSkipped ? "unknown" : propertyCount,
			};

			const result = calculateDiagnosis({
				address: currentAddress,
				depositAmount: rawDeposit,
				monthlyRent: rentNum || 0,
				seniorDebt: parsedDoc?.seniorDebt || 0,
				hasRegistrationDoc: !!fileName && fileName !== "건너뜀",
				realTradePrice,
				landlordRiskData,
				insuranceEnrolled: false,
			});

			const full: DiagnosisResult = {
				...result,
				address: currentAddress,
				id: Date.now().toString(),
				createdAt: new Date().toISOString(),
			};
			addDiagnosis(full);

			// Reset
			setSelectedAddress(null);
			setDetail("");
			setKeyword("");
			setDeposit("");
			setRent("");
			setFileName(null);
			setParsedDoc(null);
			setSearched(false);
			setCurrentAddress(null);
			resetLandlord();

			nav({ type: "diagnosis-result", id: full.id });
		} finally {
			setDiagnosing(false);
		}
	};

	const handleReset = () => {
		setSelectedAddress(null);
		setDetail("");
		setKeyword("");
		setDeposit("");
		setRent("");
		setFileName(null);
		setParsedDoc(null);
		setSearched(false);
		setCurrentAddress(null);
		resetLandlord();
	};

	const CheckButton = ({
		active,
		label,
		color,
		onClick,
	}: {
		active: boolean;
		label: string;
		color: string;
		onClick: () => void;
	}) => (
		<button
			onClick={onClick}
			style={{
				flex: 1,
				padding: "10px 0",
				borderRadius: 8,
				border: `1.5px solid ${active ? color : "#E5E7E3"}`,
				backgroundColor: active ? `${color}15` : "#FAF8F4",
				color: active ? color : "#5C6B66",
				fontWeight: active ? 700 : 400,
				fontSize: 13,
				cursor: "pointer",
			}}
		>
			{label}
		</button>
	);

	return (
		<>
			{/* Logo + tagline */}
			<div style={{ padding: "20px 20px 8px", display: "flex", alignItems: "center", gap: 10 }}>
				<img src="/logo.png" alt="Homey" style={{ width: 28, height: 28, borderRadius: 6 }} />
				<div>
					<div style={{ fontSize: 20, fontWeight: 800, color: "#1B3D35" }}>Homey</div>
					<div style={{ fontSize: 13, color: "#5C6B66" }}>내 집에 대한 모든 정보를 알려줘</div>
				</div>
			</div>

			<div style={{ padding: "0 20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

				{/* ── STEP 1: Address ── */}
				<div style={{ padding: 16, backgroundColor: "#fff", borderRadius: 14, border: "1px solid #E5E7E3" }}>
					<StepHeader n={1} done={addressConfirmed} label="주소 검색" />

					{!addressConfirmed ? (
						<>
							<div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
								<input
									type="text"
									value={keyword}
									onChange={(e) => setKeyword(e.target.value)}
									onKeyDown={(e) => e.key === "Enter" && handleSearch()}
									placeholder="주소 또는 건물명 입력"
									style={{ flex: 1, padding: "12px 14px", borderRadius: 10, border: "1.5px solid #E5E7E3", fontSize: 14, outline: "none" }}
								/>
								<Button size="small" variant="weak" loading={searching} onClick={handleSearch}>검색</Button>
							</div>

							{selectedAddress && (
								<div style={{ backgroundColor: "#E7EFEC", borderRadius: 10, padding: 12, marginTop: 8, borderLeft: "3px solid #1B3D35" }}>
									<div style={{ fontSize: 13, fontWeight: 600 }}>{selectedAddress.roadAddress}</div>
									{selectedAddress.buildingName && <div style={{ fontSize: 12, color: "#5C6B66" }}>{selectedAddress.buildingName}</div>}
									<input
										type="text"
										value={detail}
										onChange={(e) => setDetail(e.target.value)}
										placeholder="상세주소 (동/호수)"
										style={{ width: "100%", marginTop: 8, padding: "10px 12px", borderRadius: 8, border: "1.5px solid #1B3D35", fontSize: 13, outline: "none", boxSizing: "border-box" }}
										autoFocus
									/>
									<div style={{ display: "flex", gap: 8, marginTop: 8 }}>
										<Button size="small" color="dark" onClick={handleConfirmAddress}>이 주소로 진행</Button>
										<TextButton size="small" color={colors.grey600} onClick={() => setSelectedAddress(null)}>다시 선택</TextButton>
									</div>
								</div>
							)}

							{!selectedAddress && searched && (
								<div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
									{searchResults.length === 0 && !searching ? (
										<div style={{ textAlign: "center", padding: 16, color: "#9BA6A2", fontSize: 13 }}>검색 결과가 없어요</div>
									) : (
										searchResults.map((addr, i) => (
											<div key={i} onClick={() => handleSelectAddress(addr)} style={{ padding: 12, backgroundColor: "#FAF8F4", borderRadius: 8, cursor: "pointer", border: "1px solid #E5E7E3" }}>
												<div style={{ fontSize: 13, fontWeight: 600 }}>{addr.roadAddress}</div>
												<div style={{ fontSize: 11, color: "#5C6B66", marginTop: 2 }}>
													{addr.jibunAddress}{addr.buildingName && ` · ${addr.buildingName}`}
												</div>
											</div>
										))
									)}
								</div>
							)}
						</>
					) : (
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
							<div>
								<div style={{ fontSize: 13, fontWeight: 600 }}>{currentAddress!.roadAddress}</div>
								{currentAddress!.detailAddress && <div style={{ fontSize: 12, color: "#5C6B66" }}>{currentAddress!.detailAddress}</div>}
							</div>
							<TextButton size="small" color={colors.grey600} onClick={handleReset}>변경</TextButton>
						</div>
					)}
				</div>

				{/* ── STEP 2: Deposit ── */}
				{addressConfirmed && (
					<div ref={depositRef} style={{ padding: 16, backgroundColor: "#fff", borderRadius: 14, border: "1px solid #E5E7E3" }}>
						<StepHeader n={2} done={depositValid} label="보증금 정보" />

						<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
							<div>
								<label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
									보증금 <span style={{ color: "#F44336" }}>*</span>
								</label>
								<div style={{ display: "flex", alignItems: "center", border: "1.5px solid #E5E7E3", borderRadius: 10 }}>
									<input
										type="text" inputMode="numeric" value={deposit}
										onChange={(e) => setDeposit(fmtNum(e.target.value))}
										placeholder="예) 30,000"
										style={{ flex: 1, padding: 12, border: "none", outline: "none", fontSize: 15, borderRadius: 10 }}
									/>
									<span style={{ padding: "0 12px", color: "#5C6B66", fontSize: 13 }}>만원</span>
								</div>
								{depositValid && <div style={{ fontSize: 11, color: "#1B3D35", marginTop: 4 }}>= {(rawDeposit / 10000).toFixed(1)}억원</div>}
							</div>

							<div>
								<div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
									<label style={{ fontSize: 13, fontWeight: 600 }}>월세</label>
									<span style={{ fontSize: 10, color: "#5C6B66", backgroundColor: "#FAF8F4", border: "1px solid #E5E7E3", borderRadius: 4, padding: "1px 6px" }}>선택</span>
								</div>
								<div style={{ display: "flex", alignItems: "center", border: "1.5px solid #E5E7E3", borderRadius: 10 }}>
									<input
										type="text" inputMode="numeric" value={rent}
										onChange={(e) => setRent(fmtNum(e.target.value))}
										placeholder="예) 50"
										style={{ flex: 1, padding: 12, border: "none", outline: "none", fontSize: 15, borderRadius: 10 }}
									/>
									<span style={{ padding: "0 12px", color: "#5C6B66", fontSize: 13 }}>만원/월</span>
								</div>
							</div>

							{depositValid && (
								<Button size="small" variant="weak" onClick={handleDepositNext}>다음 단계로</Button>
							)}
						</div>
					</div>
				)}

				{/* ── STEP 3: Registration doc ── */}
				{addressConfirmed && depositValid && (
					<div ref={docRef} style={{ padding: 16, backgroundColor: "#fff", borderRadius: 14, border: "1px solid #E5E7E3" }}>
						<StepHeader n={3} done={docDone} label="등기부등본 (선택)" />

						<input ref={fileRef} type="file" accept="application/pdf,image/*" style={{ display: "none" }} onChange={handleFile} />

						{!fileName && !docLoading && (
							<>
								<div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
									<div onClick={() => fileRef.current?.click()} style={{ flex: 1, border: "2px dashed #E5E7E3", borderRadius: 12, padding: "16px 8px", textAlign: "center", cursor: "pointer", backgroundColor: "#FAF8F4" }}>
										<div style={{ fontSize: 22, marginBottom: 4 }}>📄</div>
										<div style={{ fontSize: 12, fontWeight: 600 }}>직접 업로드</div>
										<div style={{ fontSize: 10, color: "#5C6B66", marginTop: 2 }}>PDF / 이미지</div>
									</div>
									<div onClick={handleFetchDoc} style={{ flex: 1, border: "2px dashed #E5E7E3", borderRadius: 12, padding: "16px 8px", textAlign: "center", cursor: "pointer", backgroundColor: "#FAF8F4" }}>
										<div style={{ fontSize: 22, marginBottom: 4 }}>🔍</div>
										<div style={{ fontSize: 12, fontWeight: 600 }}>자동 발급받기</div>
										<div style={{ fontSize: 10, color: "#5C6B66", marginTop: 2 }}>API 조회</div>
									</div>
								</div>
								<button onClick={handleSkipDoc} style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: "1px solid #E5E7E3", backgroundColor: "transparent", fontSize: 12, color: "#9BA6A2", cursor: "pointer" }}>
									건너뛰기 (선순위 채권 중립값 처리)
								</button>
							</>
						)}

						{docLoading && (
							<div style={{ textAlign: "center", padding: "24px 0" }}>
								<div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
								<div style={{ fontSize: 13, color: "#5C6B66" }}>등기부등본을 분석하고 있어요...</div>
							</div>
						)}

						{fileName && !docLoading && (
							<>
								<div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, backgroundColor: "#F0FFF4", borderRadius: 10, border: "1.5px solid #48BB78", marginBottom: 10 }}>
									<span style={{ fontSize: 18 }}>✅</span>
									<div style={{ flex: 1 }}>
										<div style={{ fontSize: 12, fontWeight: 600 }}>{fileName}</div>
										<div style={{ fontSize: 11, color: "#276749", marginTop: 2 }}>{parsedDoc ? "분석 완료" : "업로드 완료"}</div>
									</div>
									<button onClick={() => { setFileName(null); setParsedDoc(null); if (fileRef.current) fileRef.current.value = ""; }}
										style={{ background: "none", border: "none", fontSize: 14, color: "#5C6B66", cursor: "pointer" }}>✕</button>
								</div>

								{parsedDoc && (
									<div style={{ padding: 12, backgroundColor: "#F8FAFF", borderRadius: 10, border: "1px solid #E5E7E3", marginBottom: 10 }}>
										<div style={{ fontSize: 12, fontWeight: 700, color: "#1B3D35", marginBottom: 8 }}>추출된 정보</div>
										<div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
											<InfoRow label="소유자" value={parsedDoc.owner} />
											<InfoRow label="선순위 채권 총액" value={`${parsedDoc.seniorDebt.toLocaleString()}만원`} valueColor={parsedDoc.seniorDebt > 30000 ? "#F44336" : "#1B3D35"} />
											{parsedDoc.mortgages.map((m, i) => (
												<div key={i} style={{ display: "flex", justifyContent: "space-between", paddingLeft: 12 }}>
													<span style={{ color: "#9BA6A2" }}>└ {m.creditor}</span>
													<span style={{ color: "#5C6B66" }}>{m.amount.toLocaleString()}만원</span>
												</div>
											))}
											<InfoRow label="압류/가압류" value={parsedDoc.hasSeizure ? "있음" : "없음"} valueColor={parsedDoc.hasSeizure ? "#F44336" : "#00B274"} />
											<InfoRow label="경매 개시" value={parsedDoc.hasAuction ? "있음" : "없음"} valueColor={parsedDoc.hasAuction ? "#F44336" : "#00B274"} />
										</div>
										{parsedDoc.warnings.length > 0 && (
											<div style={{ marginTop: 8, padding: 8, backgroundColor: "#FFF5F5", borderRadius: 6 }}>
												{parsedDoc.warnings.map((w, i) => (
													<div key={i} style={{ fontSize: 11, color: "#F44336" }}>⚠️ {w}</div>
												))}
											</div>
										)}
									</div>
								)}
							</>
						)}
					</div>
				)}

				{/* ── STEP 4: Landlord Risk ── */}
				{addressConfirmed && depositValid && docDone && (
					<div ref={landlordRef} style={{ padding: 16, backgroundColor: "#fff", borderRadius: 14, border: "1px solid #E5E7E3" }}>
						<StepHeader n={4} done={landlordDone} label="집주인 신뢰도 확인" />

						{!landlordSkipped && (
							<>
								{/* 세금 체납 */}
								<div style={{ marginBottom: 16 }}>
									<div style={{ fontSize: 13, fontWeight: 600, color: "#1B3D35", marginBottom: 4 }}>💰 세금 체납 여부</div>
									<div style={{ fontSize: 11, color: "#5C6B66", marginBottom: 8, lineHeight: 1.5 }}>
										홈택스/위택스에서 발급한 납세증명서를 업로드하면 분석해드려요.
									</div>
									<input ref={taxFileRef} type="file" accept="application/pdf,image/*" style={{ display: "none" }} onChange={handleTaxFileUpload} />
									{!taxFileName ? (
										<button onClick={() => taxFileRef.current?.click()} style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: "1.5px dashed #E5E7E3", backgroundColor: "#FAF8F4", fontSize: 12, color: "#5C6B66", cursor: "pointer" }}>
											📄 납세증명서 업로드 (국세 + 지방세)
										</button>
									) : (
										<div style={{ fontSize: 12, color: "#1B3D35", padding: "8px 10px", backgroundColor: "#E7EFEC", borderRadius: 8, marginBottom: 8 }}>
											✅ {taxFileName}
										</div>
									)}
									<div style={{ display: "flex", gap: 8, marginTop: 8 }}>
										<CheckButton active={taxResult === "none"} label="✅ 체납 없음" color="#00B274" onClick={() => setTaxResult("none")} />
										<CheckButton active={taxResult === "exists"} label="❌ 체납 있음" color="#F44336" onClick={() => setTaxResult("exists")} />
									</div>
								</div>

								{/* 보증사고 이력 */}
								<div style={{ marginBottom: 16 }}>
									<div style={{ fontSize: 13, fontWeight: 600, color: "#1B3D35", marginBottom: 4 }}>🏦 HUG 보증사고 이력</div>
									<div style={{ fontSize: 11, color: "#5C6B66", marginBottom: 8, lineHeight: 1.5 }}>
										HUG 안심전세앱 조회 결과 스크린샷을 업로드하면 분석해드려요.
									</div>
									<input ref={guaranteeFileRef} type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={handleGuaranteeFileUpload} />
									{!guaranteeFileName ? (
										<button onClick={() => guaranteeFileRef.current?.click()} style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: "1.5px dashed #E5E7E3", backgroundColor: "#FAF8F4", fontSize: 12, color: "#5C6B66", cursor: "pointer" }}>
											📸 조회 결과 스크린샷 업로드
										</button>
									) : (
										<div style={{ fontSize: 12, color: "#1B3D35", padding: "8px 10px", backgroundColor: "#E7EFEC", borderRadius: 8, marginBottom: 8 }}>
											✅ {guaranteeFileName}
										</div>
									)}
									<div style={{ display: "flex", gap: 8, marginTop: 8 }}>
										<CheckButton active={guaranteeResult === "none"} label="✅ 이력 없음" color="#00B274" onClick={() => setGuaranteeResult("none")} />
										<CheckButton active={guaranteeResult === "exists"} label="❌ 이력 있음" color="#F44336" onClick={() => setGuaranteeResult("exists")} />
									</div>
								</div>

								{/* 다주택 여부 */}
								<div style={{ marginBottom: 16 }}>
									<div style={{ fontSize: 13, fontWeight: 600, color: "#1B3D35", marginBottom: 8 }}>🏠 임대인 보유 주택 수</div>
									<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
										{(
											[
												["one_two", "1~2채", "#00B274"],
												["three_five", "3~5채", "#FFC107"],
												["six_plus", "6채 이상", "#F44336"],
												["unknown", "모름", "#9BA6A2"],
											] as [LandlordRiskInput["propertyCount"], string, string][]
										).map(([val, label, color]) => (
											<CheckButton key={val} active={propertyCount === val} label={label} color={color} onClick={() => setPropertyCount(val)} />
										))}
									</div>
								</div>
							</>
						)}

						{/* Skip / Diagnose */}
						<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
							{!landlordSkipped ? (
								<>
									<Button
										color="dark"
										onClick={handleDiagnose}
										loading={diagnosing}
										disabled={!landlordDone || diagnosing}
									>
										정밀 진단 시작하기
									</Button>
									<button
										onClick={() => { setLandlordSkipped(true); }}
										style={{ padding: "10px 0", borderRadius: 8, border: "1px solid #E5E7E3", backgroundColor: "transparent", fontSize: 12, color: "#9BA6A2", cursor: "pointer" }}
									>
										이 단계 건너뛰기 (임대인 항목 미확인 처리)
									</button>
								</>
							) : (
								<Button color="dark" onClick={handleDiagnose} loading={diagnosing}>
									진단 시작하기
								</Button>
							)}
						</div>
					</div>
				)}

				{/* ── Grade criteria section ── */}
				<GradeCriteriaSection />

				{/* ── Recent diagnoses ── */}
				{recent.length > 0 && (
					<div>
						<div style={{ fontSize: 14, fontWeight: 700, color: "#1B3D35", marginBottom: 8, padding: "0 4px" }}>최근 진단 내역</div>
						<List>
							{recent.map((d) => {
								const info = GRADE_INFO[d.grade];
								const displayGrade = getDisplayGrade(d.grade, d.scores.insuranceAvailable, d.insuranceEnrolled ?? false);
								return (
									<ListRow
										key={d.id}
										verticalPadding="large"
										onClick={() => nav({ type: "diagnosis-result", id: d.id })}
										left={
											<div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: info.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14 }}>
												{displayGrade}
											</div>
										}
										contents={
											<ListRow.Texts
												type="2RowTypeA"
												top={d.address.roadAddress}
												topProps={{ color: colors.grey800, fontWeight: "bold" }}
												bottom={`보증금 ${d.depositAmount.toLocaleString()}만원 · ${info.description}`}
												bottomProps={{ color: colors.grey600 }}
											/>
										}
									/>
								);
							})}
						</List>
					</div>
				)}
			</div>
		</>
	);
}

/* ── 공통 컴포넌트 ── */
function StepHeader({ n, done, label }: { n: number; done: boolean; label: string }) {
	return (
		<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
			<div style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: done ? "#1B3D35" : "#E5E7E3", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
				{done ? "✓" : n}
			</div>
			<span style={{ fontSize: 15, fontWeight: 700, color: "#1B3D35" }}>{label}</span>
		</div>
	);
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
	return (
		<div style={{ display: "flex", justifyContent: "space-between" }}>
			<span style={{ color: "#5C6B66" }}>{label}</span>
			<span style={{ fontWeight: 600, color: valueColor || "#1B3D35" }}>{value}</span>
		</div>
	);
}

/* ────────────────── MyHome Tab ────────────────── */
function MyhomeTab({ nav }: { nav: (p: Page) => void }) {
	const { myHome, clearMyHome } = useAppStore();

	if (!myHome) {
		return (
			<div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 32px", textAlign: "center" }}>
				<div style={{ width: 80, height: 80, borderRadius: 20, backgroundColor: "#E7EFEC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, marginBottom: 20 }}>🏠</div>
				<div style={{ fontSize: 18, fontWeight: 700, color: "#1B3D35", marginBottom: 8 }}>아직 등록된 집이 없어요</div>
				<div style={{ fontSize: 14, color: "#5C6B66", lineHeight: 1.6, marginBottom: 8 }}>내 집을 등록하면{"\n"}이상 징후를 실시간으로 알려드려요</div>

				<div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", margin: "16px 0 24px", textAlign: "left" }}>
					{[
						{ icon: "📊", title: "근저당권 추가 설정 감지", desc: "새로운 담보가 설정되면 즉시 알려드려요" },
						{ icon: "👤", title: "소유자 변경 모니터링", desc: "집주인이 바뀌면 바로 알려드려요" },
						{ icon: "⚖️", title: "경매 개시 감지", desc: "경매가 시작되면 긴급 알림을 보내드려요" },
						{ icon: "📅", title: "계약 만료 D-day 알림", desc: "만료일이 다가오면 미리 알려드려요" },
					].map((item) => (
						<div key={item.title} style={{ display: "flex", gap: 12, padding: "12px 14px", backgroundColor: "#FAF8F4", borderRadius: 10 }}>
							<span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
							<div>
								<div style={{ fontSize: 13, fontWeight: 600, color: "#1B3D35" }}>{item.title}</div>
								<div style={{ fontSize: 12, color: "#5C6B66", marginTop: 2 }}>{item.desc}</div>
							</div>
						</div>
					))}
				</div>

				<Button color="dark" onClick={() => nav({ type: "diagnosis-search", mode: "myhome" })}>내 집 등록하기</Button>
			</div>
		);
	}

	const daysLeft = Math.ceil((new Date(myHome.contractEndDate).getTime() - Date.now()) / 86400000);
	const gradeInfo = myHome.grade ? GRADE_INFO[myHome.grade] : null;
	const startDate = new Date(myHome.contractStartDate);
	const endDate = new Date(myHome.contractEndDate);
	const now = new Date();
	const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000);
	const elapsedDays = Math.ceil((now.getTime() - startDate.getTime()) / 86400000);
	const progressPct = Math.max(0, Math.min(100, Math.round((elapsedDays / totalDays) * 100)));
	const fmtDate = (d: Date) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;

	return (
		<>
			<Top title={<Top.TitleParagraph size={22}>내 집 지키기</Top.TitleParagraph>} />

			<div style={{ margin: "16px 20px", padding: 16, backgroundColor: "#fff", borderRadius: 14, border: "1px solid #E5E7E3" }}>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
					<div>
						<div style={{ fontSize: 11, color: "#1B3D35", fontWeight: 600 }}>{myHome.address.buildingName || "내 집"}</div>
						<div style={{ fontSize: 14, fontWeight: 600 }}>{myHome.address.roadAddress}</div>
					</div>
					{gradeInfo && (
						<div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: gradeInfo.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 18 }}>
							{myHome.grade}
						</div>
					)}
				</div>
				<div style={{ fontSize: 13, color: "#5C6B66" }}>보증금 {myHome.depositAmount.toLocaleString()}만원</div>
			</div>

			<div style={{ margin: "0 20px 16px", padding: 16, backgroundColor: "#fff", borderRadius: 14, border: "1px solid #E5E7E3" }}>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
					<div style={{ fontSize: 14, fontWeight: 700, color: "#1B3D35" }}>📅 계약 기간</div>
					<div style={{ fontSize: 14, fontWeight: 800, color: daysLeft <= 30 ? "#F44336" : daysLeft <= 90 ? "#FF9800" : "#1B3D35" }}>D-{daysLeft}</div>
				</div>
				<div style={{ position: "relative", marginBottom: 8 }}>
					<div style={{ height: 8, backgroundColor: "#E5E7E3", borderRadius: 4, overflow: "hidden" }}>
						<div style={{ height: 8, width: `${progressPct}%`, backgroundColor: daysLeft <= 30 ? "#F44336" : daysLeft <= 90 ? "#FF9800" : "#1B3D35", borderRadius: 4 }} />
					</div>
					<div style={{ position: "absolute", top: -3, left: `${progressPct}%`, transform: "translateX(-50%)", width: 14, height: 14, borderRadius: "50%", backgroundColor: "#fff", border: `3px solid ${daysLeft <= 30 ? "#F44336" : daysLeft <= 90 ? "#FF9800" : "#1B3D35"}` }} />
				</div>
				<div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
					<div><div style={{ color: "#9BA6A2" }}>계약 시작</div><div style={{ fontWeight: 600, color: "#5C6B66" }}>{fmtDate(startDate)}</div></div>
					<div style={{ textAlign: "center" }}><div style={{ color: "#1B3D35", fontWeight: 600 }}>오늘</div><div style={{ color: "#5C6B66" }}>{fmtDate(now)}</div></div>
					<div style={{ textAlign: "right" }}><div style={{ color: daysLeft <= 30 ? "#F44336" : "#9BA6A2" }}>계약 만료</div><div style={{ fontWeight: 600, color: daysLeft <= 30 ? "#F44336" : "#5C6B66" }}>{fmtDate(endDate)}</div></div>
				</div>
				{daysLeft <= 90 && daysLeft > 0 && (
					<div style={{ marginTop: 12, padding: 10, borderRadius: 8, backgroundColor: daysLeft <= 30 ? "#FFF5F5" : "#FFFBEB", fontSize: 12, color: daysLeft <= 30 ? "#F44336" : "#E65100", lineHeight: 1.5 }}>
						{daysLeft <= 30 ? "⚠️ 만료까지 30일 이내예요. 보증금 반환 절차를 시작하세요." : "📌 만료까지 90일 이내예요. 재계약 또는 이사 준비를 시작하세요."}
					</div>
				)}
			</div>

			{myHome.alerts.length > 0 && (
				<div style={{ padding: "0 20px" }}>
					<Text style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>이상 징후 알림</Text>
					{myHome.alerts.map((a) => (
						<div key={a.id} style={{ padding: 12, marginBottom: 8, borderRadius: 10, backgroundColor: a.severity === "high" ? "#FFF5F5" : a.severity === "medium" ? "#FFFBEB" : "#F0F4FF", borderLeft: `3px solid ${a.severity === "high" ? "#F44336" : a.severity === "medium" ? "#FFC107" : "#1B3D35"}` }}>
							<div style={{ fontWeight: 600, fontSize: 13 }}>{a.title}</div>
							<div style={{ fontSize: 12, color: "#5C6B66", marginTop: 4 }}>{a.description}</div>
						</div>
					))}
				</div>
			)}

			<div style={{ padding: "16px 20px" }}>
				<TextButton size="medium" color="#F44336" onClick={() => { if (confirm("정말 내 집 등록을 해제할까요?")) clearMyHome(); }}>
					등록 해제하기
				</TextButton>
			</div>
		</>
	);
}

/* ────────────────── History Tab ────────────────── */
function HistoryTab({ nav }: { nav: (p: Page) => void }) {
	const { diagnosisHistory, userType, setUserType } = useAppStore();

	return (
		<>
			<Top title={<Top.TitleParagraph size={22}>내 기록</Top.TitleParagraph>} />

			<div style={{ padding: "12px 20px", display: "flex", gap: 8 }}>
				{(
					[
						["seeker", "🔍 전세 구하는 중"],
						["resident", "🏠 거주 중"],
					] as const
				).map(([key, label]) => (
					<button key={key} onClick={() => setUserType(key)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1.5px solid ${userType === key ? "#1B3D35" : "#E5E7E3"}`, backgroundColor: userType === key ? "#E7EFEC" : "#FAF8F4", fontWeight: userType === key ? 700 : 400, color: userType === key ? "#1B3D35" : "#5C6B66", fontSize: 13, cursor: "pointer" }}>
						{label}
					</button>
				))}
			</div>

			{diagnosisHistory.length === 0 ? (
				<div style={{ textAlign: "center", padding: "48px 24px" }}>
					<div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
					<Text style={{ fontWeight: 700, fontSize: 16, display: "block" }}>진단 내역이 없어요</Text>
					<Text style={{ color: "#5C6B66", fontSize: 14, display: "block", marginTop: 8, marginBottom: 24 }}>전세 물건을 진단하면 여기에 기록돼요</Text>
				</div>
			) : (
				<List>
					{diagnosisHistory.map((d) => {
						const info = GRADE_INFO[d.grade];
						const displayGrade = getDisplayGrade(d.grade, d.scores.insuranceAvailable, d.insuranceEnrolled ?? false);
						return (
							<ListRow
								key={d.id}
								verticalPadding="large"
								onClick={() => nav({ type: "diagnosis-result", id: d.id })}
								left={
									<div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: info.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14 }}>
										{displayGrade}
									</div>
								}
								contents={
									<ListRow.Texts
										type="3RowTypeA"
										top={d.address.roadAddress}
										topProps={{ color: colors.grey800, fontWeight: "bold" }}
										middle={`보증금 ${d.depositAmount.toLocaleString()}만원`}
										middleProps={{ color: colors.grey600 }}
										bottom={`${new Date(d.createdAt).toLocaleDateString("ko-KR")} 진단 · ${d.score}점`}
										bottomProps={{ color: colors.grey600 }}
									/>
								}
							/>
						);
					})}
				</List>
			)}
		</>
	);
}
