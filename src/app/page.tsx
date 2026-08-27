import { AddTickerForm } from "@/components/AddTickerForm";
import { EquityChart } from "@/components/EquityChart";
import { LogoutButton } from "@/components/LogoutButton";
import { WatchlistTable } from "@/components/WatchlistTable";
import { getDashboardData } from "@/lib/dashboard";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Daily Trader</h1>
          <p className="text-sm text-slate-400">
            Overnight buy-at-close / sell-at-open compounding strategy
          </p>
        </div>
        <LogoutButton />
      </header>

      {data.alpacaError ? (
        <div className="rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-200">
          {data.alpacaError}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-[1fr_2fr]">
        <div className="card">
          <p className="text-sm text-slate-400">Strategy total</p>
          <p className="mt-2 text-4xl font-semibold text-emerald-300">
            {formatCurrency(data.totalEquity)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Sum of watchlist positions and allocated cash waiting to buy.
          </p>
        </div>
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold">Growth</h2>
          <EquityChart data={data.snapshots} />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Watchlist</h2>
        </div>
        <WatchlistTable rows={data.rows} />
      </section>

      <AddTickerForm />
    </main>
  );
}
