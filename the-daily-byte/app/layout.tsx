import type { Metadata, Viewport } from "next";
import { Big_Shoulders, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import RegisterSW from "./RegisterSW";

// Fontes do design system: Big Shoulders (antiga Big Shoulders Display) nos títulos, IBM Plex Sans no texto, Plex Mono em números e horários.
const display = Big_Shoulders({ subsets: ["latin"], weight: ["700", "900"], variable: "--f-display" });
const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--f-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--f-mono" });

export const metadata: Metadata = {
  title: "The Daily Byte",
  description: "Notícias de tech, IA e geopolítica, com fontes e roteiro pronto.",
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.png",
    shortcut: "/brand/avatar.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "Daily Byte", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#D92D14",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
