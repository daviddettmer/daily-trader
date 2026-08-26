import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/auth";
import { isWithinBuyWindow } from "@/lib/marketHours";
import { processBuyCron } from "@/lib/strategy";

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const inWindow = await isWithinBuyWindow();
  if (!inWindow) {
    return NextResponse.json({ skipped: true, reason: "outside_buy_window" });
  }

  const results = await processBuyCron();
  return NextResponse.json({ ok: true, results });
}
