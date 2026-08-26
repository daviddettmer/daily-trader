import { WatchlistItem } from "@prisma/client";
import { AlpacaPosition } from "./alpaca";
import { decimalToNumber } from "./nextTrade";

export function lineEquity(
  item: WatchlistItem,
  position: AlpacaPosition | null
) {
  if (position && position.qty > 0) {
    return position.marketValue;
  }
  return (
    decimalToNumber(item.nextBuyNotional) + decimalToNumber(item.pendingDeposit)
  );
}

export function computeTotalEquity(
  items: WatchlistItem[],
  positions: Map<string, AlpacaPosition>
) {
  return items.reduce((total, item) => {
    if (!item.active) return total;
    const position = positions.get(item.symbol) ?? null;
    return total + lineEquity(item, position);
  }, 0);
}
