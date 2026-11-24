export function longDate(d: string): string {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Perfil oficial no Instagram. */
export const INSTAGRAM = "thedailybyte_26";

/** Design system da marca (The Daily Byte Brand Digital, no claude.ai). */
export const BRAND_URL = "https://claude.ai/artifact/Y8iCXeaGtGRtUTFsNCG55E";

const KW_STOP = new Set(
  "the a an and or of to in on for with from at by as is are was be new how why what who when after over amid says said report reports us u.s. uk eu ai o os as um uma de da do das dos em no na nos nas por para com que se sobre após diz".split(
    " ",
  ),
);

/**
 * Palavra que representa a notícia na imagem gerada (quando não há foto).
 * Usa a escolhida pela IA; senão, um valor em dinheiro do título; senão, o nome próprio mais longo.
 */
export function keywordOf(s: { keyword?: string; title: string; titlePt?: string }): string {
  if (s.keyword) return s.keyword;
  const money = s.title.match(/\$\s?(\d+(?:[.,]\d+)?)\s?(billion|bn|b|million|mn|m|trillion|tn)?\b/i);
  if (money) {
    const unit = (money[2] ?? "").toLowerCase();
    const suf = unit.startsWith("t") ? " TRI" : unit.startsWith("b") ? " BI" : unit.startsWith("m") ? " MI" : "";
    return `$${money[1]}${suf}`;
  }
  const words = (s.titlePt ?? s.title)
    .split(/[^\p{L}\p{N}'’.-]+/u)
    .map((w) => w.replace(/['’]s$/i, "").replace(/[.-]+$/, ""))
    .filter(
      (w, i) =>
        w.length > 2 && /^\p{Lu}/u.test(w) && !KW_STOP.has(w.toLowerCase()) && (i > 0 || /\p{Lu}{2,}/u.test(w)),
    );
  const best = words.sort((a, b) => b.length - a.length)[0];
  return (best ?? "").toUpperCase().slice(0, 14);
}
