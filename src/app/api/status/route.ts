import { NextResponse } from "next/server";
import { isVotingOpen, getEventName, getVotingOpenedAt } from "@/lib/settings";

export async function GET() {
  const [open, eventName, votingOpenedAt] = await Promise.all([
    isVotingOpen(),
    getEventName(),
    getVotingOpenedAt(),
  ]);
  return NextResponse.json({ votingOpen: open, eventName, votingOpenedAt });
}
