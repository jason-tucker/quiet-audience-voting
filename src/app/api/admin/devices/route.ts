import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { matchesAnyTrustedProfile } from "@/lib/trustedDevices";
import type { DeviceSummary } from "@/types";

export async function GET() {
  const [votes, profiles] = await Promise.all([
    prisma.vote.findMany({
      orderBy: { timestamp: "asc" },
      include: { film: { select: { name: true } } },
    }),
    prisma.trustedDeviceProfile.findMany(),
  ]);

  const byDevice = new Map<string, DeviceSummary>();

  for (const v of votes) {
    const existing = byDevice.get(v.deviceFingerprint);
    if (existing) {
      existing.voteCount++;
      existing.lastSeen = v.timestamp.toISOString();
      if (!existing.films.includes(v.film.name)) existing.films.push(v.film.name);
      existing.votesByFilm[v.filmId] = (existing.votesByFilm[v.filmId] ?? 0) + 1;
      existing.ipAddress = v.ipAddress;
      existing.userAgent = v.userAgent;
      existing.platform = v.platform;
      existing.rawDeviceJson = v.rawDeviceJson;
    } else {
      byDevice.set(v.deviceFingerprint, {
        fingerprint: v.deviceFingerprint,
        voteCount: 1,
        firstSeen: v.timestamp.toISOString(),
        lastSeen: v.timestamp.toISOString(),
        films: [v.film.name],
        votesByFilm: { [v.filmId]: 1 },
        ipAddress: v.ipAddress,
        userAgent: v.userAgent,
        platform: v.platform,
        rawDeviceJson: v.rawDeviceJson,
        trusted: false,
      });
    }
  }

  for (const summary of byDevice.values()) {
    const latestVote = votes.find((v) => v.deviceFingerprint === summary.fingerprint);
    summary.trusted = matchesAnyTrustedProfile(
      {
        fingerprint: summary.fingerprint,
        userAgent: summary.userAgent,
        platform: summary.platform,
        screenWidth: latestVote?.screenWidth ?? null,
        screenHeight: latestVote?.screenHeight ?? null,
      },
      profiles,
    );
  }

  const devices = Array.from(byDevice.values()).sort((a, b) => b.voteCount - a.voteCount);
  return NextResponse.json({ devices, hasTrustedProfiles: profiles.length > 0 });
}
