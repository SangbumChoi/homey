import { useMemo, useState } from "react";
import { useAuctionStore } from "../store/useAuctionStore";
import { auctionKey, formatKRW } from "../utils/auctionXlsx";
import { RecordSheet } from "../components/RecordSheet";
import {
	ConditionBadges,
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

			{/* ── 가격 분포 ── */}
			<Section delay={0.06} title="가격 분포">
				<PriceDistChart items={upcoming} />
			</Section>

			{/* ── 매각기일 분포 ── */}
			<Section delay={0.1} title="매각기일 분포">
				<SaleDateChart items={upcoming} />
			</Section>

			{/* ── 관심 물건 기일 ── */}
			<Section
				delay={0.14}
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
										style={{
											fontSize: 12,
											color: "#555",
											marginTop: 3,
											display: "flex",
											alignItems: "center",
											gap: 6,
										}}
									>
										<span>
											{formatKRW(item.minPrice)} ·{" "}
											{item.saleDate.slice(5).replace("-", ".")}
										</span>
										<ConditionBadges item={item} includeInfo={false} max={1} />
									</div>
								</div>
								<DdayPill saleDate={item.saleDate} />
							</div>
						))}
					</RowCard>
				)}
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
/** 범례용 짧은 선 견본 (실선/점선) */
function LineMark({ color, dashed }: { color: string; dashed?: boolean }) {
	return (
		<span
			style={{
				display: "inline-block",
				width: 12,
				height: 0,
				borderTop: `2px ${dashed ? "dashed" : "solid"} ${color}`,
				verticalAlign: "middle",
				marginRight: 3,
			}}
		/>
	);
}

/** 정수면 그대로, 아니면 소수 첫째 자리까지 (억 단위 축 라벨) */
function fmtEok(n: number): string {
	return Number.isInteger(n) ? `${n}` : n.toFixed(1).replace(/\.0$/, "");
}

const NICE_WIDTHS = [0.1, 0.2, 0.25, 0.5, 1, 2, 3, 5, 10, 20, 50, 100];

/**
 * 진행 물건의 최저매각가 분포를 이어지는 면적 그래프로 보여줘요.
 * 양 끝 극단값(상·하위 5%)은 축에서 제외해 가운데 분포에 집중하고,
 * 약 30개 구간으로 잘게 나눠 연속적인 곡선처럼 그려요.
 * 중앙값(빨강 실선)·평균(파랑 점선)을 기준선으로 겹쳐요.
 */
function PriceDistChart({ items }: { items: AuctionItem[] }) {
	const EOK = 100_000_000;
	const stat = useMemo(() => {
		const prices = items
			.map((i) => i.minPrice)
			.filter((p) => p > 0)
			.sort((a, b) => a - b);
		const n = prices.length;
		if (n === 0) return null;

		/* 전체 기준 중앙값·평균 (극단값 포함) */
		const median =
			n % 2 === 1
				? prices[(n - 1) / 2]
				: (prices[n / 2 - 1] + prices[n / 2]) / 2;
		const mean = prices.reduce((s, p) => s + p, 0) / n;

		/* 축은 상·하위 5%를 잘라 가운데 분포에 집중해요 */
		const q = (r: number) => prices[Math.min(n - 1, Math.round((n - 1) * r))];
		const loRaw = q(0.05) / EOK;
		const hiRaw = q(0.95) / EOK;
		const robustSpan = Math.max(hiRaw - loRaw, 0.1);

		/* 약 30개(데이터가 적으면 그만큼) 구간이 되도록 구간 폭(억)을 골라요 */
		const target = Math.max(8, Math.min(30, n));
		const width =
			NICE_WIDTHS.find((w) => robustSpan / w <= target) ??
			NICE_WIDTHS[NICE_WIDTHS.length - 1];
		const start = Math.floor(loRaw / width) * width;
		let end = Math.ceil(hiRaw / width) * width;
		if (end <= start) end = start + width;
		const binCount = Math.max(1, Math.round((end - start) / width));

		const bins = Array.from({ length: binCount }, () => 0);
		let counted = 0;
		for (const p of prices) {
			const idx = Math.floor((p / EOK - start) / width);
			if (idx >= 0 && idx < binCount) {
				bins[idx]++;
				counted++;
			}
		}
		const outliers = n - counted;

		const pct = (v: number) =>
			Math.max(0, Math.min(100, ((v / EOK - start) / (end - start)) * 100));

		/* x축 라벨은 6개 정도만 (눈금은 구간 수만큼 촘촘하게) */
		const tickCount = Math.min(6, binCount + 1);
		const ticks = Array.from({ length: tickCount }, (_, i) =>
			fmtEok(start + ((end - start) * i) / (tickCount - 1 || 1)),
		);

		return {
			bins,
			max: Math.max(...bins, 1),
			median,
			mean,
			medianPct: pct(median),
			meanPct: pct(mean),
			ticks,
			count: n,
			outliers,
		};
	}, [items]);

	if (stat === null) {
		return (
			<EmptyCard
				icon={<ChartIcon size={30} />}
				text={"진행 중인 경매 물건이 모이면\n가격 분포를 보여드려요"}
			/>
		);
	}

	const { bins, max, median, mean, medianPct, meanPct, ticks, count, outliers } =
		stat;

	/* SVG 좌표 — 가로(0~W)는 컨테이너 너비에 맞춰 늘어나요 */
	const W = 300;
	const H = 96;
	const TOP = 8;
	const yOf = (c: number) => H - (c / max) * (H - TOP);
	const xOf = (i: number) => ((i + 0.5) / bins.length) * W;
	const pts = bins.map((c, i) => `${xOf(i).toFixed(1)},${yOf(c).toFixed(1)}`);
	const areaPath = `M0,${H} L${pts.join(" L")} L${W},${H} Z`;
	const medianX = (medianPct / 100) * W;
	const meanX = (meanPct / 100) * W;

	return (
		<div
			style={{
				backgroundColor: "#fff",
				border: "2px solid #111",
				borderRadius: 14,
				padding: "16px 14px 12px",
			}}
		>
			{/* 이어지는 면적 그래프 + 기준선 */}
			<svg
				width="100%"
				height={H}
				viewBox={`0 0 ${W} ${H}`}
				preserveAspectRatio="none"
				style={{ display: "block", overflow: "visible" }}
			>
				<path d={areaPath} fill="#B6F09C" />
				<polyline
					points={pts.join(" ")}
					fill="none"
					stroke="#111"
					strokeWidth={2}
					strokeLinejoin="round"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
				<line
					x1={0}
					y1={H}
					x2={W}
					y2={H}
					stroke="#111"
					strokeWidth={2}
					vectorEffect="non-scaling-stroke"
				/>
				<line
					x1={medianX}
					y1={0}
					x2={medianX}
					y2={H}
					stroke="#F44336"
					strokeWidth={2}
					vectorEffect="non-scaling-stroke"
				/>
				<line
					x1={meanX}
					y1={0}
					x2={meanX}
					y2={H}
					stroke="#1E88E5"
					strokeWidth={2}
					strokeDasharray="3 3"
					vectorEffect="non-scaling-stroke"
				/>
			</svg>

			{/* x축 눈금자 — 구간 경계마다 촘촘하게, 5칸마다 길게 */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "flex-start",
					height: 5,
					marginTop: 2,
				}}
			>
				{Array.from({ length: bins.length + 1 }, (_, i) => (
					<span
						key={i}
						style={{
							width: 1,
							height: i % 5 === 0 ? 5 : 3,
							backgroundColor:
								i % 5 === 0 ? "rgba(17,17,17,0.35)" : "rgba(17,17,17,0.18)",
						}}
					/>
				))}
			</div>

			{/* x축 라벨 (억) */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					marginTop: 3,
				}}
			>
				{ticks.map((t, i) => (
					<span key={i} style={{ fontSize: 10, color: "#8C8576" }}>
						{t}
					</span>
				))}
			</div>

			{/* 범례 + 통계 */}
			<div
				style={{
					fontSize: 10,
					color: "#8C8576",
					marginTop: 8,
					display: "flex",
					flexWrap: "wrap",
					alignItems: "center",
					gap: "2px 7px",
				}}
			>
				<span>
					<LineMark color="#F44336" /> 중앙값 {formatKRW(median)}
				</span>
				<span>
					<LineMark color="#1E88E5" dashed /> 평균 {formatKRW(Math.round(mean))}
				</span>
				<span>· 총 {count}건</span>
				{outliers > 0 && <span>· 극단값 {outliers}건 제외 (단위: 억원)</span>}
				{outliers === 0 && <span>· 단위: 억원</span>}
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
