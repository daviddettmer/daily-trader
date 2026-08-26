import Alpaca from "@alpacahq/alpaca-trade-api";
import { config } from "./config";

let client: Alpaca | null = null;

export function getAlpacaClient() {
  if (!client) {
    client = new Alpaca({
      keyId: config.alpacaApiKey,
      secretKey: config.alpacaSecretKey,
      paper: config.alpacaPaper,
    });
  }
  return client;
}

export type AlpacaPosition = {
  symbol: string;
  qty: number;
  marketValue: number;
  currentPrice: number;
};

export type AlpacaOrder = {
  id: string;
  symbol: string;
  side: string;
  type: string;
  qty: number | null;
  notional: number | null;
  filledQty: number;
  filledAvgPrice: number | null;
  status: string;
  submittedAt: string;
  filledAt: string | null;
};

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value);
}

export async function getPositionsMap() {
  const alpaca = getAlpacaClient();
  const positions = await alpaca.getPositions();
  const map = new Map<string, AlpacaPosition>();

  for (const position of positions) {
    map.set(position.symbol, {
      symbol: position.symbol,
      qty: toNumber(position.qty),
      marketValue: toNumber(position.market_value),
      currentPrice: toNumber(position.current_price),
    });
  }

  return map;
}

export async function getPosition(symbol: string) {
  const alpaca = getAlpacaClient();
  try {
    const position = await alpaca.getPosition(symbol);
    return {
      symbol: position.symbol,
      qty: toNumber(position.qty),
      marketValue: toNumber(position.market_value),
      currentPrice: toNumber(position.current_price),
    } satisfies AlpacaPosition;
  } catch {
    return null;
  }
}

export async function validateSymbol(symbol: string) {
  const alpaca = getAlpacaClient();
  const asset = await alpaca.getAsset(symbol.toUpperCase());
  if (!asset.tradable) {
    throw new Error(`${symbol} is not tradable on Alpaca`);
  }
  return asset.symbol as string;
}

export async function buyNotional(symbol: string, notional: number) {
  const alpaca = getAlpacaClient();
  const order = await alpaca.createOrder({
    symbol: symbol.toUpperCase(),
    notional: notional.toFixed(2),
    side: "buy",
    type: "market",
    time_in_force: "day",
  });
  return order;
}

export async function sellAtOpen(symbol: string, qty: number) {
  const alpaca = getAlpacaClient();
  const order = await alpaca.createOrder({
    symbol: symbol.toUpperCase(),
    qty: qty.toString(),
    side: "sell",
    type: "market",
    time_in_force: "day",
    extended_hours: false,
  });
  return order;
}

export async function waitForOrderFill(orderId: string, maxAttempts = 20) {
  const alpaca = getAlpacaClient();
  for (let i = 0; i < maxAttempts; i++) {
    const order = await alpaca.getOrder(orderId);
    if (order.status === "filled") {
      return order;
    }
    if (["canceled", "expired", "rejected"].includes(order.status)) {
      throw new Error(`Order ${orderId} ended with status ${order.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return alpaca.getOrder(orderId);
}

export function orderProceeds(order: {
  filled_qty?: string | number | null;
  filled_avg_price?: string | number | null;
}) {
  const qty = toNumber(order.filled_qty);
  const price = toNumber(order.filled_avg_price);
  return qty * price;
}

export async function getOrdersForSymbol(symbol: string, days = 30) {
  const alpaca = getAlpacaClient();
  const after = new Date();
  after.setDate(after.getDate() - days);

  try {
    const orders = await alpaca.getOrders({
      status: "all",
      after: after.toISOString(),
      until: undefined,
      limit: 100,
      direction: "desc",
      nested: true,
      symbols: symbol.toUpperCase(),
    });

    return orders.map((order: {
    id: string;
    symbol: string;
    side: string;
    type: string;
    qty?: string | number | null;
    notional?: string | number | null;
    filled_qty?: string | number | null;
    filled_avg_price?: string | number | null;
    status: string;
    submitted_at: string;
    filled_at?: string | null;
  }): AlpacaOrder => ({
      id: order.id,
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      qty: order.qty ? toNumber(order.qty) : null,
      notional: order.notional ? toNumber(order.notional) : null,
      filledQty: toNumber(order.filled_qty),
      filledAvgPrice: order.filled_avg_price
        ? toNumber(order.filled_avg_price)
        : null,
      status: order.status,
      submittedAt: order.submitted_at,
      filledAt: order.filled_at ?? null,
    }));
  } catch {
    return [];
  }
}

export async function getClock() {
  const alpaca = getAlpacaClient();
  return alpaca.getClock();
}

export async function getCalendar(start: string, end: string) {
  const alpaca = getAlpacaClient();
  return alpaca.getCalendar({ start, end });
}
