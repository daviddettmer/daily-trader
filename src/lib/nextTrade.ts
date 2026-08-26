import { Decimal } from "@prisma/client/runtime/library";
import { WatchlistItem } from "@prisma/client";
import { AlpacaPosition } from "./alpaca";
import {
  formatEtDateTime,
  getBuySubmitTime,
  getNextBuySession,
  getNextSellSession,
  getSellSubmitTime,
} from "./marketHours";

export type NextTrade = {
  action: "buy" | "sell";
  label: string;
  scheduledAt: Date;
  scheduledLabel: string;
  amountLabel: string;
};

export async function computeNextTrade(
  item: WatchlistItem,
  position: AlpacaPosition | null
): Promise<NextTrade> {
  const now = new Date();

  if (position && position.qty > 0) {
    const session = await getNextSellSession(now);
    if (!session) {
      return {
        action: "sell",
        label: `Selling ${position.qty} shares of ${item.symbol}`,
        scheduledAt: now,
        scheduledLabel: "Schedule unavailable",
        amountLabel: `${position.qty} shares`,
      };
    }

    const sellAt = getSellSubmitTime(session);
    const pending = decimalToNumber(item.pendingDeposit);
    const pendingNote =
      pending > 0 ? ` (+$${pending.toFixed(2)} queued for next buy)` : "";

    return {
      action: "sell",
      label: `Selling ${position.qty} shares of ${item.symbol}`,
      scheduledAt: sellAt,
      scheduledLabel: `${formatEtDateTime(sellAt)} (fills at open)${pendingNote}`,
      amountLabel: `${position.qty} shares`,
    };
  }

  const session = await getNextBuySession(now);
  if (!session) {
    const buyAmount =
      decimalToNumber(item.nextBuyNotional) +
      decimalToNumber(item.pendingDeposit);
    return {
      action: "buy",
      label: `Buying $${buyAmount.toFixed(2)} of ${item.symbol}`,
      scheduledAt: now,
      scheduledLabel: "Schedule unavailable",
      amountLabel: `$${buyAmount.toFixed(2)}`,
    };
  }

  const buyAt = getBuySubmitTime(session);
  const buyAmount =
    decimalToNumber(item.nextBuyNotional) +
    decimalToNumber(item.pendingDeposit);

  return {
    action: "buy",
    label: `Buying $${buyAmount.toFixed(2)} of ${item.symbol}`,
    scheduledAt: buyAt,
    scheduledLabel: formatEtDateTime(buyAt),
    amountLabel: `$${buyAmount.toFixed(2)}`,
  };
}

export function decimalToNumber(value: Decimal | number) {
  if (typeof value === "number") return value;
  return Number(value.toString());
}
