import { notFound, redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { longDate } from "@/lib/format";
import { getDigest, listDates } from "@/lib/store";
import { CATEGORY_LABEL, type Script, type Story } from "@/lib/types";
import CopyButton from "../../CopyButton";
import Masthead from "../../Masthead";

export const dynamic = "force-dynamic";

function fullText(s: Story, sc: Script): string {
  const src = s.sources.map((x) => `- ${x.name}: ${x.url}`).join("\n");
  return `${sc.titlePt}\n\nGANCHO: ${sc.hook}\n\n${sc.narration}\n\nPONTOS:\n${sc.points
    .map((p, i) => `${i + 1}. ${p}`)
    .join("\n")}\n\nPOR QUE IMPORTA: ${sc.whyItMatters}\n\nCHAMADA FINAL: ${sc.cta}\n\nFONTES:\n${src}`;
}

export default async function StoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ d?: string }>;
}) {
  if (!(await isAuthed())) redirect("/login");

  const { id } = await params;
  const { d } = await searchParams;
  const dates = await listDates(14);
  const date = d && dates.includes(d) ? d : dates[0];
  const digest = date ? await getDigest(date) : null;
  const story = digest?.stories.find((s) => s.id === id);
  if (!story || !date) notFound();

  const sc = story.script;
  const title = sc?.titlePt ?? story.title;
  const words = sc ? sc.narration.trim().split(/\s+/).length : 0;

  return (
    <>
      <Masthead left={`Roteiro · ${longDate(date)}`} right={CATEGORY_LABEL[story.category]} />

      <main className="article">
        <a className="back" href={`/?d=${date}`}>
          ← Voltar às notícias
        </a>

        <div className="kicker" style={{ marginTop: 18 }}>
          <span className={`tag ${story.category}`}>{CATEGORY_LABEL[story.category]}</span>
          <span>{story.whyRanked}</span>
        </div>
        <h2 className="headline big">{title}</h2>
        {sc && title !== story.title && <p className="orig">Título original: {story.title}</p>}
        {sc?.summary && <p className="summary lg">{sc.summary}</p>}

        {sc ? (
          <section className="roteiro">
            <div className="roteiro-head">
              <h3>Roteiro</h3>
              <span>
                ~{sc.seconds}s · {words} palavras
              </span>
              <CopyButton text={fullText(story, sc)} label="Copiar tudo" />
            </div>

            <div className="block">
              <h4>Gancho (primeiros 3 segundos)</h4>
              <p className="hook-big">{sc.hook}</p>
            </div>

            <div className="block">
              <h4>Narração</h4>
              <p className="narr">{sc.narration}</p>
              <div style={{ marginTop: 10 }}>
                <CopyButton text={sc.narration} label="Copiar só a narração" />
              </div>
            </div>

            <div className="block">
              <h4>Três pontos</h4>
              <ol>
                {sc.points.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ol>
            </div>

            <div className="block">
              <h4>Por que importa</h4>
              <p>{sc.whyItMatters}</p>
            </div>

            <div className="block">
              <h4>Chamada final</h4>
              <p>{sc.cta}</p>
            </div>
          </section>
        ) : (
          <div className="empty">
            <p>
              Esta notícia ainda não tem roteiro. Clica em &quot;Gerar agora&quot; para tentar de novo.
            </p>
          </div>
        )}

        <section className="fontes">
          <h3>Fontes</h3>
          <ul>
            {story.sources.map((x) => (
              <li key={x.url}>
                <a href={x.url} target="_blank" rel="noopener noreferrer">
                  {x.name}
                </a>
                <span>{x.title}</span>
              </li>
            ))}
          </ul>
          <p className="diag">Confere a fonte original antes de publicar.</p>
        </section>
      </main>
    </>
  );
}
