import { prisma } from "@/lib/prisma";

// Cap on retained AuthEvent rows. Anything older than this rolls off so
// SQLite stays small on long-running deployments. Chosen large enough to
// cover months of normal admin activity, small enough that a brute-force
// attack's logs don't dominate the DB.
const RETENTION = 1000;

export type AuthOutcome = "success" | "fail";

export type AuthEventInput = {
  outcome: AuthOutcome;
  ipAddress?: string | null;
  userAgent?: string | null;
  // Reason on failure ("bad_password", "rate_limited", "bad_origin",
  // "server_misconfigured"). Null on success.
  reason?: string | null;
};

export async function recordAuthEvent(input: AuthEventInput): Promise<void> {
  try {
    await prisma.authEvent.create({
      data: {
        outcome: input.outcome,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        reason: input.reason ?? null,
      },
    });
    // Best-effort pruning: keep only the last RETENTION rows. Done with a
    // sub-select against timestamp so we don't have to count first. SQLite
    // handles this fine at the small scales we run at.
    await prisma.$executeRaw`
      DELETE FROM "AuthEvent"
      WHERE id NOT IN (
        SELECT id FROM "AuthEvent" ORDER BY timestamp DESC LIMIT ${RETENTION}
      )
    `;
  } catch (err) {
    // Audit logging must NEVER block an auth response. Log and move on.
    console.error("recordAuthEvent failed", err);
  }
}
