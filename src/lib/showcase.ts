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

// Six plausible iPads. Each gets its OWN independent voting loop so the
// total throughput is roughly 6 votes per 3-8 seconds, mirroring six
// physical iPads being used in parallel at exits.
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

const PAUSED_CHECK_MS = 2000;

const g = globalThis as unknown as {
  __qavShowcaseTimers?: Map<string, NodeJS.Timeout>;
};

function getTimers(): Map<string, NodeJS.Timeout> {
  if (!g.__qavShowcaseTimers) g.__qavShowcaseTimers = new Map();
  return g.__qavShowcaseTimers;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Three-tier distribution gives organic-feeling cadence per device:
//   30% fast     (1.5–4s)   → bursts of activity
//   55% normal   (4–10s)    → typical wait between voters
//   15% slow     (10–25s)   → occasional long gap
// With 6 devices ticking independently this comes out to roughly one new
// vote per second across the system, with natural ebb and flow.
function nextDelayMs(): number {
  const r = Math.random();
  if (r < 0.3) return randInt(1500, 4000);
  if (r < 0.85) return randInt(4000, 10000);
  return randInt(10000, 25000);
}

async function castVoteFor(device: SimDevice): Promise<boolean> {
  const films = await prisma.film.findMany({ select: { id: true, name: true } });
  if (films.length === 0) return false;

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
      rawDeviceJson: JSON.stringify({ ...device, simulated: true }),
    },
  });

  const payload = await getCurrentResults({
    id: created.id,
    filmId: created.filmId,
    filmName: film.name,
    timestamp: created.timestamp.toISOString(),
  });
  broadcastUpdate(payload);
  return true;
}

function scheduleDevice(device: SimDevice, delayMs: number) {
  const timers = getTimers();
  const existing = timers.get(device.fingerprint);
  if (existing) clearTimeout(existing);
  const t = setTimeout(() => deviceTick(device), delayMs);
  timers.set(device.fingerprint, t);
}

async function deviceTick(device: SimDevice): Promise<void> {
  try {
    const open = await isVotingOpen();
    if (!open) {
      // Pause this device — try again soon in case voting reopens.
      scheduleDevice(device, PAUSED_CHECK_MS);
      return;
    }
    const cast = await castVoteFor(device);
    if (!cast) {
      scheduleDevice(device, PAUSED_CHECK_MS);
      return;
    }
  } catch (err) {
    console.error(`[showcase] tick for ${device.fingerprint} failed:`, err);
  }
  scheduleDevice(device, nextDelayMs());
}

export function startShowcase(): void {
  const timers = getTimers();
  if (timers.size > 0) return;
  console.log(`[showcase] starting ${DEVICES.length} simulated voting loops`);
  for (const device of DEVICES) {
    // Stagger initial delays so devices don't all fire at once
    scheduleDevice(device, randInt(200, 2000));
  }
}

export function stopShowcase(): void {
  const timers = getTimers();
  if (timers.size === 0) return;
  console.log(`[showcase] stopping ${timers.size} simulated voting loops`);
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
}

export function isShowcaseRunning(): boolean {
  return getTimers().size > 0;
}

export async function ensureShowcaseSync(): Promise<void> {
  const value = await getSetting(SETTING_KEYS.SHOWCASE_MODE);
  const shouldRun = value === "true";
  if (shouldRun && !isShowcaseRunning()) startShowcase();
  if (!shouldRun && isShowcaseRunning()) stopShowcase();
}

export function describeShowcaseDevices(): { fingerprint: string; label: string }[] {
  return DEVICES.map((d) => ({ fingerprint: d.fingerprint, label: d.label }));
}
