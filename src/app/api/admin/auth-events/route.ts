import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

// GET /api/admin/auth-events — paginated list of admin login attempts
// (both successes and failures). Mirror of /api/admin/votes for the audit
// page's auth tab. Middleware enforces JWT for /api/admin/*.

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const rawLimit = Number(searchParams.get("limit")) || DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, rawLimit));
  const outcome = searchParams.get("outcome") ?? undefined;

  const where = outcome === "success" || outcome === "fail" ? { outcome } : {};

  const [total, events] = await Promise.all([
    prisma.authEvent.count({ where }),
    prisma.authEvent.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    total,
    page,
    limit,
    events: events.map((e) => ({
      id: e.id,
      timestamp: e.timestamp.toISOString(),
      outcome: e.outcome,
      ipAddress: e.ipAddress,
      userAgent: e.userAgent,
      reason: e.reason,
    })),
  });
}
