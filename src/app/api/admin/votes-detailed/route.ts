import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Slim list of (timestamp, filmId, deviceFingerprint) for every vote.
// Used by the per-device timeline and per-device-per-film mini charts.
export async function GET() {
  const votes = await prisma.vote.findMany({
    orderBy: { timestamp: "asc" },
    select: {
      id: true,
      filmId: true,
      timestamp: true,
      deviceFingerprint: true,
    },
  });
  return NextResponse.json({
    votes: votes.map((v) => ({
      id: v.id,
      filmId: v.filmId,
      timestamp: v.timestamp.toISOString(),
      deviceFingerprint: v.deviceFingerprint,
    })),
  });
}
