import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getPosition } from "@/lib/alpaca";
import { db } from "@/lib/db";
import { decimalToNumber } from "@/lib/nextTrade";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  await requireSession();
  const { id } = await context.params;
  const body = await request.json();
  const amount = Number(body.amount);

  if (Number.isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const item = await db.watchlistItem.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const position = await getPosition(item.symbol);
  const inPosition = position && position.qty > 0;

  const updated = await db.watchlistItem.update({
    where: { id },
    data: inPosition
      ? { pendingDeposit: decimalToNumber(item.pendingDeposit) + amount }
      : {
          nextBuyNotional: decimalToNumber(item.nextBuyNotional) + amount,
        },
  });

  return NextResponse.json(updated);
}
