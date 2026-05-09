import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as { label?: string };
  const profile = await prisma.trustedDeviceProfile.update({
    where: { id },
    data: { label: body.label },
  });
  return NextResponse.json({ profile });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.trustedDeviceProfile.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
