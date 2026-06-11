import { useMemo, useState } from "react";
import { useAuctionStore } from "../store/useAuctionStore";
import { auctionKey, formatKRW } from "../utils/auctionXlsx";
import { RecordSheet } from "../components/RecordSheet";
import { DetailSheet, rowTitle } from "./AuctionPage";
import type { AuctionItem, AuctionRecord } from "../types";

const RESULT_BADGE: Record<
	AuctionRecord["result"],
	{ label: string; bg: string; color: string } | null
> = {
	none: null,
	won: { label: "낙찰", bg: "#E6F7EF", color: "#00B274" },
	lost: { label: "패찰", bg: "#F0F2EF", color: "#5C6B66" },
};

/** 기록 탭 — 물건별 임장 메모와 입찰 결과를 모아 봐요 */
export function RecordsTab() {
	const { items, records, favorites, toggleFavorite } = useAuctionStore();
	const [editKey, setEditKey] = useState<string | null>(null);
	const [detail, setDetail] = useState<AuctionItem | null>(null);

	const itemByKey = useMemo(
		() => new Map(items.map((i) => [auctionKey(i), i])),
		[items],
	);

	const entries = useMemo(
		() =>
			Object.entries(records).sort(([, a], [, b]) =>
				b.updatedAt.localeCompare(a.updatedAt),
			),
		[records],
	);

	/* 입찰 성과 요약 */
	const bidCount = entries.filter(([, r]) => r.result !== "none").length;
	const wonCount = entries.filter(([, r]) => r.result === "won").length;

	const editAddress =
		editKey !== null
			? (itemByKey.get(editKey)?.address ??
				records[editKey]?.addressSnapshot ??
				"")
			: "";

	return (
		<>
			<div style={{ padding: "20px 20px 0" }}>
				<div
					style={{
						fontSize: 22,
						fontWeight: 800,
						color: "#1B3D35",
						letterSpacing: "-0.5px",
					}}
				>
					임장·입찰 기록
				</div>
				<div style={{ fontSize: 12, color: "#5C6B66", marginTop: 2 }}>
					{entries.length > 0
						? `기록 ${entries.length}건 · 입찰 ${bidCount}건 · 낙찰 ${wonCount}건`
						: "다녀온 물건과 입찰 결과를 남겨보세요"}
				</div>
			</div>

			{entries.length === 0 ? (
				<div
					style={{
						textAlign: "center",
						padding: "64px 32px",
						color: "#9BA6A2",
					}}
				>
					<div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
					<div style={{ fontSize: 15, fontWeight: 700, color: "#5C6B66" }}>
						아직 기록이 없어요
					</div>
					<div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
						경매 물건 상세에서 ‘임장·입찰 기록’을
						<br />
						누르면 여기에 쌓여요
					</div>
				</div>
			) : (
				<div style={{ paddingTop: 8, paddingBottom: 24 }}>
					{entries.map(([key, record]) => {
						const item = itemByKey.get(key);
						const badge = RESULT_BADGE[record.result];
						const date = new Date(record.updatedAt);
						return (
							<div
								key={key}
								className="touchable"
								onClick={() => setEditKey(key)}
								style={{
									padding: "14px 20px",
									borderBottom: "1px solid #F0F2EF",
									cursor: "pointer",
								}}
							>
								{/* 제목 + 결과 배지 */}
								<div
									style={{
										display: "flex",
										alignItems: "flex-start",
										gap: 8,
										marginBottom: 4,
									}}
								>
									<div
										style={{
											flex: 1,
											fontSize: 14,
											fontWeight: 700,
											color: "#1B3D35",
											lineHeight: 1.45,
											wordBreak: "keep-all",
										}}
									>
										{item ? rowTitle(item) : record.addressSnapshot}
									</div>
									{badge && (
										<span
											style={{
												fontSize: 11,
												fontWeight: 700,
												color: badge.color,
												backgroundColor: badge.bg,
												borderRadius: 6,
												padding: "3px 8px",
												flexShrink: 0,
											}}
										>
											{badge.label}
										</span>
									)}
								</div>

								{/* 입찰 정보 */}
								{record.bidAmount !== null && (
									<div
										style={{
											fontSize: 13,
											color: "#1B3D35",
											fontWeight: 600,
											marginBottom: 3,
										}}
									>
										내 입찰가 {formatKRW(record.bidAmount)}
										{record.winningPrice !== null &&
											` · 낙찰가 ${formatKRW(record.winningPrice)}`}
									</div>
								)}

								{/* 메모 미리보기 */}
								{record.memo && (
									<div
										style={{
											fontSize: 13,
											color: "#5C6B66",
											lineHeight: 1.5,
											display: "-webkit-box",
											WebkitLineClamp: 2,
											WebkitBoxOrient: "vertical",
											overflow: "hidden",
										}}
									>
										{record.memo}
									</div>
								)}

								{/* 날짜 + 물건 상세 링크 */}
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										marginTop: 6,
									}}
								>
									<span style={{ fontSize: 11, color: "#9BA6A2" }}>
										{date.toLocaleDateString("ko-KR")} 기록
									</span>
									{item && (
										<button
											onClick={(e) => {
												e.stopPropagation();
												setDetail(item);
											}}
											style={{
												border: "none",
												background: "none",
												fontSize: 12,
												color: "#5C6B66",
												cursor: "pointer",
												padding: 0,
											}}
										>
											물건 정보 →
										</button>
									)}
								</div>
							</div>
						);
					})}
				</div>
			)}

			<RecordSheet
				itemKey={editKey}
				address={editAddress}
				onClose={() => setEditKey(null)}
			/>
			<DetailSheet
				item={detail}
				fav={detail ? favorites.includes(auctionKey(detail)) : false}
				onToggleFav={() => detail && toggleFavorite(auctionKey(detail))}
				onClose={() => setDetail(null)}
			/>
		</>
	);
}
