import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import type { VoteEvent } from "@/types";

// Cap the response so a flood of bogus votes can't be fetched into a
// multi-megabyte JSON payload by anonymous /results viewers. A real
// festival is well below this; if more votes exist we return the most
// recent slice so the live timeline still has fresh data.
const MAX_EVENTS = 20000;

export async function GET(request: NextRequest) {
  const filmId = request.nextUrl.searchParams.get("filmId") ?? undefined;

  const votes = await prisma.vote.findMany({
    where: filmId ? { filmId } : undefined,
    orderBy: { timestamp: "desc" },
    take: MAX_EVENTS,
    select: {
      id: true,
      filmId: true,
      timestamp: true,
      film: { select: { name: true } },
    },
  });

  // Reverse to chronological order so the timeline component's bucketize
  // pass doesn't have to re-sort.
  votes.reverse();

  const events: VoteEvent[] = votes.map((v) => ({
    id: v.id,
    filmId: v.filmId,
    filmName: v.film.name,
    timestamp: v.timestamp.toISOString(),
  }));

  return NextResponse.json({ events });
}
