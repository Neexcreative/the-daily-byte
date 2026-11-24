import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import RegisterSW from "./RegisterSW";

const display = Playfair_Display({ subsets: ["latin"], weight: ["700", "900"], style: ["normal", "italic"], variable: "--f-display" });
const serif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--f-serif" });
const sans = Inter({ subsets: ["latin"], variable: "--f-sans" });

export const metadata: Metadata = {
  title: "The Daily Byte",
  description: "Notícias de tech, IA e geopolítica, com fontes e roteiro pronto.",
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "Daily Byte", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#faf8f4",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${serif.variable} ${sans.variable}`}>
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
