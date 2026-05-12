import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "qav_admin";
// 1h TTL keeps the blast radius of a stolen/rotated-password token small.
// Edge middleware can't hit the DB to do session-version invalidation, so
// short-lived tokens are the practical way to bound exposure on this stack.
const TOKEN_EXPIRY = "1h";
const COOKIE_MAX_AGE = 60 * 60;

const PLACEHOLDER_JWT_SECRET = "change-me-to-a-random-32-plus-char-string";

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET environment variable is not set or too short");
  }
  if (secret === PLACEHOLDER_JWT_SECRET) {
    throw new Error(
      "JWT_SECRET is the .env.example placeholder. Set a real random value before starting the server.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signAdminToken(): Promise<string> {
  return await new SignJWT({ sub: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(getSecretKey());
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload.sub === "admin";
  } catch {
    return false;
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get(COOKIE_NAME)?.value ?? null;
}

export function buildAuthCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${COOKIE_MAX_AGE}${secure}`;
}

export function buildClearCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`;
}

export const AUTH_COOKIE_NAME = COOKIE_NAME;
