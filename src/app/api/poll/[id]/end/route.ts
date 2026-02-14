import { NextResponse } from "next/server";
import { endPoll } from "@/lib/store";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const poll = await endPoll(params.id);

  if (!poll) {
    return NextResponse.json(
      { error: "Poll not found or already ended" },
      { status: 400 }
    );
  }

  return NextResponse.json({ winner: poll.winner });
}
