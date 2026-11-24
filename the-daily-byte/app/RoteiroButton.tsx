"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Pede um roteiro novo para a edição, sem coletar as notícias de novo. */
export default function RoteiroButton({ date, label = "Novo roteiro" }: { date?: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  return (
    <span className="run">
      <button
        type="button"
        className="btn"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMsg("");
          try {
            const res = await fetch("/api/roteiro", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ date }),
            });
            const data = (await res.json().catch(() => ({}))) as { error?: string };
            if (!res.ok) throw new Error(data.error ?? String(res.status));
            router.refresh();
          } catch (e) {
            setMsg(`Não deu certo: ${(e as Error).message}`);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Escrevendo…" : label}
      </button>
      {msg && <small className="run-msg">{msg}</small>}
    </span>
  );
}
