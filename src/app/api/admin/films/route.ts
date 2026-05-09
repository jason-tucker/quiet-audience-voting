import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();
  const { name, school, posterUrl } = body as {
    name: string;
    school: string;
    posterUrl: string;
  };

  if (!name || !school || !posterUrl) {
    return NextResponse.json({ error: "name, school, and posterUrl are required" }, { status: 400 });
  }

  const film = await prisma.film.create({
    data: { name, school, posterUrl },
  });
  return NextResponse.json({ film });
}
