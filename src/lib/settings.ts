import { prisma } from "./prisma";

export const SETTING_KEYS = {
  VOTING_OPEN: "votingOpen",
  VOTING_OPENED_AT: "votingOpenedAt",
  EVENT_NAME: "eventName",
  ADMIN_PASSWORD_HASH: "adminPasswordHash",
  SHOWCASE_MODE: "showcaseMode",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

// Keys an admin is allowed to write through PUT /api/admin/settings.
// VOTING_OPENED_AT is set by the server when voting transitions open and
// ADMIN_PASSWORD_HASH has its own write path; neither belongs in this set.
export const ADMIN_WRITABLE_SETTINGS: ReadonlySet<string> = new Set([
  SETTING_KEYS.VOTING_OPEN,
  SETTING_KEYS.EVENT_NAME,
  SETTING_KEYS.SHOWCASE_MODE,
]);

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function isVotingOpen(): Promise<boolean> {
  const value = await getSetting(SETTING_KEYS.VOTING_OPEN);
  return value === "true";
}

export async function getEventName(): Promise<string> {
  return (await getSetting(SETTING_KEYS.EVENT_NAME)) ?? "Film Festival";
}

export async function getVotingOpenedAt(): Promise<string | null> {
  return await getSetting(SETTING_KEYS.VOTING_OPENED_AT);
}
