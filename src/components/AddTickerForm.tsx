"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddTickerForm() {
  const router = useRouter();
  const [symbol, setSymbol] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, amount: Number(amount) }),
    });

    setLoading(false);

    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Failed to add ticker");
      return;
    }

    setSymbol("");
    setAmount("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Add ticker</h2>
        <p className="text-sm text-slate-400">
          Buys at close, sells at open, and reinvests proceeds automatically.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="symbol">
            Symbol
          </label>
          <input
            id="symbol"
            className="input"
            value={symbol}
            onChange={(event) => setSymbol(event.target.value.toUpperCase())}
            placeholder="AAPL"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="amount">
            Starting amount (USD)
          </label>
          <input
            id="amount"
            className="input"
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="100"
            required
          />
        </div>
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Adding..." : "Add to watchlist"}
      </button>
    </form>
  );
}
