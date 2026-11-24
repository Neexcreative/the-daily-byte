export type Category = "ai" | "tech" | "geo" | "market";

export const CATEGORY_LABEL: Record<Category, string> = {
  ai: "IA",
  tech: "Tecnologia",
  geo: "Geopolítica e tech",
  market: "Mercado",
};

export type Item = {
  title: string;
  link: string;
  source: string;
  category: Category;
  publishedAt: number;
  snippet: string;
  weight: number;
};

export type SourceRef = { name: string; url: string; title: string };

export type Story = {
  id: string;
  /** Título original (geralmente em inglês). */
  title: string;
  category: Category;
  score: number;
  whyRanked: string;
  sources: SourceRef[];
  /** Preenchidos pela IA. */
  titlePt?: string;
  summary?: string;
  /** 1 a 10: o quanto o assunto é polêmico ou gera debate. */
  controversy?: number;
};

export type RoteiroBlock = { storyId: string; assunto: string; texto: string };

/** Roteiro único do dia: até 60 segundos, com pelo menos 4 assuntos. */
export type Roteiro = {
  titulo: string;
  gancho: string;
  blocos: RoteiroBlock[];
  fechamento: string;
  narracao: string;
  words: number;
  seconds: number;
};

export type Digest = {
  date: string;
  generatedAt: string;
  stories: Story[];
  roteiro?: Roteiro;
  diagnostics: {
    feedsOk: number;
    feedsFailed: string[];
    itemsCollected: number;
    scriptErrors: number;
    emailStatus: string;
    aiError?: string;
  };
};
