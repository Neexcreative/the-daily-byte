import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { longDate } from "@/lib/format";
import { getDigest, listDates, storageMode } from "@/lib/store";
import { CATEGORY_LABEL, type Category, type Story } from "@/lib/types";
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

function StoryBody({ s, date }: { s: Story; date: string | undefined }) {
  const title = s.script?.titlePt ?? s.title;
  const url = `/story/${s.id}${date ? `?d=${date}` : ""}`;
  return (
    <>
      <div className="kicker">
        <span className={`tag ${s.category}`}>{CATEGORY_LABEL[s.category]}</span>
        <span>{s.whyRanked}</span>
      </div>
      <h2 className="headline">
        <a href={url}>{title}</a>
      </h2>
      {s.script?.summary && <p className="summary">{s.script.summary}</p>}
      {s.script && (
        <p className="hook">
          <b>Gancho</b>
          {s.script.hook}
        </p>
      )}
      <div className="src">
        {s.sources.map((x) => (
          <a key={x.url} href={x.url} target="_blank" rel="noopener noreferrer">
            {x.name}
          </a>
        ))}
      </div>
      {s.script ? (
        <a className="open" href={url}>
          Abrir roteiro (~{s.script.seconds}s) →
        </a>
      ) : (
        <p className="noscript">Sem roteiro para esta notícia.</p>
      )}
    </>
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
  const [lead, ...rest] = shown;
  const count = (k: Category) => all.filter((s) => s.category === k).length;

  return (
    <>
      <Masthead
        left={current ? longDate(current) : "Sem edição"}
        right={`Edição das 21h · ${all.length} histórias`}
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

        <main>
          <div className="section-title">
            <h2>{cat ? CATEGORY_LABEL[cat] : "Destaques do dia"}</h2>
            <span>
              {shown.length} {shown.length === 1 ? "história" : "histórias"}
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
              <p>Nenhuma história nesta seção hoje.</p>
            </div>
          )}

          {lead && (
            <article className="lead">
              <StoryBody s={lead} date={current} />
            </article>
          )}

          {rest.map((s, i) => (
            <article className="row" key={s.id}>
              <div className="num">{i + 2}</div>
              <div>
                <StoryBody s={s} date={current} />
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
              {digest.diagnostics.scriptErrors > 0 &&
                ` · roteiros com erro: ${digest.diagnostics.scriptErrors}`}
              . Confere a fonte original antes de publicar.
            </p>
          )}
        </main>
      </div>
    </>
  );
}
