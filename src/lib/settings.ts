import { prisma } from "./prisma";

export const SETTING_KEYS = {
  VOTING_OPEN: "votingOpen",
  EVENT_NAME: "eventName",
  ADMIN_PASSWORD_HASH: "adminPasswordHash",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

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
