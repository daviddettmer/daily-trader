"use client";

import { useState } from "react";

export function AddMoneyForm({ itemId, onAdded }: { itemId: string; onAdded?: () => void }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const response = await fetch(`/api/watchlist/${itemId}/deposit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount) }),
    });

    setLoading(false);

    if (!response.ok) {
      const body = await response.json();
      setMessage(body.error ?? "Failed to add money");
      return;
    }

    setAmount("");
    setMessage("Added successfully");
    onAdded?.();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="label">Add money</label>
        <input
          className="input w-28"
          type="number"
          min="1"
          step="0.01"
          placeholder="200"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />
      </div>
      <button className="btn btn-secondary" type="submit" disabled={loading}>
        {loading ? "Adding..." : "Add"}
      </button>
      {message ? <p className="text-xs text-slate-400">{message}</p> : null}
    </form>
  );
}
