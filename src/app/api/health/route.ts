import { NextResponse } from "next/server";
import { constants as fsConstants } from "node:fs";
import { access, statfs } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { UPLOAD_DIR } from "@/lib/uploadStorage";

// /api/health — operational health probe used by Watchtower, monitoring, etc.
//
// Returns 200 with `{ ok: true, checks: {...} }` when every check passes.
// Returns 503 with the same shape (and individual `ok: false` flags) on any
// failure. The shape stays the same in both directions so a probe can grep
// for `"ok":false` instead of branching on status code.
//
// /api/status remains the lightweight "what is voting state" endpoint that
// the voter screen polls. /api/health is the operational sibling.

type Check = {
  ok: boolean;
  detail?: string;
};

const DISK_FREE_FLOOR = 0.05; // 5% of total

export async function GET() {
  const checks: Record<string, Check> = {};
  const errors: string[] = [];

  // DB reachable? Trivial round-trip via Prisma.
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    checks.database = { ok: false, detail: msg };
    errors.push(`database: ${msg}`);
  }

  // Migrations applied? We rely on the same Setting rows the seed inserts —
  // their existence implies migrations ran AND the seed has happened. If the
  // table itself is missing, the Prisma call throws and we surface that.
  try {
    const count = await prisma.setting.count();
    if (count === 0) {
      checks.migrations = { ok: false, detail: "Setting table empty (seed not applied?)" };
      errors.push("migrations: Setting table empty");
    } else {
      checks.migrations = { ok: true };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    checks.migrations = { ok: false, detail: msg };
    errors.push(`migrations: ${msg}`);
  }

  // Uploads dir writable?
  try {
    await access(UPLOAD_DIR, fsConstants.W_OK);
    checks.uploads_writable = { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    checks.uploads_writable = { ok: false, detail: `${UPLOAD_DIR}: ${msg}` };
    errors.push(`uploads_writable: ${msg}`);
  }

  // Disk space > 5% free? Use statfs on the uploads dir as a proxy for the
  // volume the app cares about. node:fs/promises.statfs ships in Node 18.15+.
  try {
    const stats = await statfs(UPLOAD_DIR);
    const totalBytes = Number(stats.blocks) * stats.bsize;
    const freeBytes = Number(stats.bavail) * stats.bsize;
    const freeFraction = totalBytes > 0 ? freeBytes / totalBytes : 0;
    if (freeFraction < DISK_FREE_FLOOR) {
      checks.disk = {
        ok: false,
        detail: `${(freeFraction * 100).toFixed(1)}% free (< ${DISK_FREE_FLOOR * 100}%)`,
      };
      errors.push(`disk: ${(freeFraction * 100).toFixed(1)}% free`);
    } else {
      checks.disk = {
        ok: true,
        detail: `${(freeFraction * 100).toFixed(1)}% free`,
      };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Don't fail health on statfs not being supported — it's a soft check.
    checks.disk = { ok: true, detail: `statfs unavailable: ${msg}` };
  }

  const ok = errors.length === 0;
  return NextResponse.json(
    { ok, checks, errors: errors.length ? errors : undefined },
    { status: ok ? 200 : 503 },
  );
}
