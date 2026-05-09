import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const films = await prisma.film.findMany({
    orderBy: { displayOrder: "asc" },
  });
  return NextResponse.json({ films });
}
