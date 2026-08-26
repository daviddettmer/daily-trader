import { db } from "./db";
import { getPositionsMap } from "./alpaca";
import { computeTotalEquity, lineEquity } from "./equity";
import { computeNextTrade, decimalToNumber } from "./nextTrade";
import { WatchlistRow } from "@/components/WatchlistTable";

export async function getDashboardData() {
  const items = await db.watchlistItem.findMany({
    orderBy: { symbol: "asc" },
  });
  const positions = await getPositionsMap();
  const snapshots = await db.equitySnapshot.findMany({
    orderBy: { capturedAt: "asc" },
    take: 120,
  });

  const rows: WatchlistRow[] = await Promise.all(
    items.map(async (item) => {
      const position = positions.get(item.symbol) ?? null;
      const nextTrade = await computeNextTrade(item, position);

      return {
        id: item.id,
        symbol: item.symbol,
        initialNotional: decimalToNumber(item.initialNotional),
        nextBuyNotional: decimalToNumber(item.nextBuyNotional),
        pendingDeposit: decimalToNumber(item.pendingDeposit),
        active: item.active,
        currentValue: lineEquity(item, position),
        nextTrade,
      };
    })
  );

  const totalEquity = computeTotalEquity(items, positions);

  return {
    rows,
    totalEquity,
    snapshots: snapshots.map((snapshot) => ({
      capturedAt: snapshot.capturedAt.toISOString(),
      totalEquity: decimalToNumber(snapshot.totalEquity),
    })),
  };
}
