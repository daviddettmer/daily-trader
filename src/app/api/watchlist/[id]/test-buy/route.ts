import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { testBuyWatchlistItem } from "@/lib/strategy";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  await requireSession();

  const { id } = await context.params;
  const item = await db.watchlistItem.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const result = await testBuyWatchlistItem(item, config.testBuyNotional);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "buy_failed" },
      { status: 500 }
    );
  }
}
