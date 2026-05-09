import { prisma } from "./prisma";
import type { SuspiciousCluster } from "@/types";

const DEFAULT_WINDOW_MINUTES = 10;
const DEFAULT_THRESHOLD = 5;

export async function detectSuspiciousVotes(
  windowMinutes = DEFAULT_WINDOW_MINUTES,
  threshold = DEFAULT_THRESHOLD,
): Promise<SuspiciousCluster[]> {
  const votes = await prisma.vote.findMany({
    orderBy: [{ deviceFingerprint: "asc" }, { timestamp: "asc" }],
    include: { film: { select: { name: true } } },
  });

  const byDevice = new Map<string, typeof votes>();
  for (const vote of votes) {
    const existing = byDevice.get(vote.deviceFingerprint) ?? [];
    existing.push(vote);
    byDevice.set(vote.deviceFingerprint, existing);
  }

  const clusters: SuspiciousCluster[] = [];
  const windowMs = windowMinutes * 60 * 1000;

  for (const [fingerprint, deviceVotes] of byDevice.entries()) {
    let maxCluster: typeof deviceVotes | null = null;
    for (let i = 0; i < deviceVotes.length; i++) {
      const start = deviceVotes[i].timestamp.getTime();
      const inWindow = deviceVotes.filter(
        (v) => v.timestamp.getTime() >= start && v.timestamp.getTime() <= start + windowMs,
      );
      if (inWindow.length >= threshold && (!maxCluster || inWindow.length > maxCluster.length)) {
        maxCluster = inWindow;
      }
    }
    if (maxCluster) {
      clusters.push({
        deviceFingerprint: fingerprint,
        voteCount: maxCluster.length,
        firstVote: maxCluster[0].timestamp.toISOString(),
        lastVote: maxCluster[maxCluster.length - 1].timestamp.toISOString(),
        films: Array.from(new Set(maxCluster.map((v) => v.film.name))),
      });
    }
  }

  clusters.sort((a, b) => b.voteCount - a.voteCount);
  return clusters;
}
