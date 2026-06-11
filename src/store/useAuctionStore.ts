import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuctionItem, AuctionRecord } from "../types";
import { auctionKey } from "../utils/auctionXlsx";
import seed from "../data/auctionSeed.json";

interface ImportResult {
	added: number;
	updated: number;
}

interface AuctionState {
	items: AuctionItem[];
	/** 가장 최근 데이터 기준일 (요약 시트 작성일) */
	dataDate: string | null;
	/** 마지막 업로드 시각 (ISO) */
	lastUploadAt: string | null;
	/** 함께 출시된 시드 데이터의 기준일 — 새 버전 시드 반영 판단용 */
	seedDataDate: string;
	/** 관심 물건 키 목록 (auctionKey) */
	favorites: string[];
	/** 물건별 임장/입찰 기록 (key = auctionKey) */
	records: Record<string, AuctionRecord>;
	/** 업로드로 최저가가 바뀐 물건의 직전 가격 (key = auctionKey) */
	prevPrices: Record<string, number>;
	/** 업로드한 파일 데이터를 기존 목록에 병합해요 (같은 사건번호는 새 데이터로 갱신) */
	importItems: (items: AuctionItem[], dataDate: string | null) => ImportResult;
	toggleFavorite: (key: string) => void;
	saveRecord: (key: string, record: AuctionRecord) => void;
	deleteRecord: (key: string) => void;
	/** 업로드 데이터를 모두 지우고 시드 데이터로 되돌려요 (관심·기록은 유지) */
	reset: () => void;
}

const seedItems = seed.items as AuctionItem[];

function mergeItems(
	existing: AuctionItem[],
	incoming: AuctionItem[],
	/** false면 기존 물건은 두고 새 물건만 추가해요 (오래된 파일 업로드 대비) */
	overwrite = true,
): {
	merged: AuctionItem[];
	added: number;
	updated: number;
	priceChanges: Record<string, number>;
} {
	const map = new Map(existing.map((i) => [auctionKey(i), i]));
	let added = 0;
	let updated = 0;
	const priceChanges: Record<string, number> = {};
	for (const item of incoming) {
		const key = auctionKey(item);
		const prev = map.get(key);
		if (prev) {
			if (!overwrite) continue;
			updated++;
			if (prev.minPrice !== item.minPrice) priceChanges[key] = prev.minPrice;
		} else {
			added++;
		}
		map.set(key, item);
	}
	return { merged: [...map.values()], added, updated, priceChanges };
}

export const useAuctionStore = create<AuctionState>()(
	persist(
		(set, get) => ({
			items: seedItems,
			dataDate: seed.dataDate,
			lastUploadAt: null,
			seedDataDate: seed.dataDate,
			favorites: [],
			records: {},
			prevPrices: {},

			importItems: (incoming, dataDate) => {
				const current = get().dataDate;
				// 더 오래된 파일을 올리면 기존 데이터는 유지하고 새 물건만 추가해요
				const isOlder = !!dataDate && !!current && dataDate < current;
				const { merged, added, updated, priceChanges } = mergeItems(
					get().items,
					incoming,
					!isOlder,
				);
				set({
					items: merged,
					dataDate:
						dataDate && (!current || dataDate > current) ? dataDate : current,
					lastUploadAt: new Date().toISOString(),
					// 새 업로드 기준의 변동만 보여줘요
					prevPrices:
						Object.keys(priceChanges).length > 0
							? priceChanges
							: get().prevPrices,
				});
				return { added, updated };
			},

			toggleFavorite: (key) =>
				set((s) => ({
					favorites: s.favorites.includes(key)
						? s.favorites.filter((k) => k !== key)
						: [...s.favorites, key],
				})),

			saveRecord: (key, record) =>
				set((s) => ({ records: { ...s.records, [key]: record } })),

			deleteRecord: (key) =>
				set((s) => {
					const next = { ...s.records };
					delete next[key];
					return { records: next };
				}),

			reset: () =>
				set({
					items: seedItems,
					dataDate: seed.dataDate,
					lastUploadAt: null,
					seedDataDate: seed.dataDate,
					prevPrices: {},
				}),
		}),
		{
			name: "homey-auction",
			merge: (persisted, current) => {
				const p = persisted as Partial<AuctionState> | undefined;
				if (!p?.items) return current;
				// 앱 업데이트로 더 최신 시드가 배포됐다면 시드를 병합해요
				if (p.seedDataDate !== seed.dataDate) {
					const { merged } = mergeItems(p.items, seedItems);
					return {
						...current,
						...p,
						items: merged,
						seedDataDate: seed.dataDate,
						dataDate:
							p.dataDate && p.dataDate > seed.dataDate
								? p.dataDate
								: seed.dataDate,
					};
				}
				return { ...current, ...p };
			},
		},
	),
);
