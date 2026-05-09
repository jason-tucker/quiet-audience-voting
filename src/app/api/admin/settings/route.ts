import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAllSettings, setSetting, SETTING_KEYS } from "@/lib/settings";

export async function GET() {
  const settings = await getAllSettings();
  const hash = settings[SETTING_KEYS.ADMIN_PASSWORD_HASH] ?? "";
  // Don't leak the password hash to the client.
  delete settings[SETTING_KEYS.ADMIN_PASSWORD_HASH];
  return NextResponse.json({ settings, hasPassword: !!hash });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;

  // Reserved keys with special handling
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

  for (const [key, value] of Object.entries(rest)) {
    if (key === SETTING_KEYS.ADMIN_PASSWORD_HASH) continue; // never set directly
    if (typeof value === "string") {
      await setSetting(key, value);
    } else if (typeof value === "boolean") {
      await setSetting(key, value ? "true" : "false");
    }
  }

  return NextResponse.json({ success: true });
}
