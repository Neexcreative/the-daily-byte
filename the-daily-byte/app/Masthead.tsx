import Countdown from "./Countdown";
import RunButton from "./RunButton";
import { logout } from "./login/actions";

export default function Masthead({
  left,
  right,
  children,
}: {
  left: string;
  right: string;
  /** Barra de seções, logo abaixo do cabeçalho vermelho. */
  children?: React.ReactNode;
}) {
  const hour = Number(process.env.DIGEST_HOUR ?? 21);
  return (
    <header className="mast">
      <div className="mast-red s-red grid-bg">
        <div className="wrap mast-in">
          <a href="/" className="mast-logo" aria-label="The Daily Byte, início">
            {/* Arquivo oficial do logotipo: não redesenhar. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.png" alt="The Daily Byte" width={124} height={124} />
          </a>
          <div className="mast-copy">
            <p className="eyebrow">
              <i />
              {left}
            </p>
            <p className="mast-claim">
              Tech. IA. <span>Com fonte.</span>
            </p>
            <p className="mast-sub">{right}</p>
          </div>
          <div className="mast-side">
            <div className="mast-actions">
              <RunButton />
              <form action={logout}>
                <button className="btn">Sair</button>
              </form>
            </div>
            <Countdown hour={hour} tz={process.env.DIGEST_TZ || "Europe/Dublin"} />
          </div>
        </div>
      </div>
      {children && (
        <nav className="mast-nav s-ink" aria-label="Seções">
          <div className="wrap nav-in">{children}</div>
        </nav>
      )}
    </header>
  );
}
