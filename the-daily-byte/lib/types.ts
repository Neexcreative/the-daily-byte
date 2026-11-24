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
  /** Imagem vinda do próprio feed (enclosure, media:content ou <img> no conteúdo). */
  image?: string;
};

export type SourceRef = { name: string; url: string; title: string; image?: string };

export type Story = {
  id: string;
  /** Título original (geralmente em inglês). */
  title: string;
  category: Category;
  score: number;
  whyRanked: string;
  sources: SourceRef[];
  /** Foto principal da notícia (do feed ou og:image da matéria). */
  image?: string;
  /** Preenchidos pela IA. */
  titlePt?: string;
  summary?: string;
  /** 1 a 10: o quanto o assunto é polêmico ou gera debate. */
  controversy?: number;
  /** Outros fatos do dia sobre o mesmo assunto (mesma empresa, pessoa ou saga). */
  related?: RelatedRef[];
};

export type RelatedRef = { title: string; titlePt?: string; url: string; source: string };

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
  /** Quando este roteiro foi escrito (pode ser depois da coleta, ao pedir um roteiro novo). */
  writtenAt?: string;
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
