import RunButton from "./RunButton";
import { logout } from "./login/actions";

export default function Masthead({ left, right }: { left: string; right: string }) {
  return (
    <header className="mast">
      <div className="mast-in">
        <div className="mast-top">
          <div>
            <h1 className="brand">
              <a href="/" style={{ textDecoration: "none" }}>
                The Daily <span>Byte</span>
              </a>
            </h1>
            <p className="tagline">Tech, IA e geopolítica, com fontes e roteiro pronto.</p>
          </div>
          <div className="mast-actions">
            <RunButton />
            <form action={logout}>
              <button className="btn ghost">Sair</button>
            </form>
          </div>
        </div>
        <div className="dateline">
          <span>{left}</span>
          <span>{right}</span>
        </div>
      </div>
    </header>
  );
}
