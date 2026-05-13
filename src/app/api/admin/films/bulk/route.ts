import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { FilmBulkInputSchema } from "@/lib/schemas";

// POST /api/admin/films/bulk — create up to 500 films in one request.
// See roadmap U5 (#28).
//
// Body: { films: FilmInput[] }
// Returns: { created: number, films: Film[] }
//
// Either every row inserts or none do — we wrap in a transaction so a
// validation error on row 47 doesn't leave 46 partial rows in the table.

export async function POST(request: Request) {
  let parsed;
  try {
    const body = await request.json();
    parsed = FilmBulkInputSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", code: "VALIDATION", issues: err.issues },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Trim every field. Client-side parsing usually leaves leading/trailing
  // whitespace from CSV cells; saves a "why doesn't my row match?" support
  // round-trip.
  const films = parsed.films.map((f) => ({
    name: f.name.trim(),
    school: f.school.trim(),
    posterUrl: f.posterUrl.trim(),
  }));

  if (films.some((f) => !f.name || !f.school || !f.posterUrl)) {
    return NextResponse.json(
      { error: "Every film must have non-empty name, school, and posterUrl" },
      { status: 400 },
    );
  }

  try {
    const created = await prisma.$transaction(
      films.map((f) => prisma.film.create({ data: f })),
    );
    return NextResponse.json({ created: created.length, films: created });
  } catch (err) {
    console.error("Bulk film create failed:", err);
    return NextResponse.json({ error: "Failed to import films" }, { status: 500 });
  }
}
