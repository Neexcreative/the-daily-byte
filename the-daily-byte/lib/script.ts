import type { Item, Roteiro, Story } from "./types";
import { CATEGORY_LABEL } from "./types";
import { tokens } from "./rank";

const MAX_WORDS = 150; // 60 segundos a ~150 palavras por minuto
const WPS = 2.5; // palavras por segundo, fala natural

const VOICE = `Voz: direta, estratégica, humana, prática e confiante. Frases curtas quando a mensagem precisa de impacto. Português do Brasil, falado, fácil de gravar.

Regras gerais:
- Use SOMENTE os fatos que aparecem nas notícias recebidas. Não invente números, nomes, datas ou citações.
- Se só uma fonte reporta, diga "segundo [veículo]". Se for rumor ou não confirmado, deixe isso claro.
- Em geopolítica e temas polêmicos, apresente fatos e atribua opiniões a quem as disse. Sem tomar lado.
- Conecte a notícia a um impacto real para negócios, criadores ou clientes.
- Sem buzzwords e sem promessas irreais. Nunca use: revolucionário, game-changing, segredo, crescimento da noite pro dia, hack de crescimento, 10x, viralizar a qualquer custo.`;

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const a = text.search(/[[{]/);
    const closeA = text.lastIndexOf("]");
    const closeO = text.lastIndexOf("}");
    const end = Math.max(closeA, closeO);
    if (a === -1 || end === -1) throw new Error("sem JSON na resposta");
    return JSON.parse(text.slice(a, end + 1));
  }
}

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

async function gemini(system: string, user: string): Promise<unknown> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("sem GEMINI_API_KEY na Vercel");
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.6, maxOutputTokens: 8192 },
  });

  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body },
    );
    lastStatus = res.status;
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
      continue;
    }
    if (!res.ok) {
      const hint = res.status === 404 ? ` (modelo "${model}" não existe: ajusta GEMINI_MODEL)` : "";
      throw new Error(`Gemini ${res.status}${hint}`);
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    return parseJson(text);
  }
  throw new Error(`Gemini indisponível (${lastStatus}), possível limite do plano gratuito`);
}

type Meta = {
  id: string;
  titlePt?: string;
  summary?: string;
  controversy?: number;
  keyword?: string;
  duplicateOf?: string | null;
  relatedPt?: string[];
};

/**
 * Uma chamada só: traduz os títulos, escreve o resumo, dá nota de polêmica
 * e junta notícias que tratam do mesmo fato.
 */
export async function enrich(
  stories: Story[],
  items: Item[],
): Promise<{ stories: Story[]; error?: string }> {
  if (!stories.length) return { stories };
  const snippets = new Map(items.map((i) => [i.link, i.snippet]));
  const list = stories
    .map((s) => {
      const src = s.sources
        .slice(0, 3)
        .map((x) => `  - ${x.name}: ${x.title}. ${(snippets.get(x.url) || "").slice(0, 220)}`)
        .join("\n");
      const rel = (s.related ?? [])
        .slice(0, 5)
        .map((r, i) => `  [${i}] ${r.title} (${r.source})`)
        .join("\n");
      return `id: ${s.id}\ncategoria: ${CATEGORY_LABEL[s.category]}\ntítulo: ${s.title}\nfontes:\n${src}${rel ? `\noutros fatos do mesmo assunto:\n${rel}` : ""}`;
    })
    .join("\n\n");

  const system = `Você é editor de um jornal diário de tecnologia, IA e geopolítica da tecnologia. Recebe uma lista de notícias e devolve, para cada uma:
- "id": o mesmo id recebido.
- "titlePt": manchete em português do Brasil, estilo jornal, até 100 caracteres.
- "summary": resumo em 2 frases em português do Brasil, só com fatos das fontes.
- "controversy": inteiro de 1 a 10 indicando o quanto o assunto é polêmico, disputado ou gera debate (conflitos, proibições, processos, demissões, escândalos, segurança, ética, tensão EUA e China). Lançamentos neutros ficam entre 1 e 4.
- "keyword": 1 ou 2 palavras em caixa alta que resumem o assunto para estampar uma imagem: a empresa, o país, o produto ou o número principal (ex.: "NVIDIA", "CHIPS", "$30 BI", "CHINA"). Máximo 14 caracteres.
- "relatedPt": se a notícia tem "outros fatos do mesmo assunto", traduza cada título para português, na mesma ordem, em um array de textos. Sem eles, devolva [].
- "duplicateOf": o id de OUTRA notícia da lista que trata do MESMO fato ou evento, ou null. Considere duplicadas notícias do mesmo fato mesmo com títulos em idiomas diferentes (inglês e português) ou ângulos diferentes do mesmo anúncio. Aponte sempre para a notícia mais completa. Notícias sobre a mesma pessoa ou empresa mas fatos diferentes NÃO são duplicadas.

Responda APENAS com um array JSON, sem markdown.`;

  try {
    const raw = await gemini(system, list);
    if (!Array.isArray(raw)) throw new Error("resposta não é uma lista");
    const meta = new Map<string, Meta>();
    for (const m of raw as Meta[]) if (m && typeof m.id === "string") meta.set(m.id, m);

    const copy = new Map<string, Story>();
    for (const s of stories) {
      const m = meta.get(s.id);
      const c = Number(m?.controversy);
      copy.set(s.id, {
        ...s,
        sources: [...s.sources],
        related: s.related?.slice(0, 5).map((r, i) => ({
          ...r,
          titlePt: typeof m?.relatedPt?.[i] === "string" ? m.relatedPt[i] : undefined,
        })),
        titlePt: m?.titlePt ? String(m.titlePt) : undefined,
        keyword: m?.keyword ? String(m.keyword).toUpperCase().slice(0, 16) : undefined,
        summary: m?.summary ? String(m.summary) : undefined,
        controversy: Number.isFinite(c) ? Math.min(10, Math.max(1, Math.round(c))) : undefined,
      });
    }

    // Resolve cadeias (A→B→C) para que tudo vá parar na mesma notícia.
    const rootOf = (id: string): string => {
      const seen = new Set<string>();
      let cur = id;
      while (!seen.has(cur)) {
        seen.add(cur);
        const next = meta.get(cur)?.duplicateOf;
        if (!next || next === cur || !copy.has(next) || seen.has(next)) break;
        cur = next;
      }
      return cur;
    };

    const removed = new Set<string>();
    const absorb = (target: Story, s: Story) => {
      const from = copy.get(s.id)!;
      for (const x of from.sources) {
        if (target.sources.length >= 8) break;
        if (!target.sources.some((y) => y.name.toLowerCase() === x.name.toLowerCase())) target.sources.push(x);
      }
      for (const r of from.related ?? []) {
        target.related = target.related ?? [];
        if (target.related.length < 6 && !target.related.some((y) => y.url === r.url)) target.related.push(r);
      }
      target.image = target.image ?? from.image;
      target.summary = target.summary ?? from.summary;
      target.controversy = Math.max(target.controversy ?? 0, from.controversy ?? 0) || undefined;
      target.score = Math.max(target.score, from.score) + 1;
      removed.add(s.id);
    };

    for (const s of stories) {
      const root = rootOf(s.id);
      if (root !== s.id) absorb(copy.get(root)!, s);
    }

    // Segunda rede: manchetes em português quase iguais também são o mesmo fato.
    const alive = stories.filter((s) => !removed.has(s.id)).sort((a, b) => b.score - a.score);
    const tok = new Map(alive.map((s) => [s.id, tokens(copy.get(s.id)!.titlePt ?? s.title)]));
    for (let i = 0; i < alive.length; i++) {
      if (removed.has(alive[i].id)) continue;
      for (let j = i + 1; j < alive.length; j++) {
        if (removed.has(alive[j].id)) continue;
        const a = tok.get(alive[i].id)!;
        const b = tok.get(alive[j].id)!;
        let inter = 0;
        for (const t of a) if (b.has(t)) inter++;
        const sim = a.size && b.size ? inter / (a.size + b.size - inter) : 0;
        if (sim >= 0.45) absorb(copy.get(alive[i].id)!, alive[j]);
      }
    }

    const out = stories
      .filter((s) => !removed.has(s.id))
      .map((s) => {
        const c = copy.get(s.id)!;
        const n = c.sources.length;
        c.whyRanked = c.whyRanked.replace(/^\d+ \S+/, `${n} ${n === 1 ? "fonte" : "fontes"}`);
        return c;
      })
      .sort((a, b) => b.score - a.score);
    return { stories: out };
  } catch (e) {
    console.error("enrich error", e);
    return { stories, error: (e as Error).message };
  }
}

type RawRoteiro = {
  titulo?: string;
  gancho?: string;
  blocos?: { storyId?: string; assunto?: string; texto?: string }[];
  fechamento?: string;
};

/** Escreve UM roteiro de até 60 segundos com 4 ou mais assuntos, priorizando os mais polêmicos. */
export async function writeRoteiro(
  stories: Story[],
  /** Roteiro anterior: quando vem, a IA escreve uma versão nova, com outro gancho e outro ângulo. */
  previous?: Roteiro,
): Promise<{ roteiro?: Roteiro; error?: string }> {
  const candidates = [...stories]
    .sort((a, b) => (b.controversy ?? 0) - (a.controversy ?? 0) || b.score - a.score)
    .slice(0, 7);
  if (candidates.length < 2) return { error: "poucas notícias para montar o roteiro" };
  const minTopics = Math.min(4, candidates.length);

  const list = candidates
    .map(
      (s) =>
        `id: ${s.id}\npolêmica: ${s.controversy ?? "?"}/10\ntítulo: ${s.titlePt ?? s.title}\nresumo: ${s.summary ?? ""}\nfontes: ${s.sources.map((x) => x.name).join(", ")}`,
    )
    .join("\n\n");
  const again = previous
    ? `\n\nJá existe um roteiro para hoje. Escreva uma versão NOVA, com outro título, outro gancho e outra ordem ou outro ângulo. Não repita estas frases:\ntítulo: ${previous.titulo}\ngancho: ${previous.gancho}`
    : "";

  const system = `Você escreve o roteiro ÚNICO do vídeo diário de notícias de tecnologia do Marlon, criador de conteúdo e estrategista criativo. O vídeo dura NO MÁXIMO 60 segundos e cobre os assuntos mais polêmicos do dia.

${VOICE}

Estrutura:
- Escolha os assuntos mais polêmicos da lista: no mínimo ${minTopics} e no máximo 5, todos diferentes.
- "gancho": frase de impacto para os primeiros 3 segundos, até 15 palavras.
- "blocos": um por assunto, com 20 a 30 palavras cada, frases curtas, na ordem que prende mais a atenção.
- "fechamento": chamada curta para ação, até 15 palavras.
- TOTAL (gancho + blocos + fechamento) entre 115 e 145 palavras. Nunca passe de ${MAX_WORDS}.

Responda APENAS com JSON, sem markdown:
{"titulo":"título curto do vídeo","gancho":"...","blocos":[{"storyId":"id da lista","assunto":"2 a 4 palavras","texto":"..."}],"fechamento":"..."}`;

  let feedback = "";
  let best: Roteiro | undefined;
  let lastError: string | undefined;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const raw = (await gemini(system, list + again + feedback)) as RawRoteiro;
      const ids = new Set(candidates.map((s) => s.id));
      const seen = new Set<string>();
      const blocos = (raw.blocos ?? [])
        .filter((b) => b.storyId && ids.has(b.storyId) && b.texto && !seen.has(b.storyId) && seen.add(b.storyId))
        .map((b) => ({
          storyId: String(b.storyId),
          assunto: String(b.assunto ?? ""),
          texto: String(b.texto),
        }));
      const gancho = String(raw.gancho ?? "");
      const fechamento = String(raw.fechamento ?? "");
      const narracao = [gancho, ...blocos.map((b) => b.texto), fechamento].filter(Boolean).join("\n\n");
      const words = wordCount(narracao);
      const roteiro: Roteiro = {
        titulo: String(raw.titulo ?? "Roteiro do dia"),
        gancho,
        blocos,
        fechamento,
        narracao,
        words,
        seconds: Math.round(words / WPS),
        writtenAt: new Date().toISOString(),
      };
      if (!best || (blocos.length >= minTopics && words <= MAX_WORDS)) best = roteiro;
      if (blocos.length >= minTopics && words <= MAX_WORDS) return { roteiro };
      feedback = `\n\nATENÇÃO: a tentativa anterior teve ${words} palavras e ${blocos.length} assuntos. Corrija: no máximo ${MAX_WORDS} palavras no total e pelo menos ${minTopics} assuntos válidos, usando só ids da lista.`;
      lastError = `roteiro fora do limite (${words} palavras, ${blocos.length} assuntos)`;
    } catch (e) {
      lastError = (e as Error).message;
      break;
    }
  }
  return best && best.blocos.length ? { roteiro: best, error: lastError } : { error: lastError };
}
