import { NextResponse } from "next/server";
import { verifySessionTokenEdge } from "@/lib/auth-edge";
import { SESSION_COOKIE } from "@/lib/auth";
import { config as appConfig } from "@/lib/config";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/api/auth/login", "/api/cron/buy", "/api/cron/sell"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/cron/")) {
    return NextResponse.next();
  }

  if (!appConfig.sessionSecret) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token
    ? await verifySessionTokenEdge(token, appConfig.sessionSecret)
    : null;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
