import { createHash } from "node:crypto";
import type { Category, Item, SourceRef, Story } from "./types";

const STOP = new Set(
  "the and for with from that this are was were has have had will its into over after about more than new says said how why what who when your you our their his her can could would should may might not but out off all any one two just use uses used get gets got now new com para com uma uns umas dos das que por mais como sobre apos ate sao foi ser tem seu sua nos nas pelo pela".split(
    " ",
  ),
);

export function tokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Agrupa notícias que falam do mesmo fato em veículos diferentes. */
export function cluster(items: Item[], threshold = 0.35): Item[][] {
  const sorted = [...items].sort((a, b) => b.weight - a.weight);
  const groups: { tok: Set<string>; items: Item[] }[] = [];
  for (const it of sorted) {
    const tok = tokens(it.title);
    let best: (typeof groups)[number] | undefined;
    let bestSim = 0;
    for (const g of groups) {
      const sim = jaccard(tok, g.tok);
      if (sim >= threshold && sim > bestSim) {
        best = g;
        bestSim = sim;
      }
    }
    if (best) {
      best.items.push(it);
      for (const t of tok) best.tok.add(t);
    } else {
      groups.push({ tok, items: [it] });
    }
  }
  return groups.map((g) => g.items);
}

function distinctSources(group: Item[]): number {
  return new Set(group.map((i) => i.source.toLowerCase())).size;
}

export function score(group: Item[], now: number): number {
  const sources = distinctSources(group);
  const best = Math.max(...group.map((i) => i.weight));
  const newest = Math.max(...group.map((i) => i.publishedAt));
  const ageH = Math.max(0, (now - newest) / 3_600_000);
  const recency = Math.max(0, 2 - ageH / 18);
  return sources * 3 + best + recency;
}

function pickCategory(group: Item[]): Category {
  const count = new Map<Category, number>();
  for (const i of group) count.set(i.category, (count.get(i.category) ?? 0) + 1);
  const order: Category[] = ["geo", "ai", "market", "tech"];
  const aiWords =
    /\b(ai|a\.i\.|ia|openai|anthropic|gemini|claude|chatgpt|gpt|llm|deepmind|inteligencia artificial|machine learning)\b/;
  const looksAi = group.some((i) =>
    aiWords.test(i.title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")),
  );
  if (looksAi && !count.has("geo")) return "ai";
  return [...count.entries()].sort(
    (a, b) => b[1] - a[1] || order.indexOf(a[0]) - order.indexOf(b[0]),
  )[0][0];
}

function toStory(group: Item[], now: number): Story {
  const lead = [...group].sort((a, b) => b.weight - a.weight || b.publishedAt - a.publishedAt)[0];
  const seen = new Set<string>();
  const sources: SourceRef[] = [];
  for (const i of [...group].sort((a, b) => b.weight - a.weight)) {
    const key = i.source.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({ name: i.source, url: i.link, title: i.title });
    if (sources.length === 4) break;
  }
  const newest = Math.max(...group.map((i) => i.publishedAt));
  const hours = Math.max(1, Math.round((now - newest) / 3_600_000));
  const n = distinctSources(group);
  return {
    id: createHash("sha1").update(lead.title).digest("hex").slice(0, 8),
    title: lead.title,
    category: pickCategory(group),
    score: Math.round(score(group, now) * 10) / 10,
    whyRanked: `${n} ${n === 1 ? "fonte" : "fontes"} · há ${hours}h`,
    sources,
  };
}

/**
 * Escolhe as melhores histórias do dia. Garante espaço para geopolítica e IA
 * quando existirem, para o painel não virar só uma categoria.
 */
export function rank(
  items: Item[],
  now: number,
  excludeLinks: Set<string> = new Set(),
  limit = 8,
): Story[] {
  const groups = cluster(items)
    .filter((g) => !g.some((i) => excludeLinks.has(i.link)))
    .map((g) => ({ g, s: score(g, now) }))
    .sort((a, b) => b.s - a.s);

  const stories = groups.map(({ g }) => toStory(g, now));
  const selected = stories.slice(0, limit);
  const rest = stories.slice(limit);

  const guarantee: [Category, number][] = [
    ["geo", 2],
    ["ai", 2],
  ];
  for (const [cat, min] of guarantee) {
    while (selected.filter((s) => s.category === cat).length < min) {
      const idx = rest.findIndex((s) => s.category === cat);
      if (idx === -1) break;
      // troca pelo item mais fraco de uma categoria que já passa do mínimo
      let victim = -1;
      for (let i = selected.length - 1; i >= 0; i--) {
        const c = selected[i].category;
        const need = guarantee.find(([k]) => k === c)?.[1] ?? 0;
        if (selected.filter((s) => s.category === c).length > need) {
          victim = i;
          break;
        }
      }
      if (victim === -1) break;
      selected[victim] = rest.splice(idx, 1)[0];
    }
  }
  return selected.sort((a, b) => b.score - a.score);
}
