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
| `VERCEL_ENV` | Definido pela Vercel. Em `production`, ativa guardrails extras para segredos internos. |
| `NEXT_PUBLIC_APP_URL` | Mesma origem publica usada pelo navegador. |
| `SUPPORT_EMAIL` | Email humano exibido para ativacao manual de assinatura, suporte e pedidos de dados. Obrigatorio em producao. |
| `GOOGLE_CLIENT_ID` | OAuth Google server-side. |
| `GOOGLE_CLIENT_SECRET` | OAuth Google server-side. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google One Tap client-side. Deve ser o mesmo OAuth client id. |
| `UPSTASH_REDIS_REST_URL` | Rate limit distribuido. |
| `UPSTASH_REDIS_REST_TOKEN` | Token REST do Upstash. |
| `R2_ACCOUNT_ID` | Cloudflare R2. |
| `R2_ACCESS_KEY_ID` | Cloudflare R2. |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2. |
| `R2_BUCKET_STAGING` | Upload temporario. |
| `R2_BUCKET_FINAL` | Variantes finais privadas. |
| `INTERNAL_R2_HEALTH_SECRET` | Obrigatorio em Vercel Production. Protege `/api/internal/health/r2` e precisa ter pelo menos 32 caracteres. |
| `PRODUCT_IMAGE_RECONCILE_SECRET` | Obrigatorio em Vercel Production. Protege o disparo manual de `/api/internal/product-images/reconcile` e precisa ter pelo menos 32 caracteres. |
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
- `INTERNAL_R2_HEALTH_SECRET` ou `PRODUCT_IMAGE_RECONCILE_SECRET` ausentes quebram validacao de env em `VERCEL_ENV=production`.
- `BETTER_AUTH_SECRET`, `INTERNAL_R2_HEALTH_SECRET`, `PRODUCT_IMAGE_RECONCILE_SECRET` e `INTERNAL_BOOTSTRAP_SECRET` fracos sao rejeitados em producao.
- `/api/internal/product-images/reconcile` exige `Authorization: Bearer $PRODUCT_IMAGE_RECONCILE_SECRET` para disparo manual.
- `/api/health` nao exige segredo e deve retornar apenas status sanitizado. Falha de banco retorna `503` sem mensagem interna.
- `/api/internal/health/r2` exige `Authorization: Bearer $INTERNAL_R2_HEALTH_SECRET` e nao deve expor chaves secretas.
- Migrations destrutivas ou com precheck devem ser aplicadas primeiro em branch Neon isolada.
- `bun run prod:preflight` valida wiring basico de producao antes de deploy: URLs runtime/migration/E2E separadas com `sslmode=verify-full`, smoke RLS configurado, bootstrap E2E desligado em Production, secrets fortes, origens canonicas alinhadas e envs obrigatorios de suporte, Google/R2/Upstash/Inngest/Sentry.
- `ADMIN_APP_URL` precisa estar em origem separada do app publico. Proteja o projeto Vercel do admin com Vercel Authentication/deployment protection; o preflight valida a origem separada, mas a protecao da Vercel precisa ser conferida no projeto.

## Admin interno

O monorepo tem duas superficies:

- `apps/web`: app publico dos clientes.
- `apps/admin`: painel interno da plataforma.

O admin deve ser um projeto/deploy separado na Vercel, apontando o root para `apps/admin` e usando subdominio dedicado, por exemplo `admin.seu-dominio.com`. Nao publique o admin na mesma origem do app cliente.

Configuracao esperada do projeto Vercel admin:

1. Importe o mesmo repositorio como um segundo projeto Vercel.
2. Configure **Root Directory** como `apps/admin`.
3. Use o `apps/admin/vercel.json` versionado como configuracao do projeto. Nao use `vercel.admin.json` na raiz; esse arquivo foi removido para evitar deploys escondidos ou divergentes.
4. Mantenha **Include source files outside of the Root Directory in the Build Step** habilitado para que os packages compartilhados do monorepo sejam incluidos no build.

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
ADMIN_DEPLOYMENT_SMOKE_URL=https://admin.seu-dominio.com bun run deploy:smoke:admin
vercel env run -e production -- bun run prod:preflight
```

Se a URL estiver protegida por Vercel Authentication e o smoke estiver rodando sem sessao/autenticacao da Vercel, valide a barreira de protecao explicitamente:

```bash
ADMIN_DEPLOYMENT_SMOKE_URL=https://admin.seu-dominio.com \
ADMIN_DEPLOYMENT_SMOKE_PROTECTED=true \
bun run deploy:smoke:admin
```

Esse modo aceita `401` ou `403` como evidencia de protecao no perimetro. Para validar o health route da aplicacao, rode o smoke contra uma URL/autenticacao que consiga atravessar a Vercel Authentication.

`bun run test:e2e:admin` roda Playwright headless contra `apps/admin` e usa `/api/dev/bootstrap-platform-admin` apenas quando `ALLOW_PLAYWRIGHT_BOOTSTRAP=true`, `NODE_ENV=production`, host local e `DATABASE_URL === E2E_DATABASE_URL`. Esse endpoint deve responder `403` fora de E2E local/CI isolado.

## Ativacao manual controlada de billing

O produto e pago desde o primeiro acesso. Enquanto nao houver checkout self-service, a ativacao manual e permitida apenas como modo controlado de operacao.

SOP operacional: `docs/runbooks/manual-billing-activation-sop.md`.

Fluxo obrigatorio:

1. Cliente bloqueado em `/billing-required` aciona o contato configurado em `SUPPORT_EMAIL`.
2. Operador confirma pagamento fora do app e registra uma referencia auditavel, como id do pagamento, id da invoice, link interno de comprovante ou protocolo do provider.
3. Operador acessa `apps/admin` em `/billing`, informa motivo, referencia da evidencia de pagamento, confirma a alteracao e ativa a assinatura.
4. O app registra `billing.subscription.status_changed` em `platform_audit_events` com `reason`, `status` e `paymentEvidenceReference`.
5. Se a evidencia for invalida, estornada ou contestada, operador deve bloquear a assinatura para `past_due` pelo mesmo painel, com motivo claro. Essa reversao exige confirmacao e motivo, mas nao exige nova evidencia de pagamento.

Regras de operacao:

- Nao ative assinatura sem referencia de evidencia externa. A acao server e o pacote platform recusam ativacao `active` sem `paymentEvidenceReference`.
- O SLA do modo manual deve seguir o SOP operacional antes de lancamento publico. Sem esse compromisso operacional, use o fluxo apenas em piloto controlado.
- Guarde a evidencia fora do banco quando ela contiver dados sensiveis; no app, grave somente uma referencia curta e rastreavel.
- Esse fluxo nao substitui checkout self-service para escala. Ele e uma excecao operacional auditavel ate a integracao de pagamento automatizada.

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
2. Confirme que `DATABASE_URL_DIRECT` e `DATABASE_URL` nao sao a mesma connection string.
3. Rode `bun run db:migrate`. O script falha antes do Drizzle se `DATABASE_URL_DIRECT` estiver ausente, invalida ou igual a `DATABASE_URL`; nao existe mais fallback para a URL runtime.
4. Configure `DATABASE_URL` do runtime com role nao proprietaria sem `BYPASSRLS`.
5. Rode `bun run db:smoke:rls` no ambiente apontado para a branch promovida.
6. Rode `bun run platform-admin:bootstrap` uma unica vez para o primeiro operador interno aprovado, usando `DATABASE_URL_DIRECT`.
7. Confira o runbook em `docs/saas-organization-migration-runbook.md`.

Antes de migrations sensiveis, registre evidencia de restore drill recente em variables do GitHub e rode o job manual `restore-drill-checklist`:

- `RESTORE_DRILL_CONFIRMED_AT`: timestamp ISO do drill validado.
- `RESTORE_DRILL_SOURCE_BRANCH`: branch/base original.
- `RESTORE_DRILL_RESTORE_BRANCH`: branch restaurada usada para validacao.
- `RESTORE_DRILL_VALIDATED_BY`: operador responsavel.

Localmente, a mesma validacao roda com:

```bash
RESTORE_DRILL_CONFIRMED_AT=2026-07-10T12:00:00.000Z \
RESTORE_DRILL_SOURCE_BRANCH=production \
RESTORE_DRILL_RESTORE_BRANCH=production-restore-drill-20260710 \
RESTORE_DRILL_VALIDATED_BY=ops@example.com \
bun run ops:restore-drill:checklist
```

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

## Rotinas agendadas

O reconcile diario de imagens de produto roda como funcao agendada do Inngest (`reconcile-product-images`, cron `0 4 * * *`). O `vercel.json` nao agenda mais essa rota via Vercel Cron.

Depois de promover, confirme no Inngest que a app sincronizou a funcao agendada e que `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY` estao configuradas no ambiente.

Disparo manual protegido, apenas para diagnostico operacional:

```bash
curl -X POST "https://SEU_DOMINIO/api/internal/product-images/reconcile" \
  -H "Authorization: Bearer $PRODUCT_IMAGE_RECONCILE_SECRET"
```

Teste de saude R2:

```bash
curl "https://SEU_DOMINIO/api/internal/health/r2" \
  -H "Authorization: Bearer $INTERNAL_R2_HEALTH_SECRET"
```

## Fluxo de deploy

Fluxo manual recomendado:

```bash
vercel link
vercel env pull .env.local
bun run check
bun run check:all
bun run check:admin
bun run typecheck
bun run typecheck:all
bun run typecheck:admin
bun run test
bun run test:all
vercel env run -e production -- bun run prod:preflight
bun run db:smoke:rls
bun run db:analyze:listings
DEPLOYMENT_SMOKE_URL=https://SEU_DOMINIO bun run deploy:smoke
ADMIN_DEPLOYMENT_SMOKE_URL=https://ADMIN_SEU_DOMINIO bun run deploy:smoke:admin
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
3. `DEPLOYMENT_SMOKE_URL=https://SEU_DOMINIO bun run deploy:smoke` confirma health HTTP, `/sign-in` 200, redirect do Google OAuth para `accounts.google.com` e bootstrap interno bloqueado com 403; com `INTERNAL_R2_HEALTH_SECRET`, tambem valida `/api/internal/health/r2`.
4. `ADMIN_DEPLOYMENT_SMOKE_URL=https://ADMIN_SEU_DOMINIO bun run deploy:smoke:admin` confirma `/api/health` do admin quando a URL estiver acessivel, ou `ADMIN_DEPLOYMENT_SMOKE_PROTECTED=true` confirma que a Vercel Authentication bloqueia acesso anonimo.
5. Opcional: `bun run db:analyze:listings` passa para uma organizacao com dataset representativo ou retorna `skipped-small-dataset` explicitamente para bases pequenas.
6. `/sign-in` com Google redireciona para `accounts.google.com`.
7. Usuario novo criado pelo Google vai para onboarding.
8. Onboarding cria organizacao, owner, categoria `Outros` e settings.
9. Dashboard carrega vazio para tenant novo.
10. Produto, estoque, venda e cancelamento funcionam.
11. Upload de imagem funciona e bytes saem por rota autenticada.
12. Reconcile de imagens retorna contagens, nao chaves completas; uploads recentes nao devem ser removidos imediatamente.
13. `/api/internal/health/r2` retorna diagnostico sem segredos.
14. Better Auth Dashboard conecta e Sentinel nao bloqueia login legitimo.
15. Sentry recebe erro de teste controlado em preview, tracing aparece com sampling configurado e replay so aparece conforme as taxas.
16. Logs de producao sem erros recorrentes apos 5 minutos.

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
- `bun run ops:restore-drill:checklist` no job manual `restore-drill-checklist`, dependente de variables `RESTORE_DRILL_CONFIRMED_AT`, `RESTORE_DRILL_SOURCE_BRANCH`, `RESTORE_DRILL_RESTORE_BRANCH` e `RESTORE_DRILL_VALIDATED_BY`
- `bun run deploy:smoke` no job manual `deployment-smoke`, dependente de `DEPLOYMENT_SMOKE_URL` e opcionalmente `INTERNAL_R2_HEALTH_SECRET`
- `bun run deploy:smoke:admin` no job manual `admin-deployment-smoke`, dependente de `ADMIN_DEPLOYMENT_SMOKE_URL` e opcionalmente `ADMIN_DEPLOYMENT_SMOKE_PROTECTED=true` quando a meta for validar o bloqueio da Vercel Authentication
- `bun run ops:production-certification:checklist` no job manual `production-certification-checklist`, dependente de variables `PRODUCTION_CERT_*` para Vercel Auth admin, Root Directory `apps/admin`, source outside root habilitado, Inngest sync/cron/function id, SOP/SLA de billing manual, branch Neon production protegida, pooler Neon habilitado, sandbox Asaas/Woovi, provider sandbox geral, query plan, restore drill com branch origem/restaurada, RLS `18/18`, R2 health, Upstash rate limit, evento/alerta Sentry e validador
- `bun run prod:preflight` no job manual `production-preflight`, dependente de `PRODUCTION_DATABASE_URL`, `PRODUCTION_DATABASE_URL_DIRECT`, `PRODUCTION_BETTER_AUTH_URL`, `PRODUCTION_NEXT_PUBLIC_APP_URL`, `SUPPORT_EMAIL`, `DEPLOYMENT_SMOKE_URL`, `E2E_DATABASE_URL`, `RLS_DATABASE_URL`, Google OAuth, R2, Upstash, Inngest, Sentry, `BETTER_AUTH_SECRET`, `INTERNAL_R2_HEALTH_SECRET` e `PRODUCT_IMAGE_RECONCILE_SECRET`

Comandos agregados disponiveis para gates locais ou jobs dedicados:

- `bun run build:all`
- `bun run check:all`
- `bun run typecheck:all`
- `bun run test:all`

Antes de promover producao, confira se o secret `E2E_DATABASE_URL` aponta para uma branch Neon isolada.

O job `rls-smoke` so roda por `workflow_dispatch`. Use `RLS_DATABASE_URL` apontando para o ambiente que sera promovido e confirme que ele usa uma role runtime sem `BYPASSRLS`; nao reutilize `DATABASE_URL_DIRECT` nem a role de migration.

O job `restore-drill-checklist` so roda por `workflow_dispatch`. Ele nao restaura banco automaticamente; ele falha se nao houver evidencia minima de drill validado em branch restaurada separada. Use isso como gate operacional antes de migrations com risco material.

O job `production-certification-checklist` so roda por `workflow_dispatch`. Ele nao consulta Vercel, Neon, Inngest ou providers automaticamente; ele falha se a evidencia operacional minima ainda nao tiver sido registrada como variables do GitHub:

- `PRODUCTION_CERT_ADMIN_VERCEL_AUTH_AT`: timestamp ISO da verificacao de Vercel Authentication/deployment protection no admin.
- `PRODUCTION_CERT_ADMIN_VERCEL_ROOT_DIRECTORY`: deve ser `apps/admin`.
- `PRODUCTION_CERT_ADMIN_VERCEL_OUTSIDE_ROOT_INCLUDED`: deve ser `true` depois de conferir que o build do projeto admin inclui arquivos fora do Root Directory.
- `PRODUCTION_CERT_INNGEST_SYNC_AT`: timestamp ISO da verificacao de app Inngest sincronizada.
- `PRODUCTION_CERT_INNGEST_RECONCILE_CRON`: deve ser `0 4 * * *`.
- `PRODUCTION_CERT_MANUAL_BILLING_SOP_AT`: timestamp ISO da revisao/aprovacao do SOP interno de ativacao manual controlada em `docs/runbooks/manual-billing-activation-sop.md`.
- `PRODUCTION_CERT_MANUAL_BILLING_SLA_HOURS`: janela de SLA operacional para ativacao manual, inteiro de `1` a `48`; use `24` salvo decisao operacional documentada.
- `PRODUCTION_CERT_NEON_PRODUCTION_BRANCH_PROTECTED`: deve ser `true` depois de conferir que a branch Neon `production` esta protegida.
- `PRODUCTION_CERT_NEON_POOLER_ENABLED`: deve ser `true` depois de conferir que o compute/runtime Neon esta com pooler habilitado e que `DATABASE_URL` usa o host pooler.
- `PRODUCTION_CERT_RLS_FORCED_TABLES`: deve ser `18/18`.
- `PRODUCTION_CERT_QUERY_PLAN_AT`: timestamp ISO do `db:analyze:listings` com `PERFORMANCE_REQUIRE_REPRESENTATIVE=true`.
- `PRODUCTION_CERT_QUERY_PLAN_MIN_ROWS`: inteiro maior ou igual a `500`, alinhado ao modo representativo estrito do `db:analyze:listings`.
- `PRODUCTION_CERT_QUERY_PLAN_SEARCH_TERM`: termo de busca nao vazio usado no `db:analyze:listings`, para provar que a checagem de busca de produtos/clientes rodou.
- `PRODUCTION_CERT_INNGEST_RECONCILE_FUNCTION_ID`: deve ser `reconcile-product-images`.
- `PRODUCTION_CERT_ASAAS_SANDBOX_AT`: timestamp ISO da validacao do fluxo Asaas em sandbox, incluindo webhook/assinatura sem endpoint de producao.
- `PRODUCTION_CERT_WOOVI_SANDBOX_AT`: timestamp ISO da validacao do fluxo Woovi em sandbox, incluindo webhook/Pix sem endpoint de producao.
- `PRODUCTION_CERT_PROVIDER_SANDBOX_AT`: timestamp ISO da aprovacao operacional geral de sandbox dos providers de pagamento/webhook.
- `PRODUCTION_CERT_RESTORE_DRILL_AT`: timestamp ISO do restore drill aceito.
- `PRODUCTION_CERT_RESTORE_DRILL_SOURCE_BRANCH`: branch/base original do restore drill, normalmente `production`.
- `PRODUCTION_CERT_RESTORE_DRILL_RESTORE_BRANCH`: branch restaurada usada para validacao; deve ser diferente da branch origem.
- `PRODUCTION_CERT_VALIDATED_BY`: operador responsavel.

O job `deployment-smoke` so roda por `workflow_dispatch`. Configure `DEPLOYMENT_SMOKE_URL` com a URL publica do preview/producao que sera promovido; ele valida `/api/health`, `/sign-in`, redirect do Google OAuth para `accounts.google.com` e confirma que `/api/auth/dev/bootstrap-session` esta bloqueado com 403. Se `INTERNAL_R2_HEALTH_SECRET` estiver configurado, tambem valida `/api/internal/health/r2`.

O job `admin-deployment-smoke` so roda por `workflow_dispatch`. Configure `ADMIN_DEPLOYMENT_SMOKE_URL` com a URL do preview/producao admin. Use `ADMIN_DEPLOYMENT_SMOKE_PROTECTED=true` como variable do GitHub quando quiser confirmar que Vercel Authentication/deployment protection esta bloqueando acesso anonimo; sem essa flag, o job espera acessar `/api/health` e receber payload `polaris-admin`.

O job `production-preflight` tambem so roda por `workflow_dispatch`. Ele valida wiring de secrets antes de deploy real, incluindo que `E2E_DATABASE_URL` usa role runtime, nao compartilha banco com runtime ou `RLS_DATABASE_URL`, e que `DEPLOYMENT_SMOKE_URL` aponta para a mesma origem de `NEXT_PUBLIC_APP_URL`. Ele nao substitui `rls-smoke`, smoke funcional ou validacao R2/Upstash em preview/producao.
