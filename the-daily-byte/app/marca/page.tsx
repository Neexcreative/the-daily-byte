import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { BRAND_URL, INSTAGRAM } from "@/lib/format";
import CopyButton from "../CopyButton";
import Masthead from "../Masthead";

export const metadata = { title: "Kit da marca · The Daily Byte" };

const LOGOS = [
  { name: "Logo horizontal", note: "Hero do site, cabeçalhos, capas largas. Fundo transparente.", src: "/brand/logo-horizontal.png", size: "1008 × 262", wide: true, files: [["PNG", "/brand/logo-horizontal.png"], ["WEBP", "/brand/logo-horizontal.webp"]] },
  { name: "Logo", note: "Versão principal, quadrada, no fundo vermelho com grade.", src: "/brand/logo.png", size: "862 × 862", files: [["PNG", "/brand/logo.png"]] },
  { name: "Monograma", note: "Espaços pequenos: favicon, marca d'água, selo.", src: "/brand/monograma.png", size: "862 × 862", files: [["PNG", "/brand/monograma.png"]] },
  { name: "Avatar", note: "Foto de perfil do Instagram e outras redes.", src: "/brand/avatar.png", size: "862 × 862", files: [["PNG", "/brand/avatar.png"]] },
] as const;

const ICONS = [
  ["Ícone 512", "/icons/icon-512.png", "512 × 512"],
  ["Ícone 192", "/icons/icon-192.png", "192 × 192"],
  ["Apple touch", "/icons/apple-touch-icon.png", "180 × 180"],
] as const;

const COLORS = [
  { name: "Vermelho", hex: "#D92D14", rgb: "217 45 20", use: "Cor principal, fundos de destaque", fg: "#fff" },
  { name: "Tinta", hex: "#0A0A0A", rgb: "10 10 10", use: "Texto, painéis escuros", fg: "#fff" },
  { name: "Branco", hex: "#FFFFFF", rgb: "255 255 255", use: "Painéis e texto sobre vermelho", fg: "#0A0A0A" },
  { name: "Papel", hex: "#F4F2EE", rgb: "244 242 238", use: "Fundo do site", fg: "#0A0A0A" },
  { name: "Grafite", hex: "#5C5C5C", rgb: "92 92 92", use: "Texto secundário", fg: "#fff" },
  { name: "Cinza", hex: "#A8A8A8", rgb: "168 168 168", use: "Secundário em fundo escuro", fg: "#0A0A0A" },
];

const FONTS = [
  { name: "Big Shoulders", role: "Títulos", cls: "f-display", sample: "SUA DOSE DIÁRIA", weights: [700, 800, 900], file: "BigShoulders", gf: "Big+Shoulders" },
  { name: "IBM Plex Sans", role: "Texto", cls: "f-sans", sample: "Informação com fonte, todo dia às 21h.", weights: [400, 500, 600, 700], file: "IBMPlexSans", gf: "IBM+Plex+Sans" },
  { name: "IBM Plex Mono", role: "Rótulos, números e horários", cls: "f-mono", sample: "[ IA ] #01 · 21:00", weights: [400, 500, 600], file: "IBMPlexMono", gf: "IBM+Plex+Mono" },
];

export default async function MarcaPage() {
  if (!(await isAuthed())) redirect("/login");

  return (
    <>
      <Masthead left="Kit da marca" />

      <main className="wrap kit">
        <a className="back" href="/">
          ← Voltar às notícias
        </a>

        <section className="kit-intro">
          <div>
            <p className="kit-eyebrow mono">// kit da marca</p>
            <h1>Tudo da The Daily Byte para baixar</h1>
            <p className="kit-lede">
              Logos, ícones, cores e fontes oficiais. Use os arquivos como estão: não redesenhe, não mude as cores do
              logo. Regras completas no design system.
            </p>
          </div>
          <div className="kit-actions">
            <a className="btn solid" href="/brand/the-daily-byte-marca.zip" download>
              Baixar tudo (.zip)
            </a>
            <a className="btn" href={BRAND_URL} target="_blank" rel="noopener noreferrer">
              Ver design system
            </a>
          </div>
        </section>

        <h2 className="kit-h">
          <span className="mono">01</span> Logos
        </h2>
        <div className="kit-grid">
          {LOGOS.map((l) => (
            <article key={l.name} className={`kit-card${"wide" in l && l.wide ? " wide" : ""}`}>
              <div className={`kit-prev${"wide" in l && l.wide ? " s-red grid-bg" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.src} alt={l.name} />
              </div>
              <div className="kit-meta">
                <h3>{l.name}</h3>
                <p>{l.note}</p>
                <span className="mono kit-size">{l.size} px</span>
                <div className="kit-dl">
                  {l.files.map(([fmt, href]) => (
                    <a key={href} className="btn" href={href} download>
                      ↓ {fmt}
                    </a>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        <h2 className="kit-h">
          <span className="mono">02</span> Ícones do app
        </h2>
        <div className="kit-grid icons">
          {ICONS.map(([name, href, size]) => (
            <article key={href} className="kit-card">
              <div className="kit-prev">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={href} alt={name} className="kit-icon" />
              </div>
              <div className="kit-meta">
                <h3>{name}</h3>
                <span className="mono kit-size">{size} px</span>
                <div className="kit-dl">
                  <a className="btn" href={href} download>
                    ↓ PNG
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>

        <h2 className="kit-h">
          <span className="mono">03</span> Cores
        </h2>
        <div className="kit-colors">
          {COLORS.map((c) => (
            <article key={c.hex} className="kit-color">
              <div className="kit-swatch" style={{ background: c.hex, color: c.fg }}>
                <b>{c.name}</b>
              </div>
              <div className="kit-meta">
                <span className="mono">{c.hex}</span>
                <span className="mono kit-size">RGB {c.rgb}</span>
                <p>{c.use}</p>
                <CopyButton text={c.hex} label="Copiar HEX" />
              </div>
            </article>
          ))}
        </div>
        <p className="kit-note">
          <a href="/brand/cores.txt" download>
            ↓ Baixar a paleta em texto (cores.txt)
          </a>
        </p>

        <h2 className="kit-h">
          <span className="mono">04</span> Fontes
        </h2>
        <div className="kit-fonts">
          {FONTS.map((f) => (
            <article key={f.name} className="kit-font">
              <p className={`kit-sample ${f.cls}`}>{f.sample}</p>
              <div className="kit-meta">
                <h3>{f.name}</h3>
                <p>{f.role}</p>
                <div className="kit-dl">
                  {f.weights.map((w) => (
                    <a key={w} className="btn" href={`/brand/fonts/${f.file}-${w}.ttf`} download>
                      ↓ {w}
                    </a>
                  ))}
                  <a className="btn" href={`https://fonts.google.com/specimen/${f.gf}`} target="_blank" rel="noopener noreferrer">
                    Google Fonts ↗
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
        <p className="kit-note">
          Fontes do Google Fonts, licença SIL Open Font License: uso livre, inclusive comercial. Instagram oficial:{" "}
          <a href={`https://instagram.com/${INSTAGRAM}`} target="_blank" rel="noopener noreferrer">
            @{INSTAGRAM}
          </a>
        </p>
      </main>
    </>
  );
}
