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
| `DATABASE_URL` | Runtime com connection string pooler da branch Neon usando role nao proprietaria, sem `BYPASSRLS` e com `sslmode=verify-full` (ex.: `polaris_app`). |
| `DATABASE_URL_DIRECT` | Migracoes locais/CI com role proprietaria/admin e `sslmode=verify-full` (ex.: `neondb_owner`). Nao use essa URL como runtime da aplicacao. |
| `BETTER_AUTH_SECRET` | Segredo forte do Better Auth; em producao precisa ter pelo menos 32 caracteres. |
| `BETTER_AUTH_URL` | URL canonica do app, sem barra final. |
| `ADMIN_APP_URL` | Origem dedicada do admin interno, por exemplo `https://admin.seu-dominio.com`. Deve ser diferente de `NEXT_PUBLIC_APP_URL`. |
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
| `INNGEST_EVENT_KEY` | Chave de eventos do Inngest usada para enviar eventos do outbox em producao. |
| `INNGEST_SIGNING_KEY` | Chave de assinatura do Inngest usada para autenticar invocacoes cloud da rota `/api/inngest`. |

Em producao, sem Upstash configurado o rate limit falha fechado para endpoints sensiveis.

Valores invalidos de sampling do Sentry sao ignorados pelo app e caem nos padroes seguros.

O baseline de headers globais e aplicado por `next.config.ts`: HSTS, `nosniff`, frame policy, referrer policy e permissions policy. CSP completa deve ser validada separadamente para nao quebrar Next/Sentry.

RLS e obrigatorio em producao. Nao configure o runtime com `neondb_owner`: esse role pode ter `BYPASSRLS` no Neon e anula a barreira de tenant mesmo com policies corretas. Mantenha `neondb_owner` apenas em `DATABASE_URL_DIRECT` para migrations. Use `sslmode=verify-full` nas URLs Postgres de producao para preservar a verificacao TLS esperada pelo driver.

## Guardrails de producao

- `NODE_ENV=production` bloqueia `/api/auth/dev/bootstrap-session`, mesmo se `ALLOW_PLAYWRIGHT_BOOTSTRAP=true`.
- `CRON_SECRET` ausente quebra validacao de env em `VERCEL_ENV=production`.
- `BETTER_AUTH_SECRET`, `CRON_SECRET` e `INTERNAL_BOOTSTRAP_SECRET` fracos sao rejeitados em producao.
- `/api/internal/product-images/reconcile` exige `Authorization: Bearer $CRON_SECRET`.
- `/api/health` nao exige segredo e deve retornar apenas status sanitizado. Falha de banco retorna `503` sem mensagem interna.
- `/api/internal/health/r2` exige `Authorization: Bearer $CRON_SECRET` e nao deve expor chaves secretas.
- Migrations destrutivas ou com precheck devem ser aplicadas primeiro em branch Neon isolada.
- `bun run prod:preflight` valida wiring basico de producao antes de deploy: URLs runtime/migration/E2E separadas com `sslmode=verify-full`, smoke RLS configurado, bootstrap E2E desligado em Production, secrets fortes, origens canonicas alinhadas e envs obrigatorios de Google/R2/Upstash/Inngest/Sentry.
- `ADMIN_APP_URL` precisa estar em origem separada do app publico. Proteja o projeto Vercel do admin com Vercel Authentication/deployment protection; o preflight valida a origem separada, mas a protecao da Vercel precisa ser conferida no projeto.

## Admin interno

O monorepo tem duas superficies:

- `apps/web`: app publico dos clientes.
- `apps/admin`: painel interno da plataforma.

O admin deve ser um projeto/deploy separado na Vercel, apontando o root para `apps/admin` e usando subdominio dedicado, por exemplo `admin.seu-dominio.com`. Nao publique o admin na mesma origem do app cliente.

Protecao obrigatoria antes de promover:

1. Vercel Authentication/deployment protection ativo no projeto Vercel do admin. Recomendado: proteger production deployment URLs e todos os previews.
2. Better Auth session e grant ativo em `platform_admins` continuam obrigatorios dentro do app.
3. `DATABASE_URL` do admin usando role runtime sem `BYPASSRLS`, nunca `DATABASE_URL_DIRECT`.
4. Primeiro platform admin bootstrapado por fluxo auditavel, sem reutilizar `member.role`.

Exemplo via Vercel CLI:

```bash
vercel project protection enable <admin-project> --sso
```

Exemplo via API da Vercel:

```json
{
  "ssoProtection": {
    "deploymentType": "prod_deployment_urls_and_all_previews"
  }
}
```

Bootstrap operacional do primeiro platform admin:

```bash
PLATFORM_ADMIN_EMAIL=founder@example.com \
PLATFORM_ADMIN_NAME="Founder" \
PLATFORM_ADMIN_ROLE=owner \
PLATFORM_ADMIN_BOOTSTRAP_REASON="Initial production platform owner approved in release checklist" \
bun run platform-admin:bootstrap
```

O script usa `DATABASE_URL_DIRECT`, recusa reutilizar a mesma URL de `DATABASE_URL`, cria/reusa o usuario por email, cria/reusa `platform_admins`, garante o grant ativo e registra `platform_admin.bootstrap` em `platform_audit_events`. Rode apenas depois de confirmar branch Neon/PITR e guarde o JSON de saida como evidencia operacional.

Valide antes de promover:

```bash
bun run check:admin
bun run build:admin
E2E_DATABASE_URL="postgres://..." bun run test:e2e:admin
vercel env run -e production -- bun run prod:preflight
```

`bun run test:e2e:admin` roda Playwright headless contra `apps/admin` e usa `/api/dev/bootstrap-platform-admin` apenas quando `ALLOW_PLAYWRIGHT_BOOTSTRAP=true`, `NODE_ENV=production`, host local e `DATABASE_URL === E2E_DATABASE_URL`. Esse endpoint deve responder `403` fora de E2E local/CI isolado.

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

1. Aponte `DATABASE_URL_DIRECT` para a branch correta com role de migration.
2. Rode `bun run db:migrate`.
3. Configure `DATABASE_URL` do runtime com role nao proprietaria sem `BYPASSRLS`.
4. Rode `bun run db:smoke:rls` no ambiente apontado para a branch promovida.
5. Rode `bun run platform-admin:bootstrap` uma unica vez para o primeiro operador interno aprovado, usando `DATABASE_URL_DIRECT`.
6. Confira o runbook em `docs/saas-organization-migration-runbook.md`.

Antes de promover producao:

```bash
vercel env run -e production -- bun run prod:preflight
vercel env run -e production -- bun run build
```

Esses comandos usam as variaveis de Production da Vercel durante o preflight/build local/CI e antecipam falhas de env.

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
bun run check:admin
bun run typecheck
bun run typecheck:admin
bun run test
vercel env run -e production -- bun run prod:preflight
bun run db:smoke:rls
bun run db:analyze:listings
DEPLOYMENT_SMOKE_URL=https://SEU_DOMINIO bun run deploy:smoke
bun run build
bun run build:admin
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
2. `bun run db:smoke:rls` passa contra o `DATABASE_URL` do ambiente promovido.
3. `DEPLOYMENT_SMOKE_URL=https://SEU_DOMINIO bun run deploy:smoke` confirma health HTTP, `/sign-in` 200, redirect do Google OAuth para `accounts.google.com` e bootstrap interno bloqueado com 403; com `CRON_SECRET`, tambem valida `/api/internal/health/r2`.
4. Opcional: `bun run db:analyze:listings` passa para uma organizacao com dataset representativo ou retorna `skipped-small-dataset` explicitamente para bases pequenas.
5. `/sign-in` com Google redireciona para `accounts.google.com`.
6. Usuario novo criado pelo Google vai para onboarding.
7. Onboarding cria organizacao, owner, categoria `Outros` e settings.
8. Dashboard carrega vazio para tenant novo.
9. Produto, estoque, venda e cancelamento funcionam.
10. Upload de imagem funciona e bytes saem por rota autenticada.
11. Reconcile de imagens retorna contagens, nao chaves completas; uploads recentes nao devem ser removidos imediatamente.
12. `/api/internal/health/r2` retorna diagnostico sem segredos.
13. Better Auth Dashboard conecta e Sentinel nao bloqueia login legitimo.
14. Sentry recebe erro de teste controlado em preview, tracing aparece com sampling configurado e replay so aparece conforme as taxas.
15. Logs de producao sem erros recorrentes apos 5 minutos.

## CI

O workflow `.github/workflows/ci.yml` roda:

- `bun run check`
- `bun run check:admin`
- `bun run typecheck`
- `bun run typecheck:admin`
- `bun run test`
- `bun run knip`
- `bun run build`
- `bun run build:admin`
- `bun run test:e2e` no job `e2e`, dependente de `E2E_DATABASE_URL`
- `bun run test:e2e:admin` no job `admin-e2e`, dependente de `E2E_DATABASE_URL`
- `bun run db:smoke:rls` no job manual `rls-smoke`, dependente de `RLS_DATABASE_URL`
- `bun run deploy:smoke` no job manual `deployment-smoke`, dependente de `DEPLOYMENT_SMOKE_URL` e `CRON_SECRET`
- `bun run prod:preflight` no job manual `production-preflight`, dependente de `PRODUCTION_DATABASE_URL`, `PRODUCTION_DATABASE_URL_DIRECT`, `PRODUCTION_BETTER_AUTH_URL`, `PRODUCTION_NEXT_PUBLIC_APP_URL`, `DEPLOYMENT_SMOKE_URL`, `E2E_DATABASE_URL`, `RLS_DATABASE_URL`, Google OAuth, R2, Upstash, Inngest, Sentry, `BETTER_AUTH_SECRET` e `CRON_SECRET`

Antes de promover producao, confira se o secret `E2E_DATABASE_URL` aponta para uma branch Neon isolada.

O job `rls-smoke` so roda por `workflow_dispatch`. Use `RLS_DATABASE_URL` apontando para o ambiente que sera promovido e confirme que ele usa uma role runtime sem `BYPASSRLS`; nao reutilize `DATABASE_URL_DIRECT` nem a role de migration.

O job `deployment-smoke` so roda por `workflow_dispatch`. Configure `DEPLOYMENT_SMOKE_URL` com a URL publica do preview/producao que sera promovido; ele valida `/api/health`, `/sign-in`, redirect do Google OAuth para `accounts.google.com` e confirma que `/api/auth/dev/bootstrap-session` esta bloqueado com 403. Se `CRON_SECRET` estiver configurado, tambem valida `/api/internal/health/r2`.

O job `production-preflight` tambem so roda por `workflow_dispatch`. Ele valida wiring de secrets antes de deploy real, incluindo que `E2E_DATABASE_URL` usa role runtime, nao compartilha banco com runtime ou `RLS_DATABASE_URL`, e que `DEPLOYMENT_SMOKE_URL` aponta para a mesma origem de `NEXT_PUBLIC_APP_URL`. Ele nao substitui `rls-smoke`, smoke funcional ou validacao R2/Upstash em preview/producao.
