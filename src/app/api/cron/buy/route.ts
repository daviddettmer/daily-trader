import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/auth";
import { recordCronRun } from "@/lib/cronLog";
import { formatEtDateTime, isWithinBuyWindow } from "@/lib/marketHours";
import { processBuyCron } from "@/lib/strategy";

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    console.warn("[cron/buy] unauthorized");
    await recordCronRun({ route: "buy", status: "unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  try {
    const inWindow = await isWithinBuyWindow(now);
    if (!inWindow) {
      const body = {
        skipped: true,
        reason: "outside_buy_window",
        at: formatEtDateTime(now),
        hint: "Buy cron only runs during the hour before market close (e.g. 3:00–4:00 PM ET).",
      };
      console.info("[cron/buy] skipped", body);
      await recordCronRun({
        route: "buy",
        status: "skipped",
        reason: body.reason,
        details: { at: body.at, hint: body.hint },
      });
      return NextResponse.json(body);
    }

    const results = await processBuyCron();
    const at = formatEtDateTime(now);
    console.info("[cron/buy] ok", { at, results });
    await recordCronRun({
      route: "buy",
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
    console.error("[cron/buy] error", error);
    await recordCronRun({
      route: "buy",
      status: "error",
      error: message,
      details: { at: formatEtDateTime(now) },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
