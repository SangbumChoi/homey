import { useEffect, useMemo, useState } from "react";
import { BottomSheet, TextButton } from "@toss/tds-mobile";
import { colors } from "@toss/tds-colors";
import { useAuctionStore } from "../store/useAuctionStore";
import { auctionKey, formatKRW, pricePerPyeong } from "../utils/auctionXlsx";
import { RecordSheet } from "../components/RecordSheet";
import { fetchRemoteAuctionData } from "../services/remoteAuctionData";
import {
	trackConditionFilter,
	trackCourtFilter,
	trackListingDwell,
	trackListingOpen,
	trackRangeFilter,
	trackRegionFilter,
	trackSort,
} from "../services/analytics";
import { HouseIcon, PencilIcon } from "../components/icons";
import type { AuctionItem } from "../types";

/** 대시보드 빠른 필터에서 전달받는 필터 프리셋 */
export interface AuctionPreset {
	failFilter?: "all" | "new" | "failed";
	priceRange?: [number | null, number | null];
	areaRange?: [number | null, number | null];
}

/* ────────────────── 정렬 ────────────────── */
type SortKey =
	| "saleDate"
	| "priceAsc"
	| "priceDesc"
	| "perPyeong"
	| "areaDesc"
	| "failDesc";

const SORT_OPTIONS: [SortKey, string][] = [
	["saleDate", "매각기일 빠른순"],
	["priceAsc", "최저가 낮은순"],
	["priceDesc", "최저가 높은순"],
	["perPyeong", "평당가 낮은순"],
	["areaDesc", "면적 넓은순"],
	["failDesc", "유찰 많은순"],
];

/* ────────────────── 필터 프리셋 ────────────────── */
/** [최소, 최대] 억원 단위 (null = 제한 없음) */
const PRICE_PRESETS: [string, number | null, number | null][] = [
	["전체", null, null],
	["3억 이하", null, 3],
	["3~5억", 3, 5],
	["5~7억", 5, 7],
	["7~9억", 7, 9],
	["9~12억", 9, 12],
	["12~15억", 12, 15],
	["15억 이상", 15, null],
];

/** [최소, 최대] 평 단위 (null = 제한 없음) */
const AREA_PRESETS: [string, number | null, number | null][] = [
	["전체", null, null],
	["15평 이하", null, 15],
	["15~20평", 15, 20],
	["20~25평", 20, 25],
	["25~30평", 25, 30],
	["30~35평", 30, 35],
	["35~40평", 35, 40],
	["40평 이상", 40, null],
];

type SheetKind =
	| "region"
	| "court"
	| "price"
	| "area"
	| "etc"
	| "sort"
	| null;

/* ────────────────── 헬퍼 ────────────────── */
/** "서울동부지방법원" → "동부", "성남지원" → "성남" */
export function shortCourt(court: string): string {
	return court.replace("서울", "").replace("지방법원", "").replace("지원", "");
}

/** "(중곡동,에스케이아파트)" → "에스케이아파트" */
function buildingName(address: string): string | null {
	const m = address.match(/\(([^)]+)\)/);
	if (!m) return null;
	const parts = m[1].split(",");
	return parts[parts.length - 1].trim();
}

/** 시/도 접두사·괄호·동호수를 떼어낸 짧은 주소 — 상세 시트 제목용 */
function shortAddress(address: string): string {
	const s = fullAddress(address);
	// "제1층 제106호", "103동 8층802호" 같은 동/층/호 토큰부터 잘라내요
	const tokens = s.split(/\s+/);
	const idx = tokens.findIndex((t) => /^제?\d+(동|층|호)/.test(t));
	return idx > 1 ? tokens.slice(0, idx).join(" ") : s;
}

/** 시/도 접두사·괄호만 떼고 동/층/호까지 모두 보여주는 주소 — 리스트 제목용 */
function fullAddress(address: string): string {
	return address
		.replace(/^(서울특별시|경기도)\s*/, "")
		.replace(/\([^)]*\)/g, "")
		.trim();
}

/** 리스트 행 제목 — 주소 전체에 단지명(괄호 안)이 따로 있으면 덧붙여요 */
export function rowTitle(item: AuctionItem): string {
	const name = buildingName(item.address);
	const addr = fullAddress(item.address);
	return name && !addr.includes(name) ? `${addr} (${name})` : addr;
}

/** 상세 시트 제목 — 단지명이 있으면 단지명, 없으면 짧은 주소 */
export function displayName(item: AuctionItem): string {
	return buildingName(item.address) ?? shortAddress(item.address);
}

export function todayStr(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dDayLabel(saleDate: string): {
	label: string;
	color: string;
	bg: string;
	level: "past" | "urgent" | "soon" | "normal";
} {
	const diff = Math.round(
		(new Date(saleDate).getTime() - new Date(todayStr()).getTime()) / 86400000,
	);
	if (diff < 0)
		return { label: "기일 지남", color: "#888", bg: "#EFEDE4", level: "past" };
	if (diff === 0)
		return { label: "D-Day", color: "#E03131", bg: "#FF6B6B", level: "urgent" };
	if (diff <= 7)
		return {
			label: `D-${diff}`,
			color: "#E03131",
			bg: "#FF6B6B",
			level: "urgent",
		};
	if (diff <= 14)
		return {
			label: `D-${diff}`,
			color: "#946800",
			bg: "#FFD43B",
			level: "soon",
		};
	return { label: `D-${diff}`, color: "#111", bg: "#fff", level: "normal" };
}

/** 매각기일 D-day 알약 배지 — 네오브루탈 */
export function DdayPill({ saleDate }: { saleDate: string }) {
	const d = dDayLabel(saleDate);
	const text: Record<typeof d.level, string> = {
		past: "#888",
		urgent: "#111",
		soon: "#111",
		normal: "#555",
	};
	const border: Record<typeof d.level, string> = {
		past: "#BBB4A4",
		urgent: "#111",
		soon: "#111",
		normal: "#C9C2AE",
	};
	return (
		<span
			style={{
				fontSize: 10,
				fontWeight: 900,
				color: text[d.level],
				backgroundColor: d.bg,
				border: `2px solid ${border[d.level]}`,
				borderRadius: 7,
				padding: "2px 6px",
				whiteSpace: "nowrap",
			}}
		>
			{d.label}
		</span>
	);
}

/* ────────────────── 메인 ────────────────── */
export function AuctionTab({
	preset,
	onPresetApplied,
}: {
	preset?: AuctionPreset | null;
	onPresetApplied?: () => void;
} = {}) {
	const {
		items,
		dataDate,
		lastUploadAt,
		importItems,
		reset,
		favorites,
		toggleFavorite,
	} = useAuctionStore();

	/* 필터 상태 */
	const [region, setRegion] = useState<string | null>(null);
	const [selectedCourts, setSelectedCourts] = useState<string[]>([]);
	const [priceRange, setPriceRange] = useState<
		[number | null, number | null]
	>([null, null]);
	const [areaRange, setAreaRange] = useState<[number | null, number | null]>([
		null,
		null,
	]);
	const [areaUnit, setAreaUnit] = useState<"pyeong" | "m2">("pyeong");
	const [failFilter, setFailFilter] = useState<"all" | "new" | "failed">(
		"all",
	);
	const [excludeShare, setExcludeShare] = useState(false);
	const [includePast, setIncludePast] = useState(false);
	const [sort, setSort] = useState<SortKey>("saleDate");

	/* 실데이터 1,900여 건을 한 번에 그리지 않도록 50건씩 보여줘요 */
	const PAGE = 50;
	const [visibleCount, setVisibleCount] = useState(PAGE);
	useEffect(() => {
		setVisibleCount(PAGE);
	}, [region, selectedCourts, priceRange, areaRange, failFilter, excludeShare, includePast, sort]);

	/* 시트 상태 */
	const [sheet, setSheet] = useState<SheetKind>(null);
	const [detail, setDetail] = useState<AuctionItem | null>(null);
	const [recordItem, setRecordItem] = useState<AuctionItem | null>(null);
	const closeSheet = () => setSheet(null);

	/* 대시보드 빠른 필터 프리셋 적용 */
	useEffect(() => {
		if (!preset) return;
		if (preset.failFilter) setFailFilter(preset.failFilter);
		if (preset.priceRange) setPriceRange(preset.priceRange);
		if (preset.areaRange) setAreaRange(preset.areaRange);
		onPresetApplied?.();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [preset]);

	/* 원격 동기화 */
	const [syncing, setSyncing] = useState(false);
	const [uploadMsg, setUploadMsg] = useState<{
		text: string;
		error?: boolean;
	} | null>(null);

	/* 원격 저장소(homey-data)에서 최신 주간 엑셀을 받아 병합해요 */
	const handleRemoteSync = async () => {
		setSyncing(true);
		setUploadMsg(null);
		try {
			const { items: parsed, dataDate: parsedDate } =
				await fetchRemoteAuctionData();
			const { added, updated } = importItems(parsed, parsedDate);
			useAuctionStore.getState().markRemoteChecked();
			setUploadMsg({
				text:
					added + updated > 0
						? `새 데이터 반영 — 신규 ${added}건, 갱신 ${updated}건이에요`
						: "이미 최신 데이터예요",
			});
		} catch (err) {
			setUploadMsg({
				text:
					err instanceof Error
						? err.message
						: "새 데이터를 확인하지 못했어요",
				error: true,
			});
		} finally {
			setSyncing(false);
		}
	};

	/* 파생 데이터 */
	const regions = useMemo(
		() => [...new Set(items.map((i) => i.region))].sort(),
		[items],
	);
	const courts = useMemo(
		() => [...new Set(items.map((i) => i.court))].sort(),
		[items],
	);

	const filtered = useMemo(() => {
		const today = todayStr();
		const [pMin, pMax] = priceRange;
		const [aMin, aMax] = areaRange;

		const result = items.filter((i) => {
			if (region && i.region !== region) return false;
			if (selectedCourts.length > 0 && !selectedCourts.includes(i.court))
				return false;
			if (pMin !== null && i.minPrice < pMin * 100_000_000) return false;
			if (pMax !== null && i.minPrice > pMax * 100_000_000) return false;
			if (aMin !== null && i.areaPyeong < aMin) return false;
			if (aMax !== null && i.areaPyeong > aMax) return false;
			if (failFilter === "new" && i.failCount !== 0) return false;
			if (failFilter === "failed" && i.failCount === 0) return false;
			if (excludeShare && i.note?.includes("지분")) return false;
			if (!includePast && i.saleDate < today) return false;
			return true;
		});

		const cmp: Record<SortKey, (a: AuctionItem, b: AuctionItem) => number> = {
			saleDate: (a, b) => a.saleDate.localeCompare(b.saleDate),
			priceAsc: (a, b) => a.minPrice - b.minPrice,
			priceDesc: (a, b) => b.minPrice - a.minPrice,
			perPyeong: (a, b) => pricePerPyeong(a) - pricePerPyeong(b),
			areaDesc: (a, b) => b.areaPyeong - a.areaPyeong,
			failDesc: (a, b) => b.failCount - a.failCount,
		};
		return result.sort(cmp[sort]);
	}, [
		items,
		region,
		selectedCourts,
		priceRange,
		areaRange,
		failFilter,
		excludeShare,
		includePast,
		sort,
	]);

	/* 칩 라벨 — 선택된 값을 그대로 보여줘요 */
	const rangeLabel = (
		[min, max]: [number | null, number | null],
		unit: string,
	) => {
		if (min === null && max === null) return null;
		if (min === null) return `${max}${unit} 이하`;
		if (max === null) return `${min}${unit} 이상`;
		return `${min}~${max}${unit}`;
	};
	const courtLabel =
		selectedCourts.length === 0
			? null
			: selectedCourts.length === 1
				? shortCourt(selectedCourts[0])
				: `${shortCourt(selectedCourts[0])} 외 ${selectedCourts.length - 1}`;
	const etcCount =
		(failFilter !== "all" ? 1 : 0) +
		(excludeShare ? 1 : 0) +
		(includePast ? 1 : 0);

	const activeFilterCount =
		(region ? 1 : 0) +
		(selectedCourts.length > 0 ? 1 : 0) +
		(priceRange[0] !== null || priceRange[1] !== null ? 1 : 0) +
		(areaRange[0] !== null || areaRange[1] !== null ? 1 : 0) +
		etcCount;

	const clearFilters = () => {
		setRegion(null);
		setSelectedCourts([]);
		setPriceRange([null, null]);
		setAreaRange([null, null]);
		setFailFilter("all");
		setExcludeShare(false);
		setIncludePast(false);
	};

	return (
		<>
			{/* ── 헤더 ── */}
			<div style={{ padding: "20px 20px 0" }}>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
					}}
				>
					<div>
						<div
					style={{
						fontSize: 22,
						fontWeight: 800,
						color: "#111",
						letterSpacing: "-0.5px",
					}}
				>
							경매 물건
						</div>
						<div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
							{dataDate ? `${dataDate} 기준` : ""} · 전체 {items.length}건 ·{" "}
							<button
								onClick={handleRemoteSync}
								disabled={syncing}
								style={{
									border: "none",
									background: "none",
									padding: 0,
									fontSize: 12,
									fontWeight: 700,
									color: "#111",
									textDecoration: "underline",
									cursor: "pointer",
								}}
							>
								{syncing ? "확인 중…" : "↻ 새 데이터"}
							</button>
						</div>
					</div>
				</div>

				{uploadMsg && (
					<div
						style={{
							marginTop: 10,
							padding: "8px 12px",
							borderRadius: 8,
							fontSize: 12,
							border: "2px solid #111",
							backgroundColor: uploadMsg.error ? "#FF6B6B" : "#B6F09C",
							color: "#111",
							fontWeight: 700,
						}}
					>
						{uploadMsg.text}
					</div>
				)}
			</div>

			{/* ── 필터 칩바 + 정렬 (스크롤해도 상단에 고정돼요) ── */}
			<div
				style={{
					position: "sticky",
					top: 0,
					zIndex: 10,
					backgroundColor: "#FFFBEF",
					borderBottom: "2.5px solid #111",
				}}
			>
			<div
				className="hide-scrollbar"
				style={{
					display: "flex",
					gap: 8,
					overflowX: "auto",
					padding: "14px 20px 12px",
				}}
			>
				<FilterChip
					label={region ?? "지역"}
					active={!!region}
					onClick={() => setSheet("region")}
				/>
				<FilterChip
					label={courtLabel ?? "법원"}
					active={!!courtLabel}
					onClick={() => setSheet("court")}
				/>
				<FilterChip
					label={rangeLabel(priceRange, "억") ?? "가격"}
					active={priceRange[0] !== null || priceRange[1] !== null}
					onClick={() => setSheet("price")}
				/>
				<FilterChip
					label={rangeLabel(areaRange, "평") ?? "면적"}
					active={areaRange[0] !== null || areaRange[1] !== null}
					onClick={() => setSheet("area")}
				/>
				<FilterChip
					label={etcCount > 0 ? `조건 ${etcCount}` : "조건"}
					active={etcCount > 0}
					onClick={() => setSheet("etc")}
				/>
			</div>

			{/* ── 결과 수 + 정렬 ── */}
			<div
				style={{
					padding: "0 20px 10px",
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<div style={{ fontSize: 13, color: "#555" }}>
					<strong style={{ color: "#111" }}>{filtered.length}건</strong>
					{activeFilterCount > 0 && (
						<TextButton
							size="xsmall"
							color={colors.grey500}
							onClick={clearFilters}
							style={{ marginLeft: 8 }}
						>
							필터 초기화
						</TextButton>
					)}
				</div>
				<button
					onClick={() => setSheet("sort")}
					style={{
						border: "none",
						background: "none",
						fontSize: 12,
						color: "#555",
						cursor: "pointer",
						padding: "4px 0",
					}}
				>
					{SORT_OPTIONS.find(([k]) => k === sort)![1]} ▾
				</button>
			</div>
			</div>

			{/* ── 물건 리스트 ── */}
			<div style={{ paddingBottom: 24 }}>
				{filtered.length === 0 ? (
					<div
						style={{
							textAlign: "center",
							padding: "56px 24px",
							color: "#8C8576",
						}}
					>
						<div style={{ marginBottom: 12 }}><HouseIcon size={36} color="#8C8576" /></div>
						<div style={{ fontSize: 14, fontWeight: 600, color: "#555" }}>
							조건에 맞는 물건이 없어요
						</div>
						<div style={{ fontSize: 12, marginTop: 4 }}>
							필터를 조정해 보세요
						</div>
					</div>
				) : (
					<>
						{filtered.slice(0, visibleCount).map((item) => {
							const key = auctionKey(item);
							return (
								<AuctionRow
									key={key}
									item={item}
									areaUnit={areaUnit}
									fav={favorites.includes(key)}
									onToggleFav={() => toggleFavorite(key)}
									onClick={() => setDetail(item)}
								/>
							);
						})}
						{filtered.length > visibleCount && (
							<div style={{ padding: "16px 20px 4px" }}>
								<button
									className="nb nb-press"
									onClick={() => setVisibleCount((c) => c + PAGE)}
									style={{
										width: "100%",
										padding: "13px 0",
										borderRadius: 12,
										backgroundColor: "#fff",
										color: "#111",
										fontSize: 14,
										fontWeight: 900,
										cursor: "pointer",
									}}
								>
									더 보기 ({(filtered.length - visibleCount).toLocaleString()}건 남음)
								</button>
							</div>
						)}
					</>
				)}

				{lastUploadAt && (
					<div style={{ textAlign: "center", marginTop: 16 }}>
						<TextButton
							size="xsmall"
							color={colors.grey500}
							onClick={() => {
								if (confirm("데이터를 앱에 포함된 기본본으로 되돌릴까요?"))
									reset();
							}}
						>
							데이터 초기화
						</TextButton>
					</div>
				)}
			</div>

			{/* ── 지역 시트 ── */}
			<BottomSheet
				open={sheet === "region"}
				onClose={closeSheet}
				header={<BottomSheet.Header>지역</BottomSheet.Header>}
			>
				<SheetOption
					label="전체"
					selected={region === null}
					onClick={() => {
						setRegion(null);
						trackRegionFilter(null);
						closeSheet();
					}}
				/>
				{regions.map((r) => (
					<SheetOption
						key={r}
						label={r}
						selected={region === r}
						onClick={() => {
							setRegion(r);
							trackRegionFilter(r);
							closeSheet();
						}}
					/>
				))}
			</BottomSheet>

			{/* ── 법원 시트 (복수 선택) ── */}
			<BottomSheet
				open={sheet === "court"}
				onClose={closeSheet}
				header={<BottomSheet.Header>법원</BottomSheet.Header>}
				headerDescription={
					<BottomSheet.HeaderDescription>
						여러 법원을 함께 선택할 수 있어요
					</BottomSheet.HeaderDescription>
				}
				cta={
					<BottomSheet.CTA
						onClick={() => {
							trackCourtFilter(selectedCourts);
							closeSheet();
						}}
					>
						확인
					</BottomSheet.CTA>
				}
			>
				<SheetOption
					label="전체"
					selected={selectedCourts.length === 0}
					onClick={() => setSelectedCourts([])}
				/>
				{courts.map((c) => (
					<SheetOption
						key={c}
						label={c}
						selected={selectedCourts.includes(c)}
						onClick={() =>
							setSelectedCourts((prev) =>
								prev.includes(c)
									? prev.filter((x) => x !== c)
									: [...prev, c],
							)
						}
					/>
				))}
			</BottomSheet>

			{/* ── 가격 시트 ── */}
			<RangeSheet
				open={sheet === "price"}
				title="최저가"
				unit="억"
				presets={PRICE_PRESETS}
				value={priceRange}
				onApply={(range) => {
					setPriceRange(range);
					trackRangeFilter("price", range);
					closeSheet();
				}}
				onClose={closeSheet}
			/>

			{/* ── 면적 시트 ── */}
			<RangeSheet
				open={sheet === "area"}
				title="면적"
				unit="평"
				presets={AREA_PRESETS}
				value={areaRange}
				onApply={(range) => {
					setAreaRange(range);
					trackRangeFilter("area", range);
					closeSheet();
				}}
				onClose={closeSheet}
				extra={
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginTop: 16,
							paddingTop: 14,
							borderTop: "1px solid #EFE9D8",
						}}
					>
						<span style={{ fontSize: 14, color: "#111" }}>표시 단위</span>
						<div style={{ display: "flex", gap: 4 }}>
							{(
								[
									["pyeong", "평"],
									["m2", "㎡"],
								] as const
							).map(([u, label]) => (
								<button
									key={u}
									onClick={() => setAreaUnit(u)}
									style={{
										padding: "5px 14px",
										borderRadius: 8,
										fontSize: 13,
										fontWeight: areaUnit === u ? 900 : 500,
										border: "2px solid #111",
										backgroundColor: areaUnit === u ? "#FFD43B" : "#fff",
										color: "#111",
										cursor: "pointer",
									}}
								>
									{label}
								</button>
							))}
						</div>
					</div>
				}
			/>

			{/* ── 조건 시트 ── */}
			<BottomSheet
				open={sheet === "etc"}
				onClose={closeSheet}
				header={<BottomSheet.Header>조건</BottomSheet.Header>}
				cta={<BottomSheet.CTA onClick={closeSheet}>확인</BottomSheet.CTA>}
			>
				<div
					style={{
						padding: "4px 24px 10px",
						fontSize: 12,
						fontWeight: 700,
						color: "#8C8576",
					}}
				>
					유찰
				</div>
				{(
					[
						["all", "전체"],
						["new", "신건만"],
						["failed", "유찰 1회 이상"],
					] as const
				).map(([key, label]) => (
					<SheetOption
						key={key}
						label={label}
						selected={failFilter === key}
						onClick={() => {
							setFailFilter(key);
							trackConditionFilter("fail", key);
						}}
					/>
				))}
				<div
					style={{
						padding: "14px 24px 10px",
						fontSize: 12,
						fontWeight: 700,
						color: "#8C8576",
						borderTop: "1px solid #F0F2EF",
						marginTop: 8,
					}}
				>
					기타
				</div>
				<SheetToggle
					label="지분매각 제외"
					description="일부 지분만 매각하는 물건을 빼고 봐요"
					on={excludeShare}
					onToggle={() => {
						setExcludeShare(!excludeShare);
						trackConditionFilter("exclude_share", !excludeShare);
					}}
				/>
				<SheetToggle
					label="지난 기일 포함"
					description="매각기일이 지난 물건도 함께 봐요"
					on={includePast}
					onToggle={() => {
						setIncludePast(!includePast);
						trackConditionFilter("include_past", !includePast);
					}}
				/>
			</BottomSheet>

			{/* ── 정렬 시트 ── */}
			<BottomSheet
				open={sheet === "sort"}
				onClose={closeSheet}
				header={<BottomSheet.Header>정렬</BottomSheet.Header>}
			>
				{SORT_OPTIONS.map(([key, label]) => (
					<SheetOption
						key={key}
						label={label}
						selected={sort === key}
						onClick={() => {
							setSort(key);
							trackSort(key);
							closeSheet();
						}}
					/>
				))}
			</BottomSheet>

			{/* ── 상세 시트 ── */}
			<DetailSheet
				source="auction"
				item={detail}
				fav={detail ? favorites.includes(auctionKey(detail)) : false}
				onToggleFav={() => detail && toggleFavorite(auctionKey(detail))}
				onWriteRecord={() => {
					setRecordItem(detail);
					setDetail(null);
				}}
				onClose={() => setDetail(null)}
			/>

			{/* ── 기록 시트 ── */}
			<RecordSheet
				itemKey={recordItem ? auctionKey(recordItem) : null}
				address={recordItem?.address ?? ""}
				onClose={() => setRecordItem(null)}
			/>
		</>
	);
}

/* ────────────────── 리스트 행 ────────────────── */
export function AuctionRow({
	item,
	areaUnit,
	fav,
	onToggleFav,
	onClick,
}: {
	item: AuctionItem;
	areaUnit?: "pyeong" | "m2";
	fav?: boolean;
	onToggleFav?: () => void;
	onClick: () => void;
}) {
	const isShare = item.note?.includes("지분") ?? false;
	const discounted = item.minRate < 100;
	const areaText =
		areaUnit === "m2" ? `${item.areaM2}㎡` : `${item.areaPyeong}평`;
	const perPyeong = formatKRW(Math.round(pricePerPyeong(item)));

	return (
		<div
			className="touchable"
			onClick={onClick}
			style={{
				backgroundColor: "#fff",
				padding: "13px 20px",
				borderBottom: "1px solid #EFE9D8",
				cursor: "pointer",
			}}
		>
			{/* 1줄: 주소 — 가장 중요한 정보라 전부 보여주고, 길면 줄바꿈해요 */}
			<div style={{ display: "flex", gap: 8, marginBottom: 5 }}>
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
					{rowTitle(item)}
				</div>
				{onToggleFav && (
					<button
						aria-label={fav ? "관심 해제" : "관심 등록"}
						onClick={(e) => {
							e.stopPropagation();
							onToggleFav();
						}}
						style={{
							border: "none",
							background: "none",
							padding: "0 0 0 4px",
							fontSize: 18,
							lineHeight: 1.2,
							color: fav ? "#FFB331" : "#C9C2B2",
							cursor: "pointer",
							flexShrink: 0,
						}}
					>
						{fav ? "★" : "☆"}
					</button>
				)}
			</div>

			{/* 2줄: 최저가 + 할인율 + 지분 경고 */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 6,
					marginBottom: 5,
				}}
			>
				<span
					style={{
						fontSize: 19,
						fontWeight: 900,
						color: "#111",
						letterSpacing: "-0.3px",
					}}
				>
					{formatKRW(item.minPrice)}
				</span>
				{discounted && (
					<span
						style={{
							fontSize: 10,
							fontWeight: 900,
							color: "#111",
							backgroundColor: "#FF6B6B",
							border: "2px solid #111",
							borderRadius: 7,
							padding: "2px 6px",
						}}
					>
						감정가 {item.minRate}%
					</span>
				)}
				{isShare && (
					<span
						style={{
							fontSize: 10,
							fontWeight: 900,
							color: "#111",
							backgroundColor: "#FF6B6B",
							border: "2px solid #111",
							borderRadius: 7,
							padding: "2px 6px",
						}}
					>
						지분
					</span>
				)}
			</div>

			{/* 3줄: 면적 · 평당가 · 유찰 · 법원 + 기일 배지 */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 8,
					fontSize: 12,
					color: "#555",
					lineHeight: 1.5,
				}}
			>
				<span
					style={{
						flex: 1,
						whiteSpace: "nowrap",
						overflow: "hidden",
						textOverflow: "ellipsis",
					}}
				>
					{areaText} · 평당 {perPyeong} ·{" "}
					{item.failCount === 0 ? "신건" : `유찰 ${item.failCount}회`} ·{" "}
					{shortCourt(item.court)}
				</span>
				<DdayPill saleDate={item.saleDate} />
			</div>
		</div>
	);
}

/* ────────────────── 상세 시트 ────────────────── */
export function DetailSheet({
	item,
	fav,
	source = "list",
	onToggleFav,
	onWriteRecord,
	onClose,
}: {
	item: AuctionItem | null;
	fav?: boolean;
	/** 어디서 열렸는지 — list(경매) / favorites / dashboard */
	source?: string;
	onToggleFav?: () => void;
	onWriteRecord?: () => void;
	onClose: () => void;
}) {
	const dday = item ? dDayLabel(item.saleDate) : null;
	const isShare = item?.note?.includes("지분") ?? false;

	/* 상세 열람·체류 로깅 — 3개 호출처를 한 곳에서 처리해요 */
	useEffect(() => {
		if (!item) return;
		trackListingOpen(item, source);
		const start = Date.now();
		return () => trackListingDwell(item, Date.now() - start);
	}, [item, source]);

	return (
		<BottomSheet
			open={!!item}
			onClose={onClose}
			header={
				<BottomSheet.Header>
					{item ? displayName(item) : ""}
				</BottomSheet.Header>
			}
			cta={<BottomSheet.CTA onClick={onClose}>확인</BottomSheet.CTA>}
		>
			{item && (
				<div style={{ padding: "0 24px 8px" }}>
					{/* 주소 전문 */}
					<div
						style={{
							fontSize: 13,
							color: "#555",
							lineHeight: 1.5,
							marginBottom: 14,
						}}
					>
						{item.address}
					</div>

					{/* 가격 강조 */}
					<div
						style={{
							display: "flex",
							alignItems: "baseline",
							gap: 8,
							marginBottom: 14,
						}}
					>
						<span style={{ fontSize: 24, fontWeight: 800, color: "#111" }}>
							{formatKRW(item.minPrice)}
						</span>
						<span
							style={{
								fontSize: 13,
								fontWeight: 700,
								color: item.minRate < 100 ? "#F44336" : "#8C8576",
							}}
						>
							감정가의 {item.minRate}%
						</span>
					</div>

					{/* 관심·기록 액션 */}
					{(onToggleFav || onWriteRecord) && (
						<div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
							{onToggleFav && (
								<button
									onClick={onToggleFav}
									style={{
										flex: 1,
										padding: "10px 0",
										borderRadius: 10,
										border: "2.5px solid #111",
										backgroundColor: fav ? "#FFD43B" : "#fff",
										color: "#111",
										fontSize: 14,
										fontWeight: 900,
										cursor: "pointer",
									}}
								>
									{fav ? "★ 관심 물건" : "☆ 관심 등록"}
								</button>
							)}
							{onWriteRecord && (
								<button
									onClick={onWriteRecord}
									style={{
										flex: 1,
										padding: "10px 0",
										borderRadius: 10,
										border: "2.5px solid #111",
										backgroundColor: "#fff",
										color: "#111",
										fontSize: 14,
										fontWeight: 900,
										cursor: "pointer",
									}}
								>
									<PencilIcon /> 임장·입찰 기록
								</button>
							)}
						</div>
					)}

					{/* 상세 표 */}
					<div
						style={{
							border: "2px solid #111",
							borderRadius: 12,
							padding: "4px 14px",
							marginBottom: 12,
						}}
					>
						<DetailRow label="감정가" value={formatKRW(item.appraisal)} />
						<DetailRow
							label="평당가"
							value={`${formatKRW(Math.round(pricePerPyeong(item)))} / 평`}
						/>
						<DetailRow
							label="면적"
							value={`${item.areaPyeong}평 (${item.areaM2}㎡)`}
						/>
						<DetailRow
							label="매각기일"
							value={`${item.saleDate.replace(/-/g, ".")} (${dday!.label})`}
							valueColor={dday!.color}
						/>
						<DetailRow
							label="유찰"
							value={item.failCount === 0 ? "신건" : `${item.failCount}회`}
						/>
						<DetailRow label="법원" value={item.court} />
						<DetailRow
							label="사건번호"
							value={item.caseNo.replace(item.court, "").trim()}
						/>
						{item.itemNo !== "1" && (
							<DetailRow label="물건번호" value={item.itemNo} />
						)}
					</div>

					{/* 비고 */}
					{item.note && (
						<div
							style={{
								padding: "10px 12px",
								backgroundColor: isShare ? "#FFF5F5" : "#F8FAFF",
								borderRadius: 10,
								fontSize: 12,
								color: isShare ? "#C62828" : "#555",
								lineHeight: 1.6,
							}}
						>
							<strong style={{ marginRight: 6 }}>비고</strong>
						{item.note}
						</div>
					)}
				</div>
			)}
		</BottomSheet>
	);
}

function DetailRow({
	label,
	value,
	valueColor,
}: {
	label: string;
	value: string;
	valueColor?: string;
}) {
	return (
		<div
			style={{
				display: "flex",
				justifyContent: "space-between",
				gap: 12,
				padding: "9px 0",
				fontSize: 13,
			}}
		>
			<span style={{ color: "#8C8576", flexShrink: 0 }}>{label}</span>
			<span
				style={{
					color: valueColor ?? "#111",
					fontWeight: 600,
					textAlign: "right",
				}}
			>
				{value}
			</span>
		</div>
	);
}

/* ────────────────── 공통 소품 ────────────────── */
function FilterChip({
	label,
	active,
	onClick,
}: {
	label: string;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<button
			className={active ? "nb-press" : undefined}
			onClick={onClick}
			style={{
				padding: "7px 11px",
				borderRadius: 18,
				border: active ? "2.5px solid #111" : "1.5px solid #C9C2AE",
				backgroundColor: active ? "#B6F09C" : "#fff",
				color: active ? "#111" : "#333",
				fontSize: 13,
				fontWeight: active ? 900 : 600,
				boxShadow: active ? "3px 3px 0 #111" : "none",
				cursor: "pointer",
				whiteSpace: "nowrap",
				flexShrink: 0,
			}}
		>
			{label} <span style={{ fontSize: 10, opacity: 0.55 }}>▾</span>
		</button>
	);
}

/** 가격·면적 범위 선택 시트 — 프리셋 칩 + 직접 입력 */
function RangeSheet({
	open,
	title,
	unit,
	presets,
	value,
	onApply,
	onClose,
	extra,
}: {
	open: boolean;
	title: string;
	unit: string;
	presets: [string, number | null, number | null][];
	value: [number | null, number | null];
	onApply: (range: [number | null, number | null]) => void;
	onClose: () => void;
	extra?: React.ReactNode;
}) {
	const [minStr, setMinStr] = useState("");
	const [maxStr, setMaxStr] = useState("");

	// 시트가 열릴 때 현재 값을 직접 입력칸에 채워둬요
	useEffect(() => {
		if (!open) return;
		setMinStr(value[0] === null ? "" : String(value[0]));
		setMaxStr(value[1] === null ? "" : String(value[1]));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const parse = (s: string): number | null => {
		const n = Number(s);
		return s.trim() === "" || Number.isNaN(n) || n < 0 ? null : n;
	};

	const applyCustom = () => {
		let min = parse(minStr);
		let max = parse(maxStr);
		// 최소가 최대보다 크면 자리를 바꿔줘요
		if (min !== null && max !== null && min > max) [min, max] = [max, min];
		onApply([min, max]);
	};

	const inputStyle: React.CSSProperties = {
		width: "100%",
		padding: "10px 12px",
		borderRadius: 10,
		border: "1.5px solid #C9C2AE",
		fontSize: 15,
		color: "#111",
		outline: "none",
		boxSizing: "border-box",
		textAlign: "center",
	};

	return (
		<BottomSheet
			open={open}
			onClose={onClose}
			hasTextField
			header={<BottomSheet.Header>{title}</BottomSheet.Header>}
		>
			<div style={{ padding: "0 24px 8px" }}>
				{/* 프리셋 칩 */}
				<div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
					{presets.map(([label, min, max]) => {
						const selected = value[0] === min && value[1] === max;
						return (
							<button
								key={label}
								onClick={() => onApply([min, max])}
								style={{
									padding: "8px 13px",
									borderRadius: 18,
									border: selected
										? "2.5px solid #111"
										: "1.5px solid #C9C2AE",
									backgroundColor: selected ? "#B6F09C" : "#fff",
									color: "#111",
									fontSize: 13,
									fontWeight: selected ? 900 : 600,
									boxShadow: selected ? "3px 3px 0 #111" : "none",
									cursor: "pointer",
								}}
							>
								{label}
							</button>
						);
					})}
				</div>

				{/* 직접 입력 */}
				<div
					style={{
						fontSize: 12,
						fontWeight: 700,
						color: "#555",
						margin: "18px 0 8px",
					}}
				>
					직접 입력 ({unit} 단위)
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
					<input
						type="number"
						inputMode="decimal"
						value={minStr}
						onChange={(e) => setMinStr(e.target.value)}
						placeholder="최소"
						style={inputStyle}
					/>
					<span style={{ color: "#8C8576", flexShrink: 0 }}>~</span>
					<input
						type="number"
						inputMode="decimal"
						value={maxStr}
						onChange={(e) => setMaxStr(e.target.value)}
						placeholder="최대"
						style={inputStyle}
					/>
					<button
						className="nb nb-press"
						onClick={applyCustom}
						style={{
							flexShrink: 0,
							padding: "10px 16px",
							borderRadius: 10,
							backgroundColor: "#FFD43B",
							color: "#111",
							fontSize: 14,
							fontWeight: 900,
							cursor: "pointer",
						}}
					>
						적용
					</button>
				</div>

				{extra}
			</div>
		</BottomSheet>
	);
}

function SheetOption({
	label,
	selected,
	onClick,
}: {
	label: string;
	selected: boolean;
	onClick: () => void;
}) {
	return (
		<button
			onClick={onClick}
			style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				width: "100%",
				padding: "14px 24px",
				border: "none",
				background: "none",
				fontSize: 16,
				fontWeight: selected ? 700 : 400,
				color: selected ? "#111" : "#333D4B",
				cursor: "pointer",
				textAlign: "left",
			}}
		>
			{label}
			{selected && (
				<span style={{ color: "#111", fontWeight: 800 }}>✓</span>
			)}
		</button>
	);
}

function SheetToggle({
	label,
	description,
	on,
	onToggle,
}: {
	label: string;
	description: string;
	on: boolean;
	onToggle: () => void;
}) {
	return (
		<div
			onClick={onToggle}
			style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				padding: "12px 24px",
				cursor: "pointer",
			}}
		>
			<div>
				<div style={{ fontSize: 16, color: "#333D4B" }}>{label}</div>
				<div style={{ fontSize: 12, color: "#8C8576", marginTop: 2 }}>
					{description}
				</div>
			</div>
			{/* 토글 스위치 */}
			<div
				style={{
					width: 46,
					height: 28,
					borderRadius: 14,
					backgroundColor: on ? "#111" : "#E5E0D2",
					position: "relative",
					transition: "background-color 0.2s",
					flexShrink: 0,
				}}
			>
				<div
					style={{
						width: 22,
						height: 22,
						borderRadius: "50%",
						backgroundColor: "#fff",
						position: "absolute",
						top: 3,
						left: on ? 21 : 3,
						transition: "left 0.2s",
						boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
					}}
				/>
			</div>
		</div>
	);
}
