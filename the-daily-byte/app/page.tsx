import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { getDigest, listDates, storageMode } from "@/lib/store";
import { CATEGORY_LABEL, type Script, type Story } from "@/lib/types";
import CopyButton from "./CopyButton";
import RunButton from "./RunButton";
import { logout } from "./login/actions";

export const dynamic = "force-dynamic";

function fullText(s: Story, sc: Script): string {
  const src = s.sources.map((x) => `- ${x.name}: ${x.url}`).join("\n");
  return `${s.title}\n\nGANCHO: ${sc.hook}\n\n${sc.narration}\n\nPONTOS:\n${sc.points.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n\nPOR QUE IMPORTA: ${sc.whyItMatters}\n\nCTA: ${sc.cta}\n\nFONTES:\n${src}`;
}

export default async function Home({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  if (!(await isAuthed())) redirect("/login");

  const { d } = await searchParams;
  const dates = await listDates(14);
  const current = d && dates.includes(d) ? d : dates[0];
  const digest = current ? await getDigest(current) : null;

  return (
    <main className="wrap">
      <div className="top">
        <div>
          <h1 className="brand">The Daily <span>Byte</span></h1>
          <p className="sub">Tech, IA e geopolítica. Entrega às 21h para gravar na manhã seguinte.</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <RunButton />
          <form action={logout}><button className="btn ghost">Sair</button></form>
        </div>
      </div>

      {dates.length > 0 && (
        <nav className="bar" aria-label="Datas">
          {dates.map((x) => (
            <a key={x} className="chip" href={`/?d=${x}`} aria-current={x === current}>{x}</a>
          ))}
        </nav>
      )}

      {!digest && (
        <div className="card empty">
          <p><b>Nenhum digest ainda.</b></p>
          <p>Clica em "Gerar agora" para criar o primeiro, ou espera a entrega das 21h.</p>
        </div>
      )}

      {digest?.stories.map((s) => (
        <article className="card" key={s.id}>
          <div className="meta">
            <span className={`tag ${s.category}`}>{CATEGORY_LABEL[s.category]}</span>
            <span>{s.whyRanked}</span>
          </div>
          <h2 className="title">{s.title}</h2>
          {s.script && <p className="hook"><b>Gancho:</b> {s.script.hook}</p>}
          <div className="src">
            {s.sources.map((x) => (
              <a key={x.url} href={x.url} target="_blank" rel="noopener noreferrer">{x.name}</a>
            ))}
          </div>

          {s.script ? (
            <details>
              <summary>Roteiro (~{s.script.seconds}s)</summary>
              <div className="script">
                <div><h4>Narração</h4><p className="narr">{s.script.narration}</p></div>
                <div><h4>Três pontos</h4><ol>{s.script.points.map((p, i) => <li key={i}>{p}</li>)}</ol></div>
                <div><h4>Por que importa</h4><p>{s.script.whyItMatters}</p></div>
                <div><h4>Chamada final</h4><p>{s.script.cta}</p></div>
                <div><CopyButton text={fullText(s, s.script)} /></div>
              </div>
            </details>
          ) : (
            <p className="sub" style={{ marginTop: 10 }}>Sem roteiro para esta notícia.</p>
          )}
        </article>
      ))}

      {digest && (
        <p className="diag">
          Gerado em {new Date(digest.generatedAt).toLocaleString("pt-BR", { timeZone: process.env.DIGEST_TZ || "Europe/Dublin" })} ·
          {" "}{digest.diagnostics.itemsCollected} itens de {digest.diagnostics.feedsOk} feeds ·
          {" "}e-mail: {digest.diagnostics.emailStatus} · armazenamento: {storageMode}
          {digest.diagnostics.feedsFailed.length > 0 && ` · feeds com falha: ${digest.diagnostics.feedsFailed.join(", ")}`}
          {digest.diagnostics.scriptErrors > 0 && ` · roteiros com erro: ${digest.diagnostics.scriptErrors}`}
          . Confere a fonte original antes de publicar.
        </p>
      )}
    </main>
  );
}
