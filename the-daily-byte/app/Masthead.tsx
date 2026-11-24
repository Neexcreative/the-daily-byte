import { INSTAGRAM } from "@/lib/format";
import Countdown from "./Countdown";
import RunButton from "./RunButton";
import { logout } from "./login/actions";

export const TAGLINE = "Sua dose diária de conhecimento sobre tech, IA, geopolítica e entretenimento.";

export default function Masthead({
  left,
  ticker,
  children,
}: {
  left: string;
  /** Manchetes do dia para a faixa que corre embaixo do cabeçalho. */
  ticker?: string[];
  /** Barra de seções. */
  children?: React.ReactNode;
}) {
  const hour = Number(process.env.DIGEST_HOUR ?? 21);
  const items = (ticker ?? []).filter(Boolean).slice(0, 10);
  return (
    <header className="mast">
      {/* Barra fina: status, data, contagem, Instagram e ações */}
      <div className="util s-ink">
        <div className="wrap util-in">
          <span className="live mono">
            <i aria-hidden="true" /> ao vivo
          </span>
          <span className="util-date mono">{left}</span>
          <Countdown hour={hour} tz={process.env.DIGEST_TZ || "Europe/Dublin"} />
          <a className="util-ig mono" href={`https://instagram.com/${INSTAGRAM}`} target="_blank" rel="noopener noreferrer">
            @{INSTAGRAM}
          </a>
          <div className="mast-actions">
            <RunButton />
            <form action={logout}>
              <button className="btn">Sair</button>
            </form>
          </div>
        </div>
      </div>

      {/* Hero: só o logotipo e o subtítulo */}
      <div className="hero s-red grid-bg">
        <div className="wrap hero-in">
          <a href="/" className="hero-logo" aria-label="The Daily Byte, início">
            {/* Arquivo oficial do logotipo: não redesenhar. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-horizontal.webp" alt="The Daily Byte" width={1008} height={262} />
          </a>
          <p className="hero-sub">{TAGLINE}</p>
        </div>
      </div>

      {items.length > 0 && (
        <div className="ticker s-ink" aria-label="Manchetes do dia">
          <div className="ticker-track">
            {[0, 1].map((k) => (
              <div className="ticker-set" key={k} aria-hidden={k === 1}>
                {items.map((t, i) => (
                  <span key={i}>{t}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {children && (
        <nav className="mast-nav s-ink" aria-label="Seções">
          <div className="wrap nav-in">{children}</div>
        </nav>
      )}
    </header>
  );
}
