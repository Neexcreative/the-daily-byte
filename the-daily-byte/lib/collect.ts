import Parser from "rss-parser";
import { FEEDS, type Feed } from "./feeds";
import type { Item } from "./types";

const parser = new Parser({
  timeout: 12000,
  headers: { "User-Agent": "TheDailyByte/1.0 (+news digest)" },
});

const MAX_AGE_MS = 36 * 3600 * 1000;

function clean(s: string | undefined, max = 400): string {
  return (s ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

async function readFeed(feed: Feed, now: number): Promise<Item[]> {
  const res = await parser.parseURL(feed.url);
  const items: Item[] = [];
  for (const entry of res.items ?? []) {
    if (!entry.title || !entry.link) continue;
    const ts = entry.isoDate ? Date.parse(entry.isoDate) : now;
    if (Number.isNaN(ts) || now - ts > MAX_AGE_MS) continue;

    let title = clean(entry.title, 300);
    let source = feed.name;
    if (feed.publisherInTitle) {
      const idx = title.lastIndexOf(" - ");
      if (idx > 20) {
        source = title.slice(idx + 3).trim();
        title = title.slice(0, idx).trim();
      }
    }

    items.push({
      title,
      link: entry.link,
      source,
      category: feed.category,
      publishedAt: ts,
      snippet: clean(entry.contentSnippet ?? entry.content ?? entry.summary),
      weight: feed.weight,
    });
  }
  return items;
}

export async function collect(now = Date.now()) {
  const results = await Promise.allSettled(FEEDS.map((f) => readFeed(f, now)));
  const items: Item[] = [];
  const failed: string[] = [];
  let ok = 0;
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      ok++;
      items.push(...r.value);
    } else {
      failed.push(FEEDS[i].name);
    }
  });
  return { items, feedsOk: ok, feedsFailed: failed };
}
