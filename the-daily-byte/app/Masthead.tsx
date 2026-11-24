import RunButton from "./RunButton";
import { logout } from "./login/actions";

export default function Masthead({
  left,
  right,
  children,
}: {
  left: string;
  right: string;
  /** Barra de seções, logo abaixo do nome do jornal. */
  children?: React.ReactNode;
}) {
  return (
    <header className="mast">
      <div className="mast-util">
        <div className="wrap util-in">
          <span className="util-date">{left}</span>
          <div className="mast-actions">
            <RunButton />
            <form action={logout}>
              <button className="btn quiet">Sair</button>
            </form>
          </div>
        </div>
      </div>
      <div className="wrap mast-brand">
        <h1 className="brand">
          <a href="/">
            The Daily <em>Byte</em>
          </a>
        </h1>
        <p className="tagline">Tecnologia, inteligência artificial e geopolítica · {right}</p>
      </div>
      {children && (
        <nav className="mast-nav" aria-label="Seções">
          <div className="wrap nav-in">{children}</div>
        </nav>
      )}
    </header>
  );
}
