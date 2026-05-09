import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { detectSuspiciousVotes } from "@/lib/suspicious";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const windowMinutes = Number(searchParams.get("windowMinutes")) || 10;
  const threshold = Number(searchParams.get("threshold")) || 5;
  const clusters = await detectSuspiciousVotes(windowMinutes, threshold);
  return NextResponse.json({ clusters, windowMinutes, threshold });
}
