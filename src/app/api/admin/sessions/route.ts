import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { VoteSnapshotSummary } from "@/types";

export async function GET() {
  const snapshots = await prisma.voteSnapshot.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const summaries: VoteSnapshotSummary[] = snapshots.map((s) => ({
    id: s.id,
    label: s.label,
    createdAt: s.createdAt.toISOString(),
    totalVotes: s.totalVotes,
    uniqueDevices: s.uniqueDevices,
    filmResults: JSON.parse(s.filmResults),
  }));
  return NextResponse.json({ snapshots: summaries });
}
