import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import type { AuditVote } from "@/types";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const rawLimit = Number(searchParams.get("limit")) || DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, rawLimit));
  const filmId = searchParams.get("filmId") ?? undefined;

  const where = filmId ? { filmId } : {};

  const [total, votes] = await Promise.all([
    prisma.vote.count({ where }),
    prisma.vote.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { film: { select: { name: true } } },
    }),
  ]);

  const audit: AuditVote[] = votes.map((v) => ({
    id: v.id,
    filmId: v.filmId,
    filmName: v.film.name,
    timestamp: v.timestamp.toISOString(),
    deviceFingerprint: v.deviceFingerprint,
    ipAddress: v.ipAddress,
    userAgent: v.userAgent,
    platform: v.platform,
    screenWidth: v.screenWidth,
    screenHeight: v.screenHeight,
    timezone: v.timezone,
    language: v.language,
    rawDeviceJson: v.rawDeviceJson,
  }));

  return NextResponse.json({ votes: audit, total, page, limit });
}
