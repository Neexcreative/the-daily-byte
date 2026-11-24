import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { INSTAGRAM, keywordOf, longDate } from "@/lib/format";
import { getDigest, listDates, storageMode } from "@/lib/store";
import { CATEGORY_LABEL, type Category, type Roteiro, type Story } from "@/lib/types";
import CopyButton from "./CopyButton";
import Masthead, { TAGLINE } from "./Masthead";
import RoteiroButton from "./RoteiroButton";
import Thumb from "./Thumb";

export const dynamic = "force-dynamic";

const SECTIONS: Category[] = ["ai", "tech", "geo", "market"];

function href(d: string | undefined, c: string | undefined): string {
  const q = new URLSearchParams();
  if (d) q.set("d", d);
  if (c) q.set("c", c);
  const s = q.toString();
  return s ? `/?${s}` : "/";
}

function shortDate(d: string): string {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

const WPS = 2.5; // palavras por segundo, igual ao cálculo do roteiro
const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;

/** Em que segundo do vídeo cada bloco começa (gancho em 0:00). */
function timings(r: Roteiro): { blocos: string[]; fechamento: string } {
  let t = words(r.gancho) / WPS;
  const blocos = r.blocos.map((b) => {
    const at = clock(t);
    t += words(b.texto) / WPS;
    return at;
  });
  return { blocos, fechamento: clock(t) };
}

/** Tamanho de cada cartão no bento: manchete grande, destaques largos e o resto em blocos. */
type Size = "hero" | "tall" | "wide" | "std";
function sizeOf(i: number): Size {
  if (i === 0) return "hero";
  if (i === 1) return "tall";
  if (i === 5) return "wide";
  return "std";
}

// Superfícies alternam como no design system: vermelho, preto e branco.
const SURFACE: Record<Size, string> = { hero: "s-red", tall: "s-ink", wide: "s-white", std: "s-white" };

function StoryCard({ s, size, inRoteiro, index }: { s: Story; size: Size; inRoteiro: boolean; index: number }) {
  const title = s.titlePt ?? s.title;
  const lead = s.sources[0]?.url;
  const related = s.related ?? [];
  const showRelated = size === "std" ? 0 : size === "hero" ? 4 : 3;

  return (
    <article className={`tile ${size} ${s.category} ${SURFACE[size]}`}>
      <a className="tile-media" href={lead} target="_blank" rel="noopener noreferrer" tabIndex={-1}>
        <Thumb src={s.image} category={s.category} alt="" keyword={keywordOf(s)} index={index} />
        {inRoteiro && <span className="badge">No roteiro</span>}
      </a>

      <div className="tile-body">
        <div className="kicker">
          <span className="idx mono">#{String(index + 1).padStart(2, "0")}</span>
          <span className="tag">{CATEGORY_LABEL[s.category]}</span>
          <span className="meta">{`// ${s.whyRanked}`}</span>
          {s.controversy != null && s.controversy >= 6 && (
            <span className={`heat${s.controversy >= 8 ? " hot" : ""}`}>Polêmica {s.controversy}/10</span>
          )}
        </div>

        {size === "hero" ? (
          // Manchete principal no painel inclinado da marca, com os três filetes e a tarja.
          <div className="pn hero-panel">
            <span className="fil" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="tarja">Hoje</span>
            <h2 className="headline">
              <a href={lead} target="_blank" rel="noopener noreferrer" title={s.titlePt ? `Original: ${s.title}` : undefined}>
                {title}
              </a>
            </h2>
          </div>
        ) : (
          <h2 className="headline">
            <a href={lead} target="_blank" rel="noopener noreferrer" title={s.titlePt ? `Original: ${s.title}` : undefined}>
              {title}
            </a>
          </h2>
        )}

        {s.summary && <p className="summary">{s.summary}</p>}

        {showRelated > 0 && related.length > 0 && (
          <div className="related">
            <h4>Desdobramentos</h4>
            <ul>
              {related.slice(0, showRelated).map((r) => (
                <li key={r.url}>
                  <a href={r.url} target="_blank" rel="noopener noreferrer">
                    {r.titlePt ?? r.title}
                  </a>
                  <span>{r.source}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="tile-foot">
          <div className="src">
            {s.sources.slice(0, size === "std" ? 3 : 6).map((x) => (
              <a key={x.url} href={x.url} target="_blank" rel="noopener noreferrer">
                {x.name}
              </a>
            ))}
            {size === "std" && s.sources.length > 3 && <span className="more">+{s.sources.length - 3}</span>}
          </div>
          {size === "std" && related.length > 0 && (
            <span className="more">
              +{related.length} {related.length === 1 ? "desdobramento" : "desdobramentos"}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function RoteiroPanel({
  roteiro,
  date,
  version,
  hasStories,
}: {
  roteiro: Roteiro | undefined;
  date: string | undefined;
  version: string | undefined;
  hasStories: boolean;
}) {
  const v = roteiro?.writtenAt ?? version ?? "";
  const capa = date ? `/api/capa?d=${date}&v=${encodeURIComponent(v)}` : undefined;
  const times = roteiro ? timings(roteiro) : undefined;
  const written = roteiro?.writtenAt
    ? new Date(roteiro.writtenAt).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: process.env.DIGEST_TZ || "Europe/Dublin",
      })
    : undefined;
  return (
    <aside className="rcol" aria-label="Roteiro do dia">
      <div className="rbox s-ink">
        <div className="rhead">
          <span className="eyebrow">
            <i />
            Roteiro do dia
          </span>
          {roteiro && <span className="pill mono">~{roteiro.seconds}s</span>}
        </div>

        {roteiro ? (
          <>
            <h3 className="rtitle">{roteiro.titulo}</h3>
            <p className="rmeta">
              {roteiro.blocos.length} assuntos · {roteiro.words} palavras
              {roteiro.seconds > 60 && " · passou de 60s"}
              {written && ` · escrito às ${written}`}
            </p>
            <p className="rhook">
              <span className="at mono">0:00</span>“{roteiro.gancho}”
            </p>
            {/* No celular o texto completo fica recolhido para as notícias aparecerem logo. */}
            <input type="checkbox" id="rt-toggle" className="rt-toggle" />
            <label htmlFor="rt-toggle" className="rt-more">
              <span className="open">Ver roteiro completo</span>
              <span className="close">Recolher roteiro</span>
            </label>
            <div className="rfull">
              <ol className="rlist">
                {roteiro.blocos.map((b, i) => (
                  <li key={b.storyId}>
                    <span className="at mono">{times?.blocos[i]}</span>
                    <b>{b.assunto}</b>
                    <p>{b.texto}</p>
                  </li>
                ))}
              </ol>
              <p className="rclose">
                <span className="at mono">{times?.fechamento}</span>
                {roteiro.fechamento}
              </p>
            </div>
            {capa && (
              <div className="rcover">
                <a href={capa} target="_blank" rel="noopener noreferrer" title="Abrir a capa em tamanho real">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={capa} alt="Capa vertical do vídeo de hoje" loading="lazy" />
                </a>
                <div>
                  <b>Capa do vídeo</b>
                  <p>Vertical 1080×1920, pronta para Reels, Shorts e TikTok.</p>
                  <a className="btn" href={`${capa}&download=1`} download={`capa-${date}.png`}>
                    Baixar capa
                  </a>
                </div>
              </div>
            )}
            <div className="ractions">
              <CopyButton text={roteiro.narracao} label="Copiar roteiro" />
              {date && (
                <a className="btn" href={`/roteiro?d=${date}`}>
                  Modo gravação →
                </a>
              )}
            </div>
            <div className="ragain">
              <p>Não gostou? Pede outra versão com as mesmas notícias, a qualquer hora.</p>
              <RoteiroButton date={date} />
            </div>
          </>
        ) : hasStories ? (
          <div className="rempty">
            <p>O roteiro desta edição ainda não foi escrito. As notícias já estão aqui: escreve agora, leva uns segundos.</p>
            <RoteiroButton date={date} label="Escrever roteiro" />
          </div>
        ) : (
          <p className="rempty">
            Ainda não há notícias nesta edição. Toca em &quot;Gerar edição&quot; ou espera a entrega das 21h.
          </p>
        )}
      </div>
    </aside>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ d?: string; c?: string }>;
}) {
  if (!(await isAuthed())) redirect("/login");

  const { d, c } = await searchParams;
  const dates = await listDates(14);
  const current = d && dates.includes(d) ? d : dates[0];
  const digest = current ? await getDigest(current) : null;

  const cat = SECTIONS.find((x) => x === c);
  const all = digest?.stories ?? [];
  const shown = cat ? all.filter((s) => s.category === cat) : all;
  const count = (k: Category) => all.filter((s) => s.category === k).length;
  const inRoteiro = new Set(digest?.roteiro?.blocos.map((b) => b.storyId) ?? []);

  return (
    <>
      <Masthead left={current ? longDate(current) : "Sem edição"} ticker={all.map((s) => s.titlePt ?? s.title)}>
        <ul className="sections">
          <li>
            <a href={href(current, undefined)} aria-current={!cat}>
              Destaques <span className="n">[{all.length}]</span>
            </a>
          </li>
          {SECTIONS.map((k) => (
            <li key={k}>
              <a href={href(current, k)} aria-current={cat === k} className={k}>
                {CATEGORY_LABEL[k]} <span className="n">[{count(k)}]</span>
              </a>
            </li>
          ))}
        </ul>

        {dates.length > 0 && (
          <details className="editions">
            <summary>Edições anteriores</summary>
            <ul>
              {dates.map((x) => (
                <li key={x}>
                  <a href={href(x, cat)} aria-current={x === current}>
                    {shortDate(x)}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Masthead>

      <div className="wrap shell">
        <main className="feed">
          <div className="section-title">
            <div>
              <p className="eyebrow">
                <i />
                {`> ${shown.length} ${shown.length === 1 ? "notícia" : "notícias"} · com fonte`}
              </p>
              <h2>
                {cat ? CATEGORY_LABEL[cat] : "Os destaques de hoje"}
                <span className="cursor" aria-hidden="true" />
              </h2>
            </div>
          </div>

          {!digest && (
            <div className="empty">
              <p>
                <b>Nenhuma edição ainda.</b>
              </p>
              <p>Toca em &quot;Gerar edição&quot; para criar a primeira, ou espera a entrega das 21h.</p>
            </div>
          )}

          {digest && shown.length === 0 && (
            <div className="empty">
              <p>Nenhuma notícia nesta seção hoje.</p>
            </div>
          )}

          <div className="bento">
            {shown.map((s, i) => (
              <StoryCard key={s.id} s={s} size={sizeOf(i)} inRoteiro={inRoteiro.has(s.id)} index={i} />
            ))}
          </div>

          {digest && (
            <p className="diag">
              Gerado em{" "}
              {new Date(digest.generatedAt).toLocaleString("pt-BR", {
                timeZone: process.env.DIGEST_TZ || "Europe/Dublin",
              })}{" "}
              · {digest.diagnostics.itemsCollected} itens de {digest.diagnostics.feedsOk} feeds · e-mail:{" "}
              {digest.diagnostics.emailStatus} · armazenamento: {storageMode}
              {digest.diagnostics.feedsFailed.length > 0 &&
                ` · feeds com falha: ${digest.diagnostics.feedsFailed.join(", ")}`}
              {digest.diagnostics.aiError && ` · erro da IA: ${digest.diagnostics.aiError}`}
              . Confere a fonte original antes de publicar.
            </p>
          )}
        </main>

        <RoteiroPanel
          roteiro={digest?.roteiro}
          date={current}
          version={digest?.generatedAt}
          hasStories={all.length > 0}
        />
      </div>

      <footer className="foot s-ink">
        <div className="wrap foot-in">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/avatar.png" alt="" width={56} height={56} />
          <p>{TAGLINE}</p>
          <a className="mono" href={`https://instagram.com/${INSTAGRAM}`} target="_blank" rel="noopener noreferrer">
            @{INSTAGRAM}
          </a>
        </div>
      </footer>
    </>
  );
}
