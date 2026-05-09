import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentResults, broadcastUpdate } from "@/lib/sse";

const SNAPSHOTS_TO_KEEP = 5;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { label?: string };

  // Capture current state before wiping.
  const [results, votes] = await Promise.all([
    getCurrentResults(),
    prisma.vote.findMany({ select: { deviceFingerprint: true } }),
  ]);

  const uniqueDevices = new Set(votes.map((v) => v.deviceFingerprint)).size;
  const label = body.label?.trim() || `Session ${new Date().toLocaleString()}`;

  await prisma.$transaction(async (tx) => {
    await tx.voteSnapshot.create({
      data: {
        label,
        totalVotes: results.total,
        uniqueDevices,
        filmResults: JSON.stringify(results.films),
      },
    });
    await tx.vote.deleteMany({});

    // Prune older snapshots beyond the retention limit
    const all = await tx.voteSnapshot.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    const toDelete = all.slice(SNAPSHOTS_TO_KEEP).map((s) => s.id);
    if (toDelete.length > 0) {
      await tx.voteSnapshot.deleteMany({ where: { id: { in: toDelete } } });
    }
  });

  // Push the cleared state to any open results streams.
  const cleared = await getCurrentResults();
  broadcastUpdate(cleared);

  return NextResponse.json({ success: true });
}
