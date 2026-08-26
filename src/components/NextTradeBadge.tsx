import { NextTrade } from "@/lib/nextTrade";

export function NextTradeBadge({ trade }: { trade: NextTrade }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className={trade.action === "buy" ? "badge-buy" : "badge-sell"}>
          {trade.action === "buy" ? "Buy" : "Sell"}
        </span>
        <span className="text-sm font-medium text-slate-100">{trade.label}</span>
      </div>
      <p className="text-xs text-slate-400">{trade.scheduledLabel}</p>
    </div>
  );
}
