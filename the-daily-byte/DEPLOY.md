# DEPLOY — The Daily Byte

Terminal: PowerShell. Um comando de cada vez, espera a resposta antes do próximo.

## 1. Antes de começar

```powershell
git --version
```
```powershell
node --version
```

Se der erro `dubious ownership` (drive externo):

```powershell
git config --global --add safe.directory 'CAMINHO/COMPLETO/DA/PASTA'
```

## 2. GitHub (conta Neexcreative)

Cria o repo `the-daily-byte` em github.com (privado). Depois, na pasta do projeto:

```powershell
git init
```
```powershell
git add .
```
```powershell
git commit -m "first commit"
```
```powershell
git branch -M main
```
```powershell
git remote add origin https://github.com/Neexcreative/the-daily-byte.git
```
```powershell
git push -u origin main
```

O `.gitignore` já exclui `.env.local`, `node_modules` e `.next`.

## 3. Vercel

1. vercel.com, **Add New, Project**, importa o repo. O Next.js é detectado sozinho.
2. Em **Storage** (ou Marketplace), adiciona **Upstash Redis** e liga ao projeto. Isso preenche `KV_REST_API_URL` e `KV_REST_API_TOKEN`.
3. Em **Settings, Environment Variables**, adiciona (antes do deploy, ou faz Redeploy depois):

| Variável | O que é |
|---|---|
| `DASHBOARD_PASSWORD` | senha do painel |
| `AUTH_SECRET` | string aleatória longa |
| `CRON_SECRET` | outra string aleatória (a Vercel envia sozinha no cron) |
| `GEMINI_API_KEY` | chave gratuita do Google AI Studio (escreve os roteiros) |
| `GEMINI_MODEL` | opcional, padrão `gemini-2.5-flash` |
| `RESEND_API_KEY` | chave do Resend para o e-mail |
| `EMAIL_TO` | teu e-mail (vários separados por vírgula) |
| `EMAIL_FROM` | opcional, ex.: `The Daily Byte <onboarding@resend.dev>` |
| `DIGEST_TZ` | `Europe/Dublin` |
| `DIGEST_HOUR` | `21` |

4. Deploy. Abre a URL, entra com a senha e clica em **Gerar agora** para testar.

## 4. Update do dia a dia

```powershell
git add .
```
```powershell
git commit -m "feat: descricao curta"
```
```powershell
git push
```

A Vercel publica sozinha em 1 a 3 minutos.

## 5. Conferir o cron

Vercel, projeto, **Settings, Cron Jobs**. Devem aparecer dois jobs em `/api/cron` (20h e 21h UTC). Só um roda de verdade por dia, o que bate com 21h em Dublin.

Plano Hobby: a Vercel limita cron a execuções diárias com horário aproximado (pode atrasar até 1h). Se precisar de 21h exatas, usa o plano Pro.

## Checklist

- [ ] Nenhum segredo no repo
- [ ] Push feito e Vercel verde
- [ ] Redis ligado e variáveis preenchidas
- [ ] "Gerar agora" funcionou no desktop e no telemóvel
- [ ] Primeiro e-mail das 21h chegou
