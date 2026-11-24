import { ImageResponse } from "next/og";
import { isAuthed } from "@/lib/auth";
import { getDigest, listDates } from "@/lib/store";
import { CATEGORY_LABEL, type Category, type Digest, type Story } from "@/lib/types";

export const dynamic = "force-dynamic";

const W = 1080;
const H = 1920;

const SECTION_BG: Record<Category, [string, string]> = {
  ai: ["#6a54e0", "#1c1259"],
  tech: ["#1b8f88", "#032c2a"],
  geo: ["#d0414a", "#4a0b10"],
  market: ["#b88a1c", "#3a2900"],
};

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
      ["Display", "Playfair Display", 900, false],
      ["Display", "Playfair Display", 900, true],
      ["Sans", "Inter", 700, false],
      ["Sans", "Inter", 400, false],
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
  if (n <= 28) return 128;
  if (n <= 45) return 112;
  if (n <= 65) return 96;
  return 82;
}

function shortDate(d: string): string {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

export async function GET(req: Request) {
  if (!(await isAuthed())) return new Response("unauthorized", { status: 401 });

  const d = new URL(req.url).searchParams.get("d") ?? undefined;
  const dates = await listDates(14);
  const date = d && dates.includes(d) ? d : dates[0];
  const digest = date ? await getDigest(date) : null;
  if (!digest || !date) return new Response("sem edição", { status: 404 });

  const [{ story, img }, fontList] = await Promise.all([coverPhoto(digest), fonts()]);
  const cat: Category = story?.category ?? "tech";
  const [bgFrom, bgTo] = SECTION_BG[cat];

  const title = digest.roteiro?.titulo || story?.titlePt || story?.title || "As notícias de hoje";
  const topics = digest.roteiro?.blocos ?? [];
  const display = fontList.some((f) => f.name === "Display") ? "Display" : undefined;
  const sans = fontList.some((f) => f.name === "Sans") ? "Sans" : undefined;

  const image = new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          background: `linear-gradient(160deg, ${bgFrom}, ${bgTo})`,
          color: "#fff",
          fontFamily: sans,
        }}
      >
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" width={W} height={H} style={{ position: "absolute", top: 0, left: 0, width: W, height: H, objectFit: "cover" }} />
        )}
        {/* Escurece a foto para o texto ficar legível */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: W,
            height: H,
            display: "flex",
            background: img
              ? "linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.05) 22%, rgba(0,0,0,.15) 45%, rgba(0,0,0,.8) 55%, rgba(0,0,0,.92) 100%)"
              : "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,.45) 100%)",
          }}
        />

        {/* Topo: marca e data */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "200px 80px 0", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "baseline", fontFamily: display, fontWeight: 900, fontSize: 56 }}>
            The Daily&nbsp;<span style={{ fontStyle: "italic", color: "#ff5a4a" }}>Byte</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              fontWeight: 700,
              padding: "12px 26px",
              borderRadius: 999,
              background: "rgba(255,255,255,.16)",
              border: "2px solid rgba(255,255,255,.28)",
            }}
          >
            {shortDate(date)}
          </div>
        </div>

        {/* Base: título e assuntos */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", padding: "0 150px 400px 80px", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 34 }}>
            <div style={{ display: "flex", width: 56, height: 8, borderRadius: 8, background: "#ff5a4a" }} />
            <div style={{ display: "flex", fontSize: 32, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", color: "#ffd9d4" }}>
              {topics.length ? `${topics.length} notícias em 60s` : CATEGORY_LABEL[cat]}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: display,
              fontWeight: 900,
              fontSize: titleSize(title),
              lineHeight: 1.02,
              letterSpacing: -2,
              textShadow: "0 4px 30px rgba(0,0,0,.35)",
            }}
          >
            {title}
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
