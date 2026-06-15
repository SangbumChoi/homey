import { useMemo, useState } from "react";
import { useAuctionStore } from "../store/useAuctionStore";
import { auctionKey, formatKRW } from "../utils/auctionXlsx";
import { RecordSheet } from "../components/RecordSheet";
import {
	DdayPill,
	dDayLabel,
	DetailSheet,
	rowTitle,
	todayStr,
	type AuctionPreset,
} from "./AuctionPage";
import {
	AreaIcon,
	BoltIcon,
	CalendarIcon,
	ChartIcon,
	SparkleIcon,
	StarIcon,
	TagIcon,
	TrendDownIcon,
} from "../components/icons";
import { trackQuickFilter } from "../services/analytics";
import type { AuctionItem } from "../types";

interface Props {
	/** 경매 탭으로 이동하면서 필터 프리셋을 적용해요 */
	goAuction: (preset?: AuctionPreset) => void;
	/** 관심 탭으로 이동해요 */
	goFavorites: () => void;
}

const QUICK_FILTERS: {
	label: string;
	icon: React.ReactNode;
	preset: AuctionPreset;
}[] = [
	{ label: "신건만", icon: <SparkleIcon />, preset: { failFilter: "new" } },
	{
		label: "유찰 물건",
		icon: <TrendDownIcon />,
		preset: { failFilter: "failed" },
	},
	{ label: "6억 이하", icon: <TagIcon />, preset: { priceRange: [null, 6] } },
	{
		label: "25~35평",
		icon: <AreaIcon />,
		preset: { areaRange: [25, 35] },
	},
];

/** "2026-06-08" → "6월 8일" */
function fmtKoreanDate(iso: string | null): string {
	if (!iso) return "";
	const [, m, d] = iso.split("-");
	return `${Number(m)}월 ${Number(d)}일`;
}

/** 홈 대시보드 — 이번 주에 봐야 할 것들을 모아 보여줘요 */
export function DashboardTab({ goAuction, goFavorites }: Props) {
	const { items, favorites, toggleFavorite } = useAuctionStore();
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
					오늘 {fmtKoreanDate(today)}
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
					오늘의 경매 <BoltIcon size={24} />
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
				{QUICK_FILTERS.map(({ label, icon, preset }) => (
					<button
						key={label}
						className="touchable"
						onClick={() => {
							trackQuickFilter(label);
							goAuction(preset);
						}}
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: 6,
							padding: "8px 12px",
							borderRadius: 18,
							border: "2px solid #111",
							backgroundColor: "#fff",
							color: "#111",
							fontSize: 13,
							fontWeight: 800,
							cursor: "pointer",
							whiteSpace: "nowrap",
							flexShrink: 0,
						}}
					>
						{icon}
						{label}
					</button>
				))}
			</div>

			{/* ── 매각기일 분포 ── */}
			<Section delay={0.06} title="매각기일 분포">
				<SaleDateChart items={upcoming} />
			</Section>

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
						icon={<StarIcon size={30} />}
						text={"경매 탭에서 별표로 담아두면\n기일이 다가올 때 여기에 보여요"}
						actionLabel="물건 보러 가기"
						onAction={() => goAuction()}
					/>
				) : favSoon.length === 0 ? (
					<EmptyCard icon={<CalendarIcon size={30} />} text="관심 물건의 매각기일이 모두 지났어요" />
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

			{/* ── 가격 분포 ── */}
			<Section delay={0.14} title="가격 분포">
				<PriceDistChart items={upcoming} />
			</Section>

			<div style={{ height: 28 }} />

			<DetailSheet
				source="dashboard"
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
			style={{
				backgroundColor: "#fff",
				border: "2px solid #111",
				borderRadius: 14,
				overflow: "hidden",
			}}
		>
			{children}
		</div>
	);
}

function EmptyCard({
	icon,
	text,
	actionLabel,
	onAction,
}: {
	icon: React.ReactNode;
	text: string;
	actionLabel?: string;
	onAction?: () => void;
}) {
	return (
		<div
			style={{
				backgroundColor: "#fff",
				border: "2px solid #111",
				borderRadius: 14,
				padding: "24px 16px",
				textAlign: "center",
			}}
		>
			<div style={{ marginBottom: 10 }}>{icon}</div>
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

/* ────────────────── 매각기일 분포 차트 ────────────────── */
/** 진행 물건을 기일별로 묶어 막대로 보여줘요 — 색은 임박도예요 */
function SaleDateChart({ items }: { items: AuctionItem[] }) {
	const bars = useMemo(() => {
		const counts = new Map<string, number>();
		for (const i of items) {
			counts.set(i.saleDate, (counts.get(i.saleDate) ?? 0) + 1);
		}
		return [...counts.entries()]
			.sort(([a], [b]) => a.localeCompare(b))
			.slice(0, 8);
	}, [items]);

	if (bars.length === 0) {
		return <EmptyCard icon={<CalendarIcon size={30} />} text="진행 중인 매각기일이 없어요" />;
	}

	const max = Math.max(...bars.map(([, n]) => n));
	const barColor = (date: string) => {
		const level = dDayLabel(date).level;
		if (level === "urgent") return "#FF6B6B";
		if (level === "soon") return "#FFD43B";
		return "#B6F09C";
	};

	return (
		<div
			style={{
				backgroundColor: "#fff",
				border: "2px solid #111",
				borderRadius: 14,
				padding: "16px 14px 12px",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "flex-end",
					gap: 8,
					height: 112,
				}}
			>
				{bars.map(([date, n]) => (
					<div
						key={date}
						style={{
							flex: 1,
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							justifyContent: "flex-end",
							gap: 4,
							minWidth: 0,
						}}
					>
						<span style={{ fontSize: 10, fontWeight: 800, color: "#111" }}>
							{n}
						</span>
						<div
							style={{
								width: "100%",
								height: Math.max(5, (n / max) * 64),
								backgroundColor: barColor(date),
								border: "2px solid #111",
								borderRadius: 6,
							}}
						/>
						<span style={{ fontSize: 10, color: "#555", whiteSpace: "nowrap" }}>
							{Number(date.slice(5, 7))}.{Number(date.slice(8, 10))}
						</span>
					</div>
				))}
			</div>
			<div
				style={{
					fontSize: 10,
					color: "#8C8576",
					marginTop: 8,
					textAlign: "right",
				}}
			>
				<Swatch color="#FF6B6B" /> 7일 이내 · <Swatch color="#FFD43B" /> 14일
				이내 · <Swatch color="#B6F09C" /> 그 이후
			</div>
		</div>
	);
}

/* ────────────────── 가격 분포 차트 ────────────────── */
/** 진행 물건의 최저매각가를 가격 구간으로 묶어 막대로 보여줘요 — 노란 막대가 중앙값 구간이에요 */
function PriceDistChart({ items }: { items: AuctionItem[] }) {
	const EOK = 100_000_000;
	const { bins, median, medianIdx } = useMemo(() => {
		const prices = items
			.map((i) => i.minPrice)
			.filter((p) => p > 0)
			.sort((a, b) => a - b);
		if (prices.length === 0) {
			return { bins: [], median: 0, medianIdx: -1 };
		}
		const minEok = Math.floor(prices[0] / EOK);
		const maxEok = Math.max(minEok + 1, Math.ceil(prices[prices.length - 1] / EOK));
		const span = maxEok - minEok;
		/* 막대가 6개 이하가 되도록 보기 좋은 구간 폭(억)을 골라요 */
		const niceWidths = [1, 2, 3, 5, 10, 20, 50, 100];
		const width = niceWidths.find((w) => span / w <= 6) ?? Math.ceil(span / 6);
		const start = Math.floor(minEok / width) * width;
		const bins: { lo: number; count: number }[] = [];
		for (let lo = start; lo < maxEok; lo += width) {
			bins.push({ lo, count: 0 });
		}
		for (const p of prices) {
			const idx = Math.min(bins.length - 1, Math.floor((p / EOK - start) / width));
			bins[idx].count++;
		}
		const median = prices[Math.floor(prices.length / 2)];
		const medianIdx = Math.min(
			bins.length - 1,
			Math.floor((median / EOK - start) / width),
		);
		return { bins, median, medianIdx };
	}, [items]);

	if (bins.length === 0) {
		return (
			<EmptyCard
				icon={<ChartIcon size={30} />}
				text={"새 엑셀을 업로드하면 진행 물건의\n가격 분포를 보여드려요"}
			/>
		);
	}

	const max = Math.max(...bins.map((b) => b.count));

	return (
		<div
			style={{
				backgroundColor: "#fff",
				border: "2px solid #111",
				borderRadius: 14,
				padding: "16px 14px 12px",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "flex-end",
					gap: 8,
					height: 112,
				}}
			>
				{bins.map((b, idx) => (
					<div
						key={b.lo}
						style={{
							flex: 1,
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							justifyContent: "flex-end",
							gap: 4,
							minWidth: 0,
						}}
					>
						<span style={{ fontSize: 10, fontWeight: 800, color: "#111" }}>
							{b.count}
						</span>
						<div
							style={{
								width: "100%",
								height: Math.max(5, (b.count / max) * 64),
								backgroundColor: idx === medianIdx ? "#FFD43B" : "#B6F09C",
								border: "2px solid #111",
								borderRadius: 6,
							}}
						/>
						<span style={{ fontSize: 10, color: "#555", whiteSpace: "nowrap" }}>
							{b.lo}
						</span>
					</div>
				))}
			</div>
			<div
				style={{
					fontSize: 10,
					color: "#8C8576",
					marginTop: 8,
					textAlign: "right",
				}}
			>
				단위: 억원 · <Swatch color="#FFD43B" /> 중앙값 {formatKRW(median)}
			</div>
		</div>
	);
}

/** 범례용 색 견본 — 검정 테두리의 작은 사각형이에요 */
function Swatch({ color }: { color: string }) {
	return (
		<span
			style={{
				display: "inline-block",
				width: 9,
				height: 9,
				backgroundColor: color,
				border: "1.5px solid #111",
				borderRadius: 3,
				verticalAlign: "-1px",
			}}
		/>
	);
}
