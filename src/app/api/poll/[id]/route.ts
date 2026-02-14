import { NextResponse } from "next/server";
import { getPoll, getScores } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const poll = await getPoll(params.id);

  if (!poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  return NextResponse.json({
    options: poll.options,
    voteCount: poll.votes.length,
    ended: poll.ended,
    winner: poll.winner,
    showScores: poll.showScores,
    scores: poll.ended && poll.showScores ? getScores(poll) : null,
  });
}
