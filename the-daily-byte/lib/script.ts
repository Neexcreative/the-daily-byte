import type { Item, Script, Story } from "./types";
import { CATEGORY_LABEL } from "./types";

const SYSTEM = `Você escreve roteiros de vídeos curtos de notícias de tecnologia para o Marlon, criador de conteúdo e estrategista criativo.

Voz: direta, estratégica, humana, prática e confiante. Frases curtas quando a mensagem precisa de impacto. Português do Brasil, falado, fácil de gravar.

Regras:
- Use SOMENTE os fatos que aparecem nas fontes recebidas. Não invente números, nomes, datas ou citações.
- Se só uma fonte reporta, diga "segundo [veículo]". Se for rumor ou ainda não confirmado, deixe isso claro.
- Em geopolítica, apresente fatos e atribua opiniões a quem as disse. Sem tomar lado.
- Sempre conecte a notícia a um impacto real para negócios, criadores ou clientes.
- Sem buzzwords e sem promessas irreais. Nunca use: revolucionário, game-changing, segredo, crescimento da noite pro dia, hack de crescimento, 10x, viralizar a qualquer custo.
- Estrutura: gancho (primeiros 3 segundos) → contexto → três pontos → por que importa → chamada curta para ação.

Todo o texto da resposta deve estar em português do Brasil, inclusive o título.

Responda APENAS com JSON válido, sem markdown, neste formato:
{
  "titlePt": "título da notícia em português, estilo manchete de jornal, até 100 caracteres",
  "summary": "resumo em 2 frases, só com fatos das fontes",
  "hook": "frase de impacto, até 15 palavras",
  "narration": "texto corrido completo para gravar, entre 80 e 140 palavras (30 a 60 segundos)",
  "points": ["ponto 1", "ponto 2", "ponto 3"],
  "whyItMatters": "uma ou duas frases sobre o impacto prático",
  "cta": "chamada para ação curta"
}`;

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("sem JSON na resposta");
  return JSON.parse(text.slice(start, end + 1));
}

function words(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

async function callGemini(story: Story, snippets: Map<string, string>): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("sem GEMINI_API_KEY");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const sources = story.sources
    .map((s, i) => `Fonte ${i + 1}: ${s.name}\nTítulo: ${s.title}\nResumo: ${snippets.get(s.url) || "(sem resumo)"}\nLink: ${s.url}`)
    .join("\n\n");

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [
      { role: "user", parts: [{ text: `Categoria: ${CATEGORY_LABEL[story.category]}\nNotícia: ${story.title}\n\n${sources}` }] },
    ],
    generationConfig: { responseMimeType: "application/json", temperature: 0.7, maxOutputTokens: 1500 },
  });

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body },
    );
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
      continue;
    }
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  }
  throw new Error("Gemini indisponível (limite gratuito?)");
}

export async function writeScript(story: Story, snippets: Map<string, string>): Promise<Script> {
  const text = await callGemini(story, snippets);
  const raw = extractJson(text) as Partial<Script>;
  if (!raw.narration || !raw.hook || !Array.isArray(raw.points)) {
    throw new Error("JSON incompleto");
  }
  const wpm = 150;
  return {
    titlePt: String(raw.titlePt || story.title),
    summary: String(raw.summary ?? ""),
    hook: String(raw.hook),
    narration: String(raw.narration),
    points: raw.points.slice(0, 3).map(String),
    whyItMatters: String(raw.whyItMatters ?? ""),
    cta: String(raw.cta ?? ""),
    seconds: Math.round((words(String(raw.narration)) / wpm) * 60),
  };
}

export async function writeScripts(
  stories: Story[],
  items: Item[],
  count = 5,
): Promise<{ stories: Story[]; errors: number }> {
  if (!process.env.GEMINI_API_KEY) {
    return { stories, errors: Math.min(count, stories.length) };
  }
  const snippets = new Map(items.map((i) => [i.link, i.snippet]));
  let errors = 0;
  const out: Story[] = [];
  // Em sequência, para respeitar o limite por minuto do plano gratuito.
  for (let idx = 0; idx < stories.length; idx++) {
    const s = stories[idx];
    if (idx >= count) {
      out.push(s);
      continue;
    }
    try {
      out.push({ ...s, script: await writeScript(s, snippets) });
    } catch (e) {
      console.error("script error", s.title, e);
      errors++;
      out.push(s);
    }
  }
  return { stories: out, errors };
}
