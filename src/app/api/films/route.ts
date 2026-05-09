import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const films = await prisma.film.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ films });
}
