import { collect } from "./collect";
import { rank } from "./rank";
import { writeScripts } from "./script";
import { getDigest, listDates, saveDigest } from "./store";
import { sendEmail } from "./email";
import type { Digest } from "./types";

export function dateKey(tz = process.env.DIGEST_TZ || "Europe/Dublin", at = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

export function localHour(tz = process.env.DIGEST_TZ || "Europe/Dublin", at = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hour12: false }).format(at),
  ) % 24;
}

export async function runDigest(opts: { sendMail?: boolean } = {}): Promise<Digest> {
  const now = Date.now();
  const date = dateKey();

  // Evita repetir o que já saiu no digest anterior.
  const exclude = new Set<string>();
  const dates = await listDates(3);
  for (const d of dates) {
    if (d === date) continue;
    const prev = await getDigest(d);
    prev?.stories.forEach((s) => s.sources.forEach((x) => exclude.add(x.url)));
    break;
  }

  const { items, feedsOk, feedsFailed } = await collect(now);
  const ranked = rank(items, now, exclude, 8);
  const { stories, errors } = await writeScripts(ranked, items, 8);

  const digest: Digest = {
    date,
    generatedAt: new Date(now).toISOString(),
    stories,
    diagnostics: {
      feedsOk,
      feedsFailed,
      itemsCollected: items.length,
      scriptErrors: errors,
      emailStatus: "não enviado",
    },
  };

  if (opts.sendMail !== false && stories.length) {
    try {
      digest.diagnostics.emailStatus = await sendEmail(digest);
    } catch (e) {
      digest.diagnostics.emailStatus = `erro: ${(e as Error).message}`;
    }
  }

  await saveDigest(digest);
  return digest;
}
