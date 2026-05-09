import { NextResponse } from "next/server";
import { getCurrentResults } from "@/lib/sse";

export async function GET() {
  const results = await getCurrentResults();
  return NextResponse.json(results);
}
