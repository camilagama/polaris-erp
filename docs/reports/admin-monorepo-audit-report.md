# Relatorio de Auditoria - Monorepo e Admin Interno

> Nota de supersessao, 2026-07-12: este relatorio e um snapshot historico. Qualquer recomendacao de Cloudflare Access para o admin foi substituida pelo plano atual em `docs/superpowers/plans/2026-07-10-production-readiness-pr-plan.md`: admin separado em Vercel com Vercel Authentication/deployment protection e guard in-app de platform admin.

Data: 2026-07-09  
Escopo: revisao do estado atual do monorepo Polaris contra `docs/admin-monorepo-implementation-plan.md`, com foco em isolamento `apps/web` vs `apps/admin`, Neon/Postgres, gates de producao, outbox, rate limit admin, Vercel/Cloudflare/Sentry/R2/Upstash e riscos de release.

## Resumo Executivo

O monorepo existe e o `apps/admin` foi criado, mas ainda nao esta isolado o suficiente para ser tratado como uma superficie independente pronta para producao. O maior problema arquitetural e que `apps/admin` importa internals de `apps/web` por alias TypeScript. Isso confirma o risco apontado: hoje existe `apps/admin -> apps/web/src`.

Status de producao: nao liberar ainda.

Motivos principais:

- `apps/admin/tsconfig.json` mapeia `"@/*"` para `"../web/src/*"`.
- Mutacoes admin sensiveis passaram a ter rate limit dedicado neste bloco posterior ao snapshot inicial do relatorio.
- O outbox agora tem rota/fundacao Inngest para claim/finalizacao duravel e os webhooks Resend/Woovi/Asaas ja enfileiram eventos reais; ainda faltam dispatchers de email/billing.
- Gates externos de producao seguem sem prova local: Vercel link/protection, Cloudflare Access real, OAuth admin/app, Sentry alerts, Upstash real, R2 lifecycle real e deploy smoke.
- Neon plugin falhou nesta auditoria com `HTTP 401 token_invalidated`; metadados Neon anteriores continuam uteis, mas nova verificacao via plugin depende de reautenticacao.
- `prod:preflight` existe e cobre boa parte dos riscos, mas ainda precisa passar com envs reais.

## Evidencia Relevante

Comandos e inspecoes usados:

- `git status --short`: worktree limpo antes do relatorio.
- `Get-Content -Raw apps/admin/tsconfig.json`: alias admin aponta para web.
- Busca em `apps/admin/src`: todas as paginas/actions usam imports `@/...`, resolvidos para `apps/web/src`.
- `Get-Content -Raw apps/admin/package.json`: admin nao declara packages de dominio proprios.
- `Get-Content -Raw turbo.json`: pipeline existe, mas `globalPassThroughEnv` nao inclui todas as envs novas de admin/providers.
- `Select-String` em webhooks: Resend/Woovi/Asaas validam assinatura/token e gravam eventos.
- `Select-String` em outbox: no snapshot inicial existia `retryOutboxEvent`, mas nao havia runner/processador automatico; depois foi adicionada rota `/api/inngest` com funcao `process-outbox-event`.
- `Get-Content -Raw .github/workflows/ci.yml`: CI cobre check/test/build/e2e e jobs manuais de smoke/preflight.
- Neon plugin: tentativa nova retornou `HTTP 401 token_invalidated`.
- `ctx7` para Inngest: docs atuais confirmam uso em Next.js para funcoes duraveis, eventos, cron, retries e jobs em background.

## Achados Stop-Ship

### P0 - Admin ainda acoplado ao web por alias

Evidencia:

- `apps/admin/tsconfig.json`:
  - `"@/*": ["../web/src/*"]`
- Imports encontrados em `apps/admin/src`:
  - `@/db`
  - `@/lib/auth`
  - `@/lib/env`
  - `@/lib/platform-admin-auth`
  - `@/lib/platform-directory`
  - `@/lib/platform-organization-mutations`
  - `@/lib/event-foundation`
  - outros helpers app-local do web
- `apps/admin/playwright.config.ts` e E2E admin reutilizam suporte do web.

Impacto:

- O monorepo tem dois apps no filesystem, mas nao tem fronteira real de dominio.
- Mudancas internas em `apps/web/src` podem quebrar o admin sem contrato publico.
- `apps/admin` nao consegue evoluir deploy/env/auth/db de modo independente.

Guardrail aplicado depois do snapshot inicial:

- `apps/web/src/lib/admin-boundary.test.ts` lista os imports temporarios existentes de `apps/admin` para `apps/web/src` e falha se novos imports surgirem.
- Esse teste permite reduzir a lista sem bloquear a extracao futura, mas nao resolve o acoplamento por si so.

Recomendacao:

1. Extrair `@polaris/db` com schema, migrations, cliente DB e helpers de contexto.
2. Extrair `@polaris/auth` ou `@polaris/platform-auth` com Better Auth/session/platform guard/Cloudflare Access.
3. Extrair `@polaris/platform` para queries/mutations/audit/support/admin domain.
4. Criar `@polaris/testing` ou mover fixtures E2E compartilhadas para package proprio.
5. Mudar alias do admin para `"@/*": ["./src/*"]`.
6. Adicionar teste de arquitetura que falhe se `apps/admin` importar `apps/web/src`.

Justificativa para nao implementar nesta auditoria:

Essa extracao mexe em DB, auth, imports de server components, testes E2E e build de dois apps. E uma PR propria de arquitetura, nao um ajuste seguro de relatorio.

### Resolvido neste bloco - Rate limit admin dedicado

Evidencia antes do ajuste:

- `apps/admin/src/app/organizations/actions.ts` exige platform admin, motivo e confirmacao.
- `apps/web/src/lib/platform-organization-mutations.ts` audita a mutacao em transacao.
- Busca em `apps/admin/src` por `rateLimit`, `rate-limit`, `Upstash`, `ratelimit`: sem resultados.
- `apps/web/src/lib/rate-limit.ts` existe, mas nao e chamado pelas actions admin.

Implementacao aplicada depois da auditoria inicial:

- `apps/web/src/lib/admin-rate-limit.ts` cria chave por acao, ator, alvo e IP.
- `apps/admin/src/app/organizations/actions.ts` limita `organization.status.change`.
- `apps/admin/src/app/events/actions.ts` limita `outbox.retry`.
- `apps/admin/src/app/support-notes/actions.ts` limita `support-note.create`.
- Sem Upstash em `NODE_ENV=production`, o limiter base falha fechado.

Risco residual:

- Ainda precisa validar Upstash real em producao e headers confiaveis na borda.

### P0 - Gates externos de producao seguem sem prova

Itens ainda nao comprovados:

- migrations aplicadas via `DATABASE_URL_DIRECT` em producao;
- `DATABASE_URL` runtime sem owner/admin e sem `BYPASSRLS` em producao;
- Cloudflare Access ativo em `admin.*` e `staging.*`;
- Vercel Deployment Protection ativo;
- admin nao acessivel por URL publica de preview;
- OAuth callbacks validados para app e admin;
- Sentry com alertas para webhook/outbox/admin;
- Upstash configurado em producao;
- R2 staging/final com lifecycle ativo;
- primeiro platform admin criado por script auditavel em ambiente real.

Impacto:

- O codigo tem bons guardrails, mas release real ainda depende de configuracao fora do repo.
- Sem esses checks, um preview ou admin domain pode ficar exposto por erro operacional.

Recomendacao:

- Tratar `bun run prod:preflight` + `bun run deploy:smoke` + `db:smoke:rls` como gates manuais obrigatorios antes de promover.
- Rodar os gates via `vercel env run -e production` depois de linkar Vercel e configurar secrets reais.
- Registrar evidencias em `docs/admin-monorepo-implementation-plan.md` ou runbook de release.

## Achados de Arquitetura e Operacao

### Parcialmente Resolvido - Outbox com fundacao Inngest

Evidencia antes do ajuste:

- `apps/web/src/lib/event-foundation.ts` tem:
  - captura de webhook;
  - listagem de outbox/webhook events;
  - retry manual de eventos `failed`/`dead_letter`.
- Nao foi encontrado `processOutbox`, runner cron, claim lock, worker ou Inngest.

Implementacao aplicada depois da auditoria inicial:

- Dependencia `inngest` adicionada.
- `apps/web/src/app/api/inngest/route.ts` serve as funcoes Inngest pelo App Router.
- `apps/web/src/lib/inngest-client.ts` cria o client e evento `outbox/event.pending`.
- `apps/web/src/lib/inngest-functions.ts` registra `process-outbox-event`.
- `apps/web/src/lib/event-foundation.ts` ganhou claim, mark processed e mark failed/dead-letter.
- Webhooks Resend/Woovi/Asaas agora chamam `enqueueOutboxEvent` e enviam o ID para Inngest em best-effort.
- Woovi/Asaas preservam a reconciliacao sincrona atual enquanto os dispatchers assincronos nao forem validados.
- Eventos sem dispatcher registrado ficam `failed` para revisao manual, sem executar side effect falso.
- `.env.example` e `turbo.json` agora incluem `INNGEST_EVENT_KEY` e `INNGEST_SIGNING_KEY`.

Resposta ao ponto levantado:

Sim, faz sentido trocar o runner planejado por Inngest ou introduzir Inngest antes de qualquer processamento real de email/billing. Pelas docs atuais via `ctx7`, Inngest integra com Next.js por route handler, permite enviar eventos a partir de API routes, suporta cron e funcoes duraveis/retriaveis com observabilidade.

Risco residual:

- Ainda falta registrar dispatchers reais para email/billing/reconciliacao.
- Ainda falta configurar credenciais Inngest reais e validar a rota no deploy.

### P1 - Admin depende de guard server-side, sem middleware proprio

Evidencia:

- Nao existe `apps/admin/src/middleware.ts`.
- Paginas e actions chamam `requirePlatformAdmin`.
- `verifyCloudflareAccess` so enforce em `NODE_ENV=production` com `VERCEL_ENV=preview|production`.

Impacto:

- Para Server Components, o gate por pagina/action e valido.
- Ainda assim, preview/domain protection precisa estar correto, porque a borda do app nao bloqueia tudo antes do render.

Recomendacao:

- Manter `requirePlatformAdmin` em todas as rotas/paginas/actions.
- Adicionar source test que cobre qualquer nova page/action admin.
- Avaliar middleware leve para rotas admin se houver endpoints/paginas que nao passem por Server Component guard.

### P1 - Neon/Postgres: separacao local boa, producao ainda nao comprovada

Evidencia anterior do plugin Neon e URLs locais sanitizadas:

- `DATABASE_URL`: role `polaris_app`, pooler, branch dev, `sslmode=require`.
- `DATABASE_URL_DIRECT`: role `neondb_owner`, conexao direta, branch dev, `sslmode=require`.
- `E2E_DATABASE_URL`: role `polaris_app`, pooler, branch e2e.
- Projeto Neon `polaris-erp`, plan `free_v3`, branch `production` nao protegido, `history_retention_seconds=21600`.

Estado atual:

- O preflight de producao exige `sslmode=verify-full`.
- A verificacao nova via plugin falhou com `token_invalidated`.

Recomendacao:

- Reautenticar Neon plugin antes da proxima auditoria operacional.
- Proteger branch `production` no Neon.
- Usar `DATABASE_URL_DIRECT` apenas para migrations.
- Confirmar `polaris_app` sem `BYPASSRLS` em producao com smoke real.
- Ajustar URLs de producao para `sslmode=verify-full`.

### P1 - Sentry instrumentado, alertas nao comprovados

Evidencia:

- `apps/web/src/instrumentation.ts`
- `apps/web/src/instrumentation-client.ts`
- `apps/web/src/lib/sentry-config.ts`
- `apps/web/next.config.ts` usa `withSentryConfig` e source map upload quando `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` existem.

Lacuna:

- Nao ha prova local de alertas Sentry para webhook/outbox/admin.
- Sem acesso Sentry autenticado, nao da para validar regras de alerta ou issues reais.

Recomendacao:

- Criar alertas especificos:
  - webhook 4xx/5xx por provider;
  - outbox `dead_letter`;
  - mutacao admin falhando;
  - erro no dashboard admin.
- Registrar IDs/links dos alertas no runbook de deploy.

### P2 - Turbo/CI precisa de refinamento de fronteiras e envs

Evidencia:

- `turbo.json` tem outputs de build corretos para `.next/**`, excluindo cache/dev.
- `$schema` usa `https://turborepo.com/schema.json`; docs atuais do Turbo usam `https://turborepo.dev/schema.json`.
- `globalPassThroughEnv` nao inclui algumas envs usadas pelo app/admin/providers:
  - `ADMIN_APP_URL`
  - `CLOUDFLARE_ACCESS_AUD`
  - `CLOUDFLARE_ACCESS_TEAM_DOMAIN`
  - `ASAAS_API_BASE_URL`
  - `ASAAS_API_KEY`
  - `ASAAS_WEBHOOK_TOKEN`
  - `WOOVI_API_BASE_URL`
  - `WOOVI_API_KEY`
  - `WOOVI_WEBHOOK_SECRET`
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL`
  - `RESEND_WEBHOOK_SECRET`
  - Sentry sampling envs
- Nao ha `turbo boundaries` ou regra equivalente impedindo import cross-app.

Recomendacao:

- Atualizar `turbo.json` com envs novas.
- Adicionar task ou teste de boundary.
- Considerar `turbo run build test check --affected` em CI quando o repo estabilizar.

### P2 - R2 lifecycle documentado, nao verificado

Evidencia:

- `docs/product-images-r2.md` recomenda:
  - apagar `staging/` apos 1 dia;
  - abortar uploads incompletos apos 1 dia.
- Codigo tem health/reconcile e separa staging/final.

Lacuna:

- Nao ha prova de lifecycle real aplicado no Cloudflare R2.

Recomendacao:

- Validar via Cloudflare dashboard/API e registrar evidencia no runbook.
- Executar `deploy:smoke` com `CRON_SECRET` para checar health R2 no deploy promovido.

### P2 - Provider billing/email implementados como fundacao, mas precisam sandbox real

Evidencia:

- Resend valida `svix-*`, grava webhook event e enfileira outbox/Inngest.
- Woovi valida `x-webhook-signature` por HMAC local, enfileira outbox/Inngest e reconcilia billing sincronamente.
- Asaas valida `asaas-access-token`, enfileira outbox/Inngest e reconcilia billing sincronamente.

Lacunas:

- Resend precisa dominio verificado em producao.
- Woovi precisa validar algoritmo/fixtures contra sandbox/SDK oficial.
- Asaas precisa validar tokenizacao/customer/update-card no fluxo real.

Recomendacao:

- Nao cobrar clientes ate passar sandbox/producao controlada dos providers.
- Manter envs opcionais e endpoints falhando fechado quando segredo ausente.

## O Que Foi Implementado Como Esperado

- Monorepo com `apps/web`, `apps/admin`, `packages/config`, `packages/emails`, `packages/billing`.
- CI com check, admin check, unit tests, knip, build web/admin, E2E web/admin e jobs manuais de smoke/preflight.
- Admin com paginas de dashboard, orgs, users, audit, billing, events e support notes.
- Platform admin, grants, audit events e mutacoes auditadas.
- Cloudflare Access helper com validacao server-side quando configurado/enforced.
- Webhooks com validacao de entrada e captura idempotente.
- Preflight de producao cobrindo varias configuracoes criticas.
- R2 upload/serve/reconcile documentado e testado localmente.

## O Que Ainda Falta Fazer

Ordem recomendada:

1. Reautenticar Neon plugin e confirmar branch/roles atuais.
2. Extrair `@polaris/db`, `@polaris/auth` e `@polaris/platform`.
3. Remover alias `apps/admin -> apps/web/src`.
4. Adicionar boundary test que proiba import de `apps/web` pelo admin.
5. Registrar dispatchers reais de email/billing/reconciliacao.
6. Linkar Vercel e configurar projetos/domains reais para web/admin.
7. Configurar Cloudflare Access e Vercel Preview/Deployment Protection.
8. Configurar Upstash, R2 lifecycle, Sentry DSN/alerts, OAuth callbacks, Resend domain e credenciais Inngest.
9. Rodar migrations em producao somente com `DATABASE_URL_DIRECT`.
10. Rodar `prod:preflight`, `db:smoke:rls` e `deploy:smoke` com envs reais.
11. Criar primeiro platform admin por script auditavel e registrar evidencia.
12. Validar Woovi/Asaas/Resend em sandbox/producao controlada.

Itens locais removidos da fila durante esta continuacao:

- `aidd_docs/memory/project-state.md` criado para satisfazer o contrato de memoria do `AGENTS.md`.
- `docs/production-database-cleanup.md` e `docs/production-database-cleanup.sql` restaurados; o SQL e conservador e termina em `rollback` por padrao.
- `bun run platform-admin:bootstrap` adicionado para bootstrap auditavel do primeiro platform admin; execucao real e identidade do primeiro admin continuam pendentes.
- CI atualizado para executar `bun run typecheck` e `bun run typecheck:admin` no job `verify`.
- `prod:preflight` atualizado para exigir `INNGEST_EVENT_KEY` e `INNGEST_SIGNING_KEY` em producao.

## Decisao de Release

Estado recomendado: `no-go` para producao ampla.

Pode seguir em desenvolvimento/local/preview protegido se:

- admin nao estiver exposto publicamente;
- envs reais sensiveis nao forem conectadas a preview sem protection;
- mutacoes admin ficarem restritas a operadores internos;
- Upstash real e headers de IP forem validados antes de qualquer uso operacional real.

## Observacoes Sobre o Plano Existente

O checklist em `docs/admin-monorepo-implementation-plan.md` esta mais honesto do que antes: PR 18 e checklist final ainda deixam gates reais desmarcados. Contudo, os itens de PR 7/10/13 podem passar a falsa impressao de conclusao completa porque o admin existe e as mutacoes/outbox existem, mas:

- o isolamento entre apps ainda nao existe de fato;
- rate limit admin foi implementado para as actions existentes, mas ainda falta validar Upstash real/borda;
- outbox tem fundacao Inngest e produtores reais em Resend/Woovi/Asaas, mas ainda faltam dispatchers reais;
- deploy real segue sem prova.

Recomendacao documental:

- Manter PRs marcadas como implementacao local quando codigo existe.
- Adicionar uma secao explicita de "bloqueadores de release" no plano, apontando para este relatorio.
