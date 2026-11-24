"use client";

import { useEffect, useState } from "react";

/** Contagem regressiva até a próxima edição (hora local do fuso da entrega). */
export default function Countdown({ hour = 21, tz = "Europe/Dublin" }: { hour?: number; tz?: string }) {
  const [left, setLeft] = useState<string | null>(null);

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const tick = () => {
      const [h, m, s] = fmt.format(new Date()).split(":").map(Number);
      const now = (h % 24) * 3600 + m * 60 + s;
      let diff = hour * 3600 - now;
      if (diff <= 0) diff += 86400;
      const p = (n: number) => String(n).padStart(2, "0");
      setLeft(`${p(Math.floor(diff / 3600))}:${p(Math.floor((diff % 3600) / 60))}:${p(diff % 60)}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [hour, tz]);

  return (
    <span className="clock mono" title={`Próxima edição às ${String(hour).padStart(2, "0")}:00 (Dublin)`}>
      <small>próx. edição</small>
      <b suppressHydrationWarning>{left ?? "--:--:--"}</b>
    </span>
  );
}
