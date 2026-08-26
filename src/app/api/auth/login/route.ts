import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  setSessionCookie,
  validateCredentials,
} from "@/lib/auth";
import { config } from "@/lib/config";

export async function POST(request: NextRequest) {
  if (!config.appPassword) {
    return NextResponse.json(
      { error: "APP_PASSWORD is not configured" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const username = String(body.username ?? "");
  const password = String(body.password ?? "");

  if (!validateCredentials(username, password)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await createSessionToken(username || undefined);
  const response = NextResponse.json({ ok: true });
  await setSessionCookie(response, token);
  return response;
}
