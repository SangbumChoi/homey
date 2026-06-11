import { useMemo, useState } from "react";
import { useAuctionStore } from "../store/useAuctionStore";
import { auctionKey, formatKRW } from "../utils/auctionXlsx";
import { RecordSheet } from "../components/RecordSheet";
import {
	DdayPill,
	DetailSheet,
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
			<div style={{ padding: "26px 20px 0" }}>
				<div
					className="rise"
					style={{
						display: "inline-block",
						backgroundColor: "#B6F09C",
						border: "2.5px solid #111",
						boxShadow: "3px 3px 0 #111",
						padding: "3px 10px",
						fontSize: 11,
						fontWeight: 900,
						color: "#111",
						transform: "rotate(-2deg)",
					}}
				>
					{fmtKoreanDate(dataDate)} 기준
				</div>
				<div
					style={{
						fontSize: 26,
						fontWeight: 900,
						color: "#111",
						letterSpacing: "-1px",
						marginTop: 12,
					}}
				>
					오늘의 경매 ⚡
				</div>
			</div>

			{/* ── 요약 카드 ── */}
			<div
				className="rise"
				style={{ display: "flex", gap: 10, margin: "16px 20px 0" }}
			>
				<StatCard
					label="진행 물건"
					value={upcoming.length}
					onClick={() => goAuction()}
				/>
				<StatCard
					label="이번 주 기일"
					value={thisWeek.length}
					bg={thisWeek.length > 0 ? "#FFD43B" : "#fff"}
					onClick={() => goAuction()}
				/>
				<StatCard label="관심 물건" value={favorites.length} onClick={goFavorites} />
			</div>

			{/* ── 빠른 필터 ── */}
			<div
				className="hide-scrollbar rise"
				style={{
					display: "flex",
					gap: 9,
					overflowX: "auto",
					padding: "16px 20px 2px",
					animationDelay: "0.04s",
				}}
			>
				{QUICK_FILTERS.map(({ label, preset }) => (
					<button
						key={label}
						className="nb-press"
						onClick={() => goAuction(preset)}
						style={{
							padding: "8px 12px",
							borderRadius: 18,
							border: "2.5px solid #111",
							backgroundColor: "#fff",
							color: "#111",
							fontSize: 13,
							fontWeight: 800,
							boxShadow: "3px 3px 0 #111",
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
				delay={0.08}
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
						{favSoon.map((item, idx) => (
							<div
								key={auctionKey(item)}
								className="touchable"
								onClick={() => setDetail(item)}
								style={{
									display: "flex",
									alignItems: "center",
									gap: 10,
									padding: "13px 16px",
									borderTop: idx === 0 ? "none" : "1px solid #F4F4F0",
									cursor: "pointer",
								}}
							>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div
										style={{
											fontSize: 13,
											fontWeight: 700,
											color: "#111",
											whiteSpace: "nowrap",
											overflow: "hidden",
											textOverflow: "ellipsis",
										}}
									>
										{rowTitle(item)}
									</div>
									<div
										style={{ fontSize: 12, color: "#555", marginTop: 3 }}
									>
										{formatKRW(item.minPrice)} ·{" "}
										{item.saleDate.slice(5).replace("-", ".")}
									</div>
								</div>
								<DdayPill saleDate={item.saleDate} />
							</div>
						))}
					</RowCard>
				)}
			</Section>

			{/* ── 가격 변동 ── */}
			<Section delay={0.14} title="최저가 하락">
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
												color: "#111",
												whiteSpace: "nowrap",
												overflow: "hidden",
												textOverflow: "ellipsis",
											}}
										>
											{displayName(item)}
										</div>
										<div
											style={{ fontSize: 12, color: "#555", marginTop: 3 }}
										>
											<span
												style={{
													textDecoration: "line-through",
													color: "#8C8576",
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
function StatCard({
	label,
	value,
	bg = "#fff",
	onClick,
}: {
	label: string;
	value: number;
	bg?: string;
	onClick?: () => void;
}) {
	return (
		<div
			className="nb nb-press"
			onClick={onClick}
			style={{
				flex: 1,
				borderRadius: 12,
				backgroundColor: bg,
				padding: "12px 0",
				textAlign: "center",
				cursor: onClick ? "pointer" : "default",
			}}
		>
			<div
				style={{
					fontSize: 20,
					fontWeight: 900,
					color: "#111",
					lineHeight: 1.2,
					letterSpacing: "-0.3px",
				}}
			>
				{value}
				<span style={{ fontSize: 12, fontWeight: 700, marginLeft: 1 }}>건</span>
			</div>
			<div style={{ fontSize: 10, fontWeight: 700, color: "#555", marginTop: 3 }}>
				{label}
			</div>
		</div>
	);
}

function Section({
	title,
	action,
	delay = 0,
	children,
}: {
	title: string;
	action?: { label: string; onClick: () => void };
	delay?: number;
	children: React.ReactNode;
}) {
	return (
		<div
			className="rise"
			style={{ padding: "24px 20px 0", animationDelay: `${delay}s` }}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: 10,
				}}
			>
				<span style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>
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
							color: "#8C8576",
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
			className="nb"
			style={{ borderRadius: 14, overflow: "hidden" }}
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
			className="nb"
			style={{ borderRadius: 14, padding: "24px 16px", textAlign: "center" }}
		>
			<div style={{ fontSize: 28, marginBottom: 8 }}>{emoji}</div>
			<div
				style={{
					fontSize: 13,
					color: "#555",
					lineHeight: 1.6,
					whiteSpace: "pre-line",
				}}
			>
				{text}
			</div>
			{actionLabel && (
				<button
					onClick={onAction}
					className="nb nb-press"
					style={{
						marginTop: 14,
						padding: "8px 16px",
						borderRadius: 10,
						backgroundColor: "#FFD43B",
						color: "#111",
						fontSize: 13,
						fontWeight: 900,
						cursor: "pointer",
					}}
				>
					{actionLabel}
				</button>
			)}
		</div>
	);
}
