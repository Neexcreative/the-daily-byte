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
  const top = d.stories.slice(0, 8);
  const rows = top
    .map((s) => {
      const hook = s.script ? `<p style="margin:6px 0 0;color:#444"><b>Gancho:</b> ${esc(s.script.hook)}</p>` : "";
      const src = s.sources
        .map((x) => `<a href="${esc(x.url)}" style="color:#0a58ca">${esc(x.name)}</a>`)
        .join(" · ");
      return `<div style="padding:14px 0;border-top:1px solid #e5e5e5">
        <div style="font-size:12px;color:#777;text-transform:uppercase;letter-spacing:.04em">${CATEGORY_LABEL[s.category]} · ${esc(s.whyRanked)}</div>
        <div style="font-size:17px;font-weight:600;margin-top:4px">${base ? `<a href="${esc(base)}/story/${s.id}?d=${d.date}" style="color:#111;text-decoration:none">${esc(s.script?.titlePt ?? s.title)}</a>` : esc(s.script?.titlePt ?? s.title)}</div>
        ${hook}
        <div style="font-size:13px;margin-top:6px">${src}</div>
      </div>`;
    })
    .join("");
  const cta = base
    ? `<p><a href="${esc(base)}/?d=${d.date}" style="display:inline-block;background:#111;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Abrir roteiros completos</a></p>`
    : "";
  const html = `<div style="font-family:system-ui,Segoe UI,sans-serif;max-width:620px;margin:0 auto;color:#111">
    <h1 style="font-size:22px;margin:0 0 4px">The Daily Byte</h1>
    <p style="color:#666;margin:0 0 12px">Para gravar amanhã. ${top.length} histórias, com fontes.</p>
    ${cta}${rows}
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
