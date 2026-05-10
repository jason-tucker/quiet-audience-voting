import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  let body: { name?: unknown; school?: unknown; posterUrl?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const school = typeof body.school === "string" ? body.school.trim() : "";
  const posterUrl = typeof body.posterUrl === "string" ? body.posterUrl.trim() : "";

  if (!name || !school || !posterUrl) {
    return NextResponse.json(
      { error: "name, school, and posterUrl are all required" },
      { status: 400 },
    );
  }

  try {
    const film = await prisma.film.create({
      data: { name, school, posterUrl },
    });
    return NextResponse.json({ film });
  } catch (err) {
    console.error("Failed to create film:", err);
    return NextResponse.json({ error: "Failed to create film" }, { status: 500 });
  }
}
