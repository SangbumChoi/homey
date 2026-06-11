import { useMemo, useState } from "react";
import { useAuctionStore } from "../store/useAuctionStore";
import { auctionKey, formatKRW, pricePerPyeong } from "../utils/auctionXlsx";
import { RecordSheet } from "../components/RecordSheet";
import {
	AuctionRow,
	DetailSheet,
	dDayLabel,
	displayName,
	shortCourt,
} from "./AuctionPage";
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
				<div style={{ fontSize: 20, fontWeight: 800, color: "#1B3D35" }}>
					관심 물건
				</div>
				<div style={{ fontSize: 12, color: "#5C6B66", marginTop: 2 }}>
					{favItems.length}건을 담아뒀어요
				</div>
			</div>

			{favItems.length === 0 ? (
				<div
					style={{
						textAlign: "center",
						padding: "64px 32px",
						color: "#9BA6A2",
					}}
				>
					<div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
					<div style={{ fontSize: 15, fontWeight: 700, color: "#5C6B66" }}>
						아직 담은 물건이 없어요
					</div>
					<div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
						경매 탭에서 별표(☆)를 누르면
						<br />
						여기에 모여요
					</div>
					{goAuction && (
						<button
							className="touchable"
							onClick={goAuction}
							style={{
								marginTop: 16,
								padding: "10px 20px",
								borderRadius: 10,
								border: "none",
								backgroundColor: "#1B3D35",
								color: "#fff",
								fontSize: 13,
								fontWeight: 700,
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
										border: `1px solid ${view === key ? "#1B3D35" : "#E5E7E3"}`,
										backgroundColor: view === key ? "#1B3D35" : "#fff",
										color: view === key ? "#fff" : "#1B3D35",
										fontSize: 13,
										fontWeight: view === key ? 700 : 500,
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
		borderBottom: "1px solid #F0F2EF",
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
								backgroundColor: "#fff",
								zIndex: 1,
							}}
						/>
						{items.map((item) => (
							<th
								key={auctionKey(item)}
								onClick={() => onSelect(item)}
								style={{
									...cellStyle,
									minWidth: 120,
									maxWidth: 140,
									whiteSpace: "normal",
									verticalAlign: "bottom",
									textAlign: "left",
									fontWeight: 700,
									color: "#1B3D35",
									lineHeight: 1.4,
									cursor: "pointer",
									wordBreak: "keep-all",
								}}
							>
								{displayName(item)}
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
									backgroundColor: "#fff",
									zIndex: 1,
									color: "#9BA6A2",
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
								let color = "#1B3D35";
								let weight = 500;
								switch (metric) {
									case "최저가":
										content = formatKRW(item.minPrice);
										if (item.minPrice === minPrice) {
											color = "#00B274";
											weight = 800;
										}
										break;
									case "평당가":
										content = formatKRW(Math.round(per));
										if (per === minPer) {
											color = "#00B274";
											weight = 800;
										}
										break;
									case "감정가 대비":
										content = `${item.minRate}%`;
										if (item.minRate < 100) color = "#F44336";
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
					color: "#9BA6A2",
					marginTop: 10,
					paddingRight: 20,
				}}
			>
				초록색은 비교 중 가장 낮은 가격이에요 · 물건명을 누르면 상세를 볼 수
				있어요
			</div>
		</div>
	);
}
