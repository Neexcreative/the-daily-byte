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

export type Script = {
  titlePt: string;
  summary: string;
  hook: string;
  narration: string;
  points: string[];
  whyItMatters: string;
  cta: string;
  seconds: number;
};

export type Story = {
  id: string;
  title: string;
  category: Category;
  score: number;
  whyRanked: string;
  sources: SourceRef[];
  script?: Script;
};

export type Digest = {
  date: string;
  generatedAt: string;
  stories: Story[];
  diagnostics: {
    feedsOk: number;
    feedsFailed: string[];
    itemsCollected: number;
    scriptErrors: number;
    emailStatus: string;
  };
};
