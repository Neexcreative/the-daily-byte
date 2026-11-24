"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(login, "");
  return (
    <main className="login-page s-red grid-bg">
      <form className="login" action={action}>
        <h1 style={{ margin: 0, lineHeight: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="The Daily Byte" width={180} height={180} />
        </h1>
        <p className="sub">Área privada · informação com fonte</p>
        <input name="password" type="password" placeholder="Senha" autoFocus required autoComplete="current-password" />
        {error && <p className="err">{error}</p>}
        <button className="btn solid" disabled={pending}>{pending ? "Entrando..." : "Entrar"}</button>
      </form>
    </main>
  );
}
