import { NextResponse } from "next/server";
import { isVotingOpen, getEventName } from "@/lib/settings";

export async function GET() {
  const [open, eventName] = await Promise.all([isVotingOpen(), getEventName()]);
  return NextResponse.json({ votingOpen: open, eventName });
}
