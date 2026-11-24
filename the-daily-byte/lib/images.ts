import type { Story } from "./types";

// Páginas que não dão a foto da matéria (redirecionadores, agregadores, discussões).
const SKIP = /(news\.google\.com|reddit\.com|news\.ycombinator\.com|twitter\.com|x\.com)/i;

function metaImage(html: string, base: string): string | undefined {
  const pick = (re: RegExp) => html.match(re)?.[1];
  const raw =
    pick(/<meta[^>]+(?:property|name)=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["']/i) ??
    pick(/<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']og:image["']/i) ??
    pick(/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)["']/i) ??
    pick(/<meta[^>]+content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i);
  if (!raw) return undefined;
  try {
    const u = new URL(raw.replace(/&amp;/g, "&"), base);
    if (u.protocol !== "https:") return undefined;
    if (/(logo|favicon|default|placeholder)/i.test(u.pathname)) return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

async function ogImage(url: string): Promise<string | undefined> {
  if (SKIP.test(url)) return undefined;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TheDailyByte/1.0; +news digest)",
        Accept: "text/html",
      },
    });
    if (!res.ok || !res.body || !(res.headers.get("content-type") ?? "").includes("html")) return undefined;
    // Só o começo da página: as metatags ficam no <head>.
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let html = "";
    while (html.length < 250_000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += dec.decode(value, { stream: true });
      if (/<\/head>/i.test(html)) break;
    }
    reader.cancel().catch(() => {});
    return metaImage(html, res.url || url);
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

/** Completa a foto das histórias que vieram sem imagem no feed, lendo a og:image das matérias. */
export async function fillImages(stories: Story[]): Promise<void> {
  await Promise.all(
    stories.map(async (s) => {
      if (s.image) return;
      const fromSource = s.sources.find((x) => x.image)?.image;
      if (fromSource) {
        s.image = fromSource;
        return;
      }
      for (const src of s.sources.slice(0, 3)) {
        const img = await ogImage(src.url);
        if (img) {
          s.image = img;
          return;
        }
      }
    }),
  );
}
