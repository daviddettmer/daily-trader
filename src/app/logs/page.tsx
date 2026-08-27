import Link from "next/link";
import { AppNavLinks } from "@/components/AppNavLinks";
import { LogoutButton } from "@/components/LogoutButton";
import { getCronRuns } from "@/lib/cronLog";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

function statusClass(status: string) {
  switch (status) {
    case "ok":
      return "text-emerald-300";
    case "skipped":
      return "text-slate-300";
    case "error":
      return "text-red-300";
    case "unauthorized":
      return "text-amber-300";
    default:
      return "text-slate-300";
  }
}

function formatDetails(details: unknown) {
  if (details === null || details === undefined) return "—";
  return JSON.stringify(details, null, 2);
}

export default async function LogsPage() {
  const runs = await getCronRuns();

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Cron logs</h1>
          <p className="text-sm text-slate-400">
            Every scheduled buy/sell cron invocation, stored in your database.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <AppNavLinks />
          <LogoutButton />
        </div>
      </header>

      <section className="space-y-4">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time (ET)</th>
                <th>Route</th>
                <th>Status</th>
                <th>Reason</th>
                <th>Error</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-slate-400">
                    No cron runs logged yet. They appear here after the next buy or sell cron
                    fires.
                  </td>
                </tr>
              ) : (
                runs.map((run) => (
                  <tr key={run.id}>
                    <td className="whitespace-nowrap">{formatDateTime(run.createdAt)}</td>
                    <td className="uppercase">{run.route}</td>
                    <td className={`capitalize ${statusClass(run.status)}`}>{run.status}</td>
                    <td>{run.reason ?? "—"}</td>
                    <td className="max-w-xs text-red-200">{run.error ?? "—"}</td>
                    <td>
                      <pre className="max-h-40 max-w-md overflow-auto whitespace-pre-wrap text-xs text-slate-400">
                        {formatDetails(run.details)}
                      </pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {runs.length > 0 ? (
          <p className="text-xs text-slate-500">Showing the most recent {runs.length} runs.</p>
        ) : null}
      </section>

      <Link href="/" className="text-sm text-emerald-300 hover:underline">
        ← Back to dashboard
      </Link>
    </main>
  );
}
