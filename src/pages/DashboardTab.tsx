import { useMemo, useState } from "react";
import { useAuctionStore } from "../store/useAuctionStore";
import { auctionKey, formatKRW } from "../utils/auctionXlsx";
import { RecordSheet } from "../components/RecordSheet";
import {
	DetailSheet,
	dDayLabel,
	displayName,
	rowTitle,
	todayStr,
	type AuctionPreset,
} from "./AuctionPage";
import type { AuctionItem } from "../types";

interface Props {
	/** 경매 탭으로 이동하면서 필터 프리셋을 적용해요 */
	goAuction: (preset?: AuctionPreset) => void;
	/** 관심 탭으로 이동해요 */
	goFavorites: () => void;
}

const QUICK_FILTERS: { label: string; preset: AuctionPreset }[] = [
	{ label: "🆕 신건만", preset: { failFilter: "new" } },
	{ label: "📉 유찰 물건", preset: { failFilter: "failed" } },
	{ label: "💰 6억 이하", preset: { priceRange: [null, 6] } },
	{ label: "📐 25~35평", preset: { areaRange: [25, 35] } },
];

/** "2026-06-08" → "6월 8일" */
function fmtKoreanDate(iso: string | null): string {
	if (!iso) return "";
	const [, m, d] = iso.split("-");
	return `${Number(m)}월 ${Number(d)}일`;
}

/** 홈 대시보드 — 이번 주에 봐야 할 것들을 모아 보여줘요 */
export function DashboardTab({ goAuction, goFavorites }: Props) {
	const { items, dataDate, favorites, toggleFavorite, prevPrices } =
		useAuctionStore();
	const [detail, setDetail] = useState<AuctionItem | null>(null);
	const [recordItem, setRecordItem] = useState<AuctionItem | null>(null);

	const today = todayStr();
	const weekLater = useMemo(() => {
		const d = new Date(today);
		d.setDate(d.getDate() + 7);
		return d.toISOString().slice(0, 10);
	}, [today]);

	/* 통계 */
	const upcoming = items.filter((i) => i.saleDate >= today);
	const thisWeek = upcoming.filter((i) => i.saleDate <= weekLater);

	/* 관심 물건 중 기일 임박 순 */
	const favSoon = useMemo(
		() =>
			items
				.filter(
					(i) => favorites.includes(auctionKey(i)) && i.saleDate >= today,
				)
				.sort((a, b) => a.saleDate.localeCompare(b.saleDate))
				.slice(0, 3),
		[items, favorites, today],
	);

	/* 최근 업로드로 최저가가 내려간 물건 */
	const priceDrops = useMemo(
		() =>
			items
				.filter((i) => {
					const prev = prevPrices[auctionKey(i)];
					return prev !== undefined && prev > i.minPrice && i.saleDate >= today;
				})
				.sort((a, b) => {
					const dropA = prevPrices[auctionKey(a)] - a.minPrice;
					const dropB = prevPrices[auctionKey(b)] - b.minPrice;
					return dropB - dropA;
				})
				.slice(0, 5),
		[items, prevPrices, today],
	);

	return (
		<>
			{/* ── 헤더 ── */}
			<div style={{ padding: "24px 20px 0" }}>
				<div style={{ fontSize: 22, fontWeight: 800, color: "#1B3D35" }}>
					오늘의 경매
				</div>
				<div style={{ fontSize: 13, color: "#5C6B66", marginTop: 4 }}>
					{fmtKoreanDate(dataDate)} 데이터 기준 · 진행 {upcoming.length}건
				</div>
			</div>

			{/* ── 요약 카드 ── */}
			<div
				style={{
					display: "flex",
					margin: "16px 20px 0",
					backgroundColor: "#FAF8F4",
					borderRadius: 16,
					padding: "16px 0",
				}}
			>
				<Stat
					label="진행 물건"
					value={upcoming.length}
					onClick={() => goAuction()}
				/>
				<StatDivider />
				<Stat
					label="이번 주 기일"
					value={thisWeek.length}
					color={thisWeek.length > 0 ? "#F44336" : undefined}
					onClick={() => goAuction()}
				/>
				<StatDivider />
				<Stat label="관심 물건" value={favorites.length} onClick={goFavorites} />
			</div>

			{/* ── 빠른 필터 ── */}
			<div
				className="hide-scrollbar"
				style={{
					display: "flex",
					gap: 8,
					overflowX: "auto",
					padding: "12px 20px 0",
				}}
			>
				{QUICK_FILTERS.map(({ label, preset }) => (
					<button
						key={label}
						className="touchable"
						onClick={() => goAuction(preset)}
						style={{
							padding: "9px 14px",
							borderRadius: 18,
							border: "none",
							backgroundColor: "#FAF8F4",
							color: "#1B3D35",
							fontSize: 13,
							fontWeight: 600,
							cursor: "pointer",
							whiteSpace: "nowrap",
							flexShrink: 0,
						}}
					>
						{label}
					</button>
				))}
			</div>

			{/* ── 관심 물건 기일 ── */}
			<Section
				title="관심 물건 기일"
				action={
					favorites.length > 0
						? { label: "전체 보기", onClick: goFavorites }
						: undefined
				}
			>
				{favorites.length === 0 ? (
					<EmptyCard
						emoji="⭐"
						text={"경매 탭에서 별표로 담아두면\n기일이 다가올 때 여기에 보여요"}
						actionLabel="물건 보러 가기"
						onAction={() => goAuction()}
					/>
				) : favSoon.length === 0 ? (
					<EmptyCard emoji="🗓️" text="관심 물건의 매각기일이 모두 지났어요" />
				) : (
					<RowCard>
						{favSoon.map((item, idx) => {
							const dday = dDayLabel(item.saleDate);
							return (
								<div
									key={auctionKey(item)}
									className="touchable"
									onClick={() => setDetail(item)}
									style={{
										display: "flex",
										alignItems: "center",
										gap: 10,
										padding: "13px 16px",
										borderTop: idx === 0 ? "none" : "1px solid #F0EDE6",
										cursor: "pointer",
									}}
								>
									<div style={{ flex: 1, minWidth: 0 }}>
										<div
											style={{
												fontSize: 13,
												fontWeight: 700,
												color: "#1B3D35",
												whiteSpace: "nowrap",
												overflow: "hidden",
												textOverflow: "ellipsis",
											}}
										>
											{rowTitle(item)}
										</div>
										<div
											style={{ fontSize: 12, color: "#5C6B66", marginTop: 3 }}
										>
											{formatKRW(item.minPrice)} ·{" "}
											{item.saleDate.slice(5).replace("-", ".")}
										</div>
									</div>
									<span
										style={{
											fontSize: 13,
											fontWeight: 800,
											color: dday.color,
											flexShrink: 0,
										}}
									>
										{dday.label}
									</span>
								</div>
							);
						})}
					</RowCard>
				)}
			</Section>

			{/* ── 가격 변동 ── */}
			<Section title="최저가 하락">
				{priceDrops.length === 0 ? (
					<EmptyCard
						emoji="📊"
						text={"새 엑셀을 업로드하면 유찰로\n최저가가 내려간 물건을 알려드려요"}
					/>
				) : (
					<RowCard>
						{priceDrops.map((item, idx) => {
							const prev = prevPrices[auctionKey(item)];
							const dropPct = Math.round((1 - item.minPrice / prev) * 100);
							return (
								<div
									key={auctionKey(item)}
									className="touchable"
									onClick={() => setDetail(item)}
									style={{
										display: "flex",
										alignItems: "center",
										gap: 10,
										padding: "13px 16px",
										borderTop: idx === 0 ? "none" : "1px solid #F0EDE6",
										cursor: "pointer",
									}}
								>
									<div style={{ flex: 1, minWidth: 0 }}>
										<div
											style={{
												fontSize: 13,
												fontWeight: 700,
												color: "#1B3D35",
												whiteSpace: "nowrap",
												overflow: "hidden",
												textOverflow: "ellipsis",
											}}
										>
											{displayName(item)}
										</div>
										<div
											style={{ fontSize: 12, color: "#5C6B66", marginTop: 3 }}
										>
											<span
												style={{
													textDecoration: "line-through",
													color: "#9BA6A2",
												}}
											>
												{formatKRW(prev)}
											</span>{" "}
											→ <strong>{formatKRW(item.minPrice)}</strong>
										</div>
									</div>
									<span
										style={{
											fontSize: 13,
											fontWeight: 800,
											color: "#F44336",
											flexShrink: 0,
										}}
									>
										−{dropPct}%
									</span>
								</div>
							);
						})}
					</RowCard>
				)}
			</Section>

			<div style={{ height: 28 }} />

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

/* ────────────────── 소품 ────────────────── */
function Stat({
	label,
	value,
	color,
	onClick,
}: {
	label: string;
	value: number;
	color?: string;
	onClick?: () => void;
}) {
	return (
		<div
			onClick={onClick}
			style={{
				flex: 1,
				textAlign: "center",
				cursor: onClick ? "pointer" : "default",
			}}
		>
			<div
				style={{
					fontSize: 20,
					fontWeight: 800,
					color: color ?? "#1B3D35",
					lineHeight: 1.2,
				}}
			>
				{value}
				<span style={{ fontSize: 13, fontWeight: 600, marginLeft: 1 }}>건</span>
			</div>
			<div style={{ fontSize: 11, color: "#5C6B66", marginTop: 3 }}>
				{label}
			</div>
		</div>
	);
}

function StatDivider() {
	return (
		<div style={{ width: 1, backgroundColor: "#E8E4DB", margin: "4px 0" }} />
	);
}

function Section({
	title,
	action,
	children,
}: {
	title: string;
	action?: { label: string; onClick: () => void };
	children: React.ReactNode;
}) {
	return (
		<div style={{ padding: "24px 20px 0" }}>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: 10,
				}}
			>
				<span style={{ fontSize: 15, fontWeight: 700, color: "#1B3D35" }}>
					{title}
				</span>
				{action && (
					<button
						onClick={action.onClick}
						style={{
							border: "none",
							background: "none",
							padding: 0,
							fontSize: 12,
							color: "#9BA6A2",
							cursor: "pointer",
						}}
					>
						{action.label} ›
					</button>
				)}
			</div>
			{children}
		</div>
	);
}

/** 행 목록을 담는 카드 컨테이너 */
function RowCard({ children }: { children: React.ReactNode }) {
	return (
		<div
			style={{
				backgroundColor: "#FAF8F4",
				borderRadius: 16,
				overflow: "hidden",
			}}
		>
			{children}
		</div>
	);
}

function EmptyCard({
	emoji,
	text,
	actionLabel,
	onAction,
}: {
	emoji: string;
	text: string;
	actionLabel?: string;
	onAction?: () => void;
}) {
	return (
		<div
			style={{
				backgroundColor: "#FAF8F4",
				borderRadius: 16,
				padding: "22px 16px",
				textAlign: "center",
			}}
		>
			<div style={{ fontSize: 26, marginBottom: 8 }}>{emoji}</div>
			<div
				style={{
					fontSize: 13,
					color: "#5C6B66",
					lineHeight: 1.6,
					whiteSpace: "pre-line",
				}}
			>
				{text}
			</div>
			{actionLabel && (
				<button
					className="touchable"
					onClick={onAction}
					style={{
						marginTop: 12,
						padding: "8px 16px",
						borderRadius: 10,
						border: "none",
						backgroundColor: "#1B3D35",
						color: "#fff",
						fontSize: 13,
						fontWeight: 700,
						cursor: "pointer",
					}}
				>
					{actionLabel}
				</button>
			)}
		</div>
	);
}
