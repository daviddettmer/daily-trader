import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  await requireSession();
  const { id } = await context.params;
  const body = await request.json();

  const item = await db.watchlistItem.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (typeof body.active === "boolean") {
    const updated = await db.watchlistItem.update({
      where: { id },
      data: { active: body.active },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "No valid fields" }, { status: 400 });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  await requireSession();
  const { id } = await context.params;

  const item = await db.watchlistItem.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.watchlistItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
