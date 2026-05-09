import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { name?: unknown; school?: unknown; posterUrl?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const film = await prisma.film.update({
      where: { id },
      data: {
        name: typeof body.name === "string" ? body.name : undefined,
        school: typeof body.school === "string" ? body.school : undefined,
        posterUrl: typeof body.posterUrl === "string" ? body.posterUrl : undefined,
      },
    });
    return NextResponse.json({ film });
  } catch (err) {
    console.error("Failed to update film:", err);
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: `Failed to update film: ${message}` }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.film.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete film:", err);
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: `Failed to delete film: ${message}` }, { status: 500 });
  }
}
