import Link from "next/link";

export function AppNavLinks() {
  return (
    <nav className="flex items-center gap-3 text-sm">
      <Link href="/" className="text-slate-400 transition hover:text-slate-200">
        Dashboard
      </Link>
      <Link href="/logs" className="text-slate-400 transition hover:text-slate-200">
        Logs
      </Link>
    </nav>
  );
}
