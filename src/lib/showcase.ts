import { prisma } from "./prisma";
import { getSetting, isVotingOpen, SETTING_KEYS } from "./settings";
import { broadcastUpdate, getCurrentResults } from "./sse";

interface SimDevice {
  fingerprint: string;
  label: string;
  userAgent: string;
  platform: string;
  screenWidth: number;
  screenHeight: number;
  timezone: string;
  language: string;
  colorDepth: number;
  hardwareConcurrency: number;
  deviceMemory: number;
  pixelRatio: number;
}

// Six plausible iPads. Fingerprints are stable so admin sees them as 6
// distinct devices, just like 6 physical iPads at exits would appear.
const DEVICES: SimDevice[] = [
  {
    fingerprint: "sim-ipad-pro-12-9",
    label: "Sim iPad Pro 12.9",
    userAgent:
      "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    platform: "iPad",
    screenWidth: 1024,
    screenHeight: 1366,
    timezone: "America/New_York",
    language: "en-US",
    colorDepth: 24,
    hardwareConcurrency: 8,
    deviceMemory: 8,
    pixelRatio: 2,
  },
  {
    fingerprint: "sim-ipad-pro-11",
    label: "Sim iPad Pro 11",
    userAgent:
      "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    platform: "iPad",
    screenWidth: 834,
    screenHeight: 1194,
    timezone: "America/New_York",
    language: "en-US",
    colorDepth: 24,
    hardwareConcurrency: 8,
    deviceMemory: 6,
    pixelRatio: 2,
  },
  {
    fingerprint: "sim-ipad-air",
    label: "Sim iPad Air",
    userAgent:
      "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    platform: "iPad",
    screenWidth: 820,
    screenHeight: 1180,
    timezone: "America/New_York",
    language: "en-US",
    colorDepth: 24,
    hardwareConcurrency: 8,
    deviceMemory: 4,
    pixelRatio: 2,
  },
  {
    fingerprint: "sim-ipad-10",
    label: "Sim iPad 10th gen",
    userAgent:
      "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    platform: "iPad",
    screenWidth: 810,
    screenHeight: 1080,
    timezone: "America/New_York",
    language: "en-US",
    colorDepth: 24,
    hardwareConcurrency: 8,
    deviceMemory: 4,
    pixelRatio: 2,
  },
  {
    fingerprint: "sim-ipad-mini",
    label: "Sim iPad mini",
    userAgent:
      "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    platform: "iPad",
    screenWidth: 744,
    screenHeight: 1133,
    timezone: "America/New_York",
    language: "en-US",
    colorDepth: 24,
    hardwareConcurrency: 8,
    deviceMemory: 4,
    pixelRatio: 2,
  },
  {
    fingerprint: "sim-ipad-9",
    label: "Sim iPad 9th gen",
    userAgent:
      "Mozilla/5.0 (iPad; CPU OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.7 Mobile/15E148 Safari/604.1",
    platform: "iPad",
    screenWidth: 810,
    screenHeight: 1080,
    timezone: "America/New_York",
    language: "en-US",
    colorDepth: 24,
    hardwareConcurrency: 6,
    deviceMemory: 3,
    pixelRatio: 2,
  },
];

const NORMAL_MIN_MS = 3000;
const NORMAL_MAX_MS = 8000;
const SLOW_MIN_MS = 8000;
const SLOW_MAX_MS = 30000;
// 1 in N ticks is a "slow" cadence to look natural.
const SLOW_RATIO = 5;

const g = globalThis as unknown as { __qavShowcaseTimer?: NodeJS.Timeout };

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function nextDelayMs(): number {
  const slow = Math.random() * SLOW_RATIO < 1;
  return slow ? randInt(SLOW_MIN_MS, SLOW_MAX_MS) : randInt(NORMAL_MIN_MS, NORMAL_MAX_MS);
}

async function tick() {
  try {
    const open = await isVotingOpen();
    if (!open) {
      // Pause but stay armed — try again soon in case voting reopens.
      schedule(2000);
      return;
    }

    const films = await prisma.film.findMany({ select: { id: true, name: true } });
    if (films.length === 0) {
      schedule(2000);
      return;
    }

    const device = DEVICES[randInt(0, DEVICES.length - 1)];
    const film = films[randInt(0, films.length - 1)];

    const created = await prisma.vote.create({
      data: {
        filmId: film.id,
        deviceFingerprint: device.fingerprint,
        ipAddress: "127.0.0.1",
        userAgent: device.userAgent,
        screenWidth: device.screenWidth,
        screenHeight: device.screenHeight,
        timezone: device.timezone,
        language: device.language,
        platform: device.platform,
        colorDepth: device.colorDepth,
        touchSupport: true,
        pixelRatio: device.pixelRatio,
        viewportWidth: device.screenWidth,
        viewportHeight: device.screenHeight,
        cookieEnabled: true,
        doNotTrack: null,
        hardwareConcurrency: device.hardwareConcurrency,
        deviceMemory: device.deviceMemory,
        rawDeviceJson: JSON.stringify({
          ...device,
          simulated: true,
        }),
      },
    });

    const payload = await getCurrentResults({
      id: created.id,
      filmId: created.filmId,
      filmName: film.name,
      timestamp: created.timestamp.toISOString(),
    });
    broadcastUpdate(payload);
  } catch (err) {
    console.error("Showcase tick failed:", err);
  } finally {
    schedule(nextDelayMs());
  }
}

function schedule(delayMs: number) {
  if (g.__qavShowcaseTimer) clearTimeout(g.__qavShowcaseTimer);
  g.__qavShowcaseTimer = setTimeout(tick, delayMs);
}

export function startShowcase(): void {
  if (g.__qavShowcaseTimer) return;
  console.log("[showcase] starting simulated voting loop");
  schedule(nextDelayMs());
}

export function stopShowcase(): void {
  if (g.__qavShowcaseTimer) {
    console.log("[showcase] stopping simulated voting loop");
    clearTimeout(g.__qavShowcaseTimer);
    g.__qavShowcaseTimer = undefined;
  }
}

export function isShowcaseRunning(): boolean {
  return !!g.__qavShowcaseTimer;
}

/**
 * Reconcile the in-memory simulator state with the persisted setting.
 * Call this from any endpoint that the admin is likely to hit shortly
 * after a server restart (settings GET, dashboard load) so the showcase
 * loop self-resumes without requiring a manual toggle.
 */
export async function ensureShowcaseSync(): Promise<void> {
  const value = await getSetting(SETTING_KEYS.SHOWCASE_MODE);
  const shouldRun = value === "true";
  if (shouldRun && !isShowcaseRunning()) startShowcase();
  if (!shouldRun && isShowcaseRunning()) stopShowcase();
}

export function describeShowcaseDevices(): { fingerprint: string; label: string }[] {
  return DEVICES.map((d) => ({ fingerprint: d.fingerprint, label: d.label }));
}
