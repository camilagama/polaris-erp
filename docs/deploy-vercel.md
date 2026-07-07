# Deploy na Vercel

Guia operacional para publicar o Polaris como SaaS self-serve em Next.js 16 com Neon, Better Auth, R2, Upstash e Sentry.

## Pre-requisitos

- Projeto Vercel conectado ao repositorio.
- Branch Neon de producao e branch separada para preview/E2E.
- OAuth Google configurado para a origem real do app.
- Buckets Cloudflare R2 para staging e variantes finais.
- Upstash Redis para rate limit distribuido.

## Variaveis de ambiente

Configure em Production e replique/adapte para Preview:

| Variavel | Uso |
| --- | --- |
| `DATABASE_URL` | Runtime com connection string pooler da branch Neon. |
| `DATABASE_URL_DIRECT` | Migracoes locais/CI quando necessario. Nao precisa ficar exposta ao runtime se o processo de migracao usar outro secret. |
| `BETTER_AUTH_SECRET` | Segredo forte do Better Auth; em producao precisa ter pelo menos 32 caracteres. |
| `BETTER_AUTH_URL` | URL canonica do app, sem barra final. |
| `BETTER_AUTH_API_KEY` | Chave do Better Auth Infrastructure para Dashboard e Sentinel. |
| `VERCEL_ENV` | Definido pela Vercel. Em `production`, ativa guardrails extras como exigencia de `CRON_SECRET`. |
| `NEXT_PUBLIC_APP_URL` | Mesma origem publica usada pelo navegador. |
| `GOOGLE_CLIENT_ID` | OAuth Google server-side. |
| `GOOGLE_CLIENT_SECRET` | OAuth Google server-side. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google One Tap client-side. Deve ser o mesmo OAuth client id. |
| `UPSTASH_REDIS_REST_URL` | Rate limit distribuido. |
| `UPSTASH_REDIS_REST_TOKEN` | Token REST do Upstash. |
| `R2_ACCOUNT_ID` | Cloudflare R2. |
| `R2_ACCESS_KEY_ID` | Cloudflare R2. |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2. |
| `R2_BUCKET_STAGING` | Upload temporario. |
| `R2_BUCKET_PUBLIC` | Variantes finais. |
| `CRON_SECRET` | Obrigatorio em Vercel Production. Protege endpoints internos/cron e precisa ter pelo menos 32 caracteres. |
| `INTERNAL_BOOTSTRAP_SECRET` | Apenas para E2E/dev. Nunca habilite bootstrap em producao; se existir em producao, precisa ter pelo menos 32 caracteres. |
| `SENTRY_DSN` | Sentry server-side. |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry client-side. |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Source maps no build. |
| `SENTRY_TRACES_SAMPLE_RATE` | Opcional. Override server-side de tracing, numero entre `0` e `1`. Padrao: `0.1` em producao, `1` em desenvolvimento. |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | Opcional. Override client-side de tracing, numero entre `0` e `1`. |
| `NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE` | Opcional. Replay de sessoes normais, numero entre `0` e `1`. Padrao: `0`. |
| `NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE` | Opcional. Replay em sessoes com erro, numero entre `0` e `1`. Padrao: `1`. |
| `ALLOW_PLAYWRIGHT_BOOTSTRAP` | Nunca em producao real; apenas E2E com banco isolado. |

Em producao, sem Upstash configurado o rate limit falha fechado para endpoints sensiveis.

Valores invalidos de sampling do Sentry sao ignorados pelo app e caem nos padroes seguros.

O baseline de headers globais e aplicado por `next.config.ts`: HSTS, `nosniff`, frame policy, referrer policy e permissions policy. CSP completa deve ser validada separadamente para nao quebrar Next/Sentry.

## Guardrails de producao

- `NODE_ENV=production` bloqueia `/api/auth/dev/bootstrap-session`, mesmo se `ALLOW_PLAYWRIGHT_BOOTSTRAP=true`.
- `CRON_SECRET` ausente quebra validacao de env em `VERCEL_ENV=production`.
- `BETTER_AUTH_SECRET`, `CRON_SECRET` e `INTERNAL_BOOTSTRAP_SECRET` fracos sao rejeitados em producao.
- `/api/internal/product-images/reconcile` exige `Authorization: Bearer $CRON_SECRET`.
- `/api/health` nao exige segredo e deve retornar apenas status sanitizado. Falha de banco retorna `503` sem mensagem interna.
- `/api/internal/health/r2` exige `Authorization: Bearer $CRON_SECRET` e nao deve expor chaves secretas.
- Migrations destrutivas ou com precheck devem ser aplicadas primeiro em branch Neon isolada.

## Google OAuth

No Google Cloud Console:

- Authorized JavaScript origins: `https://seu-dominio.com`.
- Authorized redirect URIs: `https://seu-dominio.com/api/auth/callback/google`.

Se usar preview com login real, inclua tambem a origem de preview.

O login usa OAuth server-side do Better Auth e Google One Tap no cliente.
`BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, a origem aberta no navegador e as URLs autorizadas no Google precisam apontar para a mesma origem canonica. A rota `/api/auth/google` redireciona automaticamente para `BETTER_AUTH_URL` antes de iniciar o OAuth para que o cookie de estado do Better Auth e o callback do Google fiquem no mesmo host.

Em desenvolvimento local, use uma das duas configuracoes de ponta a ponta:

- Localhost: `BETTER_AUTH_URL=http://localhost:3000`, `NEXT_PUBLIC_APP_URL=http://localhost:3000`, origem autorizada `http://localhost:3000` e redirect `http://localhost:3000/api/auth/callback/google`.
- Tunnel publico: `BETTER_AUTH_URL=https://seu-tunnel`, `NEXT_PUBLIC_APP_URL=https://seu-tunnel`, origem autorizada `https://seu-tunnel` e redirect `https://seu-tunnel/api/auth/callback/google`.

Nao misture `localhost` no navegador com `BETTER_AUTH_URL` apontando para tunnel offline ou outra origem; nesse caso o clique sera redirecionado para a origem canonica e o fluxo so continua se ela estiver ativa.

## Banco e migracoes

As migracoes nao rodam automaticamente no deploy por padrao.

1. Aponte `DATABASE_URL` ou `DATABASE_URL_DIRECT` para a branch correta.
2. Rode `bun run db:migrate`.
3. Confira o runbook em `docs/saas-organization-migration-runbook.md`.

Antes de promover producao:

```bash
vercel env run -e production -- bun run build
```

Esse comando usa as variaveis de Production da Vercel durante o build local/CI e antecipa falhas de env.

## R2

O upload usa URL pre-assinada para o bucket de staging. Configure CORS do bucket de staging conforme `docs/product-images-r2.md`.

As imagens finais sao servidas por rota autenticada:

```text
/api/product-images/{organizationId}/{productId}/{version}/{variant}
```

Nao exponha imagens de produto via URL publica direta de CDN/R2 em SaaS multi-tenant.

## Cron

O `vercel.json` agenda `/api/internal/product-images/reconcile`.

Cron jobs configurados em `vercel.json` passam a rodar no deploy de producao da Vercel. Confirme que `CRON_SECRET` existe no ambiente Production antes de promover.

Teste manual:

```bash
curl -X POST "https://SEU_DOMINIO/api/internal/product-images/reconcile" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Teste de saude R2:

```bash
curl "https://SEU_DOMINIO/api/internal/health/r2" \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Fluxo de deploy

Fluxo manual recomendado:

```bash
vercel link
vercel env pull .env.local
bun run check
bun run test
bun run build
vercel env run -e production -- bun run build
vercel deploy
vercel logs --deployment <preview-deployment-id> --level error
vercel deploy --prod
vercel logs --environment production --level error --since 5m
```

Promova para producao somente depois de validar o preview contra banco/servicos isolados.

## Smoke checks

Depois do deploy:

1. `GET /api/health` retorna `200` e `checks.database.ok=true`.
2. `/sign-in` com Google redireciona para `accounts.google.com`.
3. Usuario novo criado pelo Google vai para onboarding.
4. Onboarding cria organizacao, owner, categoria `Outros` e settings.
5. Dashboard carrega vazio para tenant novo.
6. Produto, estoque, venda e cancelamento funcionam.
7. Upload de imagem funciona e bytes saem por rota autenticada.
8. Reconcile de imagens retorna contagens, nao chaves completas; uploads recentes nao devem ser removidos imediatamente.
9. `/api/internal/health/r2` retorna diagnostico sem segredos.
10. Better Auth Dashboard conecta e Sentinel nao bloqueia login legitimo.
11. Sentry recebe erro de teste controlado em preview, tracing aparece com sampling configurado e replay so aparece conforme as taxas.
12. Logs de producao sem erros recorrentes apos 5 minutos.

## CI

O workflow `.github/workflows/ci.yml` roda:

- `bun run check`
- `bun run test`
- `bun run knip`
- `bun run build`
- `bun run test:e2e` no job `e2e`, dependente de `E2E_DATABASE_URL`

Antes de promover producao, confira se o secret `E2E_DATABASE_URL` aponta para uma branch Neon isolada.
