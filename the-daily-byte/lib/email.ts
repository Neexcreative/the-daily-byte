import type { Digest } from "./types";
import { CATEGORY_LABEL } from "./types";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function dashboardUrl(): string {
  if (process.env.DASHBOARD_URL) return process.env.DASHBOARD_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "";
}

export function renderEmail(d: Digest): { subject: string; html: string } {
  const base = dashboardUrl();
  const r = d.roteiro;

  const roteiro = r
    ? `<div style="background:#141414;color:#f3f0e8;padding:18px 20px;margin:14px 0">
        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#b9b4a8">Roteiro do dia · ~${r.seconds}s · ${r.blocos.length} assuntos</div>
        <div style="font-size:19px;font-weight:700;margin:8px 0;font-family:Georgia,serif">${esc(r.gancho)}</div>
        ${r.blocos.map((b) => `<p style="margin:10px 0"><b>${esc(b.assunto)}.</b> ${esc(b.texto)}</p>`).join("")}
        <p style="margin:10px 0;color:#e4dfd2">${esc(r.fechamento)}</p>
      </div>`
    : `<p style="color:#b4232c">O roteiro de hoje não foi gerado. Abre o painel e clica em "Gerar agora".</p>`;

  const rows = d.stories
    .slice(0, 10)
    .map((s) => {
      const src = s.sources
        .map((x) => `<a href="${esc(x.url)}" style="color:#0a58ca">${esc(x.name)}</a>`)
        .join(" · ");
      return `<div style="padding:12px 0;border-top:1px solid #e5e5e5">
        <div style="font-size:12px;color:#777;text-transform:uppercase;letter-spacing:.04em">${CATEGORY_LABEL[s.category]} · ${esc(s.whyRanked)}${s.controversy ? ` · polêmica ${s.controversy}/10` : ""}</div>
        <div style="font-size:16px;font-weight:600;margin-top:4px">${esc(s.titlePt ?? s.title)}</div>
        ${s.summary ? `<p style="margin:4px 0 0;color:#444;font-size:14px">${esc(s.summary)}</p>` : ""}
        <div style="font-size:13px;margin-top:6px">${src}</div>
      </div>`;
    })
    .join("");

  const cta = base
    ? `<p><a href="${esc(base)}/roteiro?d=${d.date}" style="display:inline-block;background:#111;color:#fff;padding:10px 16px;border-radius:2px;text-decoration:none">Abrir modo gravação</a></p>`
    : "";

  const html = `<div style="font-family:system-ui,Segoe UI,sans-serif;max-width:640px;margin:0 auto;color:#111">
    <h1 style="font-size:24px;margin:0 0 4px;font-family:Georgia,serif">The Daily Byte</h1>
    <p style="color:#666;margin:0">Para gravar amanhã. Roteiro único e ${d.stories.length} notícias, com fontes.</p>
    ${roteiro}${cta}
    <h2 style="font-size:16px;margin:22px 0 4px;font-family:Georgia,serif">Notícias do dia</h2>
    ${rows}
    <p style="color:#888;font-size:12px;margin-top:20px">Confere a fonte original antes de publicar.</p>
  </div>`;
  return { subject: `The Daily Byte · ${d.date}`, html };
}

export async function sendEmail(d: Digest): Promise<string> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.EMAIL_TO;
  if (!key || !to) return "ignorado (sem RESEND_API_KEY ou EMAIL_TO)";
  const { subject, html } = renderEmail(d);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "The Daily Byte <onboarding@resend.dev>",
      to: to.split(",").map((x) => x.trim()),
      subject,
      html,
    }),
  });
  return res.ok ? "enviado" : `erro ${res.status}`;
}
