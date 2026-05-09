import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [totalFilms, totalVotes, distinctDevices] = await Promise.all([
    prisma.film.count(),
    prisma.vote.count(),
    prisma.vote.findMany({ select: { deviceFingerprint: true }, distinct: ["deviceFingerprint"] }),
  ]);

  return NextResponse.json({
    totalFilms,
    totalVotes,
    uniqueDevices: distinctDevices.length,
  });
}
