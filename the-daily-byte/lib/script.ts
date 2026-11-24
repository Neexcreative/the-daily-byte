import type { Item, Roteiro, Story } from "./types";
import { CATEGORY_LABEL } from "./types";

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
  duplicateOf?: string | null;
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
      return `id: ${s.id}\ncategoria: ${CATEGORY_LABEL[s.category]}\ntítulo: ${s.title}\nfontes:\n${src}`;
    })
    .join("\n\n");

  const system = `Você é editor de um jornal diário de tecnologia, IA e geopolítica da tecnologia. Recebe uma lista de notícias e devolve, para cada uma:
- "id": o mesmo id recebido.
- "titlePt": manchete em português do Brasil, estilo jornal, até 100 caracteres.
- "summary": resumo em 2 frases em português do Brasil, só com fatos das fontes.
- "controversy": inteiro de 1 a 10 indicando o quanto o assunto é polêmico, disputado ou gera debate (conflitos, proibições, processos, demissões, escândalos, segurança, ética, tensão EUA e China). Lançamentos neutros ficam entre 1 e 4.
- "duplicateOf": o id de OUTRA notícia da lista que trata do MESMO fato ou evento, ou null. Notícias sobre a mesma pessoa mas fatos diferentes NÃO são duplicadas.

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
        titlePt: m?.titlePt ? String(m.titlePt) : undefined,
        summary: m?.summary ? String(m.summary) : undefined,
        controversy: Number.isFinite(c) ? Math.min(10, Math.max(1, Math.round(c))) : undefined,
      });
    }

    const removed = new Set<string>();
    for (const s of stories) {
      const dup = meta.get(s.id)?.duplicateOf;
      if (!dup || dup === s.id || !copy.has(dup) || meta.get(dup)?.duplicateOf) continue;
      const target = copy.get(dup)!;
      for (const x of s.sources) {
        if (target.sources.length >= 6) break;
        if (!target.sources.some((y) => y.name.toLowerCase() === x.name.toLowerCase())) {
          target.sources.push(x);
        }
      }
      target.score = Math.max(target.score, s.score) + 1;
      removed.add(s.id);
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
      const raw = (await gemini(system, list + feedback)) as RawRoteiro;
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
