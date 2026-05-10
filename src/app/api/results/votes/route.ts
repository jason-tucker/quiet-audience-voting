import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import type { VoteEvent } from "@/types";

// Public endpoint that returns just the timestamp + film for every vote.
// No device info is exposed — enough to render a timeline, nothing more.
export async function GET(request: NextRequest) {
  const filmId = request.nextUrl.searchParams.get("filmId") ?? undefined;

  const votes = await prisma.vote.findMany({
    where: filmId ? { filmId } : undefined,
    orderBy: { timestamp: "asc" },
    select: {
      id: true,
      filmId: true,
      timestamp: true,
      film: { select: { name: true } },
    },
  });

  const events: VoteEvent[] = votes.map((v) => ({
    id: v.id,
    filmId: v.filmId,
    filmName: v.film.name,
    timestamp: v.timestamp.toISOString(),
  }));

  return NextResponse.json({ events });
}
