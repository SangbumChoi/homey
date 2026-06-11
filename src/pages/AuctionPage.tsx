import { useMemo, useRef, useState } from "react";
import { Button, TextButton } from "@toss/tds-mobile";
import { colors } from "@toss/tds-colors";
import { useAuctionStore } from "../store/useAuctionStore";
import {
	parseAuctionXlsx,
	formatKRW,
	pricePerPyeong,
} from "../utils/auctionXlsx";
import type { AuctionItem } from "../types";

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

/** "서울동부지방법원" → "동부", "성남지원" → "성남" */
function shortCourt(court: string): string {
	return court.replace("서울", "").replace("지방법원", "").replace("지원", "");
}

function todayStr(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dDayLabel(saleDate: string): { label: string; color: string } {
	const diff = Math.round(
		(new Date(saleDate).getTime() - new Date(todayStr()).getTime()) / 86400000,
	);
	if (diff < 0) return { label: "기일 지남", color: "#9BA6A2" };
	if (diff === 0) return { label: "D-Day", color: "#F44336" };
	if (diff <= 7) return { label: `D-${diff}`, color: "#F44336" };
	if (diff <= 14) return { label: `D-${diff}`, color: "#FF9800" };
	return { label: `D-${diff}`, color: "#1B3D35" };
}

export function AuctionTab() {
	const { items, dataDate, lastUploadAt, importItems, reset } =
		useAuctionStore();

	/* ── 필터 상태 ── */
	const [region, setRegion] = useState<string | null>(null);
	const [selectedCourts, setSelectedCourts] = useState<string[]>([]);
	const [priceMin, setPriceMin] = useState(""); // 억 단위
	const [priceMax, setPriceMax] = useState("");
	const [areaUnit, setAreaUnit] = useState<"pyeong" | "m2">("pyeong");
	const [areaMin, setAreaMin] = useState("");
	const [areaMax, setAreaMax] = useState("");
	const [failFilter, setFailFilter] = useState<"all" | "new" | "failed">(
		"all",
	);
	const [excludeShare, setExcludeShare] = useState(false);
	const [includePast, setIncludePast] = useState(false);
	const [sort, setSort] = useState<SortKey>("saleDate");
	const [filterOpen, setFilterOpen] = useState(true);

	/* ── 업로드 ── */
	const fileRef = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(false);
	const [uploadMsg, setUploadMsg] = useState<{
		text: string;
		error?: boolean;
	} | null>(null);

	const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		setUploading(true);
		setUploadMsg(null);
		try {
			const buffer = await file.arrayBuffer();
			const { items: parsed, dataDate: parsedDate } =
				await parseAuctionXlsx(buffer);
			const { added, updated } = importItems(parsed, parsedDate);
			setUploadMsg({
				text: `업로드 완료 — 신규 ${added}건, 갱신 ${updated}건이에요`,
			});
		} catch (err) {
			setUploadMsg({
				text: err instanceof Error ? err.message : "파일을 읽지 못했어요",
				error: true,
			});
		} finally {
			setUploading(false);
		}
	};

	/* ── 파생 데이터 ── */
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
		const min = parseFloat(priceMin) * 100_000_000;
		const max = parseFloat(priceMax) * 100_000_000;
		const aMin = parseFloat(areaMin);
		const aMax = parseFloat(areaMax);
		const area = (i: AuctionItem) =>
			areaUnit === "pyeong" ? i.areaPyeong : i.areaM2;

		const result = items.filter((i) => {
			if (region && i.region !== region) return false;
			if (selectedCourts.length > 0 && !selectedCourts.includes(i.court))
				return false;
			if (!isNaN(min) && i.minPrice < min) return false;
			if (!isNaN(max) && i.minPrice > max) return false;
			if (!isNaN(aMin) && area(i) < aMin) return false;
			if (!isNaN(aMax) && area(i) > aMax) return false;
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
		priceMin,
		priceMax,
		areaUnit,
		areaMin,
		areaMax,
		failFilter,
		excludeShare,
		includePast,
		sort,
	]);

	const activeFilterCount =
		(region ? 1 : 0) +
		(selectedCourts.length > 0 ? 1 : 0) +
		(priceMin || priceMax ? 1 : 0) +
		(areaMin || areaMax ? 1 : 0) +
		(failFilter !== "all" ? 1 : 0) +
		(excludeShare ? 1 : 0) +
		(includePast ? 1 : 0);

	const clearFilters = () => {
		setRegion(null);
		setSelectedCourts([]);
		setPriceMin("");
		setPriceMax("");
		setAreaMin("");
		setAreaMax("");
		setFailFilter("all");
		setExcludeShare(false);
		setIncludePast(false);
	};

	const toggleCourt = (c: string) =>
		setSelectedCourts((prev) =>
			prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
		);

	return (
		<>
			{/* ── 헤더 ── */}
			<div style={{ padding: "20px 20px 12px" }}>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
					}}
				>
					<div>
						<div style={{ fontSize: 20, fontWeight: 800, color: "#1B3D35" }}>
							경매 물건
						</div>
						<div style={{ fontSize: 12, color: "#5C6B66", marginTop: 2 }}>
							{dataDate ? `${dataDate} 기준` : ""} · 전체 {items.length}건
							{lastUploadAt &&
								` · ${new Date(lastUploadAt).toLocaleDateString("ko-KR")} 업로드`}
						</div>
					</div>
					<input
						ref={fileRef}
						type="file"
						accept=".xlsx,.xls"
						style={{ display: "none" }}
						onChange={handleUpload}
					/>
					<Button
						size="small"
						color="dark"
						loading={uploading}
						onClick={() => fileRef.current?.click()}
					>
						엑셀 업로드
					</Button>
				</div>

				{uploadMsg && (
					<div
						style={{
							marginTop: 10,
							padding: "8px 12px",
							borderRadius: 8,
							fontSize: 12,
							backgroundColor: uploadMsg.error ? "#FFF5F5" : "#E7EFEC",
							color: uploadMsg.error ? "#F44336" : "#1B3D35",
						}}
					>
						{uploadMsg.error ? "⚠️ " : "✅ "}
						{uploadMsg.text}
					</div>
				)}
			</div>

			{/* ── 컨트롤 패널 ── */}
			<div style={{ padding: "0 20px 12px" }}>
				<div
					style={{
						backgroundColor: "#fff",
						borderRadius: 14,
						border: "1px solid #E5E7E3",
						overflow: "hidden",
					}}
				>
					<div
						onClick={() => setFilterOpen(!filterOpen)}
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							padding: "12px 16px",
							cursor: "pointer",
						}}
					>
						<div style={{ fontSize: 14, fontWeight: 700, color: "#1B3D35" }}>
							🎛️ 필터
							{activeFilterCount > 0 && (
								<span
									style={{
										marginLeft: 6,
										fontSize: 11,
										fontWeight: 700,
										color: "#fff",
										backgroundColor: "#1B3D35",
										borderRadius: 9,
										padding: "1px 7px",
									}}
								>
									{activeFilterCount}
								</span>
							)}
						</div>
						<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
							{activeFilterCount > 0 && (
								<TextButton
									size="xsmall"
									color={colors.grey600}
									onClick={(e: React.MouseEvent) => {
										e.stopPropagation();
										clearFilters();
									}}
								>
									초기화
								</TextButton>
							)}
							<span style={{ color: "#9BA6A2", fontSize: 12 }}>
								{filterOpen ? "▲" : "▼"}
							</span>
						</div>
					</div>

					{filterOpen && (
						<div
							style={{
								padding: "0 16px 16px",
								display: "flex",
								flexDirection: "column",
								gap: 14,
							}}
						>
							{/* 지역 */}
							<FilterSection label="지역">
								<Chip
									active={region === null}
									label="전체"
									onClick={() => setRegion(null)}
								/>
								{regions.map((r) => (
									<Chip
										key={r}
										active={region === r}
										label={r}
										onClick={() => setRegion(region === r ? null : r)}
									/>
								))}
							</FilterSection>

							{/* 법원 */}
							<FilterSection label="법원 (복수 선택)">
								<Chip
									active={selectedCourts.length === 0}
									label="전체"
									onClick={() => setSelectedCourts([])}
								/>
								{courts.map((c) => (
									<Chip
										key={c}
										active={selectedCourts.includes(c)}
										label={shortCourt(c)}
										onClick={() => toggleCourt(c)}
									/>
								))}
							</FilterSection>

							{/* 최저가 */}
							<FilterSection label="최저가 (억원)">
								<RangeInput
									minValue={priceMin}
									maxValue={priceMax}
									onMin={setPriceMin}
									onMax={setPriceMax}
									placeholder={["최소", "최대"]}
									unit="억"
								/>
							</FilterSection>

							{/* 면적 */}
							<FilterSection
								label="면적"
								right={
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
													padding: "3px 10px",
													borderRadius: 6,
													border: "none",
													fontSize: 11,
													fontWeight: areaUnit === u ? 700 : 400,
													backgroundColor:
														areaUnit === u ? "#1B3D35" : "#F0F2EF",
													color: areaUnit === u ? "#fff" : "#5C6B66",
													cursor: "pointer",
												}}
											>
												{label}
											</button>
										))}
									</div>
								}
							>
								<RangeInput
									minValue={areaMin}
									maxValue={areaMax}
									onMin={setAreaMin}
									onMax={setAreaMax}
									placeholder={["최소", "최대"]}
									unit={areaUnit === "pyeong" ? "평" : "㎡"}
								/>
							</FilterSection>

							{/* 유찰 / 기타 */}
							<FilterSection label="유찰 · 기타">
								<Chip
									active={failFilter === "all"}
									label="전체"
									onClick={() => setFailFilter("all")}
								/>
								<Chip
									active={failFilter === "new"}
									label="신건만"
									onClick={() =>
										setFailFilter(failFilter === "new" ? "all" : "new")
									}
								/>
								<Chip
									active={failFilter === "failed"}
									label="유찰 1회 이상"
									onClick={() =>
										setFailFilter(failFilter === "failed" ? "all" : "failed")
									}
								/>
								<Chip
									active={excludeShare}
									label="지분매각 제외"
									onClick={() => setExcludeShare(!excludeShare)}
								/>
								<Chip
									active={includePast}
									label="지난 기일 포함"
									onClick={() => setIncludePast(!includePast)}
								/>
							</FilterSection>
						</div>
					)}
				</div>
			</div>

			{/* ── 결과 수 + 정렬 ── */}
			<div
				style={{
					padding: "0 20px 8px",
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<div style={{ fontSize: 13, color: "#5C6B66" }}>
					<strong style={{ color: "#1B3D35" }}>{filtered.length}건</strong>의
					물건이 있어요
				</div>
				<select
					value={sort}
					onChange={(e) => setSort(e.target.value as SortKey)}
					style={{
						border: "1px solid #E5E7E3",
						borderRadius: 8,
						padding: "6px 8px",
						fontSize: 12,
						color: "#1B3D35",
						backgroundColor: "#fff",
						outline: "none",
					}}
				>
					{SORT_OPTIONS.map(([key, label]) => (
						<option key={key} value={key}>
							{label}
						</option>
					))}
				</select>
			</div>

			{/* ── 물건 리스트 ── */}
			<div
				style={{
					padding: "0 20px 24px",
					display: "flex",
					flexDirection: "column",
					gap: 10,
				}}
			>
				{filtered.length === 0 ? (
					<div
						style={{
							textAlign: "center",
							padding: "48px 24px",
							color: "#9BA6A2",
						}}
					>
						<div style={{ fontSize: 40, marginBottom: 10 }}>🏚️</div>
						<div style={{ fontSize: 14, fontWeight: 600, color: "#5C6B66" }}>
							조건에 맞는 물건이 없어요
						</div>
						<div style={{ fontSize: 12, marginTop: 4 }}>
							필터를 조정해 보세요
						</div>
					</div>
				) : (
					filtered.map((item) => (
						<AuctionCard
							key={`${item.caseNo}|${item.itemNo}`}
							item={item}
							areaUnit={areaUnit}
						/>
					))
				)}

				{/* 데이터 초기화 */}
				{lastUploadAt && (
					<div style={{ textAlign: "center", marginTop: 8 }}>
						<TextButton
							size="xsmall"
							color={colors.grey500}
							onClick={() => {
								if (confirm("업로드한 데이터를 지우고 기본 데이터로 되돌릴까요?"))
									reset();
							}}
						>
							업로드 데이터 초기화
						</TextButton>
					</div>
				)}
			</div>
		</>
	);
}

/* ────────────────── 물건 카드 ────────────────── */
function AuctionCard({
	item,
	areaUnit,
}: {
	item: AuctionItem;
	areaUnit: "pyeong" | "m2";
}) {
	const [noteOpen, setNoteOpen] = useState(false);
	const dday = dDayLabel(item.saleDate);
	const isShare = item.note?.includes("지분") ?? false;
	const perPyeong = pricePerPyeong(item);
	const discounted = item.minRate < 100;

	return (
		<div
			style={{
				backgroundColor: "#fff",
				borderRadius: 14,
				border: "1px solid #E5E7E3",
				padding: 14,
			}}
		>
			{/* 배지 행 */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 6,
					marginBottom: 8,
					flexWrap: "wrap",
				}}
			>
				<Badge bg="#E7EFEC" color="#1B3D35">
					{shortCourt(item.court)}법원
				</Badge>
				{item.failCount === 0 ? (
					<Badge bg="#F0FFF4" color="#00B274">
						신건
					</Badge>
				) : (
					<Badge bg="#FFFBEB" color="#E65100">
						유찰 {item.failCount}회
					</Badge>
				)}
				{isShare && (
					<Badge bg="#FFF5F5" color="#F44336">
						지분매각
					</Badge>
				)}
				<span
					style={{
						marginLeft: "auto",
						fontSize: 12,
						fontWeight: 800,
						color: dday.color,
					}}
				>
					{item.saleDate.replace(/-/g, ".")} ({dday.label})
				</span>
			</div>

			{/* 주소 */}
			<div
				style={{
					fontSize: 14,
					fontWeight: 700,
					color: "#1B3D35",
					lineHeight: 1.4,
					marginBottom: 8,
				}}
			>
				{item.address}
			</div>

			{/* 가격 */}
			<div
				style={{
					display: "flex",
					alignItems: "baseline",
					gap: 8,
					marginBottom: 8,
				}}
			>
				<span style={{ fontSize: 18, fontWeight: 800, color: "#1B3D35" }}>
					{formatKRW(item.minPrice)}
				</span>
				<span
					style={{
						fontSize: 12,
						fontWeight: 700,
						color: discounted ? "#F44336" : "#9BA6A2",
					}}
				>
					감정가의 {item.minRate}%
				</span>
				{discounted && (
					<span
						style={{
							fontSize: 12,
							color: "#9BA6A2",
							textDecoration: "line-through",
						}}
					>
						{formatKRW(item.appraisal)}
					</span>
				)}
			</div>

			{/* 면적/평당가 */}
			<div
				style={{
					display: "flex",
					gap: 12,
					fontSize: 12,
					color: "#5C6B66",
					flexWrap: "wrap",
				}}
			>
				<span>
					{areaUnit === "pyeong"
						? `${item.areaPyeong}평 (${item.areaM2}㎡)`
						: `${item.areaM2}㎡ (${item.areaPyeong}평)`}
				</span>
				<span>평당 {formatKRW(Math.round(perPyeong))}</span>
				<span style={{ color: "#9BA6A2" }}>
					{item.caseNo.replace(item.court, "").trim()}
					{item.itemNo !== "1" && ` (물건 ${item.itemNo})`}
				</span>
			</div>

			{/* 비고 */}
			{item.note && (
				<div
					onClick={() => setNoteOpen(!noteOpen)}
					style={{
						marginTop: 10,
						padding: "8px 10px",
						backgroundColor: isShare ? "#FFF5F5" : "#FAF8F4",
						borderRadius: 8,
						fontSize: 11,
						color: isShare ? "#C62828" : "#5C6B66",
						lineHeight: 1.5,
						cursor: "pointer",
						...(noteOpen
							? {}
							: {
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap" as const,
								}),
					}}
				>
					📌 {item.note}
				</div>
			)}
		</div>
	);
}

/* ────────────────── 공통 소품 ────────────────── */
function FilterSection({
	label,
	right,
	children,
}: {
	label: string;
	right?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<div>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: 6,
				}}
			>
				<div style={{ fontSize: 12, fontWeight: 700, color: "#5C6B66" }}>
					{label}
				</div>
				{right}
			</div>
			<div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
				{children}
			</div>
		</div>
	);
}

function Badge({
	bg,
	color,
	children,
}: {
	bg: string;
	color: string;
	children: React.ReactNode;
}) {
	return (
		<span
			style={{
				padding: "2px 8px",
				borderRadius: 6,
				fontSize: 11,
				fontWeight: 700,
				backgroundColor: bg,
				color,
				whiteSpace: "nowrap",
			}}
		>
			{children}
		</span>
	);
}

function Chip({
	active,
	label,
	onClick,
}: {
	active: boolean;
	label: string;
	onClick: () => void;
}) {
	return (
		<button
			onClick={onClick}
			style={{
				padding: "7px 12px",
				borderRadius: 18,
				border: `1.5px solid ${active ? "#1B3D35" : "#E5E7E3"}`,
				backgroundColor: active ? "#1B3D35" : "#FAF8F4",
				color: active ? "#fff" : "#5C6B66",
				fontSize: 12,
				fontWeight: active ? 700 : 400,
				cursor: "pointer",
				whiteSpace: "nowrap",
			}}
		>
			{label}
		</button>
	);
}

function RangeInput({
	minValue,
	maxValue,
	onMin,
	onMax,
	placeholder,
	unit,
}: {
	minValue: string;
	maxValue: string;
	onMin: (v: string) => void;
	onMax: (v: string) => void;
	placeholder: [string, string];
	unit: string;
}) {
	const inputStyle: React.CSSProperties = {
		width: "100%",
		padding: "9px 10px",
		borderRadius: 8,
		border: "1.5px solid #E5E7E3",
		fontSize: 13,
		outline: "none",
		boxSizing: "border-box",
	};
	const sanitize = (v: string) => v.replace(/[^0-9.]/g, "");
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: 8,
				width: "100%",
			}}
		>
			<div style={{ flex: 1, position: "relative" }}>
				<input
					type="text"
					inputMode="decimal"
					value={minValue}
					onChange={(e) => onMin(sanitize(e.target.value))}
					placeholder={placeholder[0]}
					style={inputStyle}
				/>
			</div>
			<span style={{ color: "#9BA6A2", fontSize: 12, flexShrink: 0 }}>
				{unit} ~
			</span>
			<div style={{ flex: 1, position: "relative" }}>
				<input
					type="text"
					inputMode="decimal"
					value={maxValue}
					onChange={(e) => onMax(sanitize(e.target.value))}
					placeholder={placeholder[1]}
					style={inputStyle}
				/>
			</div>
			<span style={{ color: "#9BA6A2", fontSize: 12, flexShrink: 0 }}>
				{unit}
			</span>
		</div>
	);
}
