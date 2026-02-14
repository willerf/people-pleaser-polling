import { NextResponse } from "next/server";
import { createPoll } from "@/lib/store";

export async function POST(req: Request) {
  const body = await req.json();
  const { options, showScores } = body;

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

  const poll = createPoll(cleaned, !!showScores);
  return NextResponse.json({ id: poll.id });
}
