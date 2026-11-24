import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { rewriteRoteiro } from "@/lib/run";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

/** Escreve um roteiro novo para a edição pedida, usando as notícias que já foram coletadas. */
export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { date } = (await req.json().catch(() => ({}))) as { date?: string };
  try {
    const digest = await rewriteRoteiro(date);
    return NextResponse.json({ ok: true, date: digest.date, titulo: digest.roteiro?.titulo });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
