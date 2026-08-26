import { WatchlistItem } from "@prisma/client";
import { db } from "./db";
import {
  buyNotional,
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

export async function sellWatchlistItem(item: WatchlistItem) {
  const position = await getPosition(item.symbol);
  if (!position || position.qty <= 0) {
    return { skipped: true, reason: "no_position" as const };
  }

  const shareQty = position.qty;
  const order = await sellAtOpen(item.symbol, shareQty);
  const filled = await waitForOrderFill(order.id);
  const proceeds = orderProceeds(filled);
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

  return results;
}

export async function processBuyCron() {
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
