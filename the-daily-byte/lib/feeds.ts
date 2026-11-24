import type { Category } from "./types";

export type Feed = {
  name: string;
  url: string;
  category: Category;
  /** Peso da fonte no ranking (0 a 2). */
  weight: number;
  /** Feeds do Google News trazem o veículo no fim do título ("... - Reuters"). */
  publisherInTitle?: boolean;
};

const gnews = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q + " when:1d")}&hl=en-US&gl=US&ceid=US:en`;

export const FEEDS: Feed[] = [
  // Tech e IA
  { name: "Hacker News", url: "https://hnrss.org/frontpage?points=150", category: "tech", weight: 1.5 },
  { name: "TechCrunch", url: "https://techcrunch.com/feed/", category: "tech", weight: 1 },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", category: "tech", weight: 1 },
  { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", category: "tech", weight: 1 },
  { name: "Wired", url: "https://www.wired.com/feed/rss", category: "tech", weight: 1 },
  { name: "MIT Technology Review", url: "https://www.technologyreview.com/feed/", category: "ai", weight: 1.2 },
  { name: "OpenAI", url: "https://openai.com/news/rss.xml", category: "ai", weight: 1.8 },
  { name: "Google AI", url: "https://blog.google/technology/ai/rss/", category: "ai", weight: 1.5 },
  { name: "Reddit r/artificial", url: "https://www.reddit.com/r/artificial/top/.rss?t=day", category: "ai", weight: 0.8 },
  { name: "Reddit r/technology", url: "https://www.reddit.com/r/technology/top/.rss?t=day", category: "tech", weight: 0.8 },

  // Geopolítica e tech
  { name: "Rest of World", url: "https://restofworld.org/feed/", category: "geo", weight: 1.2 },
  { name: "SCMP Tech", url: "https://www.scmp.com/rss/36/feed", category: "geo", weight: 1 },
  { name: "GNews chips", url: gnews("semiconductor OR chips export controls"), category: "geo", weight: 1.2, publisherInTitle: true },
  { name: "GNews US-China tech", url: gnews("US China technology AI"), category: "geo", weight: 1.2, publisherInTitle: true },
  { name: "GNews AI regulation", url: gnews("AI regulation law"), category: "geo", weight: 1.2, publisherInTitle: true },
  { name: "GNews cyber", url: gnews("cyberattack state-sponsored hackers"), category: "geo", weight: 1, publisherInTitle: true },

  // Mercado
  { name: "GNews deals", url: gnews("tech acquisition OR funding round billion"), category: "market", weight: 1, publisherInTitle: true },

  // Brasil
  { name: "Tecnoblog", url: "https://tecnoblog.net/feed/", category: "tech", weight: 0.8 },
  { name: "Canaltech", url: "https://canaltech.com.br/rss/", category: "tech", weight: 0.8 },
  { name: "Olhar Digital", url: "https://olhardigital.com.br/feed/", category: "tech", weight: 0.8 },
];
