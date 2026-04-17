export interface TradeRecord {
	dealAmount: number;
	dealYear: number;
	dealMonth: number;
	dealDay: number;
	area: number;
	floor: number;
}

export async function getRecentTrades(): Promise<TradeRecord[]> {
	// Mock data — in production, call MOLIT API
	return [
		{ dealAmount: 71000, dealYear: 2025, dealMonth: 1, dealDay: 15, area: 59.9, floor: 5 },
		{ dealAmount: 68000, dealYear: 2024, dealMonth: 11, dealDay: 22, area: 59.9, floor: 3 },
		{ dealAmount: 72000, dealYear: 2024, dealMonth: 9, dealDay: 8, area: 59.9, floor: 7 },
	];
}

export function estimateRealTradePrice(trades: TradeRecord[]): number {
	if (trades.length === 0) return 0;
	const recent = trades.slice(0, 5);
	return Math.round(recent.reduce((s, t) => s + t.dealAmount, 0) / recent.length);
}
