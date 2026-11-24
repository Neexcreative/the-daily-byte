import { collect } from "./collect";
import { rank } from "./rank";
import { enrich, writeRoteiro } from "./script";
import { fillImages } from "./images";
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
  return (
    Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hour12: false }).format(at)) % 24
  );
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

  // 12 candidatas; a IA junta as que são o mesmo fato e sobram até 10.
  const ranked = rank(items, now, exclude, 12);
  const enriched = await enrich(ranked, items);
  const stories = enriched.stories.slice(0, 10);
  await fillImages(stories);

  const written = stories.length ? await writeRoteiro(stories) : { error: "nenhuma notícia coletada" };
  const aiErrors = [enriched.error, written.error].filter(Boolean) as string[];

  const digest: Digest = {
    date,
    generatedAt: new Date(now).toISOString(),
    stories,
    roteiro: written.roteiro,
    diagnostics: {
      feedsOk,
      feedsFailed,
      itemsCollected: items.length,
      scriptErrors: aiErrors.length,
      emailStatus: "não enviado",
      aiError: aiErrors.length ? aiErrors.join(" | ") : undefined,
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

/**
 * Escreve um roteiro novo para uma edição já coletada, sem buscar as notícias de novo.
 * Leva poucos segundos e pode ser chamado a qualquer hora.
 */
export async function rewriteRoteiro(date?: string): Promise<Digest> {
  const dates = await listDates(14);
  const target = date && dates.includes(date) ? date : dates[0];
  const digest = target ? await getDigest(target) : null;
  if (!digest) throw new Error("nenhuma edição para escrever o roteiro");
  if (!digest.stories.length) throw new Error("a edição não tem notícias");

  const written = await writeRoteiro(digest.stories, digest.roteiro);
  if (!written.roteiro) throw new Error(written.error ?? "a IA não devolveu roteiro");
  digest.roteiro = written.roteiro;
  await saveDigest(digest);
  return digest;
}
