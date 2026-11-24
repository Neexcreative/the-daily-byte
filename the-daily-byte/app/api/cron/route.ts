import { NextResponse } from "next/server";
import { localHour, runDigest } from "@/lib/run";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * A Vercel dispara este endpoint às 20h e às 21h UTC.
 * Só roda quando for a hora local certa (DIGEST_HOUR, padrão 21h em Dublin).
 * Assim o horário de verão não desloca a entrega.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const target = Number(process.env.DIGEST_HOUR ?? 21);
  const hour = localHour();
  if (hour !== target) {
    return NextResponse.json({ skipped: true, localHour: hour, target });
  }
  const digest = await runDigest();
  return NextResponse.json({
    ok: true,
    date: digest.date,
    stories: digest.stories.length,
    diagnostics: digest.diagnostics,
  });
}
