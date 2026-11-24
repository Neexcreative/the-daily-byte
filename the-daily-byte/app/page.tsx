import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { longDate } from "@/lib/format";
import { getDigest, listDates, storageMode } from "@/lib/store";
import { CATEGORY_LABEL, type Category, type Roteiro } from "@/lib/types";
import CopyButton from "./CopyButton";
import Masthead from "./Masthead";

export const dynamic = "force-dynamic";

const SECTIONS: Category[] = ["ai", "tech", "geo", "market"];
const DOT: Record<Category, string> = {
  ai: "var(--ai)",
  tech: "var(--tech)",
  geo: "var(--geo)",
  market: "var(--market)",
};

function href(d: string | undefined, c: string | undefined): string {
  const q = new URLSearchParams();
  if (d) q.set("d", d);
  if (c) q.set("c", c);
  const s = q.toString();
  return s ? `/?${s}` : "/";
}

function RoteiroPanel({ roteiro, date }: { roteiro: Roteiro | undefined; date: string | undefined }) {
  return (
    <aside className="rcol" aria-label="Roteiro do dia">
      <div className="rbox">
        <div className="rhead">
          <span>Roteiro do dia</span>
          {roteiro && <span>~{roteiro.seconds}s</span>}
        </div>

        {roteiro ? (
          <>
            <h3 className="rtitle">{roteiro.titulo}</h3>
            <p className="rmeta">
              {roteiro.blocos.length} assuntos · {roteiro.words} palavras
              {roteiro.seconds > 60 && " · passou de 60s"}
            </p>
            <p className="rhook">{roteiro.gancho}</p>
            <ol className="rlist">
              {roteiro.blocos.map((b) => (
                <li key={b.storyId}>
                  <b>{b.assunto}</b>
                  <p>{b.texto}</p>
                </li>
              ))}
            </ol>
            <p className="rclose">{roteiro.fechamento}</p>
            <div className="ractions">
              <CopyButton text={roteiro.narracao} label="Copiar roteiro" />
              {date && (
                <a className="btn ghost" href={`/roteiro?d=${date}`}>
                  Modo gravação
                </a>
              )}
            </div>
          </>
        ) : (
          <p className="rempty">
            O roteiro de hoje ainda não foi gerado. Clica em &quot;Gerar agora&quot; ou espera a entrega das 21h.
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
      <Masthead
        left={current ? longDate(current) : "Sem edição"}
        right={`Edição das 21h · ${all.length} notícias`}
      />

      <div className="shell">
        <aside className="side">
          <h3>Seções</h3>
          <ul>
            <li>
              <a href={href(current, undefined)} aria-current={!cat}>
                <span>Todas</span>
                <span className="n">{all.length}</span>
              </a>
            </li>
            {SECTIONS.map((k) => (
              <li key={k}>
                <a href={href(current, k)} aria-current={cat === k}>
                  <span>
                    <i className="dot" style={{ background: DOT[k] }} />
                    {CATEGORY_LABEL[k]}
                  </span>
                  <span className="n">{count(k)}</span>
                </a>
              </li>
            ))}
          </ul>

          {dates.length > 0 && (
            <>
              <h3>Edições</h3>
              <ul className="dates">
                {dates.map((x) => (
                  <li key={x}>
                    <a href={href(x, cat)} aria-current={x === current}>
                      <span>{x}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>

        <main className="feed">
          <div className="section-title">
            <h2>{cat ? CATEGORY_LABEL[cat] : "Notícias do dia"}</h2>
            <span>
              {shown.length} {shown.length === 1 ? "notícia" : "notícias"}
            </span>
          </div>

          {!digest && (
            <div className="empty">
              <p>
                <b>Nenhuma edição ainda.</b>
              </p>
              <p>Clica em &quot;Gerar agora&quot; para criar a primeira, ou espera a entrega das 21h.</p>
            </div>
          )}

          {digest && shown.length === 0 && (
            <div className="empty">
              <p>Nenhuma notícia nesta seção hoje.</p>
            </div>
          )}

          {shown.map((s) => (
            <article className={`card${inRoteiro.has(s.id) ? " inroteiro" : ""}`} key={s.id}>
              <div className="kicker">
                <span className={`tag ${s.category}`}>{CATEGORY_LABEL[s.category]}</span>
                <span>{s.whyRanked}</span>
                {s.controversy != null && (
                  <span className={`heat${s.controversy >= 7 ? " hot" : ""}`}>Polêmica {s.controversy}/10</span>
                )}
                {inRoteiro.has(s.id) && <span className="flag">No roteiro</span>}
              </div>
              <h2 className="headline">{s.titlePt ?? s.title}</h2>
              {s.summary && <p className="summary">{s.summary}</p>}
              {s.titlePt && s.titlePt !== s.title && <p className="orig">Original: {s.title}</p>}
              <div className="src">
                {s.sources.map((x) => (
                  <a key={x.url} href={x.url} target="_blank" rel="noopener noreferrer">
                    {x.name}
                  </a>
                ))}
              </div>
            </article>
          ))}

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

        <RoteiroPanel roteiro={digest?.roteiro} date={current} />
      </div>
    </>
  );
}
