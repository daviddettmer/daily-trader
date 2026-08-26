import Link from "next/link";
import { notFound } from "next/navigation";
import { AddMoneyWithRefresh } from "@/components/AddMoneyWithRefresh";
import { NextTradeBadge } from "@/components/NextTradeBadge";
import { TestOrderPanel } from "@/components/TestOrderPanel";
import { getOrdersForSymbol, getPosition, type AlpacaOrder } from "@/lib/alpaca";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { lineEquity } from "@/lib/equity";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { computeNextTrade, decimalToNumber } from "@/lib/nextTrade";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ symbol: string }>;
};

export default async function SymbolDetailPage({ params }: PageProps) {
  const { symbol: rawSymbol } = await params;
  const symbol = rawSymbol.toUpperCase();

  const item = await db.watchlistItem.findUnique({ where: { symbol } });
  if (!item) notFound();

  let position = null;
  let orders: AlpacaOrder[] = [];
  let alpacaError: string | null = null;

  try {
    position = await getPosition(symbol);
    orders = await getOrdersForSymbol(symbol, 30);
  } catch (error) {
    alpacaError =
      error instanceof Error ? error.message : "Could not load Alpaca data";
  }

  let nextTrade;
  try {
    nextTrade = await computeNextTrade(item, position);
  } catch (error) {
    nextTrade = {
      action: "buy" as const,
      label: `Next trade for ${symbol}`,
      scheduledAt: new Date(),
      scheduledLabel: "Schedule unavailable",
      amountLabel: formatCurrency(decimalToNumber(item.nextBuyNotional)),
    };
    alpacaError ??=
      error instanceof Error ? error.message : "Could not load market schedule";
  }

  const currentValue = lineEquity(item, position);
  const inPosition = Boolean(position && position.qty > 0);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div>
        <Link href="/" className="text-sm text-emerald-300 hover:underline">
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 text-3xl font-semibold">{symbol}</h1>
      </div>

      {alpacaError ? (
        <div className="rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-200">
          Alpaca warning: {alpacaError}. Try refreshing in a few seconds.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <p className="text-sm text-slate-400">Current value</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrency(currentValue)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-400">Starting amount</p>
          <p className="mt-2 text-2xl font-semibold">
            {formatCurrency(decimalToNumber(item.initialNotional))}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-400">Next buy amount</p>
          <p className="mt-2 text-2xl font-semibold">
            {formatCurrency(decimalToNumber(item.nextBuyNotional))}
          </p>
          {decimalToNumber(item.pendingDeposit) > 0 ? (
            <p className="mt-1 text-xs text-emerald-300">
              +{formatCurrency(decimalToNumber(item.pendingDeposit))} queued
            </p>
          ) : null}
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Next trade</h2>
        <NextTradeBadge trade={nextTrade} />
        <AddMoneyWithRefresh itemId={item.id} />
      </section>

      <TestOrderPanel
        itemId={item.id}
        symbol={symbol}
        testBuyNotional={config.testBuyNotional}
        shareQty={position?.qty ?? 0}
        positionValue={position?.marketValue ?? 0}
        inPosition={inPosition}
        isPaper={config.alpacaPaper}
      />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Trades (last 30 days)</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Side</th>
                <th>Qty</th>
                <th>Notional</th>
                <th>Fill price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-slate-400">
                    No orders yet for {symbol}.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id}>
                    <td>{formatDateTime(order.submittedAt)}</td>
                    <td className="capitalize">{order.side}</td>
                    <td>{order.filledQty || order.qty || "—"}</td>
                    <td>
                      {order.notional
                        ? formatCurrency(order.notional)
                        : order.filledQty && order.filledAvgPrice
                          ? formatCurrency(order.filledQty * order.filledAvgPrice)
                          : "—"}
                    </td>
                    <td>
                      {order.filledAvgPrice
                        ? formatCurrency(order.filledAvgPrice)
                        : "—"}
                    </td>
                    <td className="capitalize">{order.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
