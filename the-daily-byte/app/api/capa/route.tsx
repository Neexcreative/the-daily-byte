import { ImageResponse } from "next/og";
import { isAuthed } from "@/lib/auth";
import { getDigest, listDates } from "@/lib/store";
import type { Digest, Story } from "@/lib/types";

export const dynamic = "force-dynamic";

const W = 1080;
const H = 1920;

// Cores do design system: um único vermelho, preto e branco.
const RED = "#D92D14";
const INK = "#0A0A0A";

type FontDef = { name: string; data: ArrayBuffer; weight: 400 | 700 | 900; style: "normal" | "italic" };
let fontCache: Promise<FontDef[]> | null = null;

/** Baixa as fontes do Google Fonts em TTF (o gerador de imagem não lê woff2). */
async function loadFont(family: string, weight: number, italic = false): Promise<ArrayBuffer | null> {
  try {
    const axis = italic ? `ital,wght@1,${weight}` : `wght@${weight}`;
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:${axis}`, {
        headers: { "User-Agent": "Mozilla/5.0" },
      })
    ).text();
    const url = css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/)?.[1];
    if (!url) return null;
    return await (await fetch(url)).arrayBuffer();
  } catch {
    return null;
  }
}

function fonts(): Promise<FontDef[]> {
  fontCache ??= (async () => {
    const want: [string, string, 400 | 700 | 900, boolean][] = [
      ["Display", "Big Shoulders", 900, false],
      ["Sans", "IBM Plex Sans", 700, false],
      ["Mono", "IBM Plex Mono", 400, false],
    ];
    const out: FontDef[] = [];
    for (const [name, family, weight, italic] of want) {
      const data = await loadFont(family, weight, italic);
      if (data) out.push({ name, data, weight, style: italic ? "italic" : "normal" });
    }
    if (out.length < want.length) fontCache = null; // tenta de novo na próxima vez
    return out;
  })();
  return fontCache;
}

/** Baixa a foto e devolve como data URI (só JPEG/PNG, que o gerador aceita). */
async function photo(url: string | undefined): Promise<string | null> {
  if (!url) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      // Pede JPEG/PNG: muitos CDNs mandam WebP quando o cliente aceita, e o gerador não lê WebP.
      headers: { "User-Agent": "Mozilla/5.0 (TheDailyByte cover)", Accept: "image/jpeg,image/png;q=0.9,*/*;q=0.1" },
    });
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!res.ok || !/^image\/(jpeg|jpg|png)$/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 8_000_000) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Foto de fundo: começa pela notícia principal do roteiro (a de maior relevância) e,
 * se a foto dela não carregar, tenta as próximas, até achar uma que funcione.
 */
async function coverPhoto(d: Digest): Promise<{ story?: Story; img: string | null }> {
  const byScore = (a: Story, b: Story) => b.score - a.score;
  const inRoteiro = (d.roteiro?.blocos ?? [])
    .map((b) => d.stories.find((s) => s.id === b.storyId))
    .filter((s): s is Story => !!s)
    .sort(byScore);
  const rest = d.stories.filter((s) => !inRoteiro.includes(s)).sort(byScore);
  const order = [...inRoteiro, ...rest];

  let tries = 0;
  for (const s of order) {
    const urls = [s.image, ...s.sources.map((x) => x.image)].filter((u, i, all): u is string => !!u && all.indexOf(u) === i);
    for (const u of urls) {
      if (tries++ >= 8) return { story: order[0], img: null };
      const img = await photo(u);
      if (img) return { story: s, img };
    }
  }
  return { story: order[0], img: null };
}

function titleSize(t: string): number {
  const n = t.length;
  if (n <= 24) return 150;
  if (n <= 40) return 128;
  if (n <= 60) return 108;
  return 92;
}

function shortDate(d: string): string {
  return new Date(`${d}T12:00:00Z`)
    .toLocaleDateString("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" })
    .replace(".", "");
}

/** Logotipo oficial, servido pelo próprio site (arquivo público, sem login). */
async function logo(req: Request): Promise<string | null> {
  try {
    const res = await fetch(new URL("/brand/logo.png", req.url));
    if (!res.ok) return null;
    return `data:image/png;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  if (!(await isAuthed())) return new Response("unauthorized", { status: 401 });

  const d = new URL(req.url).searchParams.get("d") ?? undefined;
  const dates = await listDates(14);
  const date = d && dates.includes(d) ? d : dates[0];
  const digest = date ? await getDigest(date) : null;
  if (!digest || !date) return new Response("sem edição", { status: 404 });

  const [{ story, img }, fontList, logoSrc] = await Promise.all([coverPhoto(digest), fonts(), logo(req)]);

  const title = (digest.roteiro?.titulo || story?.titlePt || story?.title || "As notícias de hoje").toUpperCase();
  const topics = digest.roteiro?.blocos ?? [];
  const display = fontList.some((f) => f.name === "Display") ? "Display" : undefined;
  const sans = fontList.some((f) => f.name === "Sans") ? "Sans" : undefined;
  const mono = fontList.some((f) => f.name === "Mono") ? "Mono" : undefined;
  const full = { position: "absolute" as const, top: 0, left: 0, width: W, height: H };

  // Área segura do vídeo vertical (design system): fora de 250 px no topo e 480 px na base.
  const image = new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", position: "relative", background: RED, color: "#fff", fontFamily: sans }}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" width={W} height={H} style={{ ...full, objectFit: "cover" }} />
        ) : (
          <div
            style={{
              ...full,
              display: "flex",
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.14) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,.14) 2px, transparent 2px)",
              backgroundSize: "120px 120px",
            }}
          />
        )}
        {img && (
          <div
            style={{
              ...full,
              display: "flex",
              background:
                "linear-gradient(180deg, rgba(10,10,10,.55) 0%, rgba(10,10,10,0) 26%, rgba(10,10,10,0) 40%, rgba(10,10,10,.7) 62%, rgba(10,10,10,.9) 100%)",
            }}
          />
        )}

        {/* Topo: logotipo oficial e data */}
        <div
          style={{
            position: "absolute",
            top: 250,
            left: 72,
            right: 72,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} alt="" width={210} height={210} style={{ borderRadius: 10 }} />
          ) : (
            <div style={{ display: "flex", fontFamily: display, fontSize: 72 }}>THE DAILY BYTE</div>
          )}
          <div
            style={{
              display: "flex",
              fontFamily: mono,
              fontSize: 34,
              padding: "12px 22px",
              border: "3px solid #fff",
              borderRadius: 10,
              background: "rgba(10,10,10,.35)",
              textTransform: "uppercase",
            }}
          >
            {shortDate(date)}
          </div>
        </div>

        {/* Base: painel inclinado com a manchete, dentro da área segura */}
        <div style={{ position: "absolute", left: 64, right: 64, bottom: 480, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 44 }}>
            <div style={{ display: "flex", width: 60, height: 6, background: "#fff" }} />
            <div style={{ display: "flex", fontSize: 32, fontWeight: 700, letterSpacing: 5, textTransform: "uppercase" }}>
              {topics.length ? `${topics.length} notícias em 60 segundos` : "Tech, IA e geopolítica"}
            </div>
          </div>

          <div style={{ display: "flex", position: "relative", padding: "86px 56px 56px" }}>
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                background: "#fff",
                borderRadius: 44,
                transform: "skewY(-2deg)",
              }}
            />
            {/* três filetes */}
            <div style={{ position: "absolute", left: 56, top: 34, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", width: 28, height: 8, borderRadius: 4, background: RED }} />
              <div style={{ display: "flex", width: 56, height: 8, borderRadius: 4, background: RED }} />
              <div style={{ display: "flex", width: 112, height: 8, borderRadius: 4, background: RED }} />
            </div>
            {/* tarja */}
            <div
              style={{
                position: "absolute",
                right: -10,
                top: -40,
                display: "flex",
                fontFamily: display,
                fontSize: 56,
                lineHeight: 1,
                padding: "12px 26px",
                background: INK,
                color: "#fff",
                borderRadius: 12,
              }}
            >
              HOJE
            </div>
            <div
              style={{
                display: "flex",
                position: "relative",
                fontFamily: display,
                fontWeight: 900,
                fontSize: titleSize(title),
                lineHeight: 0.9,
                color: INK,
              }}
            >
              {title}
            </div>
          </div>
        </div>
      </div>
    ),
    { width: W, height: H, fonts: fontList.length ? fontList : undefined },
  );

  const headers = new Headers(image.headers);
  headers.set("Cache-Control", "private, max-age=3600");
  if (new URL(req.url).searchParams.has("download")) {
    headers.set("Content-Disposition", `attachment; filename="capa-${date}.png"`);
  }
  return new Response(image.body, { status: image.status, headers });
}
