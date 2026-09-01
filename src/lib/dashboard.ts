import { db } from "./db";
import { getPositionsMap } from "./alpaca";
import { config } from "./config";
import { reconcileAllWatchlistProceeds } from "./strategy";
import { computeTotalEquity, lineEquity } from "./equity";
import { computeNextTrade, decimalToNumber } from "./nextTrade";
import { WatchlistRow } from "@/components/WatchlistTable";

export async function getDashboardData() {
  await reconcileAllWatchlistProceeds();

  const items = await db.watchlistItem.findMany({
    orderBy: { symbol: "asc" },
  });
  const snapshots = await db.equitySnapshot.findMany({
    orderBy: { capturedAt: "asc" },
    take: 120,
  });

  let positions = new Map();
  let alpacaError: string | null = null;

  if (!config.alpacaApiKey || !config.alpacaSecretKey) {
    alpacaError =
      "ALPACA_API_KEY or ALPACA_SECRET_KEY is missing in this Vercel environment.";
  } else {
    try {
      positions = await getPositionsMap();
    } catch (error) {
      const status =
        error && typeof error === "object" && "response" in error
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;
      if (status === 401) {
        alpacaError =
          "Alpaca returned 401 Unauthorized. Check that Preview env vars use paper API keys, ALPACA_PAPER=true, and values have no quotes. Then redeploy.";
      } else {
        alpacaError =
          error instanceof Error
            ? error.message
            : "Could not load Alpaca positions.";
      }
    }
  }

  const rows: WatchlistRow[] = await Promise.all(
    items.map(async (item) => {
      const position = positions.get(item.symbol) ?? null;
      let nextTrade;
      try {
        nextTrade = await computeNextTrade(item, position);
      } catch {
        nextTrade = {
          action: "buy" as const,
          label: `Next trade for ${item.symbol}`,
          scheduledAt: new Date(),
          scheduledLabel: "Schedule unavailable",
          amountLabel: `$${decimalToNumber(item.nextBuyNotional).toFixed(2)}`,
        };
      }

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
    alpacaError,
    snapshots: snapshots.map((snapshot) => ({
      capturedAt: snapshot.capturedAt.toISOString(),
      totalEquity: decimalToNumber(snapshot.totalEquity),
    })),
  };
}
