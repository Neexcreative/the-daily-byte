import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { longDate } from "@/lib/format";
import { getDigest, listDates } from "@/lib/store";
import CopyButton from "../CopyButton";
import Masthead from "../Masthead";
import RoteiroButton from "../RoteiroButton";

export const dynamic = "force-dynamic";

export default async function RoteiroPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  if (!(await isAuthed())) redirect("/login");

  const { d } = await searchParams;
  const dates = await listDates(14);
  const date = d && dates.includes(d) ? d : dates[0];
  const digest = date ? await getDigest(date) : null;
  const r = digest?.roteiro;

  const withSources =
    r && digest
      ? `${r.titulo}\n\n${r.narracao}\n\nFONTES:\n${r.blocos
          .map((b) => {
            const s = digest.stories.find((x) => x.id === b.storyId);
            return `${b.assunto}: ${s?.sources.map((x) => x.url).join(" , ") ?? ""}`;
          })
          .join("\n")}`
      : "";

  return (
    <>
      <Masthead left={date ? `Modo gravação · ${longDate(date)}` : "Modo gravação"} />

      <main className="article">
        <a className="back" href={date ? `/?d=${date}` : "/"}>
          ← Voltar às notícias
        </a>

        {!r || !digest ? (
          <div className="empty" style={{ marginTop: 20 }}>
            <p>Ainda não há roteiro para esta edição. Volta ao painel e toca em &quot;Gerar edição&quot;.</p>
          </div>
        ) : (
          <>
            <h2 className="headline big" style={{ marginTop: 18 }}>
              {r.titulo}
            </h2>
            <div className="roteiro-head">
              <span>
                ~{r.seconds}s · {r.words} palavras · {r.blocos.length} assuntos
              </span>
              <CopyButton text={r.narracao} label="Copiar roteiro" />
              <CopyButton text={withSources} label="Copiar com fontes" />
              <a
                className="btn"
                href={`/api/capa?d=${date}&v=${encodeURIComponent(r.writtenAt ?? digest.generatedAt)}&download=1`}
                download={`capa-${date}.png`}
              >
                Baixar capa
              </a>
              <RoteiroButton date={date} />
            </div>

            <div className="block">
              <h4>Gancho (primeiros 3 segundos)</h4>
              <p className="hook-big">{r.gancho}</p>
            </div>

            {r.blocos.map((b, i) => {
              const story = digest.stories.find((s) => s.id === b.storyId);
              return (
                <div className="block" key={b.storyId}>
                  <h4>
                    {i + 1} · {b.assunto}
                  </h4>
                  <p className="narr">{b.texto}</p>
                  {story && (
                    <p className="src" style={{ marginTop: 10 }}>
                      {story.sources.map((x) => (
                        <a key={x.url} href={x.url} target="_blank" rel="noopener noreferrer">
                          {x.name}
                        </a>
                      ))}
                    </p>
                  )}
                </div>
              );
            })}

            <div className="block">
              <h4>Fechamento</h4>
              <p className="narr">{r.fechamento}</p>
            </div>

            <p className="diag">Confere a fonte original antes de publicar.</p>
          </>
        )}
      </main>
    </>
  );
}
