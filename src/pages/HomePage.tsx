import { useState } from "react";
import { Button, Text, TextButton, Top } from "@toss/tds-mobile";
import { useAppStore } from "../store/useAppStore";
import { GRADE_INFO } from "../utils/grades";
import type { Page } from "../App";
import { AuctionTab, type AuctionPreset } from "./AuctionPage";
import { DashboardTab } from "./DashboardTab";
import { FavoritesTab } from "./FavoritesTab";
import { RecordsTab } from "./RecordsTab";

export type HomeTab = "home" | "auction" | "favorites" | "history";

interface Props {
	nav: (p: Page) => void;
	activeTab?: HomeTab;
}

export function HomePage({ nav, activeTab }: Props) {
	const [tab, setTab] = useState<HomeTab>(activeTab ?? "home");
	const [auctionPreset, setAuctionPreset] = useState<AuctionPreset | null>(
		null,
	);
	const [showMyhome, setShowMyhome] = useState(false);

	const goAuction = (preset?: AuctionPreset) => {
		setAuctionPreset(preset ?? null);
		setTab("auction");
	};

	/* 내 집 지키기 — 대시보드에서 진입하는 보조 화면 */
	if (showMyhome) {
		return (
			<div
				style={{ display: "flex", flexDirection: "column", height: "100vh" }}
			>
				<div
					style={{
						padding: "14px 20px 0",
						flexShrink: 0,
					}}
				>
					<TextButton size="small" onClick={() => setShowMyhome(false)}>
						← 홈으로
					</TextButton>
				</div>
				<div style={{ flex: 1, overflowY: "auto", paddingBottom: 24 }}>
					<MyhomeTab nav={nav} />
				</div>
			</div>
		);
	}

	return (
		<div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
			<div style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
				{tab === "home" && (
					<DashboardTab
						nav={nav}
						goAuction={goAuction}
						openMyhome={() => setShowMyhome(true)}
					/>
				)}
				{tab === "auction" && (
					<AuctionTab
						preset={auctionPreset}
						onPresetApplied={() => setAuctionPreset(null)}
					/>
				)}
				{tab === "favorites" && <FavoritesTab />}
				{tab === "history" && <RecordsTab />}
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
						["home", "홈"],
						["auction", "경매"],
						["favorites", "관심"],
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
							<svg
								width="22"
								height="22"
								viewBox="0 0 24 24"
								fill="none"
								stroke={color}
								strokeWidth={active ? "2" : "1.5"}
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								{key === "home" && (
									<>
										<path d="M4 10L12 4l8 6v9a1 1 0 01-1 1H5a1 1 0 01-1-1z" />
										<path d="M9 20v-6h6v6" />
										<path d="M2 12l10-8 10 8" />
									</>
								)}
								{key === "auction" && (
									<>
										{/* gavel */}
										<path d="M14 4l6 6" />
										<path d="M11 7l6 6" />
										<path d="M12.5 5.5l4-1.5 3.5 3.5-1.5 4z" />
										<path d="M11.5 9.5L4 17l3 3 7.5-7.5" />
										<line x1="3" y1="22" x2="13" y2="22" />
									</>
								)}
								{key === "favorites" && (
									<path
										d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"
										fill={active ? color : "none"}
									/>
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

/* ────────────────── MyHome (내 집 지키기) ────────────────── */
function MyhomeTab({ nav }: { nav: (p: Page) => void }) {
	const { myHome, clearMyHome } = useAppStore();

	if (!myHome) {
		return (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					padding: "60px 32px",
					textAlign: "center",
				}}
			>
				<div
					style={{
						width: 80,
						height: 80,
						borderRadius: 20,
						backgroundColor: "#E7EFEC",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						fontSize: 36,
						marginBottom: 20,
					}}
				>
					🏠
				</div>
				<div
					style={{
						fontSize: 18,
						fontWeight: 700,
						color: "#1B3D35",
						marginBottom: 8,
					}}
				>
					아직 등록된 집이 없어요
				</div>
				<div
					style={{
						fontSize: 14,
						color: "#5C6B66",
						lineHeight: 1.6,
						marginBottom: 8,
					}}
				>
					내 집을 등록하면{"\n"}이상 징후를 실시간으로 알려드려요
				</div>

				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 10,
						width: "100%",
						margin: "16px 0 24px",
						textAlign: "left",
					}}
				>
					{[
						{
							icon: "📊",
							title: "근저당권 추가 설정 감지",
							desc: "새로운 담보가 설정되면 즉시 알려드려요",
						},
						{
							icon: "👤",
							title: "소유자 변경 모니터링",
							desc: "집주인이 바뀌면 바로 알려드려요",
						},
						{
							icon: "⚖️",
							title: "경매 개시 감지",
							desc: "경매가 시작되면 긴급 알림을 보내드려요",
						},
						{
							icon: "📅",
							title: "계약 만료 D-day 알림",
							desc: "만료일이 다가오면 미리 알려드려요",
						},
					].map((item) => (
						<div
							key={item.title}
							style={{
								display: "flex",
								gap: 12,
								padding: "12px 14px",
								backgroundColor: "#FAF8F4",
								borderRadius: 10,
							}}
						>
							<span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
							<div>
								<div
									style={{ fontSize: 13, fontWeight: 600, color: "#1B3D35" }}
								>
									{item.title}
								</div>
								<div style={{ fontSize: 12, color: "#5C6B66", marginTop: 2 }}>
									{item.desc}
								</div>
							</div>
						</div>
					))}
				</div>

				<Button
					color="dark"
					onClick={() => nav({ type: "diagnosis-search", mode: "myhome" })}
				>
					내 집 등록하기
				</Button>
			</div>
		);
	}

	const daysLeft = Math.ceil(
		(new Date(myHome.contractEndDate).getTime() - Date.now()) / 86400000,
	);
	const gradeInfo = myHome.grade ? GRADE_INFO[myHome.grade] : null;
	const startDate = new Date(myHome.contractStartDate);
	const endDate = new Date(myHome.contractEndDate);
	const now = new Date();
	const totalDays = Math.ceil(
		(endDate.getTime() - startDate.getTime()) / 86400000,
	);
	const elapsedDays = Math.ceil(
		(now.getTime() - startDate.getTime()) / 86400000,
	);
	const progressPct = Math.max(
		0,
		Math.min(100, Math.round((elapsedDays / totalDays) * 100)),
	);
	const fmtDate = (d: Date) =>
		`${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;

	return (
		<>
			<Top
				title={<Top.TitleParagraph size={22}>내 집 지키기</Top.TitleParagraph>}
			/>

			<div
				style={{
					margin: "16px 20px",
					padding: 16,
					backgroundColor: "#fff",
					borderRadius: 14,
					border: "1px solid #E5E7E3",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: 12,
					}}
				>
					<div>
						<div style={{ fontSize: 11, color: "#1B3D35", fontWeight: 600 }}>
							{myHome.address.buildingName || "내 집"}
						</div>
						<div style={{ fontSize: 14, fontWeight: 600 }}>
							{myHome.address.roadAddress}
						</div>
					</div>
					{gradeInfo && (
						<div
							style={{
								width: 40,
								height: 40,
								borderRadius: 12,
								backgroundColor: gradeInfo.color,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								color: "#fff",
								fontWeight: 800,
								fontSize: 18,
							}}
						>
							{myHome.grade}
						</div>
					)}
				</div>
				<div style={{ fontSize: 13, color: "#5C6B66" }}>
					보증금 {myHome.depositAmount.toLocaleString()}만원
				</div>
			</div>

			<div
				style={{
					margin: "0 20px 16px",
					padding: 16,
					backgroundColor: "#fff",
					borderRadius: 14,
					border: "1px solid #E5E7E3",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: 12,
					}}
				>
					<div style={{ fontSize: 14, fontWeight: 700, color: "#1B3D35" }}>
						📅 계약 기간
					</div>
					<div
						style={{
							fontSize: 14,
							fontWeight: 800,
							color:
								daysLeft <= 30
									? "#F44336"
									: daysLeft <= 90
										? "#FF9800"
										: "#1B3D35",
						}}
					>
						D-{daysLeft}
					</div>
				</div>
				<div style={{ position: "relative", marginBottom: 8 }}>
					<div
						style={{
							height: 8,
							backgroundColor: "#E5E7E3",
							borderRadius: 4,
							overflow: "hidden",
						}}
					>
						<div
							style={{
								height: 8,
								width: `${progressPct}%`,
								backgroundColor:
									daysLeft <= 30
										? "#F44336"
										: daysLeft <= 90
											? "#FF9800"
											: "#1B3D35",
								borderRadius: 4,
							}}
						/>
					</div>
					<div
						style={{
							position: "absolute",
							top: -3,
							left: `${progressPct}%`,
							transform: "translateX(-50%)",
							width: 14,
							height: 14,
							borderRadius: "50%",
							backgroundColor: "#fff",
							border: `3px solid ${daysLeft <= 30 ? "#F44336" : daysLeft <= 90 ? "#FF9800" : "#1B3D35"}`,
						}}
					/>
				</div>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						fontSize: 11,
					}}
				>
					<div>
						<div style={{ color: "#9BA6A2" }}>계약 시작</div>
						<div style={{ fontWeight: 600, color: "#5C6B66" }}>
							{fmtDate(startDate)}
						</div>
					</div>
					<div style={{ textAlign: "center" }}>
						<div style={{ color: "#1B3D35", fontWeight: 600 }}>오늘</div>
						<div style={{ color: "#5C6B66" }}>{fmtDate(now)}</div>
					</div>
					<div style={{ textAlign: "right" }}>
						<div style={{ color: daysLeft <= 30 ? "#F44336" : "#9BA6A2" }}>
							계약 만료
						</div>
						<div
							style={{
								fontWeight: 600,
								color: daysLeft <= 30 ? "#F44336" : "#5C6B66",
							}}
						>
							{fmtDate(endDate)}
						</div>
					</div>
				</div>
				{daysLeft <= 90 && daysLeft > 0 && (
					<div
						style={{
							marginTop: 12,
							padding: 10,
							borderRadius: 8,
							backgroundColor: daysLeft <= 30 ? "#FFF5F5" : "#FFFBEB",
							fontSize: 12,
							color: daysLeft <= 30 ? "#F44336" : "#E65100",
							lineHeight: 1.5,
						}}
					>
						{daysLeft <= 30
							? "⚠️ 만료까지 30일 이내예요. 보증금 반환 절차를 시작하세요."
							: "📌 만료까지 90일 이내예요. 재계약 또는 이사 준비를 시작하세요."}
					</div>
				)}
			</div>

			{myHome.alerts.length > 0 && (
				<div style={{ padding: "0 20px" }}>
					<Text style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
						이상 징후 알림
					</Text>
					{myHome.alerts.map((a) => (
						<div
							key={a.id}
							style={{
								padding: 12,
								marginBottom: 8,
								borderRadius: 10,
								backgroundColor:
									a.severity === "high"
										? "#FFF5F5"
										: a.severity === "medium"
											? "#FFFBEB"
											: "#F0F4FF",
								borderLeft: `3px solid ${a.severity === "high" ? "#F44336" : a.severity === "medium" ? "#FFC107" : "#1B3D35"}`,
							}}
						>
							<div style={{ fontWeight: 600, fontSize: 13 }}>{a.title}</div>
							<div style={{ fontSize: 12, color: "#5C6B66", marginTop: 4 }}>
								{a.description}
							</div>
						</div>
					))}
				</div>
			)}

			<div style={{ padding: "16px 20px" }}>
				<TextButton
					size="medium"
					color="#F44336"
					onClick={() => {
						if (confirm("정말 내 집 등록을 해제할까요?")) clearMyHome();
					}}
				>
					등록 해제하기
				</TextButton>
			</div>
		</>
	);
}
