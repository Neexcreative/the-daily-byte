"use client";

import { useState } from "react";
import type { Category } from "@/lib/types";

const LABEL: Record<Category, string> = { ai: "IA", tech: "TECH", geo: "GEO", market: "MERCADO" };

/** Ícones de linha, um por seção, desenhados no traço da marca. */
function Icon({ category }: { category: Category }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (category) {
    case "ai": // rede neural
      return (
        <svg viewBox="0 0 100 100" {...common}>
          <circle cx="20" cy="25" r="7" /><circle cx="20" cy="75" r="7" /><circle cx="50" cy="50" r="9" />
          <circle cx="80" cy="20" r="7" /><circle cx="80" cy="50" r="7" /><circle cx="80" cy="80" r="7" />
          <path d="M27 28 L42 45 M27 72 L42 55 M59 47 L73 23 M59 50 H73 M59 53 L73 77 M20 32 V68" />
        </svg>
      );
    case "tech": // chip
      return (
        <svg viewBox="0 0 100 100" {...common}>
          <rect x="25" y="25" width="50" height="50" rx="6" /><rect x="38" y="38" width="24" height="24" rx="2" />
          <path d="M35 25 V12 M50 25 V12 M65 25 V12 M35 75 V88 M50 75 V88 M65 75 V88 M25 35 H12 M25 50 H12 M25 65 H12 M75 35 H88 M75 50 H88 M75 65 H88" />
        </svg>
      );
    case "geo": // globo
      return (
        <svg viewBox="0 0 100 100" {...common}>
          <circle cx="50" cy="50" r="36" /><ellipse cx="50" cy="50" rx="15" ry="36" />
          <path d="M14 50 H86 M20 31 H80 M20 69 H80" />
        </svg>
      );
    default: // gráfico
      return (
        <svg viewBox="0 0 100 100" {...common}>
          <path d="M12 88 H88 M12 88 V12" /><path d="M20 72 L38 52 L52 62 L80 26" /><path d="M66 26 H80 V40" />
        </svg>
      );
  }
}

/**
 * Foto da notícia. Sem foto (ou se ela falhar), gera uma imagem simples que representa a notícia:
 * a palavra-chave no painel inclinado da marca, o ícone da seção e rótulos em fonte mono.
 */
export default function Thumb({
  src,
  category,
  alt,
  keyword,
  index,
}: {
  src?: string;
  category: Category;
  alt: string;
  keyword?: string;
  index?: number;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    const kw = keyword || LABEL[category];
    const size = kw.length <= 5 ? "xl" : kw.length <= 9 ? "lg" : "md";
    return (
      <div className="thumb gen grid-bg" role="img" aria-label={`Imagem gerada: ${kw}`}>
        <span className="gen-icon" aria-hidden="true">
          <Icon category={category} />
        </span>
        <span className="gen-top mono" aria-hidden="true">
          <span>[ {LABEL[category]} ]</span>
          {index != null && <span>#{String(index + 1).padStart(2, "0")}</span>}
        </span>
        <span className={`gen-panel ${size}`} aria-hidden="true">
          <span className="fil"><i /><i /><i /></span>
          <b>{kw}</b>
        </span>
        <span className="gen-foot mono" aria-hidden="true">
          {"// the daily byte"}
        </span>
      </div>
    );
  }
  return (
    <div className="thumb">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
    </div>
  );
}
