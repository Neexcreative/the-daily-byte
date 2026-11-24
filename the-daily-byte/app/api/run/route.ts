import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { runDigest } from "@/lib/run";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Geração manual não manda e-mail, para não duplicar o das 21h.
  const digest = await runDigest({ sendMail: false });
  return NextResponse.json({ ok: true, date: digest.date, stories: digest.stories.length });
}
