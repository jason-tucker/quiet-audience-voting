import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { getSetting, setSetting, SETTING_KEYS } from "@/lib/settings";
import { signAdminToken, buildAuthCookie } from "@/lib/auth";
import { getClientIp } from "@/lib/device";
import { checkRateLimit, clearRateLimit } from "@/lib/rateLimit";

const PLACEHOLDER_INITIAL_PASSWORD = "changeme";

const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 5 * 60 * 1000;

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    const originHost = new URL(origin).host;
    if (originHost === host) return true;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) {
      const appHost = new URL(appUrl).host;
      if (originHost === appHost) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const ip = getClientIp(request);
  const limitKey = `login:${ip}`;
  const limit = checkRateLimit(limitKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSec) },
      },
    );
  }

  let body: { password?: unknown };
  try {
    body = (await request.json()) as { password?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const password = typeof body.password === "string" ? body.password : "";
  if (!password) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  const storedHash = (await getSetting(SETTING_KEYS.ADMIN_PASSWORD_HASH)) ?? "";

  let valid = false;

  if (storedHash) {
    valid = await bcrypt.compare(password, storedHash);
  } else {
    const initial = process.env.INITIAL_ADMIN_PASSWORD;
    if (!initial || initial === PLACEHOLDER_INITIAL_PASSWORD) {
      console.error(
        "Refusing to bootstrap admin login: INITIAL_ADMIN_PASSWORD is unset or still the .env.example placeholder.",
      );
      return NextResponse.json(
        { error: "Server is not configured. Contact the administrator." },
        { status: 500 },
      );
    }
    if (password === initial) {
      const hash = await bcrypt.hash(password, 12);
      await setSetting(SETTING_KEYS.ADMIN_PASSWORD_HASH, hash);
      valid = true;
    }
  }

  if (!valid) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  clearRateLimit(limitKey);

  const token = await signAdminToken();
  const response = NextResponse.json({ success: true });
  response.headers.set("Set-Cookie", buildAuthCookie(token));
  return response;
}
