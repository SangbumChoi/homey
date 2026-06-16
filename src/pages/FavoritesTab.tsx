import { useMemo, useState } from "react";
import { useAuctionStore } from "../store/useAuctionStore";
import { auctionKey, formatKRW, pricePerPyeong } from "../utils/auctionXlsx";
import { RecordSheet } from "../components/RecordSheet";
import {
	AuctionRow,
	DetailSheet,
	dDayLabel,
	displayName,
	isShareSale,
	ShareBadge,
	shortCourt,
} from "./AuctionPage";
import { StarIcon } from "../components/icons";
import type { AuctionItem } from "../types";

/** 관심 물건 탭 — 찜한 물건을 모아 보고 나란히 비교해요 */
export function FavoritesTab({ goAuction }: { goAuction?: () => void }) {
	const { items, favorites, toggleFavorite } = useAuctionStore();
	const [view, setView] = useState<"list" | "compare">("list");
	const [detail, setDetail] = useState<AuctionItem | null>(null);
	const [recordItem, setRecordItem] = useState<AuctionItem | null>(null);

	const favItems = useMemo(
		() =>
			items
				.filter((i) => favorites.includes(auctionKey(i)))
				.sort((a, b) => a.saleDate.localeCompare(b.saleDate)),
		[items, favorites],
	);

	return (
		<>
			<div style={{ padding: "20px 20px 0" }}>
				<div
					style={{
						fontSize: 22,
						fontWeight: 800,
						color: "#111",
						letterSpacing: "-0.5px",
					}}
				>
					관심 물건
				</div>
				<div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
					{favItems.length}건을 담아뒀어요
				</div>
			</div>

			{favItems.length === 0 ? (
				<div
					style={{
						textAlign: "center",
						padding: "64px 32px",
						color: "#8C8576",
					}}
				>
					<div style={{ marginBottom: 14 }}><StarIcon size={36} color="#8C8576" /></div>
					<div style={{ fontSize: 15, fontWeight: 700, color: "#555" }}>
						아직 담은 물건이 없어요
					</div>
					<div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
						경매 탭에서 별표(☆)를 누르면
						<br />
						여기에 모여요
					</div>
					{goAuction && (
						<button
							className="nb nb-press"
							onClick={goAuction}
							style={{
								marginTop: 16,
								padding: "10px 20px",
								borderRadius: 10,
								backgroundColor: "#FFD43B",
								color: "#111",
								fontSize: 13,
								fontWeight: 900,
								cursor: "pointer",
							}}
						>
							물건 보러 가기
						</button>
					)}
				</div>
			) : (
				<>
					{/* 목록 / 비교 전환 */}
					{favItems.length >= 2 && (
						<div
							style={{
								display: "flex",
								gap: 6,
								padding: "14px 20px 4px",
							}}
						>
							{(
								[
									["list", "목록"],
									["compare", "비교"],
								] as const
							).map(([key, label]) => (
								<button
									key={key}
									onClick={() => setView(key)}
									style={{
										padding: "7px 16px",
										borderRadius: 18,
										border:
											view === key
												? "2.5px solid #111"
												: "1.5px solid #C9C2AE",
										backgroundColor: view === key ? "#B6F09C" : "#fff",
										color: view === key ? "#111" : "#333",
										fontSize: 13,
										fontWeight: view === key ? 900 : 600,
										boxShadow: view === key ? "3px 3px 0 #111" : "none",
										cursor: "pointer",
									}}
								>
									{label}
								</button>
							))}
						</div>
					)}

					{view === "list" || favItems.length < 2 ? (
						<div style={{ paddingTop: 4, paddingBottom: 24 }}>
							{favItems.map((item) => (
								<AuctionRow
									key={auctionKey(item)}
									item={item}
									fav
									onToggleFav={() => toggleFavorite(auctionKey(item))}
									onClick={() => setDetail(item)}
								/>
							))}
						</div>
					) : (
						<CompareTable items={favItems} onSelect={setDetail} />
					)}
				</>
			)}

			<DetailSheet
				source="favorites"
				item={detail}
				fav={detail ? favorites.includes(auctionKey(detail)) : false}
				onToggleFav={() => detail && toggleFavorite(auctionKey(detail))}
				onWriteRecord={() => {
					setRecordItem(detail);
					setDetail(null);
				}}
				onClose={() => setDetail(null)}
			/>
			<RecordSheet
				itemKey={recordItem ? auctionKey(recordItem) : null}
				address={recordItem?.address ?? ""}
				onClose={() => setRecordItem(null)}
			/>
		</>
	);
}

/* ────────────────── 비교 표 ────────────────── */
const METRIC_LABELS = [
	"최저가",
	"평당가",
	"감정가 대비",
	"면적",
	"유찰",
	"매각기일",
	"법원",
] as const;

function CompareTable({
	items,
	onSelect,
}: {
	items: AuctionItem[];
	onSelect: (item: AuctionItem) => void;
}) {
	// 가장 좋은 값(최저가·평당가 최솟값)을 강조해요
	const minPrice = Math.min(...items.map((i) => i.minPrice));
	const minPer = Math.min(...items.map((i) => pricePerPyeong(i)));

	const cellStyle: React.CSSProperties = {
		padding: "10px 10px",
		fontSize: 12,
		borderBottom: "1px solid #E5DFC9",
		whiteSpace: "nowrap",
	};

	return (
		<div style={{ overflowX: "auto", padding: "12px 0 24px 20px" }}>
			<table style={{ borderCollapse: "collapse" }}>
				<thead>
					<tr>
						<th
							style={{
								...cellStyle,
								position: "sticky",
								left: 0,
								backgroundColor: "#FFFBEF",
								zIndex: 1,
							}}
						/>
						{items.map((item) => (
							<th
								key={auctionKey(item)}
								onClick={() => onSelect(item)}
								style={{
									...cellStyle,
									borderBottom: "2px solid #111",
									minWidth: 120,
									maxWidth: 140,
									whiteSpace: "normal",
									verticalAlign: "bottom",
									textAlign: "left",
									fontWeight: 700,
									color: "#111",
									lineHeight: 1.4,
									cursor: "pointer",
									wordBreak: "keep-all",
								}}
							>
								{displayName(item)}
									{isShareSale(item) && (
										<span style={{ display: "inline-block", marginTop: 4 }}>
											<ShareBadge />
										</span>
									)}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{METRIC_LABELS.map((metric) => (
						<tr key={metric}>
							<td
								style={{
									...cellStyle,
									position: "sticky",
									left: 0,
									backgroundColor: "#FFFBEF",
									zIndex: 1,
									color: "#8C8576",
									fontWeight: 600,
									paddingRight: 14,
								}}
							>
								{metric}
							</td>
							{items.map((item) => {
								const dday = dDayLabel(item.saleDate);
								const per = pricePerPyeong(item);
								let content: React.ReactNode;
								let color = "#111";
								let weight = 500;
								switch (metric) {
									case "최저가":
										content = formatKRW(item.minPrice);
										if (item.minPrice === minPrice) {
											color = "#1B7A40";
											weight = 900;
										}
										break;
									case "평당가":
										content = formatKRW(Math.round(per));
										if (per === minPer) {
											color = "#1B7A40";
											weight = 900;
										}
										break;
									case "감정가 대비":
										content = `${item.minRate}%`;
										if (item.minRate < 100) color = "#E03131";
										break;
									case "면적":
										content = `${item.areaPyeong}평`;
										break;
									case "유찰":
										content =
											item.failCount === 0 ? "신건" : `${item.failCount}회`;
										break;
									case "매각기일":
										content = (
											<>
												{item.saleDate.slice(5).replace("-", ".")}{" "}
												<span style={{ color: dday.color, fontWeight: 700 }}>
													{dday.label}
												</span>
											</>
										);
										break;
									case "법원":
										content = shortCourt(item.court);
										break;
								}
								return (
									<td
										key={auctionKey(item)}
										style={{ ...cellStyle, color, fontWeight: weight }}
									>
										{content}
									</td>
								);
							})}
						</tr>
					))}
				</tbody>
			</table>
			<div
				style={{
					fontSize: 11,
					color: "#8C8576",
					marginTop: 10,
					paddingRight: 20,
				}}
			>
				진초록은 비교 중 가장 낮은 가격이에요 · 물건명을 누르면 상세를 볼 수
				있어요
			</div>
		</div>
	);
}
