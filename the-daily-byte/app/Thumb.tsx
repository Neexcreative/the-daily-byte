"use client";

import { useState } from "react";
import type { Category } from "@/lib/types";

const LABEL: Record<Category, string> = { ai: "IA", tech: "Tech", geo: "Geo", market: "Mercado" };

/** Foto da notícia; se não houver ou falhar ao carregar, mostra o quadro vermelho da marca. */
export default function Thumb({ src, category, alt }: { src?: string; category: Category; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      // Sem foto: quadro vermelho com o painel inclinado da marca.
      <div className="thumb ph grid-bg" aria-hidden="true">
        <span className="ph-panel">
          <span className="fil"><i /><i /><i /></span>
          <b>{LABEL[category]}</b>
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
