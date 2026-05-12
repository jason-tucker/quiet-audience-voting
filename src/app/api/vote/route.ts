import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isVotingOpen } from "@/lib/settings";
import { getClientIp } from "@/lib/device";
import { broadcastUpdate, getCurrentResults } from "@/lib/sse";
import { checkRateLimit } from "@/lib/rateLimit";
import type { DeviceInfo } from "@/types";

const MAX_BODY_BYTES = 16 * 1024;

// Per-field caps. Anything longer is silently truncated rather than
// rejected so a malformed iPad doesn't lose votes — but we won't accept
// arbitrary-size strings into the audit log.
const MAX_FINGERPRINT = 128;
const MAX_USER_AGENT = 512;
const MAX_SHORT_STRING = 128;
const MAX_RAW_JSON = 8 * 1024;

// Voters tap, see a thank-you, and the device resets after 3s. 1 vote per
// 2s per fingerprint accommodates legitimate use while still bounding
// scripted ballot-stuffing from a fixed device fingerprint.
const VOTE_WINDOW_MS = 2000;
const VOTE_MAX_PER_WINDOW = 1;

function clip(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.length > max ? value.slice(0, max) : value;
}

function clipNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function clipBool(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

export async function POST(request: NextRequest) {
  if (!(await isVotingOpen())) {
    return NextResponse.json({ error: "Voting is closed" }, { status: 403 });
  }

  const lenHeader = request.headers.get("content-length");
  if (lenHeader && Number(lenHeader) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Body too large" }, { status: 413 });
  }

  let body: { filmId?: unknown; deviceInfo?: Partial<DeviceInfo> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const filmId = typeof body.filmId === "string" ? body.filmId : "";
  const deviceInfo = body.deviceInfo;
  const fingerprint = clip(deviceInfo?.fingerprint, MAX_FINGERPRINT);
  if (!filmId || !fingerprint) {
    return NextResponse.json(
      { error: "filmId and deviceInfo.fingerprint required" },
      { status: 400 },
    );
  }

  const limit = checkRateLimit(`vote:${fingerprint}`, VOTE_MAX_PER_WINDOW, VOTE_WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Voting too quickly. Please wait." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSec) },
      },
    );
  }

  const film = await prisma.film.findUnique({ where: { id: filmId } });
  if (!film) {
    return NextResponse.json({ error: "Film not found" }, { status: 404 });
  }

  const ipAddress = getClientIp(request);
  const userAgent = clip(deviceInfo?.userAgent, MAX_USER_AGENT) ?? "";

  let rawDeviceJson = JSON.stringify(deviceInfo ?? {});
  if (rawDeviceJson.length > MAX_RAW_JSON) {
    rawDeviceJson = rawDeviceJson.slice(0, MAX_RAW_JSON);
  }

  const created = await prisma.vote.create({
    data: {
      filmId,
      deviceFingerprint: fingerprint,
      ipAddress,
      userAgent,
      screenWidth: clipNumber(deviceInfo?.screenWidth),
      screenHeight: clipNumber(deviceInfo?.screenHeight),
      timezone: clip(deviceInfo?.timezone, MAX_SHORT_STRING),
      language: clip(deviceInfo?.language, MAX_SHORT_STRING),
      platform: clip(deviceInfo?.platform, MAX_SHORT_STRING),
      colorDepth: clipNumber(deviceInfo?.colorDepth),
      touchSupport: clipBool(deviceInfo?.touchSupport),
      pixelRatio: clipNumber(deviceInfo?.pixelRatio),
      viewportWidth: clipNumber(deviceInfo?.viewportWidth),
      viewportHeight: clipNumber(deviceInfo?.viewportHeight),
      cookieEnabled: clipBool(deviceInfo?.cookieEnabled),
      doNotTrack: clip(deviceInfo?.doNotTrack, MAX_SHORT_STRING),
      hardwareConcurrency: clipNumber(deviceInfo?.hardwareConcurrency),
      deviceMemory: clipNumber(deviceInfo?.deviceMemory),
      rawDeviceJson,
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
