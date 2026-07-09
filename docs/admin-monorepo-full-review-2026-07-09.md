# Revisao Minuciosa - Monorepo e Admin Interno

Data: 2026-07-09  
Escopo: `docs/admin-monorepo-implementation-plan.md`, monorepo atual, `apps/admin`, `apps/web`, packages compartilhados, CI, Neon/Postgres, gates de producao, outbox/Inngest, Sentry, Upstash, R2 e operacao de release.

## Veredito

No-go para producao ampla.

O monorepo existe e o admin interno foi criado, mas a separacao ainda e incompleta. O principal problema continua sendo arquitetural: `apps/admin` ainda resolve `@/*` para `../web/src/*`. Isso confirma o risco levantado: existem dois apps no filesystem, mas o contrato de dominio ainda esta acoplado ao app cliente.

O codigo local esta bem melhor do que um prototipo: ha platform admin, audit, support notes, rate limit admin, outbox, Inngest, CI, E2E e preflight. O que falta para producao e principalmente: extrair contratos compartilhados, remover import cross-app e provar os gates externos em infraestrutura real.

## Evidencia Inspecionada

- `package.json`: workspaces `apps/*` e `packages/*`; scripts root delegam para Turbo.
- `turbo.json`: tasks, env pass-through e outputs configurados; sem boundary nativo do Turbo.
- `apps/admin/tsconfig.json`: alias `"@/*": ["../web/src/*"]`.
- `apps/admin/src`: imports diretos de DB foram migrados para `@polaris/db`; imports de outbox/eventos foram migrados para `@polaris/events`; paginas/actions ainda importam `@/lib/platform-*`, `@/lib/admin-rate-limit` etc., resolvidos para `apps/web/src`.
- `apps/admin/playwright.config.ts`: reutiliza helper E2E de `apps/web`.
- `apps/web/src/lib/admin-boundary.test.ts`: guardrail permite somente a lista atual de imports temporarios.
- `apps/web/src/lib/production-preflight.ts`: valida DB roles, URLs, Access, R2, Upstash, Inngest e, apos esta revisao, Sentry DSNs.
- Neon MCP: projeto `polaris-erp`, regiao `aws-sa-east-1`, PostgreSQL 18, branches `production`, `dev`, `e2e`.

## Achados P0 - Bloqueiam Producao

### 1. `apps/admin` ainda esta acoplado ao `apps/web`

Evidencia:

- `apps/admin/tsconfig.json` aponta `@/*` para `../web/src/*`.
- O boundary test contem dezenas de imports permitidos de `apps/admin` para helpers internos do web.
- `@polaris/db` existe como fundacao compartilhada para schema/client/tenant-context e ja removeu os imports `@/db` do admin; `@polaris/events` existe para outbox/event-foundation e ja removeu os imports `@/lib/event-foundation` do admin; `@polaris/auth` e `@polaris/platform` ainda nao existem.

Impacto:

- Mudancas internas no app cliente podem quebrar o admin.
- O admin nao tem contrato publico proprio para DB/auth/platform.
- O monorepo ainda nao entrega todo o beneficio de deploy e manutencao independente.

Acao recomendada:

1. Completar `@polaris/db`, movendo tambem migrations/Drizzle ownership e migrando o web para consumir o package diretamente.
2. Criar `@polaris/auth` ou `@polaris/platform-auth` com Better Auth, session, Cloudflare Access e `requirePlatformAdmin`.
3. Criar `@polaris/platform` para queries/mutations/audit/support.
4. Mover helpers E2E compartilhados para `@polaris/testing`.
5. Alterar alias admin para `"@/*": ["./src/*"]`.
6. Trocar o boundary test de allowlist temporaria para proibicao total de `apps/admin -> apps/web/src`.

### 2. Gates externos de producao continuam sem evidencia

Checklist ainda pendente:

- Migrations aplicadas em producao via `DATABASE_URL_DIRECT`.
- Runtime `DATABASE_URL` sem owner/admin e sem `BYPASSRLS`.
- Cloudflare Access ativo para `admin.*`.
- Vercel Preview/Deployment Protection ativo.
- Admin inacessivel por URL publica de preview.
- OAuth app/admin validado nas origens reais.
- Sentry DSN configurado e alertas para webhook/outbox/admin criados.
- Upstash configurado em producao.
- R2 lifecycle aplicado no bucket staging.
- Primeiro platform admin criado por script auditavel.

Impacto:

- O codigo pode estar correto localmente, mas a superficie admin pode ficar exposta por erro de deploy.
- RLS perde valor se production runtime usar role owner.

### 3. Neon production nao esta endurecido o suficiente

Evidencia do plugin:

- Branch default `production` existe, mas `protected: false`.
- `allowed_ips` vazio e `block_public_connections: false`.
- Connection string default retornada pelo plugin usa role proprietaria `neondb_owner`; nao deve ser usada como runtime.
- Historico/PITR no plano atual aparece com janela curta (`history_retention_seconds=21600`).

Acao recomendada:

- Proteger branch `production`.
- Criar/confirmar role runtime sem `BYPASSRLS`.
- Configurar `DATABASE_URL` runtime com role runtime e `sslmode=verify-full`.
- Reservar `DATABASE_URL_DIRECT` para migrations.
- Rodar `bun run db:smoke:rls` contra o ambiente promovido.

## Achados P1 - Arquitetura e Release

### 4. Outbox/Inngest tinha retry automatico quebrado

Problema encontrado:

- Em falha de dispatcher, `processOutboxEvent` marcava o evento como `failed` e relancava o erro.
- No retry do Inngest, `claimOutboxEvent` so aceitava `pending`, entao o retry automatico virava `skipped`.

Corrigido nesta revisao:

- Falha retryable agora volta para `pending`.
- Falta de dispatcher continua terminal (`failed`) para revisao manual.
- Teste adicionado em `apps/web/src/lib/inngest-functions.test.ts`.

Risco residual:

- Ainda faltam dispatchers reais para email/billing/reconciliacao.
- Credenciais Inngest e rota `/api/inngest` ainda precisam ser validadas no deploy.

### 5. Sentry estava opcional no preflight

Problema encontrado:

- `SENTRY_DSN` e `NEXT_PUBLIC_SENTRY_DSN` existiam no app, mas `prod:preflight` nao exigia DSN em producao.

Corrigido nesta revisao:

- `prod:preflight` exige `SENTRY_DSN` e `NEXT_PUBLIC_SENTRY_DSN`.
- CI manual `production-preflight` passa esses secrets.
- Teste de workflow cobre os secrets.

Risco residual:

- Alertas Sentry nao podem ser provados localmente. Precisam ser criados e registrados no runbook.

### 6. Admin tem pouco teste proprio no workspace

Evidencia:

- `apps/admin` tem E2E em `apps/admin/tests/e2e/admin-access.e2e.ts`.
- A maior parte dos testes de plataforma/admin esta em `apps/web/src/lib`.

Impacto:

- Isso acompanha o acoplamento atual.
- Depois da extracao de packages, os testes devem migrar para os packages donos do dominio.

## Achados P2 - Refinamentos

### 7. Turbo/CI esta funcional, mas ainda basico

Estado:

- `check`, `typecheck`, `test`, `knip`, `build`, `build:admin`, E2E e jobs manuais existem.
- `turbo.json` tem outputs corretos para `.next/**`.
- CI ainda roda escopo amplo; nao usa `--affected`.

Acao futura:

- Introduzir CI afetado quando as fronteiras estiverem estabilizadas.
- Adicionar boundary formal por script/teste, ou `turbo boundaries` se adotado no projeto.

### 8. R2 lifecycle e providers precisam evidencia externa

Estado:

- R2 staging/final, health e reconcile existem.
- Resend/Woovi/Asaas validam webhooks e enfileiram eventos.

Pendencias:

- R2 lifecycle real no bucket staging.
- Resend dominio verificado.
- Woovi assinatura validada contra sandbox/fixture oficial.
- Asaas tokenizacao/customer/update-card validado em sandbox.

### 9. Refinamento menor em UI/domino

Foi encontrado comentario de `any` temporario em `apps/web/src/components/products/product-history-panel.tsx`. Nao bloqueia release do admin, mas deve entrar em uma passada posterior de types/domino.

## O Que Foi Implementado Nesta Revisao

- `apps/web/src/lib/production-preflight.ts`: Sentry DSNs obrigatorios em production preflight.
- `scripts/check-production-readiness.ts`: inclui DSNs Sentry.
- `.github/workflows/ci.yml`: job manual de production preflight recebe secrets Sentry.
- `apps/web/src/lib/ci-workflow.test.ts`: garante secrets Inngest/Sentry no workflow.
- `docs/deploy-vercel.md`: documenta preflight com Inngest/Sentry.
- `packages/events/src/index.ts`: fundacao de outbox/eventos compartilhada; falhas retryable voltam para `pending`.
- `apps/web/src/lib/inngest-functions.ts`: ausencia de dispatcher e terminal.
- `apps/web/src/lib/inngest-functions.test.ts`: cobre retryable vs terminal.

## Resposta Aos Pontos Levantados

- `apps/admin` deveria ter sido criado? Sim, e foi criado. O problema nao e ausencia do app, e sim que ele ainda depende de internals de `apps/web`.
- `@polaris/db` e `@polaris/auth` fazem falta agora? Sim. `@polaris/db` foi iniciado e ja atende imports diretos de DB do admin; `@polaris/auth` e os helpers platform ainda sao o proximo passo arquitetural.
- Trocar runner outbox por Inngest faz sentido? Sim. A base Inngest ja existe e e melhor que runner caseiro para retries/observabilidade. O bug de retry automatico encontrado nesta revisao foi corrigido localmente.
- Rate limit admin ainda esta pendente? Para as mutacoes existentes, nao. `assertAdminRateLimit` ja protege status de organizacao, retry de outbox e support notes. Falta validar Upstash real/borda.
- Pode ir para producao? Nao. Falta provar gates externos e remover acoplamento critico antes de tratar o admin como superficie independente.

## Ordem Recomendada Dos Proximos Passos

1. Completar a extracao de `@polaris/db`.
2. Extrair `@polaris/auth`/`@polaris/platform-auth`.
3. Extrair `@polaris/platform` e migrar testes.
4. Remover alias `apps/admin -> apps/web/src`.
5. Reforcar boundary para proibicao total de cross-app import.
6. Configurar Vercel web/admin e dominios reais.
7. Configurar Cloudflare Access e Vercel Preview Protection.
8. Proteger Neon production branch e confirmar roles.
9. Rodar migrations com `DATABASE_URL_DIRECT`.
10. Rodar `prod:preflight`, `db:smoke:rls`, `deploy:smoke`.
11. Criar primeiro platform admin por `bun run platform-admin:bootstrap`.
12. Configurar Sentry alerts, Upstash, R2 lifecycle, OAuth callbacks, Resend domain e Inngest.
13. Validar providers em sandbox.

## Decisao Final

O estado atual e adequado para continuar evoluindo em desenvolvimento e preview protegido. Nao e adequado para producao ampla enquanto o admin depender de `apps/web/src` e os gates externos permanecerem sem evidencia.
