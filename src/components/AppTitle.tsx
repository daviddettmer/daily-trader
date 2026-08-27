import { config } from "@/lib/config";

export function AppTitle({ className = "" }: { className?: string }) {
  return (
    <span className={className}>
      Daily Trader
      {config.isPreview ? (
        <span className="font-normal text-slate-400"> (Preview)</span>
      ) : null}
    </span>
  );
}
