"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCurrency, formatShareQty } from "@/lib/format";

type TestOrderPanelProps = {
  itemId: string;
  symbol: string;
  testBuyNotional: number;
  shareQty: number;
  positionValue: number;
  inPosition: boolean;
  isPaper: boolean;
};

export function TestOrderPanel({
  itemId,
  symbol,
  testBuyNotional,
  shareQty,
  positionValue,
  inPosition,
  isPaper,
}: TestOrderPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"buy" | "sell" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shareLabel = formatShareQty(shareQty);

  async function runTest(action: "buy" | "sell") {
    const detail =
      action === "buy"
        ? `buy ${formatCurrency(testBuyNotional)} of ${symbol}`
        : `sell ${shareLabel} shares of ${symbol}`;

    const modeLabel = isPaper ? "paper" : "LIVE";
    if (
      !window.confirm(
        `Place a ${modeLabel} test order to ${detail}?${
          isPaper ? "" : " This uses real money."
        }`
      )
    ) {
      return;
    }

    setLoading(action);
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/watchlist/${itemId}/test-${action}`, {
      method: "POST",
    });
    const body = await response.json();
    setLoading(null);

    if (!response.ok) {
      setError(body.error ?? `Test ${action} failed`);
      return;
    }

    if (body.skipped) {
      setMessage(`Skipped: ${body.reason}`);
      return;
    }

    if (action === "buy") {
      setMessage(
        `Buy order placed (${formatCurrency(body.notional)}). Order ID: ${body.orderId}. Refresh in a few seconds once filled to see shares.`
      );
    } else {
      setMessage(
        `Sold ${formatShareQty(body.shareQty)} shares. Proceeds: ${formatCurrency(body.proceeds)}. Next buy: ${formatCurrency(body.nextBuyNotional)}. Order ID: ${body.orderId}`
      );
    }

    router.refresh();
  }

  return (
    <section
      className={`card space-y-4 border ${
        isPaper ? "border-amber-900/40 bg-amber-950/10" : "border-red-900/50 bg-red-950/10"
      }`}
    >
      <div>
        <h2 className="text-lg font-semibold text-amber-200">Test orders</h2>
        <p className="text-sm text-slate-400">
          Bypass cron time windows and place orders now to verify Alpaca connectivity.
          Test buy always uses {formatCurrency(testBuyNotional)} and does not change your
          configured next-buy amount.
        </p>
        {!isPaper ? (
          <p className="mt-2 text-sm font-medium text-red-300">
            Live trading mode — test orders use real money.
          </p>
        ) : null}
      </div>

      <p className="text-sm text-slate-300">
        Current position:{" "}
        {inPosition ? (
          <span className="font-medium text-emerald-300">
            {shareLabel} shares ({formatCurrency(positionValue)})
          </span>
        ) : (
          <span className="text-slate-500">No shares held</span>
        )}
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          className="btn btn-primary"
          disabled={loading !== null || inPosition}
          onClick={() => runTest("buy")}
        >
          {loading === "buy"
            ? "Buying..."
            : `Test buy ${formatCurrency(testBuyNotional)}`}
        </button>
        <button
          className="btn btn-secondary"
          disabled={loading !== null || !inPosition}
          onClick={() => runTest("sell")}
        >
          {loading === "sell"
            ? "Selling..."
            : inPosition
              ? `Test sell ${shareLabel} shares`
              : "Test sell (no shares held)"}
        </button>
      </div>
      {inPosition ? (
        <p className="text-xs text-slate-500">
          Buy is disabled while you hold a position. Sell to test the full cycle.
        </p>
      ) : (
        <p className="text-xs text-slate-500">
          After a test buy fills, refresh the page to see your share count before selling.
        </p>
      )}
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </section>
  );
}
