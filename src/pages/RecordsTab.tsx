import { useMemo, useRef, useState } from "react";
import { useAuctionStore } from "../store/useAuctionStore";
import { auctionKey, formatKRW } from "../utils/auctionXlsx";
import { RecordSheet } from "../components/RecordSheet";
import { DetailSheet, rowTitle } from "./AuctionPage";
import { PencilIcon } from "../components/icons";
import type { AuctionItem, AuctionRecord } from "../types";

const RESULT_BADGE: Record<
	AuctionRecord["result"],
	{ label: string; bg: string; color: string } | null
> = {
	none: null,
	won: { label: "낙찰", bg: "#B6F09C", color: "#111" },
	lost: { label: "패찰", bg: "#EFEDE4", color: "#555" },
};

/** 기록 탭 — 물건별 임장 메모와 입찰 결과를 모아 봐요 */
export function RecordsTab() {
	const { items, records, favorites, toggleFavorite, deleteRecord } =
		useAuctionStore();
	const [editKey, setEditKey] = useState<string | null>(null);
	/* 왼쪽으로 밀어 삭제 버튼이 열려 있는 행 */
	const [swipedKey, setSwipedKey] = useState<string | null>(null);
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
						color: "#111",
						letterSpacing: "-0.5px",
					}}
				>
					임장·입찰 기록
				</div>
				<div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
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
						color: "#8C8576",
					}}
				>
					<div style={{ marginBottom: 14 }}><PencilIcon size={36} color="#8C8576" /></div>
					<div style={{ fontSize: 15, fontWeight: 700, color: "#555" }}>
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
							<SwipeToDeleteRow
								key={key}
								open={swipedKey === key}
								onOpenChange={(open) => setSwipedKey(open ? key : null)}
								onDelete={() => {
									deleteRecord(key);
									setSwipedKey(null);
								}}
								onClick={() => setEditKey(key)}
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
											color: "#111",
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
												fontWeight: 900,
												color: badge.color,
												backgroundColor: badge.bg,
												border: "2px solid #111",
												borderRadius: 7,
												padding: "2px 8px",
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
											color: "#111",
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
											color: "#555",
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
									<span style={{ fontSize: 11, color: "#8C8576" }}>
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
												color: "#555",
												cursor: "pointer",
												padding: 0,
											}}
										>
											물건 정보 →
										</button>
									)}
								</div>
							</SwipeToDeleteRow>
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

/* ────────────────── 스와이프 삭제 행 ────────────────── */
const DELETE_W = 84;

/**
 * 행을 왼쪽으로 밀면 삭제 버튼이 나타나는 래퍼예요.
 * 세로 스크롤과 충돌하지 않도록 가로 의도가 분명할 때만 끌어요.
 */
function SwipeToDeleteRow({
	open,
	onOpenChange,
	onDelete,
	onClick,
	children,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onDelete: () => void;
	onClick: () => void;
	children: React.ReactNode;
}) {
	const [drag, setDrag] = useState<number | null>(null);
	const start = useRef<{ x: number; y: number } | null>(null);
	const horizontal = useRef(false);
	const suppressClick = useRef(false);

	const base = open ? -DELETE_W : 0;
	const x = drag ?? base;
	/* 0(닫힘) → 1(완전히 열림) — 버튼 등장 모션에 써요 */
	const progress = Math.min(1, -x / DELETE_W);

	const endDrag = () => {
		if (!start.current) return;
		const finalX = drag;
		start.current = null;
		horizontal.current = false;
		setDrag(null);
		if (finalX !== null) {
			suppressClick.current = true;
			onOpenChange(finalX < -DELETE_W / 2);
		}
	};

	return (
		<div
			style={{
				position: "relative",
				overflow: "hidden",
				backgroundColor: "#FFFBEF",
				borderBottom: "1px solid #EFE9D8",
			}}
		>
			{/* 뒤에 숨어 있는 삭제 버튼 — 스와이프한 만큼 커지면서 나타나요 */}
			<div
				style={{
					position: "absolute",
					top: 0,
					right: 0,
					bottom: 0,
					width: DELETE_W,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<button
					aria-label="기록 삭제"
					onClick={onDelete}
					className="nb-press"
					style={{
						width: 48,
						height: 48,
						borderRadius: 16,
						border: "2.5px solid #111",
						backgroundColor: "#FF6B6B",
						boxShadow: "3px 3px 0 #111",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						cursor: "pointer",
						transform: `scale(${0.4 + 0.6 * progress})`,
						opacity: progress,
						// 닫힌 행의 버튼이 포커스/탭을 받지 않게 완전히 숨겨요
						visibility: progress === 0 ? "hidden" : "visible",
						transition:
							drag === null
								? "transform 0.18s ease, opacity 0.18s ease"
								: "none",
					}}
				>
					{/* 휴지통 아이콘 */}
					<svg
						width="22"
						height="22"
						viewBox="0 0 24 24"
						fill="none"
						stroke="#111"
						strokeWidth="2.2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M3 6h18" />
						<path d="M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2" />
						<path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
						<line x1="10" y1="11" x2="10" y2="17" />
						<line x1="14" y1="11" x2="14" y2="17" />
					</svg>
				</button>
			</div>

			{/* 앞면 — 끌리는 영역 */}
			<div
				onPointerDown={(e) => {
					start.current = { x: e.clientX, y: e.clientY };
					horizontal.current = false;
				}}
				onPointerMove={(e) => {
					if (!start.current) return;
					const dx = e.clientX - start.current.x;
					const dy = e.clientY - start.current.y;
					if (!horizontal.current) {
						// 가로 의도가 분명해질 때까지는 스크롤에 양보해요
						if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) return;
						horizontal.current = true;
						e.currentTarget.setPointerCapture(e.pointerId);
					}
					setDrag(Math.max(-DELETE_W, Math.min(0, base + dx)));
				}}
				onPointerUp={endDrag}
				onPointerCancel={endDrag}
				onClick={() => {
					if (suppressClick.current) {
						suppressClick.current = false;
						return;
					}
					if (open) onOpenChange(false);
					else onClick();
				}}
				className="touchable"
				style={{
					position: "relative",
					backgroundColor: "#fff",
					padding: "13px 20px",
					cursor: "pointer",
					transform: `translateX(${x}px)`,
					transition: drag === null ? "transform 0.18s ease" : "none",
					touchAction: "pan-y",
				}}
			>
				{children}
			</div>
		</div>
	);
}
