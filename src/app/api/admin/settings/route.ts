import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAllSettings, isVotingOpen, setSetting, SETTING_KEYS } from "@/lib/settings";

export async function GET() {
  const settings = await getAllSettings();
  const hash = settings[SETTING_KEYS.ADMIN_PASSWORD_HASH] ?? "";
  // Don't leak the password hash to the client.
  delete settings[SETTING_KEYS.ADMIN_PASSWORD_HASH];
  return NextResponse.json({ settings, hasPassword: !!hash });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const { adminPassword, adminPasswordConfirm, ...rest } = body as {
    adminPassword?: string;
    adminPasswordConfirm?: string;
    [k: string]: unknown;
  };

  if (adminPassword) {
    if (adminPassword !== adminPasswordConfirm) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
    }
    if (adminPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    const hash = await bcrypt.hash(adminPassword, 12);
    await setSetting(SETTING_KEYS.ADMIN_PASSWORD_HASH, hash);
  }

  // If we're transitioning votingOpen from false → true, stamp the start time.
  // This lets the timeline begin its bucket count from when voting was opened
  // rather than the timestamp of the first vote.
  const wasOpen = await isVotingOpen();

  for (const [key, value] of Object.entries(rest)) {
    if (key === SETTING_KEYS.ADMIN_PASSWORD_HASH) continue;
    if (typeof value === "string") {
      await setSetting(key, value);
    } else if (typeof value === "boolean") {
      await setSetting(key, value ? "true" : "false");
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(rest, SETTING_KEYS.VOTING_OPEN) &&
    rest[SETTING_KEYS.VOTING_OPEN] === true &&
    !wasOpen
  ) {
    await setSetting(SETTING_KEYS.VOTING_OPENED_AT, new Date().toISOString());
  }

  return NextResponse.json({ success: true });
}
