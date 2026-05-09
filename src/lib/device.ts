import type { NextRequest } from "next/server";
import type { DeviceInfo } from "@/types";

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

// Client-side device collector. Lives in the lib so it can be imported
// from the voting page; it depends only on browser-native APIs.
export async function collectDeviceInfo(): Promise<DeviceInfo> {
  if (typeof window === "undefined") {
    throw new Error("collectDeviceInfo must run in the browser");
  }

  const nav = window.navigator as Navigator & {
    deviceMemory?: number;
    userAgentData?: { platform?: string };
  };
  const screen = window.screen;

  const data: Omit<DeviceInfo, "fingerprint"> = {
    userAgent: nav.userAgent,
    screenWidth: screen.width,
    screenHeight: screen.height,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: nav.language,
    platform: nav.userAgentData?.platform || nav.platform || "unknown",
    colorDepth: screen.colorDepth,
    touchSupport: "ontouchstart" in window || nav.maxTouchPoints > 0,
    pixelRatio: window.devicePixelRatio,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    cookieEnabled: nav.cookieEnabled,
    doNotTrack: nav.doNotTrack ?? undefined,
    hardwareConcurrency: nav.hardwareConcurrency,
    deviceMemory: nav.deviceMemory,
  };

  const fingerprintInput = [
    data.userAgent,
    data.screenWidth,
    data.screenHeight,
    data.timezone,
    data.language,
    data.platform,
    data.colorDepth,
    data.hardwareConcurrency,
    data.deviceMemory,
  ].join("|");

  const fingerprint = await sha256(fingerprintInput);

  return { ...data, fingerprint };
}

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
