# The Daily Byte

Painel privado que, todo dia às 21h (Dublin), coleta notícias de tech, IA e geopolítica de feeds RSS, agrupa o que se repete, ranqueia as mais fortes e escreve um roteiro de 30 a 60 segundos com fontes. Também manda um resumo por e-mail.

Para o passo a passo de publicar, veja o `DEPLOY.md`.

## Como funciona

1. **Coleta** (`lib/collect.ts`): lê ~20 feeds (`lib/feeds.ts`), só itens das últimas 36h. Feed que falha não derruba o resto.
2. **Ranking** (`lib/rank.ts`): agrupa títulos parecidos. Pontua por número de fontes diferentes, peso da fonte e recência. Reserva espaço para 2 de geopolítica e 2 de IA quando existirem. Não repete links do digest anterior.
3. **Roteiro** (`lib/script.ts`): para as 5 melhores, o Gemini (plano gratuito) escreve gancho, narração (80 a 140 palavras), três pontos, por que importa e CTA, usando só os fatos das fontes.
4. **Entrega**: salva no Redis, mostra no painel e manda e-mail (Resend).
5. **Cron** (`vercel.json`): dispara às 20h e 21h UTC. O código só roda quando é 21h em Dublin, então o horário de verão não desloca nada.

## Editar fontes

Abre `lib/feeds.ts` e adiciona ou remove linhas. Cada fonte tem categoria e peso.

## Rodar local

```powershell
npm install
```
```powershell
copy .env.example .env.local
```
```powershell
npm run dev
```

Sem Redis configurado, o digest fica só em memória (some ao reiniciar).

## Limites da versão 1

- Reddit às vezes bloqueia leitura de RSS. O painel mostra quais feeds falharam.
- O ranking é por regras simples (sem popularidade real das redes).
- O Anthropic não tem RSS oficial, então ficou de fora.
- Sempre confere a fonte original antes de publicar.
