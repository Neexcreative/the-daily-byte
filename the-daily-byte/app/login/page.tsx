"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(login, "");
  return (
    <main className="wrap">
      <form className="login" action={action}>
        <h1 className="brand">The Daily <span>Byte</span></h1>
        <p className="sub">Área privada.</p>
        <input name="password" type="password" placeholder="Senha" autoFocus required autoComplete="current-password" />
        {error && <p className="err">{error}</p>}
        <button className="btn primary" disabled={pending}>{pending ? "Entrando..." : "Entrar"}</button>
      </form>
    </main>
  );
}
