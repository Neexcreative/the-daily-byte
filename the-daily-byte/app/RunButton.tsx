"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RunButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <button
        className="btn"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMsg("Coletando e escrevendo roteiros. Leva cerca de 1 minuto.");
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
        {busy ? "Gerando..." : "Gerar agora"}
      </button>
      {msg && <small style={{ color: "var(--mast-muted)" }}>{msg}</small>}
    </span>
  );
}
