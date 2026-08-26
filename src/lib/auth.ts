import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { config } from "./config";

const SESSION_COOKIE = "dailytrader_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function getSecretKey() {
  return new TextEncoder().encode(config.sessionSecret);
}

export async function createSessionToken(username?: string) {
  return new SignJWT({ username: username ?? "user" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function validateCredentials(username: string, password: string) {
  if (password !== config.appPassword) return false;
  if (config.appUsername && username !== config.appUsername) return false;
  return true;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export function verifyCronAuth(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!auth || auth !== `Bearer ${config.cronSecret}`) {
    return false;
  }
  return true;
}

export { SESSION_COOKIE };
