import Parser from "rss-parser";
import { FEEDS, type Feed } from "./feeds";
import type { Item } from "./types";

type Extra = {
  mediaContent?: { $?: { url?: string; medium?: string; type?: string } }[];
  mediaThumbnail?: { $?: { url?: string } } | { $?: { url?: string } }[];
  contentEncoded?: string;
};

const parser: Parser<object, Extra> = new Parser({
  timeout: 12000,
  headers: { "User-Agent": "TheDailyByte/1.0 (+news digest)" },
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail"],
      ["content:encoded", "contentEncoded"],
    ],
  },
});

const IMG_EXT = /\.(jpe?g|png|webp|avif|gif)(\?|$)/i;

function okImage(u: string | undefined): string | undefined {
  if (!u) return undefined;
  const url = u.trim().replace(/&amp;/g, "&");
  if (!/^https:\/\//i.test(url)) return undefined;
  // Ícones, pixels de rastreio e avatares não servem de foto de capa.
  if (/(pixel|tracking|feedburner|gravatar|emoji|favicon|logo|avatar|1x1)/i.test(url)) return undefined;
  return url;
}

/** Procura a foto da matéria nos campos que os feeds costumam usar. */
function imageOf(entry: Parser.Item & Extra): string | undefined {
  const enc = entry.enclosure;
  if (enc?.url && (enc.type?.startsWith("image") || IMG_EXT.test(enc.url))) {
    const u = okImage(enc.url);
    if (u) return u;
  }
  for (const m of entry.mediaContent ?? []) {
    const a = m?.$;
    if (a?.url && (a.medium === "image" || a.type?.startsWith("image") || IMG_EXT.test(a.url))) {
      const u = okImage(a.url);
      if (u) return u;
    }
  }
  const th = entry.mediaThumbnail;
  const thumb = Array.isArray(th) ? th[0]?.$?.url : th?.$?.url;
  if (okImage(thumb)) return okImage(thumb);
  const html = `${entry.contentEncoded ?? ""} ${entry.content ?? ""}`;
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return okImage(m?.[1]);
}

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
      image: imageOf(entry),
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
