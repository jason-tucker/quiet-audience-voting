import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { label?: unknown };
  try {
    body = (await request.json()) as { label?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const label = typeof body.label === "string" ? body.label : undefined;
  try {
    const profile = await prisma.trustedDeviceProfile.update({
      where: { id },
      data: { label },
    });
    return NextResponse.json({ profile });
  } catch (err) {
    console.error("Failed to update trusted device profile:", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 404 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.trustedDeviceProfile.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete trusted device profile:", err);
    return NextResponse.json({ error: "Failed to delete profile" }, { status: 404 });
  }
}
