import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const film = await prisma.film.update({
    where: { id },
    data: {
      name: body.name,
      school: body.school,
      posterUrl: body.posterUrl,
      displayOrder: body.displayOrder,
    },
  });
  return NextResponse.json({ film });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.film.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
