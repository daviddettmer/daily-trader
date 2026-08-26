"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AddMoneyForm } from "./AddMoneyForm";
import { NextTradeBadge } from "./NextTradeBadge";
import { formatCurrency } from "@/lib/format";
import { NextTrade } from "@/lib/nextTrade";

export type WatchlistRow = {
  id: string;
  symbol: string;
  initialNotional: number;
  nextBuyNotional: number;
  pendingDeposit: number;
  active: boolean;
  currentValue: number;
  nextTrade: NextTrade;
};

export function WatchlistTable({ rows }: { rows: WatchlistRow[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function mutate(id: string, method: "PATCH" | "DELETE", body?: object) {
    setLoadingId(id);
    await fetch(`/api/watchlist/${id}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    setLoadingId(null);
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <div className="card text-sm text-slate-400">
        No tickers yet. Add one below to start the overnight cycle.
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Current value</th>
            <th>Starting</th>
            <th>Next buy $</th>
            <th>Next trade</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <Link
                  href={`/symbols/${row.symbol}`}
                  className="font-semibold text-emerald-300 hover:underline"
                >
                  {row.symbol}
                </Link>
                {!row.active ? (
                  <span className="ml-2 text-xs text-slate-500">(paused)</span>
                ) : null}
              </td>
              <td>{formatCurrency(row.currentValue)}</td>
              <td>{formatCurrency(row.initialNotional)}</td>
              <td>
                {formatCurrency(row.nextBuyNotional)}
                {row.pendingDeposit > 0 ? (
                  <span className="block text-xs text-emerald-300">
                    +{formatCurrency(row.pendingDeposit)} queued
                  </span>
                ) : null}
              </td>
              <td>
                <NextTradeBadge trade={row.nextTrade} />
              </td>
              <td className="space-y-2">
                <AddMoneyForm itemId={row.id} onAdded={() => router.refresh()} />
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn btn-secondary"
                    disabled={loadingId === row.id}
                    onClick={() =>
                      mutate(row.id, "PATCH", { active: !row.active })
                    }
                  >
                    {row.active ? "Pause" : "Resume"}
                  </button>
                  <button
                    className="btn btn-danger"
                    disabled={loadingId === row.id}
                    onClick={() => mutate(row.id, "DELETE")}
                  >
                    Remove
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
