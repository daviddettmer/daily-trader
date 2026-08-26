import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/auth";
import { isWithinSellWindow } from "@/lib/marketHours";
import { processSellCron } from "@/lib/strategy";

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const inWindow = await isWithinSellWindow();
  if (!inWindow) {
    return NextResponse.json({ skipped: true, reason: "outside_sell_window" });
  }

  const results = await processSellCron();
  return NextResponse.json({ ok: true, results });
}
