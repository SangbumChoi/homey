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
import type { Page } from "../App";

interface Props {
	nav: (p: Page) => void;
	/** 경매 탭으로 이동하면서 필터 프리셋을 적용해요 */
	goAuction: (preset?: AuctionPreset) => void;
	/** 내 집 지키기 화면을 열어요 */
	openMyhome: () => void;
}

const QUICK_FILTERS: { label: string; preset: AuctionPreset }[] = [
	{ label: "🆕 신건만", preset: { failFilter: "new" } },
	{ label: "📉 유찰 물건", preset: { failFilter: "failed" } },
	{ label: "💰 6억 이하", preset: { priceRange: [null, 6] } },
	{ label: "📐 25~35평", preset: { areaRange: [25, 35] } },
];

/** 홈 대시보드 — 이번 주에 봐야 할 것들을 모아 보여줘요 */
export function DashboardTab({ nav, goAuction, openMyhome }: Props) {
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
			<div style={{ padding: "20px 20px 0" }}>
				<div style={{ fontSize: 20, fontWeight: 800, color: "#1B3D35" }}>
					홈
				</div>
				<div style={{ fontSize: 12, color: "#5C6B66", marginTop: 2 }}>
					{dataDate} 기준 경매 데이터
				</div>
			</div>

			{/* ── 요약 카드 ── */}
			<div style={{ display: "flex", gap: 8, padding: "14px 20px 0" }}>
				<StatCard
					label="진행 물건"
					value={`${upcoming.length}건`}
					onClick={() => goAuction()}
				/>
				<StatCard
					label="이번 주 기일"
					value={`${thisWeek.length}건`}
					accent={thisWeek.length > 0}
					onClick={() => goAuction()}
				/>
				<StatCard label="관심 물건" value={`${favorites.length}건`} />
			</div>

			{/* ── 빠른 필터 ── */}
			<Section title="빠르게 찾기">
				<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
					{QUICK_FILTERS.map(({ label, preset }) => (
						<button
							key={label}
							onClick={() => goAuction(preset)}
							style={{
								padding: "9px 14px",
								borderRadius: 18,
								border: "1px solid #E5E7E3",
								backgroundColor: "#fff",
								color: "#1B3D35",
								fontSize: 13,
								fontWeight: 600,
								cursor: "pointer",
							}}
						>
							{label}
						</button>
					))}
				</div>
			</Section>

			{/* ── 관심 물건 기일 임박 ── */}
			<Section title="관심 물건 기일">
				{favorites.length === 0 ? (
					<EmptyHint
						text="경매 탭에서 별표(☆)로 담아두면 기일이 다가올 때 여기서 보여드려요"
						actionLabel="물건 보러 가기"
						onAction={() => goAuction()}
					/>
				) : favSoon.length === 0 ? (
					<EmptyHint text="관심 물건의 매각기일이 모두 지났어요" />
				) : (
					favSoon.map((item) => {
						const dday = dDayLabel(item.saleDate);
						return (
							<div
								key={auctionKey(item)}
								onClick={() => setDetail(item)}
								style={{
									display: "flex",
									alignItems: "center",
									gap: 10,
									padding: "11px 0",
									borderBottom: "1px solid #F0F2EF",
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
										style={{ fontSize: 12, color: "#5C6B66", marginTop: 2 }}
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
					})
				)}
			</Section>

			{/* ── 가격 변동 ── */}
			<Section title="최저가 하락">
				{priceDrops.length === 0 ? (
					<EmptyHint text="새 엑셀을 업로드하면 유찰로 최저가가 내려간 물건을 알려드려요" />
				) : (
					priceDrops.map((item) => {
						const prev = prevPrices[auctionKey(item)];
						const dropPct = Math.round((1 - item.minPrice / prev) * 100);
						return (
							<div
								key={auctionKey(item)}
								onClick={() => setDetail(item)}
								style={{
									display: "flex",
									alignItems: "center",
									gap: 10,
									padding: "11px 0",
									borderBottom: "1px solid #F0F2EF",
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
										style={{ fontSize: 12, color: "#5C6B66", marginTop: 2 }}
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
					})
				)}
			</Section>

			{/* ── 기타 도구 (전세 시절 기능) ── */}
			<Section title="기타 도구">
				<ToolRow
					icon="🛡️"
					title="전세 안전 진단"
					desc="전세 들어가기 전 등기부등본으로 위험도 확인"
					onClick={() => nav({ type: "diagnosis-search" })}
				/>
				<ToolRow
					icon="🏠"
					title="내 집 지키기"
					desc="거주 중인 집의 등기 변동·계약 만료 관리"
					onClick={openMyhome}
				/>
			</Section>

			<div style={{ height: 24 }} />

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
	accent,
	onClick,
}: {
	label: string;
	value: string;
	accent?: boolean;
	onClick?: () => void;
}) {
	return (
		<div
			onClick={onClick}
			style={{
				flex: 1,
				padding: "12px 0",
				borderRadius: 12,
				backgroundColor: accent ? "#1B3D35" : "#FAF8F4",
				textAlign: "center",
				cursor: onClick ? "pointer" : "default",
			}}
		>
			<div
				style={{
					fontSize: 17,
					fontWeight: 800,
					color: accent ? "#fff" : "#1B3D35",
				}}
			>
				{value}
			</div>
			<div
				style={{
					fontSize: 11,
					color: accent ? "#C9D6D1" : "#5C6B66",
					marginTop: 2,
				}}
			>
				{label}
			</div>
		</div>
	);
}

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div style={{ padding: "20px 20px 0" }}>
			<div
				style={{
					fontSize: 14,
					fontWeight: 700,
					color: "#1B3D35",
					marginBottom: 10,
				}}
			>
				{title}
			</div>
			{children}
		</div>
	);
}

function EmptyHint({
	text,
	actionLabel,
	onAction,
}: {
	text: string;
	actionLabel?: string;
	onAction?: () => void;
}) {
	return (
		<div
			style={{
				padding: "14px 16px",
				backgroundColor: "#FAF8F4",
				borderRadius: 10,
				fontSize: 12,
				color: "#5C6B66",
				lineHeight: 1.6,
			}}
		>
			{text}
			{actionLabel && (
				<button
					onClick={onAction}
					style={{
						display: "block",
						marginTop: 6,
						border: "none",
						background: "none",
						padding: 0,
						fontSize: 12,
						fontWeight: 700,
						color: "#1B3D35",
						cursor: "pointer",
						textDecoration: "underline",
					}}
				>
					{actionLabel}
				</button>
			)}
		</div>
	);
}

function ToolRow({
	icon,
	title,
	desc,
	onClick,
}: {
	icon: string;
	title: string;
	desc: string;
	onClick: () => void;
}) {
	return (
		<div
			onClick={onClick}
			style={{
				display: "flex",
				alignItems: "center",
				gap: 12,
				padding: "12px 14px",
				backgroundColor: "#FAF8F4",
				borderRadius: 10,
				marginBottom: 8,
				cursor: "pointer",
			}}
		>
			<span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
			<div style={{ flex: 1 }}>
				<div style={{ fontSize: 13, fontWeight: 700, color: "#1B3D35" }}>
					{title}
				</div>
				<div style={{ fontSize: 12, color: "#5C6B66", marginTop: 2 }}>
					{desc}
				</div>
			</div>
			<span style={{ color: "#9BA6A2" }}>›</span>
		</div>
	);
}
