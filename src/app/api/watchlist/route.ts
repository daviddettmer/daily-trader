import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { validateSymbol } from "@/lib/alpaca";
import { db } from "@/lib/db";

export async function GET() {
  await requireSession();
  const items = await db.watchlistItem.findMany({
    orderBy: { symbol: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  await requireSession();
  const body = await request.json();
  const symbol = String(body.symbol ?? "")
    .trim()
    .toUpperCase();
  const amount = Number(body.amount);

  if (!symbol || Number.isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid symbol or amount" }, { status: 400 });
  }

  await validateSymbol(symbol);

  const existing = await db.watchlistItem.findUnique({ where: { symbol } });
  if (existing) {
    return NextResponse.json({ error: "Symbol already on watchlist" }, { status: 409 });
  }

  const item = await db.watchlistItem.create({
    data: {
      symbol,
      initialNotional: amount,
      nextBuyNotional: amount,
      pendingDeposit: 0,
      active: true,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
