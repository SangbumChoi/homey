import { useCallback, useRef, useState } from "react";
import { Button, List, ListRow, Top, Text, TextButton } from "@toss/tds-mobile";
import { colors } from "@toss/tds-colors";
import { useAppStore } from "../store/useAppStore";
import { GRADE_INFO } from "../utils/grades";
import { searchAddress } from "../services/addressSearch";
import { calculateDiagnosis } from "../utils/diagnosis";
import { getRecentTrades, estimateRealTradePrice } from "../services/realEstateApi";
import type { Address, DiagnosisResult } from "../types";
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
			{/* ── Scrollable content ── */}
			<div style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
				{tab === "diagnosis" && <DiagnosisTab nav={nav} />}
				{tab === "myhome" && <MyhomeTab nav={nav} />}
				{tab === "history" && <HistoryTab nav={nav} />}
			</div>

			{/* ── Bottom tab bar ── */}
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
							<span
								style={{
									fontSize: 11,
									fontWeight: active ? 700 : 400,
									color,
								}}
							>
								{label}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}

/* ────────────────── Diagnosis Tab (inline single-page flow) ────────────────── */
function DiagnosisTab({ nav }: { nav: (p: Page) => void }) {
	const { diagnosisHistory, currentAddress, setCurrentAddress, addDiagnosis } = useAppStore();
	const recent = diagnosisHistory.slice(0, 3);

	// ── Address search state ──
	const [keyword, setKeyword] = useState("");
	const [searchResults, setSearchResults] = useState<Address[]>([]);
	const [searching, setSearching] = useState(false);
	const [searched, setSearched] = useState(false);
	const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
	const [detail, setDetail] = useState("");

	// ── Deposit state ──
	const [deposit, setDeposit] = useState("");
	const [rent, setRent] = useState("");

	// ── Doc state ──
	const fileRef = useRef<HTMLInputElement>(null);
	const [fileName, setFileName] = useState<string | null>(null);
	const [diagnosing, setDiagnosing] = useState(false);

	// ── Derived ──
	const addressConfirmed = !!selectedAddress && !!currentAddress;
	const fmt = (v: string) => {
		const n = v.replace(/[^0-9]/g, "");
		return n.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	};
	const rawDeposit = parseInt(deposit.replace(/,/g, ""), 10);
	const depositValid = deposit.length > 0 && !isNaN(rawDeposit) && rawDeposit > 0;

	// Refs for scroll-into-view
	const depositRef = useRef<HTMLDivElement>(null);
	const docRef = useRef<HTMLDivElement>(null);

	const handleSearch = useCallback(async () => {
		const q = keyword.trim();
		if (!q || q.length < 2) return;
		setSelectedAddress(null);
		setDetail("");
		setCurrentAddress(null);
		setDeposit("");
		setRent("");
		setFileName(null);
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

	const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
		const f = e.target.files?.[0];
		if (f) setFileName(f.name);
	};

	const handleDiagnose = async () => {
		if (!currentAddress) return;
		setDiagnosing(true);
		try {
			const trades = await getRecentTrades();
			const realTradePrice = estimateRealTradePrice(trades);
			const rentNum = parseInt(rent.replace(/,/g, ""), 10);
			const result = calculateDiagnosis({
				address: currentAddress,
				depositAmount: rawDeposit,
				monthlyRent: rentNum || 0,
				seniorDebt: 0,
				hasRegistrationDoc: !!fileName,
				realTradePrice,
			});
			const full: DiagnosisResult = {
				...result,
				address: currentAddress,
				id: Date.now().toString(),
				createdAt: new Date().toISOString(),
			};
			addDiagnosis(full);
			// Reset flow state
			setSelectedAddress(null);
			setDetail("");
			setKeyword("");
			setDeposit("");
			setRent("");
			setFileName(null);
			setSearched(false);
			setCurrentAddress(null);
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
		setSearched(false);
		setCurrentAddress(null);
	};

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
				{/* ── STEP 1: Address search ── */}
				<div style={{ padding: 16, backgroundColor: "#fff", borderRadius: 14, border: "1px solid #E5E7E3" }}>
					<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
						<div style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: addressConfirmed ? "#1B3D35" : "#E5E7E3", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700 }}>
							{addressConfirmed ? "✓" : "1"}
						</div>
						<span style={{ fontSize: 15, fontWeight: 700, color: "#1B3D35" }}>주소 검색</span>
					</div>

					{!addressConfirmed ? (
						<>
							<div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
								<input
									type="text"
									value={keyword}
									onChange={(e) => setKeyword(e.target.value)}
									onKeyDown={(e) => e.key === "Enter" && handleSearch()}
									placeholder="주소 또는 건물명 입력"
									style={{
										flex: 1,
										padding: "12px 14px",
										borderRadius: 10,
										border: "1.5px solid #E5E7E3",
										fontSize: 14,
										outline: "none",
									}}
								/>
								<Button size="small" variant="weak" loading={searching} onClick={handleSearch}>
									검색
								</Button>
							</div>

							{/* Selected but not confirmed yet → detail input */}
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

							{/* Search results list */}
							{!selectedAddress && searched && (
								<div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
									{searchResults.length === 0 && !searching ? (
										<div style={{ textAlign: "center", padding: 16, color: "#9BA6A2", fontSize: 13 }}>검색 결과가 없어요</div>
									) : (
										searchResults.map((addr, i) => (
											<div
												key={i}
												onClick={() => handleSelectAddress(addr)}
												style={{ padding: 12, backgroundColor: "#FAF8F4", borderRadius: 8, cursor: "pointer", border: "1px solid #E5E7E3" }}
											>
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

				{/* ── STEP 2: Deposit/rent (shows after address confirmed) ── */}
				{addressConfirmed && (
					<div ref={depositRef} style={{ padding: 16, backgroundColor: "#fff", borderRadius: 14, border: "1px solid #E5E7E3" }}>
						<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
							<div style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: depositValid ? "#1B3D35" : "#E5E7E3", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700 }}>
								{depositValid ? "✓" : "2"}
							</div>
							<span style={{ fontSize: 15, fontWeight: 700, color: "#1B3D35" }}>보증금 정보</span>
						</div>

						<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
							<div>
								<label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
									보증금 <span style={{ color: "#F44336" }}>*</span>
								</label>
								<div style={{ display: "flex", alignItems: "center", border: "1.5px solid #E5E7E3", borderRadius: 10, backgroundColor: "#fff" }}>
									<input
										type="text"
										inputMode="numeric"
										value={deposit}
										onChange={(e) => setDeposit(fmt(e.target.value))}
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
								<div style={{ display: "flex", alignItems: "center", border: "1.5px solid #E5E7E3", borderRadius: 10, backgroundColor: "#fff" }}>
									<input
										type="text"
										inputMode="numeric"
										value={rent}
										onChange={(e) => setRent(fmt(e.target.value))}
										placeholder="예) 50"
										style={{ flex: 1, padding: 12, border: "none", outline: "none", fontSize: 15, borderRadius: 10 }}
									/>
									<span style={{ padding: "0 12px", color: "#5C6B66", fontSize: 13 }}>만원/월</span>
								</div>
							</div>

							{depositValid && (
								<Button size="small" variant="weak" onClick={handleDepositNext}>
									다음 단계로
								</Button>
							)}
						</div>
					</div>
				)}

				{/* ── STEP 3: Doc upload + diagnose (shows after deposit entered) ── */}
				{addressConfirmed && depositValid && (
					<div ref={docRef} style={{ padding: 16, backgroundColor: "#fff", borderRadius: 14, border: "1px solid #E5E7E3" }}>
						<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
							<div style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: "#E5E7E3", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700 }}>3</div>
							<span style={{ fontSize: 15, fontWeight: 700, color: "#1B3D35" }}>등기부등본 (선택)</span>
						</div>

						<input ref={fileRef} type="file" accept="application/pdf,image/*" style={{ display: "none" }} onChange={handleFile} />

						{!fileName ? (
							<div
								onClick={() => fileRef.current?.click()}
								style={{ border: "2px dashed #E5E7E3", borderRadius: 12, padding: "28px 16px", textAlign: "center", cursor: "pointer", backgroundColor: "#FAF8F4" }}
							>
								<div style={{ fontSize: 28, marginBottom: 6 }}>📁</div>
								<div style={{ fontSize: 14, fontWeight: 600 }}>등기부등본 업로드하기</div>
								<div style={{ fontSize: 12, color: "#5C6B66", marginTop: 4 }}>PDF 또는 이미지 파일</div>
							</div>
						) : (
							<div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, backgroundColor: "#F0FFF4", borderRadius: 10, border: "1.5px solid #48BB78" }}>
								<span style={{ fontSize: 18 }}>✅</span>
								<div style={{ flex: 1 }}>
									<div style={{ fontSize: 12, fontWeight: 600 }}>{fileName}</div>
									<div style={{ fontSize: 11, color: "#276749", marginTop: 2 }}>업로드 완료</div>
								</div>
								<button
									onClick={() => { setFileName(null); if (fileRef.current) fileRef.current.value = ""; }}
									style={{ background: "none", border: "none", fontSize: 14, color: "#5C6B66", cursor: "pointer" }}
								>✕</button>
							</div>
						)}

						<div style={{ marginTop: 10, backgroundColor: "#FFF8E1", borderRadius: 8, padding: 10 }}>
							<div style={{ fontSize: 11, color: "#F57F17", lineHeight: 1.5 }}>
								📌 등기부등본 없이도 진단할 수 있어요. 선순위 채권 항목은 중립값으로 처리돼요.
							</div>
						</div>

						<div style={{ marginTop: 14 }}>
							<Button color="dark" onClick={handleDiagnose} loading={diagnosing}>
								{fileName ? "진단 시작하기" : "등기부등본 없이 진단하기"}
							</Button>
						</div>
					</div>
				)}

				{/* ── Grade info ── */}
				<div style={{ padding: 16, backgroundColor: "#fff", borderRadius: 14, border: "1px solid #E5E7E3" }}>
					<div style={{ fontSize: 14, fontWeight: 700, color: "#1B3D35", marginBottom: 10 }}>안전 등급 기준</div>
					<div style={{ display: "flex", gap: 6, justifyContent: "space-between" }}>
						{Object.entries(GRADE_INFO).map(([g, info]) => (
							<div key={g} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
								<div style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: info.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 15 }}>{g}</div>
								<span style={{ fontSize: 9, color: "#5C6B66", textAlign: "center" }}>{info.description}</span>
							</div>
						))}
					</div>
				</div>

				{/* ── Recent diagnoses ── */}
				{recent.length > 0 && (
					<div>
						<div style={{ fontSize: 14, fontWeight: 700, color: "#1B3D35", marginBottom: 8, padding: "0 4px" }}>최근 진단 내역</div>
						<List>
							{recent.map((d) => {
								const info = GRADE_INFO[d.grade];
								return (
									<ListRow
										key={d.id}
										verticalPadding="large"
										onClick={() => nav({ type: "diagnosis-result", id: d.id })}
										left={
											<div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: info.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16 }}>{d.grade}</div>
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

/* ────────────────── MyHome Tab ────────────────── */
function MyhomeTab({ nav }: { nav: (p: Page) => void }) {
	const { myHome, clearMyHome } = useAppStore();

	if (!myHome) {
		return (
			<div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 32px", textAlign: "center" }}>
				<div style={{
					width: 80,
					height: 80,
					borderRadius: 20,
					backgroundColor: "#E7EFEC",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					fontSize: 36,
					marginBottom: 20,
				}}>
					🏠
				</div>
				<div style={{ fontSize: 18, fontWeight: 700, color: "#1B3D35", marginBottom: 8 }}>
					아직 등록된 집이 없어요
				</div>
				<div style={{ fontSize: 14, color: "#5C6B66", lineHeight: 1.6, marginBottom: 8 }}>
					내 집을 등록하면{"\n"}이상 징후를 실시간으로 알려드려요
				</div>

				{/* Feature preview cards */}
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

				<Button color="dark" onClick={() => nav({ type: "diagnosis-search", mode: "myhome" })}>
					내 집 등록하기
				</Button>
			</div>
		);
	}

	const daysLeft = Math.ceil(
		(new Date(myHome.contractEndDate).getTime() - Date.now()) / 86400000,
	);
	const gradeInfo = myHome.grade ? GRADE_INFO[myHome.grade] : null;

	// Timeline calculations
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

			{/* Home info card */}
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

			{/* Contract lifecycle timeline */}
			<div style={{ margin: "0 20px 16px", padding: 16, backgroundColor: "#fff", borderRadius: 14, border: "1px solid #E5E7E3" }}>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
					<div style={{ fontSize: 14, fontWeight: 700, color: "#1B3D35" }}>📅 계약 기간</div>
					<div style={{ fontSize: 14, fontWeight: 800, color: daysLeft <= 30 ? "#F44336" : daysLeft <= 90 ? "#FF9800" : "#1B3D35" }}>D-{daysLeft}</div>
				</div>
				<div style={{ position: "relative", marginBottom: 8 }}>
					<div style={{ height: 8, backgroundColor: "#E5E7E3", borderRadius: 4, overflow: "hidden" }}>
						<div style={{ height: 8, width: `${progressPct}%`, backgroundColor: daysLeft <= 30 ? "#F44336" : daysLeft <= 90 ? "#FF9800" : "#1B3D35", borderRadius: 4, transition: "width 0.3s" }} />
					</div>
					<div style={{ position: "absolute", top: -3, left: `${progressPct}%`, transform: "translateX(-50%)", width: 14, height: 14, borderRadius: "50%", backgroundColor: "#fff", border: `3px solid ${daysLeft <= 30 ? "#F44336" : daysLeft <= 90 ? "#FF9800" : "#1B3D35"}` }} />
				</div>
				<div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
					<div>
						<div style={{ color: "#9BA6A2" }}>계약 시작</div>
						<div style={{ fontWeight: 600, color: "#5C6B66" }}>{fmtDate(startDate)}</div>
					</div>
					<div style={{ textAlign: "center" }}>
						<div style={{ color: "#1B3D35", fontWeight: 600 }}>오늘</div>
						<div style={{ color: "#5C6B66" }}>{fmtDate(now)}</div>
					</div>
					<div style={{ textAlign: "right" }}>
						<div style={{ color: daysLeft <= 30 ? "#F44336" : "#9BA6A2" }}>계약 만료</div>
						<div style={{ fontWeight: 600, color: daysLeft <= 30 ? "#F44336" : "#5C6B66" }}>{fmtDate(endDate)}</div>
					</div>
				</div>
				{daysLeft <= 90 && daysLeft > 0 && (
					<div style={{ marginTop: 12, padding: 10, borderRadius: 8, backgroundColor: daysLeft <= 30 ? "#FFF5F5" : "#FFFBEB", fontSize: 12, color: daysLeft <= 30 ? "#F44336" : "#E65100", lineHeight: 1.5 }}>
						{daysLeft <= 30
							? "⚠️ 만료까지 30일 이내예요. 보증금 반환 절차를 시작하세요."
							: "📌 만료까지 90일 이내예요. 재계약 또는 이사 준비를 시작하세요."}
					</div>
				)}
			</div>

			{/* Alerts */}
			{myHome.alerts.length > 0 && (
				<div style={{ padding: "0 20px" }}>
					<Text style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>이상 징후 알림</Text>
					{myHome.alerts.map((a) => (
						<div
							key={a.id}
							style={{
								padding: 12,
								marginBottom: 8,
								borderRadius: 10,
								backgroundColor: a.severity === "high" ? "#FFF5F5" : a.severity === "medium" ? "#FFFBEB" : "#F0F4FF",
								borderLeft: `3px solid ${a.severity === "high" ? "#F44336" : a.severity === "medium" ? "#FFC107" : "#1B3D35"}`,
							}}
						>
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

			{/* User type toggle */}
			<div style={{ padding: "12px 20px", display: "flex", gap: 8 }}>
				{(
					[
						["seeker", "🔍 전세 구하는 중"],
						["resident", "🏠 거주 중"],
					] as const
				).map(([key, label]) => (
					<button
						key={key}
						onClick={() => setUserType(key)}
						style={{
							flex: 1,
							padding: "10px 0",
							borderRadius: 10,
							border: `1.5px solid ${userType === key ? "#1B3D35" : "#E5E7E3"}`,
							backgroundColor: userType === key ? "#E7EFEC" : "#FAF8F4",
							fontWeight: userType === key ? 700 : 400,
							color: userType === key ? "#1B3D35" : "#5C6B66",
							fontSize: 13,
							cursor: "pointer",
						}}
					>
						{label}
					</button>
				))}
			</div>

			{diagnosisHistory.length === 0 ? (
				<div style={{ textAlign: "center", padding: "48px 24px" }}>
					<div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
					<Text style={{ fontWeight: 700, fontSize: 16, display: "block" }}>진단 내역이 없어요</Text>
					<Text style={{ color: "#5C6B66", fontSize: 14, display: "block", marginTop: 8, marginBottom: 24 }}>
						전세 물건을 진단하면 여기에 기록돼요
					</Text>
				</div>
			) : (
				<List>
					{diagnosisHistory.map((d) => {
						const info = GRADE_INFO[d.grade];
						return (
							<ListRow
								key={d.id}
								verticalPadding="large"
								onClick={() => nav({ type: "diagnosis-result", id: d.id })}
								left={
									<div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: info.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16 }}>{d.grade}</div>
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
