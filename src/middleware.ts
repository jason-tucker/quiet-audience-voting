import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminToken, getTokenFromRequest } from "./lib/auth";

export async function middleware(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/admin");
  const valid = token ? await verifyAdminToken(token) : false;

  if (valid) return NextResponse.next();

  if (isApiRoute) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
