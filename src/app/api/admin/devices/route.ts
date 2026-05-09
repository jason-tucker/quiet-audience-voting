import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { DeviceSummary } from "@/types";

export async function GET() {
  const votes = await prisma.vote.findMany({
    orderBy: { timestamp: "asc" },
    include: { film: { select: { name: true } } },
  });

  const byDevice = new Map<string, DeviceSummary>();

  for (const v of votes) {
    const existing = byDevice.get(v.deviceFingerprint);
    if (existing) {
      existing.voteCount++;
      existing.lastSeen = v.timestamp.toISOString();
      if (!existing.films.includes(v.film.name)) existing.films.push(v.film.name);
      // Keep most recent device info
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
        ipAddress: v.ipAddress,
        userAgent: v.userAgent,
        platform: v.platform,
        rawDeviceJson: v.rawDeviceJson,
      });
    }
  }

  const devices = Array.from(byDevice.values()).sort((a, b) => b.voteCount - a.voteCount);
  return NextResponse.json({ devices });
}
