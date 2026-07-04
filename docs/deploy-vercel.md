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
| `DATABASE_URL_DIRECT` | Migrações locais/CI quando necessario. |
| `BETTER_AUTH_SECRET` | Segredo forte do Better Auth. |
| `BETTER_AUTH_URL` | URL canonica do app, sem barra final. |
| `BETTER_AUTH_API_KEY` | Chave do Better Auth Infrastructure para Dashboard e Sentinel. |
| `NEXT_PUBLIC_APP_URL` | Mesma origem publica usada pelo navegador. |
| `GOOGLE_CLIENT_ID` | OAuth Google server-side. |
| `GOOGLE_CLIENT_SECRET` | OAuth Google server-side. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | OAuth Google client-side/One Tap. |
| `UPSTASH_REDIS_REST_URL` | Rate limit distribuido. |
| `UPSTASH_REDIS_REST_TOKEN` | Token REST do Upstash. |
| `R2_ACCOUNT_ID` | Cloudflare R2. |
| `R2_ACCESS_KEY_ID` | Cloudflare R2. |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2. |
| `R2_BUCKET_STAGING` | Upload temporario. |
| `R2_BUCKET_PUBLIC` | Variantes finais. |
| `CRON_SECRET` | Endpoints internos/cron. |
| `SENTRY_DSN` | Sentry server-side. |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry client-side. |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Source maps no build. |
| `ALLOW_PLAYWRIGHT_BOOTSTRAP` | Nunca em producao real; apenas E2E com banco isolado. |

Em producao, sem Upstash configurado o rate limit falha fechado para endpoints sensiveis.

## Google OAuth

No Google Cloud Console:

- Authorized JavaScript origins: `https://seu-dominio.com`.
- Authorized redirect URIs: `https://seu-dominio.com/api/auth/callback/google`.

Se usar preview com login real, inclua tambem a origem de preview.

## Banco e migracoes

As migracoes nao rodam automaticamente no deploy por padrao.

1. Aponte `DATABASE_URL` ou `DATABASE_URL_DIRECT` para a branch correta.
2. Rode `bun run db:migrate`.
3. Confira o runbook em `docs/saas-organization-migration-runbook.md`.

## R2

O upload usa URL pre-assinada para o bucket de staging. Configure CORS do bucket de staging conforme `docs/product-images-r2.md`.

As imagens finais sao servidas por rota autenticada:

```text
/api/product-images/{organizationId}/{productId}/{version}/{variant}
```

Nao exponha imagens de produto via URL publica direta de CDN/R2 em SaaS multi-tenant.

## Cron

O `vercel.json` agenda `/api/internal/product-images/reconcile`.

Teste manual:

```bash
curl -X POST "https://SEU_DOMINIO/api/internal/product-images/reconcile" \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Smoke checks

Depois do deploy:

1. `GET /api/health`.
2. `/register` com Google.
3. Onboarding cria organizacao, owner, categoria `Outros` e settings.
4. Dashboard carrega vazio para tenant novo.
5. Produto, estoque, venda e cancelamento funcionam.
6. Upload de imagem funciona e bytes saem por rota autenticada.
7. Reconcile de imagens retorna contagens, nao chaves completas.
8. Better Auth Dashboard conecta e Sentinel nao bloqueia login legitimo.
9. Logs/Sentry sem erros recorrentes.

## CI

O workflow `.github/workflows/ci.yml` roda:

- `bun run check`
- `bun run test`
- `bun run build`

Antes de promover producao, rode tambem `bun run knip` e E2E com `E2E_DATABASE_URL` isolado.
