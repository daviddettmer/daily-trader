import { WatchlistItem } from "@prisma/client";
import { db } from "./db";
import {
  buyNotional,
  getOrdersForSymbol,
  getPosition,
  getPositionsMap,
  orderProceeds,
  sellAtOpen,
  waitForOrderFill,
} from "./alpaca";
import { computeTotalEquity } from "./equity";
import { decimalToNumber } from "./nextTrade";

export async function buyWatchlistItem(item: WatchlistItem) {
  const position = await getPosition(item.symbol);
  if (position && position.qty > 0) {
    return { skipped: true, reason: "already_in_position" as const };
  }

  const notional =
    decimalToNumber(item.nextBuyNotional) + decimalToNumber(item.pendingDeposit);

  if (notional <= 0) {
    return { skipped: true, reason: "zero_notional" as const };
  }

  if (decimalToNumber(item.pendingDeposit) > 0) {
    await db.watchlistItem.update({
      where: { id: item.id },
      data: {
        nextBuyNotional: notional,
        pendingDeposit: 0,
      },
    });
  }

  const order = await buyNotional(item.symbol, notional);
  await captureEquitySnapshot();

  return {
    bought: true,
    orderId: order.id,
    notional,
    status: order.status,
  };
}

export async function reconcileWatchlistItemProceeds(item: WatchlistItem) {
  const position = await getPosition(item.symbol);
  if (position && position.qty > 0) return null;

  const orders = await getOrdersForSymbol(item.symbol, 14);
  const latestSell = orders.find(
    (order: { side: string; status: string }) =>
      order.side === "sell" && order.status === "filled"
  );
  if (!latestSell || latestSell.filledQty <= 0) return null;

  const latestBuy = orders.find(
    (order: { side: string; status: string; filledAt: string | null }) =>
      order.side === "buy" && order.status === "filled"
  );
  if (
    latestBuy?.filledAt &&
    latestSell.filledAt &&
    new Date(latestBuy.filledAt) > new Date(latestSell.filledAt)
  ) {
    return null;
  }

  const proceeds =
    latestSell.filledQty * (latestSell.filledAvgPrice ?? 0);
  if (proceeds <= 0) return null;

  const pending = decimalToNumber(item.pendingDeposit);
  const expected = proceeds + pending;
  const current = decimalToNumber(item.nextBuyNotional);

  if (Math.abs(current - expected) < 0.01) return null;

  await db.watchlistItem.update({
    where: { id: item.id },
    data: { nextBuyNotional: expected },
  });

  return { symbol: item.symbol, proceeds: expected, previous: current };
}

export async function reconcileAllWatchlistProceeds() {
  const items = await db.watchlistItem.findMany({ where: { active: true } });
  const results = [];
  for (const item of items) {
    try {
      const result = await reconcileWatchlistItemProceeds(item);
      if (result) results.push(result);
    } catch (error) {
      results.push({
        symbol: item.symbol,
        error: error instanceof Error ? error.message : "reconcile_failed",
      });
    }
  }
  return results;
}

export async function sellWatchlistItem(item: WatchlistItem) {
  const position = await getPosition(item.symbol);
  if (!position || position.qty <= 0) {
    return { skipped: true, reason: "no_position" as const };
  }

  const shareQty = position.qty;
  const order = await sellAtOpen(item.symbol, shareQty);
  const filled = await waitForOrderFill(order.id, 5);
  const proceeds = orderProceeds(filled);

  if (filled.status === "filled" && proceeds > 0) {
    const pending = decimalToNumber(item.pendingDeposit);
    await db.watchlistItem.update({
      where: { id: item.id },
      data: {
        nextBuyNotional: proceeds + pending,
        pendingDeposit: 0,
      },
    });
    await captureEquitySnapshot();

    return {
      sold: true,
      orderId: order.id,
      shareQty,
      proceeds,
      nextBuyNotional: proceeds + pending,
      status: filled.status,
    };
  }

  // Pre-open sell fills at the regular open — reconcile proceeds later.
  return {
    sold: true,
    orderId: order.id,
    shareQty,
    proceeds: 0,
    pendingFill: true,
    nextBuyNotional: decimalToNumber(item.nextBuyNotional),
    status: filled.status,
  };
}

export async function testBuyWatchlistItem(
  item: WatchlistItem,
  notional: number
) {
  const position = await getPosition(item.symbol);
  if (position && position.qty > 0) {
    return { skipped: true, reason: "already_in_position" as const };
  }

  const order = await buyNotional(item.symbol, notional);
  await captureEquitySnapshot();

  return {
    bought: true,
    orderId: order.id,
    notional,
    status: order.status,
  };
}

export async function processSellCron() {
  const items = await db.watchlistItem.findMany({ where: { active: true } });
  const results: Array<Record<string, unknown>> = [];

  for (const item of items) {
    try {
      const result = await sellWatchlistItem(item);
      results.push({ symbol: item.symbol, ...result });
    } catch (error) {
      results.push({
        symbol: item.symbol,
        error: error instanceof Error ? error.message : "sell_failed",
      });
    }
  }

  const reconciled = await reconcileAllWatchlistProceeds();
  if (reconciled.length > 0) {
    results.push({ reconciled });
  }

  return results;
}

export async function processBuyCron() {
  await reconcileAllWatchlistProceeds();

  const items = await db.watchlistItem.findMany({ where: { active: true } });
  const results: Array<Record<string, unknown>> = [];

  for (const item of items) {
    try {
      const result = await buyWatchlistItem(item);
      results.push({ symbol: item.symbol, ...result });
    } catch (error) {
      results.push({
        symbol: item.symbol,
        error: error instanceof Error ? error.message : "buy_failed",
      });
    }
  }

  return results;
}

export async function captureEquitySnapshot() {
  const items = await db.watchlistItem.findMany({ where: { active: true } });
  const positions = await getPositionsMap();
  const totalEquity = computeTotalEquity(items, positions);

  await db.equitySnapshot.create({
    data: { totalEquity },
  });
}
