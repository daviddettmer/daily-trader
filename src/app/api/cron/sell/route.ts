import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/auth";
import { recordCronRun } from "@/lib/cronLog";
import { formatEtDateTime, isWithinSellWindow } from "@/lib/marketHours";
import { processSellCron } from "@/lib/strategy";

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    console.warn("[cron/sell] unauthorized");
    await recordCronRun({ route: "sell", status: "unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  try {
    const inWindow = await isWithinSellWindow(now);
    if (!inWindow) {
      const body = {
        skipped: true,
        reason: "outside_sell_window",
        at: formatEtDateTime(now),
      };
      console.info("[cron/sell] skipped", body);
      await recordCronRun({
        route: "sell",
        status: "skipped",
        reason: body.reason,
        details: { at: body.at },
      });
      return NextResponse.json(body);
    }

    const results = await processSellCron();
    const at = formatEtDateTime(now);
    console.info("[cron/sell] ok", { at, results });
    await recordCronRun({
      route: "sell",
      status: "ok",
      details: { at, results },
    });
    return NextResponse.json({
      ok: true,
      at,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[cron/sell] error", error);
    await recordCronRun({
      route: "sell",
      status: "error",
      error: message,
      details: { at: formatEtDateTime(now) },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
