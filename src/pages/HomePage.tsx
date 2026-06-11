import { useState } from "react";
import { AuctionTab, type AuctionPreset } from "./AuctionPage";
import { DashboardTab } from "./DashboardTab";
import { FavoritesTab } from "./FavoritesTab";
import { RecordsTab } from "./RecordsTab";

export type HomeTab = "home" | "auction" | "favorites" | "history";

interface Props {
	activeTab?: HomeTab;
}

export function HomePage({ activeTab }: Props) {
	const [tab, setTab] = useState<HomeTab>(activeTab ?? "home");
	const [auctionPreset, setAuctionPreset] = useState<AuctionPreset | null>(
		null,
	);

	const goAuction = (preset?: AuctionPreset) => {
		setAuctionPreset(preset ?? null);
		setTab("auction");
	};

	return (
		<div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
			<div
				style={{
					flex: 1,
					overflowY: "auto",
					paddingBottom: 8,
					backgroundColor: "#FFFBEF",
				}}
			>
				{tab === "home" && (
					<DashboardTab
						goAuction={goAuction}
						goFavorites={() => setTab("favorites")}
					/>
				)}
				{tab === "auction" && (
					<AuctionTab
						preset={auctionPreset}
						onPresetApplied={() => setAuctionPreset(null)}
					/>
				)}
				{tab === "favorites" && <FavoritesTab goAuction={() => goAuction()} />}
				{tab === "history" && <RecordsTab />}
			</div>

			{/* Bottom tab bar */}
			<div
				style={{
					display: "flex",
					backgroundColor: "#fff",
					borderTop: "2.5px solid #111",
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
					const color = active ? "#111" : "#A9A28F";
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
									fontWeight: active ? 900 : 600,
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
