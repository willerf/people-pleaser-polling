import { NextResponse } from "next/server";
import { addVote } from "@/lib/store";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const { values } = body;

  if (!Array.isArray(values)) {
    return NextResponse.json(
      { error: "values must be an array" },
      { status: 400 }
    );
  }

  const valid = values.every(
    (v: unknown) => typeof v === "number" && v >= -1 && v <= 1
  );
  if (!valid) {
    return NextResponse.json(
      { error: "Each value must be a number between -1 and 1" },
      { status: 400 }
    );
  }

  const ok = addVote(params.id, values);
  if (!ok) {
    return NextResponse.json(
      { error: "Poll not found, ended, or wrong number of values" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
