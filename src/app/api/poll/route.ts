import { NextResponse } from "next/server";
import { createPoll } from "@/lib/store";
import { VotingMethod } from "@/types/poll";

const VALID_METHODS: VotingMethod[] = ["slider", "ranked", "single", "veto"];

export async function POST(req: Request) {
  const body = await req.json();
  const { options, hideScores, votingMethod, title } = body;

  if (!Array.isArray(options) || options.length < 2) {
    return NextResponse.json(
      { error: "At least 2 options required" },
      { status: 400 }
    );
  }

  const cleaned = options
    .map((o: unknown) => String(o).trim())
    .filter((o: string) => o.length > 0);

  if (cleaned.length < 2) {
    return NextResponse.json(
      { error: "At least 2 non-empty options required" },
      { status: 400 }
    );
  }

  const method: VotingMethod = VALID_METHODS.includes(votingMethod) ? votingMethod : "slider";

  const pollTitle = typeof title === "string" && title.trim() ? title.trim() : "Vote on it!";
  const poll = await createPoll(cleaned, !!hideScores, method, pollTitle);
  return NextResponse.json({ id: poll.id });
}
