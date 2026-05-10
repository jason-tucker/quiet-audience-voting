import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isVotingOpen } from "@/lib/settings";
import { getClientIp } from "@/lib/device";
import { broadcastUpdate, getCurrentResults } from "@/lib/sse";
import type { DeviceInfo } from "@/types";

export async function POST(request: NextRequest) {
  if (!(await isVotingOpen())) {
    return NextResponse.json({ error: "Voting is closed" }, { status: 403 });
  }

  let body: { filmId: string; deviceInfo: DeviceInfo };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { filmId, deviceInfo } = body;
  if (!filmId || !deviceInfo?.fingerprint) {
    return NextResponse.json({ error: "filmId and deviceInfo.fingerprint required" }, { status: 400 });
  }

  const film = await prisma.film.findUnique({ where: { id: filmId } });
  if (!film) {
    return NextResponse.json({ error: "Film not found" }, { status: 404 });
  }

  const ipAddress = getClientIp(request);

  const created = await prisma.vote.create({
    data: {
      filmId,
      deviceFingerprint: deviceInfo.fingerprint,
      ipAddress,
      userAgent: deviceInfo.userAgent,
      screenWidth: deviceInfo.screenWidth,
      screenHeight: deviceInfo.screenHeight,
      timezone: deviceInfo.timezone,
      language: deviceInfo.language,
      platform: deviceInfo.platform,
      colorDepth: deviceInfo.colorDepth,
      touchSupport: deviceInfo.touchSupport,
      pixelRatio: deviceInfo.pixelRatio,
      viewportWidth: deviceInfo.viewportWidth,
      viewportHeight: deviceInfo.viewportHeight,
      cookieEnabled: deviceInfo.cookieEnabled,
      doNotTrack: deviceInfo.doNotTrack,
      hardwareConcurrency: deviceInfo.hardwareConcurrency,
      deviceMemory: deviceInfo.deviceMemory,
      rawDeviceJson: JSON.stringify(deviceInfo),
    },
  });

  // Fire-and-forget broadcast — don't await; don't block the response.
  // Include the just-cast vote so live clients can animate it.
  getCurrentResults({
    id: created.id,
    filmId: created.filmId,
    filmName: film.name,
    timestamp: created.timestamp.toISOString(),
  })
    .then((payload) => broadcastUpdate(payload))
    .catch(() => {});

  return NextResponse.json({ success: true });
}
