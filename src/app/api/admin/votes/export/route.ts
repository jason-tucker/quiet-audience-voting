import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/admin/votes/export?format=csv|json[&filmId=…]
//
// Streams the full audit log to a downloadable file. Unlike /api/admin/votes
// this is NOT paginated — it walks the whole dataset in id-ordered chunks of
// EXPORT_CHUNK_SIZE so we don't buffer everything in memory. Suitable for
// 200k+ row exports on the production volume.
//
// Auth: middleware enforces JWT on /api/admin/*.

const EXPORT_CHUNK_SIZE = 500;

const CSV_COLUMNS = [
  "id",
  "filmId",
  "filmName",
  "timestamp",
  "deviceFingerprint",
  "ipAddress",
  "userAgent",
  "platform",
  "screenWidth",
  "screenHeight",
  "timezone",
  "language",
  "rawDeviceJson",
] as const;

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "string" ? value : String(value);
  // Always quote — simpler than guessing which cells need it. Escape inner
  // quotes by doubling them, per RFC 4180.
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const format = (searchParams.get("format") ?? "csv").toLowerCase();
  const filmId = searchParams.get("filmId") ?? undefined;
  if (format !== "csv" && format !== "json") {
    return new Response(
      JSON.stringify({ error: "format must be 'csv' or 'json'", code: "VALIDATION" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const where = filmId ? { filmId } : {};

  // ISO date in the filename so multiple exports don't clobber each other.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `qav-votes-${stamp}.${format}`;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        if (format === "csv") {
          controller.enqueue(enc.encode(CSV_COLUMNS.join(",") + "\n"));
        } else {
          controller.enqueue(enc.encode("[\n"));
        }

        let cursor: string | undefined;
        let first = true;
        while (true) {
          const chunk = await prisma.vote.findMany({
            where,
            orderBy: { id: "asc" },
            take: EXPORT_CHUNK_SIZE,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
            include: { film: { select: { name: true } } },
          });
          if (chunk.length === 0) break;

          for (const v of chunk) {
            const row = {
              id: v.id,
              filmId: v.filmId,
              filmName: v.film.name,
              timestamp: v.timestamp.toISOString(),
              deviceFingerprint: v.deviceFingerprint,
              ipAddress: v.ipAddress,
              userAgent: v.userAgent,
              platform: v.platform,
              screenWidth: v.screenWidth,
              screenHeight: v.screenHeight,
              timezone: v.timezone,
              language: v.language,
              rawDeviceJson: v.rawDeviceJson,
            };

            if (format === "csv") {
              const line = CSV_COLUMNS.map((c) => csvCell(row[c])).join(",") + "\n";
              controller.enqueue(enc.encode(line));
            } else {
              const sep = first ? "  " : ",\n  ";
              controller.enqueue(enc.encode(sep + JSON.stringify(row)));
              first = false;
            }
          }

          cursor = chunk[chunk.length - 1].id;
          if (chunk.length < EXPORT_CHUNK_SIZE) break;
        }

        if (format === "json") {
          controller.enqueue(enc.encode("\n]\n"));
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
