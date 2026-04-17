import { useCallback, useState } from "react";
import { Button, Top, TextButton } from "@toss/tds-mobile";
import { colors } from "@toss/tds-colors";
import { searchAddress } from "../services/addressSearch";
import { useAppStore } from "../store/useAppStore";
import type { Address } from "../types";
import type { Page } from "../App";

interface Props {
	mode?: "myhome";
	onBack: () => void;
	nav: (p: Page) => void;
}

export function DiagnosisSearchPage({ mode, onBack, nav }: Props) {
	const { setCurrentAddress } = useAppStore();
	const [keyword, setKeyword] = useState("");
	const [results, setResults] = useState<Address[]>([]);
	const [loading, setLoading] = useState(false);
	const [searched, setSearched] = useState(false);
	const [selected, setSelected] = useState<Address | null>(null);
	const [detail, setDetail] = useState("");

	const handleSearch = useCallback(async () => {
		const q = keyword.trim();
		if (!q || q.length < 2) return;
		setSelected(null);
		setDetail("");
		setLoading(true);
		setSearched(true);
		try {
			setResults(await searchAddress(q));
		} catch {
			setResults([]);
		} finally {
			setLoading(false);
		}
	}, [keyword]);

	const handleConfirm = () => {
		if (!selected) return;
		setCurrentAddress({ ...selected, detailAddress: detail.trim() || undefined });
		if (mode === "myhome") nav({ type: "myhome-deposit" });
		else nav({ type: "diagnosis-deposit" });
	};

	return (
		<>
			<Top
				title={<Top.TitleParagraph size={22}>주소 검색</Top.TitleParagraph>}
				subtitleBottom={
					<Top.SubtitleParagraph size={17}>
						{mode === "myhome"
							? "등록할 집의 주소를 검색해주세요"
							: "진단할 물건의 주소를 검색해주세요"}
					</Top.SubtitleParagraph>
				}
			/>

			<div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
				{/* Search input */}
				<div style={{ display: "flex", gap: 8 }}>
					<input
						type="text"
						value={keyword}
						onChange={(e) => setKeyword(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleSearch()}
						placeholder="주소 또는 건물명"
						style={{
							flex: 1,
							padding: "12px 14px",
							borderRadius: 10,
							border: "1.5px solid #E5E7E3",
							fontSize: 14,
							outline: "none",
						}}
					/>
					<Button size="small" variant="weak" loading={loading} onClick={handleSearch}>
						검색
					</Button>
				</div>

				{/* Selected address → detail input */}
				{selected && (
					<div
						style={{
							backgroundColor: "#E7EFEC",
							borderRadius: 12,
							padding: 14,
							borderLeft: "4px solid #1B3D35",
						}}
					>
						<div style={{ fontSize: 14, fontWeight: 600 }}>
							{selected.roadAddress}
						</div>
						{selected.buildingName && (
							<div style={{ fontSize: 12, color: "#5C6B66", marginTop: 2 }}>
								{selected.buildingName}
							</div>
						)}
						<input
							type="text"
							value={detail}
							onChange={(e) => setDetail(e.target.value)}
							placeholder="상세주소 (동/호수)"
							style={{
								width: "100%",
								marginTop: 10,
								padding: "10px 12px",
								borderRadius: 8,
								border: "1.5px solid #1B3D35",
								fontSize: 14,
								outline: "none",
								boxSizing: "border-box",
							}}
							autoFocus
						/>
						<div style={{ marginTop: 10 }}>
							<Button color="dark" onClick={handleConfirm}>
								이 주소로 진행하기
							</Button>
						</div>
						<div style={{ marginTop: 8, textAlign: "center" }}>
							<TextButton size="small" color={colors.grey600} onClick={() => setSelected(null)}>
								다른 주소 선택
							</TextButton>
						</div>
					</div>
				)}

				{/* Search results */}
				{!selected && searched && (
					<>
						{results.length === 0 && !loading ? (
							<div style={{ textAlign: "center", padding: 24, color: "#5C6B66" }}>
								검색 결과가 없어요
							</div>
						) : (
							results.map((addr, i) => (
								<div
									key={i}
									onClick={() => setSelected(addr)}
									style={{
										padding: 14,
										backgroundColor: "#fff",
										borderRadius: 10,
										border: "1px solid #E5E7E3",
										cursor: "pointer",
									}}
								>
									<div style={{ fontSize: 14, fontWeight: 600 }}>
										{addr.roadAddress}
									</div>
									<div style={{ fontSize: 12, color: "#5C6B66", marginTop: 2 }}>
										{addr.jibunAddress}
										{addr.buildingName && ` · ${addr.buildingName}`}
									</div>
								</div>
							))
						)}
					</>
				)}
			</div>

			<TextButton style={{ padding: "8px 24px" }} size="medium" color={colors.blue500} onClick={onBack}>
				← 홈으로
			</TextButton>
		</>
	);
}
