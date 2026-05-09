import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSetting, setSetting, SETTING_KEYS } from "@/lib/settings";
import { signAdminToken, buildAuthCookie } from "@/lib/auth";

export async function POST(request: Request) {
  const { password } = (await request.json()) as { password?: string };
  if (!password) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  const storedHash = (await getSetting(SETTING_KEYS.ADMIN_PASSWORD_HASH)) ?? "";

  let valid = false;

  if (storedHash) {
    valid = await bcrypt.compare(password, storedHash);
  } else {
    const initial = process.env.INITIAL_ADMIN_PASSWORD;
    if (initial && password === initial) {
      // First-run bootstrap: hash the initial password and persist.
      const hash = await bcrypt.hash(password, 12);
      await setSetting(SETTING_KEYS.ADMIN_PASSWORD_HASH, hash);
      valid = true;
    }
  }

  if (!valid) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await signAdminToken();
  const response = NextResponse.json({ success: true });
  response.headers.set("Set-Cookie", buildAuthCookie(token));
  return response;
}
