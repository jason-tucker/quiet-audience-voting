import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const profiles = await prisma.trustedDeviceProfile.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ profiles });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { fingerprint: string; label?: string };
  if (!body.fingerprint) {
    return NextResponse.json({ error: "fingerprint required" }, { status: 400 });
  }

  // Pull the most recent vote with this fingerprint to copy device fields from.
  const sample = await prisma.vote.findFirst({
    where: { deviceFingerprint: body.fingerprint },
    orderBy: { timestamp: "desc" },
  });
  if (!sample) {
    return NextResponse.json({ error: "No vote found for that device" }, { status: 404 });
  }

  const existing = await prisma.trustedDeviceProfile.findFirst({
    where: { fingerprint: body.fingerprint },
  });
  if (existing) {
    return NextResponse.json({ profile: existing });
  }

  const profile = await prisma.trustedDeviceProfile.create({
    data: {
      label: body.label?.trim() || `Trusted device ${new Date().toLocaleString()}`,
      fingerprint: body.fingerprint,
      userAgent: sample.userAgent,
      platform: sample.platform,
      screenWidth: sample.screenWidth,
      screenHeight: sample.screenHeight,
    },
  });
  return NextResponse.json({ profile });
}
