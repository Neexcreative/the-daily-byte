"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RunButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  return (
    <span className="run">
      <button
        className="btn primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMsg("Coletando notícias e escrevendo o roteiro. Leva cerca de 1 minuto.");
          try {
            const res = await fetch("/api/run", { method: "POST" });
            if (!res.ok) throw new Error(String(res.status));
            setMsg("");
            router.refresh();
          } catch (e) {
            setMsg(`Falhou (${(e as Error).message}). Tenta de novo.`);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Gerando…" : "Gerar edição"}
      </button>
      {msg && <small className="run-msg">{msg}</small>}
    </span>
  );
}
