"use client";

import { useState } from "react";
import type { Category } from "@/lib/types";

const GLYPH: Record<Category, string> = { ai: "IA", tech: "T", geo: "G", market: "$" };

/** Foto da notícia; se não houver ou falhar ao carregar, mostra um quadro tipográfico na cor da seção. */
export default function Thumb({ src, category, alt }: { src?: string; category: Category; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`thumb ph ${category}`} aria-hidden="true">
        <span>{GLYPH[category]}</span>
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
