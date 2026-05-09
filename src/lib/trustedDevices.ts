import type { TrustedDeviceProfile } from "@prisma/client";

interface DeviceLike {
  fingerprint?: string;
  userAgent: string;
  platform: string | null;
  screenWidth: number | null;
  screenHeight: number | null;
}

const SCREEN_TOLERANCE = 8;

/**
 * Returns true if `device` looks like one of the admin's trusted profiles
 * (e.g. one of the iPads set up at the event). The match is intentionally
 * lenient — same fingerprint OR same screen size + platform + matching UA
 * family is enough.
 */
export function matchesAnyTrustedProfile(
  device: DeviceLike,
  profiles: TrustedDeviceProfile[],
): boolean {
  return profiles.some((p) => matchesProfile(device, p));
}

export function matchesProfile(device: DeviceLike, p: TrustedDeviceProfile): boolean {
  if (p.fingerprint && device.fingerprint && p.fingerprint === device.fingerprint) {
    return true;
  }

  const screenOk =
    p.screenWidth != null &&
    p.screenHeight != null &&
    device.screenWidth != null &&
    device.screenHeight != null &&
    Math.abs(p.screenWidth - device.screenWidth) <= SCREEN_TOLERANCE &&
    Math.abs(p.screenHeight - device.screenHeight) <= SCREEN_TOLERANCE;

  const platformOk = p.platform == null || p.platform === device.platform;
  const uaOk = sameUserAgentFamily(p.userAgent, device.userAgent);

  return screenOk && platformOk && uaOk;
}

function sameUserAgentFamily(a: string, b: string): boolean {
  return browserFamily(a) === browserFamily(b);
}

function browserFamily(ua: string): string {
  const lower = ua.toLowerCase();
  if (lower.includes("crios")) return "chrome-ios";
  if (lower.includes("fxios")) return "firefox-ios";
  if (lower.includes("edg/")) return "edge";
  if (lower.includes("chrome/")) return "chrome";
  if (lower.includes("firefox/")) return "firefox";
  // Safari is a fallback because every iOS browser also says "Safari"
  if (lower.includes("safari/")) return "safari";
  return "other";
}
