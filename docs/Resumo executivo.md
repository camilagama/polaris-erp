**1. Resumo Executivo**
Status de execucao em 2026-07-08:
- PR 1: validado como skip/sem P0 confirmado neste snapshot.
- PR 2: iniciado. `DB-001`, parte de `RACE-001` e rota de imagem com organizacao ativa foram enderecados nesta fatia.
- PR 2: atores em audit/price changes/goals agora sao tenant-scoped por FK composta contra membership.
- PR 2: convites tambem passam a exigir inviter pertencente a mesma organizacao via FK composta.
- PR 2: arquivar/desarquivar produto agora detecta zero linhas alteradas para bloquear sucesso falso com ID de outro tenant.
- PR 2: arquivar/desarquivar produto agora delega a escrita tenant-scoped para camada de dominio.
- PR 2: remocao de imagem de produto agora falha para produto inexistente/outro tenant em vez de retornar sucesso.
- PR 2: lock tenant-scoped de produto usado por update/estoque agora fica na camada de dominio de produtos.
- PR 2: criacao de produto com estoque inicial agora persiste via camada de dominio de produtos.
- PR 2: update de produto e historico de preco agora persistem via camada de dominio de produtos.
- PR 2: entrada e baixa manual de estoque agora persistem via camada de dominio de produtos; action de produtos nao importa mais `db`/schema.
- PR 2: update/delete de categoria agora confirmam linha afetada e evitam auditoria/revalidacao em categoria inexistente/outro tenant.
- PR 2: update/archive/unarchive de metas agora confirmam linha afetada e evitam auditoria/refresh em meta inexistente/outro tenant.
- PR 2: cancelamento de venda agora confirma o update final da venda e evita auditoria/revalidacao quando a venda nao e atualizada.
- PR 2: baixa de estoque na venda e estorno no cancelamento agora confirmam update do produto e evitam auditoria/revalidacao quando o estoque nao e atualizado.
- PR 2: cancelamento de venda de outro tenant agora tem prova explicita de falha antes de estorno, auditoria e revalidacao.
- PR 2: lock tenant-scoped de produtos usado por criacao/cancelamento de venda agora fica na camada de dominio de vendas.
- PR 2: criacao/cancelamento de venda agora persistem via camada de dominio de vendas; action de vendas nao importa mais `db`/schema.
- PR 2: upload staged de imagem agora e escopado por organizacao e usuario antes de virar imagem publica do produto.
- PR 2: rota de presign de imagem agora aplica rate limit e rejeita payload invalido antes de resolver contexto, gerar URL ou auditar.
- PR 2: auditoria de login sem organizacao ativa nao cai mais em `org_dg_imports`; login com organizacao ativa segue auditado no tenant correto.
- PR 2: rota autenticada de leitura de imagem agora tem prova tenant A/B para usuario sem membership; retorna 404 antes de storage/auditoria.
- PR 2: rota autenticada de leitura de imagem deixou de importar `db` diretamente; checagem tenant/produto/org ativa agora fica em camada de dominio com guardrail estrutural.
- PR 2: guardrail global agora impede imports diretos de `@/db` e subpaths em arquivos runtime de `src/app`.
- PR 2: `getAppContext` agora tem prova local de que organizacao inativa nao gera contexto nem atualiza a organizacao ativa da sessao.
- PR 2/R2: remocao de imagem agora confirma `imageVersion` atual antes de apagar o objeto R2.
- PR 2/R2: replace de imagem agora desfaz a nova versao quando perde a corrida de update condicional.
- PR 2/R2: reconcile de imagens agora preserva uploads recentes antes de limpar orfaos.
- PR 2/R2: reconcile de imagens deixou de importar `db` diretamente no route handler; chaves esperadas dos produtos agora sao resolvidas em camada de dominio com guardrail estrutural.
- PR 2/R2: replace/remocao de imagem agora leem estado tenant-scoped do produto via dominio de imagens, nao helper local na action.
- PR 2/R2: replace/remocao de imagem agora aplicam metadata condicional por `organizationId` e versao via dominio de imagens.
- PR 7: iniciado parcialmente. `SEC-001` e `SEC-002` foram enderecados nesta fatia.
- PR 7: `/api/health` agora verifica banco e retorna 503 em falha sem expor detalhes sensiveis.
- PR 7: `/api/health` agora delega a checagem de banco para `src/lib/health.ts`; handlers em `src/app` nao importam mais `db` diretamente fora de asserts de teste.
- PR 7: Sentry agora tem tracing/replay configuravel e replay em erro no client.
- PR 7: inicio de login Google agora redireciona para erro sanitizado quando Better Auth falha antes de gerar URL OAuth.
- PR 7: runbook de deploy Vercel atualizado com envs, guardrails, cron, health checks e smoke checklist.
- PR 7: `CRON_SECRET` agora e obrigatorio em Vercel Production para proteger endpoints internos acionados por cron, sem quebrar build local.
- PR 7: guardrail de `CRON_SECRET` agora tem prova de que nao bloqueia Vercel Preview sem cron real.
- PR 7: rate limit agora faz fallback local quando Upstash falha temporariamente, reduzindo risco de outage em login/upload.
- PR 7: chaves de rate limit agora ignoram headers de IP invalidos antes de usar o valor no bucket.
- PR 7: endpoints com 429 de rate limit, incluindo reconcile interno, agora retornam `Retry-After` para orientar retry.
- PR 7: health interno do R2 agora passa por rate limit antes de consultar o storage.
- PR 7: headers de seguranca globais agora cobrem HSTS, nosniff, frame policy, referrer policy e permissions policy.
- PR 7: bootstrap interno continua bloqueado em producao e agora tambem tem rate limit em development/test.
- PR 7: bootstrap interno com bearer invalido agora tem prova explicita de que nao toca adapter de usuario nem cria sessao.
- PR 7: bootstrap interno com payload invalido agora retorna 400 sanitizado antes de tocar o adapter de usuario.
- PR 7: `.env.example` e deploy docs agora refletem Vercel env, bootstrap E2E, sampling/replay Sentry e headers globais.
- PR 7: `bun run prod:preflight` agora valida wiring basico de producao antes de deploy: URLs runtime/migration/E2E separadas com `sslmode=verify-full`, `RLS_DATABASE_URL`, bootstrap E2E desligado em Production, secrets fortes, origens canonicas e envs obrigatorios de Google/R2/Upstash.
- PR 7: GitHub Actions ganhou job manual `production-preflight` para rodar `bun run prod:preflight` com secrets reais antes de deploy.
- PR 7: headers globais agora tem teste direto contra `next.config.ts`, alem do helper isolado.
- PR 5/CI: workflow agora roda `knip` no job `verify` antes do build; E2E segue isolado por `E2E_DATABASE_URL`.
- PR 5/CI: guardrail de Playwright agora tem teste unitario garantindo falha em CI sem `E2E_DATABASE_URL`.
- PR 5/CI: `CI=true bun run test:e2e` sem `E2E_DATABASE_URL` foi executado e falhou no load do config antes de subir servidor, confirmando o bloqueio contra banco compartilhado.
- PR 5/QA: apos as fatias de hardening, refactors seguros, RLS inicial e UX destrutiva, `bun run test` passou localmente com 69 arquivos e 251 testes.
- PR 2/RLS: decisao arquitetural fechada; RLS e obrigatorio antes de producao, com escopo e sequencia segura definidos em `docs/rls-tenant-isolation.md`.
- PR 2/RLS: plano executavel criado em `docs/superpowers/plans/2026-07-07-rls-tenant-isolation.md` para implementar helper tenant-scoped, migration RLS e validacao Neon temporaria.
- PR 2/RLS: implementacao iniciada com helper transacional `withTenantContext`/`setTenantContext`, testado por TDD para usar `set_config(..., true)`.
- PR 2/RLS: `src/features/catalog/server.ts` agora executa acessos tenant-scoped por `withTenantContext`, iniciando a migracao gradual do app para policies RLS.
- PR 2/RLS: `src/features/dashboard/server.ts` agora executa consultas analiticas tenant-scoped por `withTenantContext`.
- PR 2/RLS: primeira fatia verificada com helper tenant, catalogo e dashboard; `bun run check`, `bun run test`, `bun run knip` e `bun run build` passaram.
- PR 2/RLS: `src/features/goals/server.ts` agora executa leituras, transicoes automaticas e writes de metas por `withTenantContext`.
- PR 2/RLS: `src/features/products/server.ts` agora executa analytics, historico de vendas, create/update/estoque/baixa/archive por `withTenantContext`; teste TDD validou tenant context antes do lock de produto.
- PR 2/RLS: `src/features/sales/server.ts` agora executa bounds, analytics, idempotency lookup, create/cancel por `withTenantContext`; teste TDD validou tenant context antes do lock de produtos.
- PR 2/RLS: products/sales queries e image access agora usam contexto RLS; reconcile de imagens usa contexto interno `product_image_reconcile`; scan confirmou ausencia de import direto de `@/db` em runtime de `src/features`.
- PR 2/RLS: Neon main do projeto `autumn-feather-14038163` (`polaris-erp`) foi inspecionado via plugin antes da migration RLS: `neondb`, role `neondb_owner`, PostgreSQL 18.4, compute/branch `br-empty-frog-acrcn1aj`, sem policies RLS em `public.pg_policies` naquele momento.
- PR 2/RLS: migration `20260707205000_rls_tenant_isolation.sql` criada com `ENABLE/FORCE ROW LEVEL SECURITY`, policies por `app.organization_id`, membership lookup por `app.user_id` e contexto interno de reconcile.
- PR 2/RLS: `app-session` e `audit-log` agora usam contextos RLS antes da migration ser aplicada; aplicacao em Neon main precisa ser coordenada com deploy desta versao para nao quebrar runtime antigo.
- PR 2/RLS: migration RLS aplicada no Neon main do projeto `autumn-feather-14038163`; verificacao direta retornou 14 policies e 13/13 tabelas tenant-scoped com RLS+FORCE.
- PR 2/RLS: `neondb_owner` permanece com `BYPASSRLS=true` e nao aceitou `ALTER ROLE ... NOBYPASSRLS`; criada role runtime `polaris_app` sem `BYPASSRLS`.
- PR 2/RLS: `DATABASE_URL` local foi atualizado para `polaris_app`; smoke no Neon main confirmou zero linhas sem contexto e acesso ao tenant com `app.organization_id`/`app.user_id` transacionais.
- PR 2/RLS: smoke de escrita em rollback confirmou que insert tenant-scoped sem contexto falha por RLS e que fluxo onboarding-like escreve user/org/member/categoria/settings/audit com contexto transacional.
- PR 7/deploy: runbook Vercel agora exige `DATABASE_URL` com role runtime sem `BYPASSRLS` e reserva `DATABASE_URL_DIRECT` para migrations/admin.
- PR 2/RLS: gates completos foram reexecutados com `DATABASE_URL` local usando `polaris_app`: `bun run check`, `bun run test` (74 arquivos, 265 testes), `bun run knip` e `bun run build` passaram.
- PR 2/RLS: criado smoke reexecutavel `bun run db:smoke:rls`, validando role sem `BYPASSRLS`, policies, `FORCE RLS`, bloqueio sem contexto e escrita onboarding-like com rollback.
- PR 2/RLS: apos o script de smoke, `bun run test` passou com 74 arquivos/265 testes; `bun run check`, `bun run db:smoke:rls`, `bun run knip` e `bun run build` tambem passaram.
- PR 2/RLS: GitHub Actions ganhou job manual `rls-smoke` para rodar `bun run db:smoke:rls` com secret dedicado `RLS_DATABASE_URL`, sem executar em push/PR.
- PR 2/RLS: job manual de smoke ficou coberto por teste estrutural; gates apos a mudanca passaram com 75 arquivos/266 testes, alem de `check`, `db:smoke:rls`, `knip` e `build`.
- PR 2/RLS: guardrail estrutural agora impede runtime em `src/features` de importar o root `@/db` diretamente, sem bloquear subpaths controlados como `@/db/tenant-context` e `@/db/schema`.
- PR 2/RLS: apos o guardrail de import root, `bun run check`, `bun run test` (75 arquivos, 268 testes), `bun run db:smoke:rls`, `bun run knip` e `bun run build` passaram.
- PR 2/RLS: `docs/database-environments.md` agora separa URLs/roles de runtime, migrations, E2E e smoke RLS, incluindo `RLS_DATABASE_URL` e a exigencia de role sem `BYPASSRLS`.
- PR 2/RLS: fatia de docs de ambientes verificada com `bun run check` e `bun run db:smoke:rls`, ambos verdes.
- PR 2/RLS: `.env.example` agora lista `E2E_DATABASE_URL` e `RLS_DATABASE_URL`, separando E2E isolado de smoke RLS do ambiente promovido.
- PR 2/RLS: README alinhado ao estado pos-RLS, incluindo `db:smoke:rls`, runtime sem `BYPASSRLS`, bootstrap bloqueado em production, staging R2 por org/user e CI atualizado.
- PR 2/RLS: runbook SaaS/migration foi reescrito para RLS obrigatorio, role runtime sem `BYPASSRLS`, migration via `DATABASE_URL_DIRECT`, smoke RLS, rollback/PITR e resposta a incidente tenant.
- PR 2/RLS: guardrail estrutural agora exige que runtime em `src/features` com import de `@/db/schema` tambem importe `@/db/tenant-context`, reduzindo risco de novo acesso sem contexto RLS.
- PR 2/RLS: apos o guardrail schema+tenant-context, `bun run check`, `bun run test` (75 arquivos, 270 testes) e `bun run db:smoke:rls` passaram.
- PR 2/RLS: gates finais locais reexecutados contra `polaris_app`: `bun run check` (276 arquivos), `bun run test` (75 arquivos, 270 testes), `bun run db:smoke:rls`, `bun run knip` e `bun run build` passaram; MCP Neon ainda retornou 401 `token_invalidated`.
- PR 5/QA: `bun run knip` e `bun run build` passaram apos remover exports mortos das extracoes e ajustar o tipo do env E2E.
- PR 3: iniciado. Entrada de estoque agora reativa produto arquivado ao limpar `archivedAt`.
- PR 3: banco agora rejeita venda de cartao com `payment_fee_payer = not_applicable`.
- PR 3: banco agora limita a uma meta ativa por organizacao com indice unico parcial.
- PR 3: venda agora usa idempotency key opcional para evitar duplicacao por retry/duplo submit.
- PR 3: retry concorrente com mesma idempotency key agora retorna a venda vencedora apos conflito unico, sem auditoria/cache duplicados.
- PR 3: teste de idempotency agora cobre que a migration usa indice unico parcial apenas quando `idempotency_key IS NOT NULL`.
- PR 3: busca tenant-scoped por idempotency key de venda agora fica na camada de dominio, com a action delegando o lookup.
- PR 4/Perf: produtos ativos/arquivados e vendas agora tem indices compostos alinhados a paginacao seek por organizacao.
- PR 8: cleanup seguro iniciado; export morto `getDb` removido de `src/db/index.ts`.
- PR 8: filtros de status de produtos/vendas agora vivem em contracts de dominio, reduzindo imports de queries do App Router pelos componentes.
- PR 8: queries de produtos/vendas foram movidas do App Router para `features`; wrappers de pagina/paginacao tambem foram removidos nas fatias seguintes.
- PR 8: actions de paginacao de produtos/vendas agora vivem integralmente em `features`, sem wrappers em `app`, com guardrail estrutural contra qualquer novo `src/app/**/pagination.ts`.
- PR 8: actions de metas agora vivem em `features/goals/actions`, removendo o arquivo morto em `app` e adicionando guardrail contra import direto pelos componentes de settings.
- PR 8: actions de configuracoes/catalogo agora vivem em `features/catalog/actions`, removendo o arquivo morto em `app` e adicionando guardrail contra import direto pelo painel de settings.
- PR 8: actions de vendas agora vivem em `features/sales/actions`, removendo o arquivo morto em `app` e adicionando guardrail contra import direto pelos componentes de vendas.
- PR 8: actions de produtos agora vivem em `features/products/actions`, removendo o arquivo morto em `app` e adicionando guardrail contra import direto pelos componentes de produtos.
- PR 8: action de onboarding agora vive em `features/onboarding/actions`, removendo o arquivo morto em `app` e mantendo o formulario client fora da route tree de actions.
- PR 8: action de logout agora vive em `features/auth/actions`, removendo o ultimo `actions.ts` da shell autenticada em `app` e mantendo guardrail no layout.
- PR 8: testes de server actions agora ficam junto das actions em `features`, deixando `src/app` sem actions/tests de actions e com guardrail estrutural contra regressao.
- PR 8: componentes agora tem guardrail estrutural unico contra qualquer import de `@/app`, reduzindo acoplamento futuro com a route tree.
- PR 8: `src/app` agora tem guardrail estrutural contra qualquer novo arquivo `actions.ts`, mantendo server actions fora da route tree.
- PR 8: `src/features` agora tem guardrail estrutural contra qualquer import de `@/app` ou `@/components`, mantendo o dominio independente da route tree e da UI.
- PR 8: server actions em `src/features/**/actions.ts` agora tem guardrail contra import direto de `@/db`, preservando delegacao para camadas server/domain.
- PR 8: runtime em `src/lib` agora tem guardrail estrutural contra import de `@/app`, mantendo infra compartilhada independente da route tree.
- PR 8: runtime em `src/lib` tambem nao pode importar `@/features`; default compartilhado de categoria agora vive em `src/lib/catalog-defaults.ts`.
- PR 8: componentes agora tambem tem guardrail contra import de `@/db`, e `src/db` nao pode depender de camadas superiores.
- PR 8: guardrails estruturais agora compartilham helper de teste para reduzir duplicacao e facilitar novas regras.
- PR 8: guardrails estruturais agora cobrem imports estaticos, side-effect imports e imports dinamicos (`import("...")`), reduzindo bypass simples dos boundaries.
- PR 8: regex de imports internos agora fica em helper testado diretamente, evitando divergencia entre boundaries.
- PR 6: falha em "carregar mais" de produtos/vendas agora mostra toast de erro e libera o loading.
- PR 6: modal de taxas de cartao agora tem cancelar/aplicar em rascunho local antes do save explicito.
- PR 6: filtros de busca/status em produtos e vendas ganharam nomes acessiveis explicitos.
- PR 6: documentacao alinhada ao estado verificado do modal de taxas; `UX-001` agora fica como pendencia de E2E/smoke, nao de implementacao local.
- PR 6: onboarding agora retorna erro recuperavel em validacao, anuncia a falha com `aria-live` e desabilita input/botao enquanto a action esta pendente.
- PR 6: exclusao de categoria customizada agora exige confirmacao explicita antes de chamar a action destrutiva.
- PR 5: CI agora inclui job Playwright E2E que exige `E2E_DATABASE_URL` isolado.
- PR 3/DB: migrations aditivas criticas foram aplicadas no endpoint runtime/main via `DATABASE_URL_DIRECT`; a role runtime `polaris_app` agora valida `sales.idempotency_key`, `sales_organization_idempotency_key_unique_idx` e `sessions_id_unique_idx`.
- PR 5/E2E: `bun run test:e2e` agora executa preflight `scripts/check-e2e-db-schema.ts` antes do Playwright e falha cedo se o branch E2E voltar a ficar com schema atrasado.
- PR 5/E2E: branch E2E foi alinhado via Neon MCP; preflight de schema passou e `bun run test:e2e` validou 9/9 fluxos Playwright.
- PR 4/Perf: criado `bun run db:analyze:listings`, read-only, para validar `EXPLAIN ANALYZE` das listagens de produtos/vendas com contexto RLS e dataset representativo.
- PR 4/Perf: smoke do script com tenant inexistente passou via `polaris_app`, `runtimeRoleBypassRls=false`, resultado `listing-plan-analysis-ok` e checks `skipped-small-dataset` por falta de volume representativo.
- PR 4/Perf: `db:analyze:listings` ficou como diagnostico opcional local/ops; nao e gate de `prod:preflight` nem exige secret no GitHub Actions.
- PR 7/deploy: `bun run deploy:smoke` agora valida health HTTP, `/sign-in` 200, redirect Google OAuth para `accounts.google.com`, bootstrap interno 403 e health R2 quando `CRON_SECRET` existir; GitHub Actions ganhou job manual `deployment-smoke`.
- PR 7/deploy: `prod:preflight` agora exige `DEPLOYMENT_SMOKE_URL` em Vercel Production e valida que a origem do smoke bate com `NEXT_PUBLIC_APP_URL`, sem alias de `CRON_SECRET` nem tenant de performance obrigatorio.
- PR 9: roadmap pos-MVP criado em `docs/roadmap.md`, separando convites, billing, exportacao, admin/suporte, LGPD e relatorios do hardening inicial.
- Ainda nao declarar producao pronta: PR 2/3/5/7 seguem com pendencias relevantes.

Veredito: **quase pronto para piloto controlado, não recomendado para produção self-serve aberta ainda**.

Maturidade estimada: **81/100**. Confiança: **média-alta**. Limites: RLS e migrations aditivas criticas foram aplicadas/validadas no endpoint runtime/main e no branch E2E; ainda falta smoke no deploy promovido, envs Vercel reais, R2/Upstash reais, `production-preflight`/`rls-smoke` com secrets reais e medição de planos/listagens com dataset representativo.

Forças reais:
- Multi-tenancy aplicado na maioria das queries e mutations via `organizationId`.
- Vendas/estoque usam transações e `FOR UPDATE`.
- Dinheiro usa `numeric(12,2)` no banco e validações server-side.
- R2 não expõe URL pública direta; imagens passam por rota autenticada.
- `bun run check`, `bun run test` e `bun run build` passaram.

Top bloqueadores antes de clientes reais:
1. Deploy promovido precisa usar `DATABASE_URL` com role runtime `polaris_app` e passar `bun run db:smoke:rls`.
2. Bootstrap interno bloqueado localmente em prod-like; ainda exige smoke em Vercel Production.
3. RLS foi implementado e aplicado no Neon main, mas o deploy ainda precisa usar `DATABASE_URL` com a role runtime `polaris_app` e passar por smoke no ambiente promovido.
4. Fluxos criticos passaram em E2E isolado local, mas ainda precisam rodar em CI/preview com secrets reais.
5. SSL de producao ficou coberto por `prod:preflight` exigindo `sslmode=verify-full`; ainda falta resolver o aviso Sentinel/Better Auth antes de hardening final.

**2. Mapa Técnico**
Stack confirmada: Next.js `16.2.1`, React `19.2.4`, Better Auth `1.6.23`, Drizzle `0.45.2`, PostgreSQL/Neon via `pg`, Tailwind 4, Vitest, Playwright, R2 S3 SDK, Upstash Redis, Sentry.

Arquitetura:
- App Router em `src/app`.
- Domínios em `src/features`.
- DB em `src/db/schema.ts`.
- Auth/tenant em `src/lib/app-session.ts`.
- R2 em `src/features/products/image-*`.
- Rate limit em `src/lib/rate-limit.ts`.
- Proxy Next 16 em `proxy.ts`, como barreira otimista.

Verificações:
- `bun run check` => passou, 285 arquivos.
- `bun run test` => passou, 78 arquivos, 288 testes; timeout anterior em `src/features/sales/actions.test.ts` nao reproduziu no teste isolado nem no rerun completo.
- `bun run build` => passou; alerta de SSL `pg-connection-string` fica coberto pelo `prod:preflight`, que exige `sslmode=verify-full` nas URLs de producao.
- `bun run knip` => passou.
- Gates finais da fatia `prod:preflight` reexecutados: `bun run test` (76 arquivos, 280 testes), `bun run build`, `bun run knip` e `bun run check` passaram.
- `bun run db:smoke:rls` => passou contra `polaris_app`: `rls-runtime-smoke-ok`, 14 policies, 13/13 tabelas com RLS+FORCE; warning SSL local permanece por `.env.local`.
- `bun run test src/lib/production-preflight.test.ts` => passou, 7 testes cobrindo wiring seguro, `sslmode=verify-full`, `DEPLOYMENT_SMOKE_URL`, alias de cron para smoke, envs externos obrigatorios e falhas de configuracao de producao.
- Neon MCP/plugin => voltou a conectar para o projeto `autumn-feather-14038163`; runtime/main tambem foi validado diretamente via `DATABASE_URL`/`DATABASE_URL_DIRECT`.
- `bun x playwright test tests/e2e/shell.e2e.ts` => passou, 4/4, com `E2E_DATABASE_URL` isolado.
- `bun run test:e2e` => passou, 9/9 testes, apos preflight `scripts/check-e2e-db-schema.ts`; branch E2E `br-flat-cherry-acbnuhz4` foi alinhado via Neon MCP. Warnings locais: SSL `pg-connection-string` por `.env.local` e Sentinel/Better Auth default identify ingestion.
- `bun run test src/lib/postgres-plan.test.ts` => passou, cobrindo coleta de indices em `EXPLAIN JSON` para o script `db:analyze:listings`.
- `bun run test src/lib/deployment-smoke.test.ts src/lib/ci-workflow.test.ts` => passou, cobrindo smoke HTTP, `/sign-in`, redirect Google OAuth, health R2 opcional e jobs manuais `rls-smoke`, `production-preflight` e `deployment-smoke`.
- `PERFORMANCE_ORGANIZATION_ID=org_nonexistent_plan_smoke bun run db:analyze:listings` => passou; retornou `listing-plan-analysis-ok`, role `polaris_app`, `runtimeRoleBypassRls=false`, indices esperados nos planos e `skipped-small-dataset` para contagens zeradas.
- `bun run deploy:smoke` sem `DEPLOYMENT_SMOKE_URL` => falha limpa com `DEPLOYMENT_SMOKE_URL ausente.`; execução real depende de URL publica do deploy.
- `bun run knip` => passou apos adicionar o script de analise de planos.
- `CI=true bun run test:e2e` sem `E2E_DATABASE_URL` => falha intencionalmente no load do config para impedir banco compartilhado.

**3. Achados Priorizados**
`DB-001` P1, Banco/Auth  
Evidência: [schema.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/db/schema.ts:56>) agora declara `sessions_id_unique_idx`; [session-id-unique.test.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/db/session-id-unique.test.ts:1>) cobre o índice.  
Status: Corrigido localmente; indice critico aplicado no runtime/main e no branch E2E via Neon MCP em 2026-07-08; pendente smoke no deploy promovido.
Descrição: `sessions.id` é usado para atualizar sessão ativa em [app-session.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/lib/app-session.ts:94>), então precisa ser único no banco real.  
Impacto residual: risco volta se migration nao for aplicada ou falhar por dados legados duplicados.  
Correção: manter precheck, preservar o indice no banco real e validar o smoke no ambiente promovido antes de produção.
Teste: migration/teste SQL rejeitando dois `sessions.id`.

`SEC-001` P1, Auth/Operação  
Evidência: [route.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/app/api/auth/dev/bootstrap-session/route.ts:10>) e [route.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/app/api/auth/dev/bootstrap-session/route.ts:150>).  
Status: Corrigido localmente.  
Descrição: bootstrap interno cria usuário verificado e sessão apenas em `development`/`test`; `NODE_ENV=production` retorna 403 mesmo com `ALLOW_PLAYWRIGHT_BOOTSTRAP=true`.  
Impacto residual: precisa smoke em Vercel Production para confirmar env real e segredo forte.  
Correção: negar sempre em `NODE_ENV=production`, ou restringir a CI/banco isolado com token curto e allowlist.  
Teste: preview/prod-like deve retornar 403 e não criar sessão.

`TENANT-001` P1, Multi-tenancy  
Evidência: [rls-tenant-isolation.md](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/docs/rls-tenant-isolation.md:1>) registra 14 policies, 13/13 tabelas tenant-scoped com RLS+FORCE e role runtime `polaris_app` sem `BYPASSRLS`; [smoke-rls-runtime.cjs](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/scripts/smoke-rls-runtime.cjs:1>) valida bloqueio sem contexto e escrita com rollback.  
Status: Implementado no Neon main e validado localmente; pendente configurar `DATABASE_URL`/`RLS_DATABASE_URL` no deploy e rodar job manual `rls-smoke` + E2E isolado.  
Impacto residual: se deploy usar `neondb_owner` ou outra role com `BYPASSRLS`, a barreira RLS pode ser anulada apesar das policies.  
Correção: manter runtime com role sem `BYPASSRLS`, rodar `bun run db:smoke:rls` no ambiente promovido e manter guardrails contra import direto do root `@/db` em runtime.  
Teste: `bun run db:smoke:rls`, job manual `rls-smoke`, E2E multi-tenant com `E2E_DATABASE_URL`.

`RACE-001` P1, Onboarding/SaaS  
Evidência: `createInitialOrganizationForUser` faz select depois insert sem unique global por usuário em [app-session.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/lib/app-session.ts:196>) e [schema.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/db/schema.ts:124>).  
Status: Mitigado localmente por advisory lock transacional; pendente stress/smoke em banco real.  
Impacto residual: risco volta se o lock nao cobrir o mesmo user key em todas as entradas futuras de onboarding.  
Correção: manter advisory lock e decidir se membership única por usuário é regra de produto antes de criar constraint global.  
Teste: duas chamadas paralelas de onboarding => uma org apenas.

`R2-001` P1, Imagens/R2  
Evidência: upload final antes do DB em [image-workflow.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/features/products/image-workflow.ts:45>); update condicional agora fica no domínio de imagens em [image-workflow.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/features/products/image-workflow.ts:45>); reconcile apaga não referenciadas em [route.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/app/api/internal/product-images/reconcile/route.ts:59>).  
Status: Corrigido localmente nos fluxos revisados; pendente validar contra R2 real/preview.  
Impacto residual: imagem pode ficar orfa se deploy/R2 real divergir dos mocks ou se surgirem novos fluxos sem update condicional.  
Correção: manter idade mínima no reconcile, `returning` no update e rollback da nova versão se conflito.  
Teste: replace simultâneo e replace vs reconcile.

`GOAL-001` P2, Metas  
Evidência: `MAX_ACTIVE_GOALS = 1`; [schema.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/db/schema.ts:697>) agora declara `goals_one_active_per_organization_idx`; [goals-active-unique.test.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/db/goals-active-unique.test.ts:1>) cobre o índice.  
Status: Corrigido localmente e confirmado no Neon main via MCP/read-only; pendente smoke no deploy promovido.  
Impacto residual: duas metas ativas podem voltar apenas se outro ambiente estiver com schema atrasado ou houver drift futuro.  
Correção: manter constraint e tratamento de erro de constraint; validar schema/smoke no ambiente promovido antes de liberar produção.  
Teste: `Promise.allSettled` de duas criações.

`STOCK-001` P2, Estoque  
Evidência: entrada de estoque limpa `archivedAt` via camada de produtos em [server.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/features/products/server.ts:1>) e [actions.test.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/features/products/actions.test.ts:1>) cobre produto arquivado reativado.  
Status: Corrigido localmente.  
Impacto residual: precisa smoke em preview/producao apos aplicar migrations e deploy para confirmar o fluxo real.  
Correção: manter `archivedAt: null` na entrada de estoque.  
Teste: entrada em arquivado volta para vendas.

`DB-002` P2, Integridade  
Evidência: [schema.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/db/schema.ts:591>) declara `sales_card_fee_payer_required`; [20260706144236_oval_scorpion.sql](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/db/migrations/20260706144236_oval_scorpion.sql:1>) tem precheck de legado e constraint; [sales-payment-invariants.test.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/db/sales-payment-invariants.test.ts:15>) cobre a invariante.  
Status: Corrigido localmente e confirmado no Neon main via MCP/read-only; pendente smoke no deploy promovido.  
Impacto residual: import/manual SQL ainda pode quebrar métricas se outro ambiente estiver sem a constraint ou houver drift de schema.  
Correção: manter a constraint DB exigindo `seller|customer` para cartão e validar schema/smoke no ambiente promovido.  
Teste: migration rejeita estado inválido.

`SEC-002` P2, Secrets  
Evidência: validação de `CRON_SECRET` e `INTERNAL_BOOTSTRAP_SECRET` em [env.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/lib/env.ts:24>).  
Status: Corrigido localmente.  
Impacto: segredo curto protege endpoints internos destrutivos/sensíveis.  
Correção: `CRON_SECRET` obrigatório em `VERCEL_ENV=production`; secrets internos presentes precisam ter pelo menos 32 caracteres em `NODE_ENV=production`.  
Teste: env production rejeita segredo curto; Vercel Production rejeita ausencia de `CRON_SECRET`; build local sem `VERCEL_ENV` continua aceito.

`PERF-001` P2, Listagens  
Evidência: [schema.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/db/schema.ts:360>) declara índices de paginação para produtos ativos/arquivados e vendas; [listing-indexes.test.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/db/listing-indexes.test.ts:1>) cobre schema/migration; [analyze-listing-plans.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/scripts/analyze-listing-plans.ts:1>) mede `EXPLAIN ANALYZE` das listagens reais.  
Status: Corrigido localmente e índices confirmados no Neon main via MCP/read-only; pendente rodar `bun run db:analyze:listings` com dataset representativo.  
Impacto residual: planos podem divergir em volume real sem `EXPLAIN ANALYZE` pós-migration.  
Correção: manter índices e validar planos com `PERFORMANCE_ORGANIZATION_ID=... bun run db:analyze:listings` em dataset multi-tenant representativo.  
Teste: teste de schema/migration local, `src/lib/postgres-plan.test.ts` e `db:analyze:listings` com dataset multi-tenant.

`UX-001` P2, Taxas de cartão e ações destrutivas  
Evidência: [catalog-settings-panel.tsx](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/components/settings/catalog-settings-panel.tsx:136>) abre o modal de taxas com rascunho local, cancela descartando o rascunho e aplica antes do save explícito; a exclusão de categoria customizada passa por confirmação antes da action destrutiva. [catalog-settings-panel.test.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/components/settings/catalog-settings-panel.test.ts:109>) cobre cancelar/aplicar taxas e confirmar exclusão de categoria.  
Status: Corrigido localmente; pendente E2E/smoke em navegador com banco isolado.  
Impacto residual: risco de regressão visual/operacional enquanto Playwright nao cobrir o fluxo completo.  
Correção: manter rascunho local com `Cancelar`, `Aplicar taxas` e `Salvar cartao` explícitos; manter confirmação antes de excluir categoria customizada.  
Teste: E2E fechar modal sem aplicar, aplicar e recarregar; excluir categoria customizada somente após confirmar.

`TEST-001` P2, E2E  
Evidência: `playwright.config.ts` exige `E2E_DATABASE_URL` em CI e agora carrega `.env.local` via `@next/env`; `tests/e2e/shell.e2e.ts` passou 4/4 com banco isolado.  
Status: OK para a fatia atual. Preflight de schema passou e Playwright validou shell, produto/estoque/venda/cancelamento/arquivamento, categoria protegida, snapshot de preco e taxas de cartao.  
Impacto residual: ainda falta rodar no CI/preview com secrets reais e manter branch E2E sincronizado nas proximas migrations.  
Correção: manter preflight e recriar/aplicar migrations no branch E2E sempre que o schema mudar.  

**4. Checklist Produção**
- Auth/Google/Better Auth: Parcial. Produção exige Google, secret forte e smoke real; bootstrap prod-like corrigido localmente. P1.
- Sessões/cookies: Parcial. `sessions.id` tem unique no schema e foi aplicado no runtime/main e no branch E2E; falta smoke no deploy promovido com env real. P1.
- Organizações: Parcial. Onboarding tem advisory lock local e contexto bloqueia organizacao inativa; falta stress/smoke em banco real. P1.
- Multi-tenancy: Parcial. App e migration RLS foram aplicados no Neon main; `polaris_app` bloqueia acesso sem contexto, passou smoke de escrita com rollback e tem job manual `rls-smoke`. Ainda falta atualizar env de deploy e rodar smoke/E2E pos-migration. P1.
- RBAC: Parcial. Roles existem, multiusuário/convites desativados. P2.
- Server actions/APIs: Parcial. Boa checagem de contexto; hardening bootstrap/internal avancou, mas smoke real ainda falta. P1/P2.
- IDOR: OK nos fluxos revisados. Produtos, imagens, categorias e metas agora tem provas contra sucesso falso em recurso inexistente/outro tenant.
- R2 upload/serve: Parcial. Boa autorização e corridas principais corrigidas localmente; falta validar R2 real/preview. P1.
- Rate limit: Parcial. Upstash tem fallback local em falha transitoria, descarta IPs invalidos e retorna `Retry-After`; ainda falta validar limites reais e headers confiaveis no deploy. P3.
- Security headers: Parcial. Baseline global aplicado; CSP completa ainda exige validacao separada para nao quebrar Next/Sentry. P3.
- Catálogo/estoque/vendas: Parcial. Núcleo bom; reativação por entrada, idempotency e constraints financeiras foram validadas localmente/E2E e confirmadas no Neon main, mas ainda falta smoke real no deploy promovido. P2.
- Cancelamento/estorno: OK no fluxo normal. Usa lock e estorna estoque.
- Metas: Parcial. Regra de 1 ativa tem constraint local e confirmada no Neon main; falta smoke no deploy promovido. P2.
- Logs/Sentry: Parcial. Errors, tracing e replay em erro configurados; alertas ainda precisam ser definidos na plataforma. P3.
- Backups/rollback: Parcial. Docs existem; execução não verificada. P2.
- Tests unit/integration: OK razoável. 280 testes passando no ultimo run registrado.
- E2E: OK localmente com banco isolado atualizado; pendente CI/preview com secrets reais. P2.
- CI/CD: Parcial. CI roda check/test/knip/build, job E2E isolado e jobs manuais `rls-smoke`, `production-preflight` e `deployment-smoke`; ainda depende dos secrets reais `E2E_DATABASE_URL`, `RLS_DATABASE_URL` e `DEPLOYMENT_SMOKE_URL`. P2.
- LGPD/privacidade/suporte/admin/billing: Ausente/parcial. P2/P3.

**5. Domínio Revenda**
Implementado aceitável: produtos, categorias simples, custo médio, estoque atual, entradas, baixas, venda multi-item, taxa cartão vendedor/cliente, cancelamento com estorno, metas básicas, imagens R2.

Implementado localmente, pendente de validação externa: reposição de produto arquivado reativando produto, consistência DB para cartão no deploy promovido e smoke real de vendas/metas/taxas.

Parcial: relatórios, auditoria operacional consultável, exportação, métricas avançadas, conciliação financeira.

Ausente/pós-MVP: billing, planos, suporte/admin, importação CSV, recebimentos, variações/SKU formal, permissões granulares, exportação de dados, termos/privacidade/LGPD operacional.

**6. Riscos Financeiros e Operacionais**
- Estoque errado: baixo no fluxo normal; entrada em arquivado reativa localmente, mas falta smoke real.
- Venda duplicada: mitigada por idempotency key e unique parcial; objetos críticos foram aplicados no runtime/main e branch E2E, mas ainda falta smoke no deploy promovido.
- Lookup de retry de venda duplicada: mitigado em camada de dominio tenant-scoped; ainda falta smoke no deploy promovido.
- Venda sem baixa: mitigado por transação.
- Baixa sem venda: fluxo existe por baixa operacional, OK.
- Cancelamento inconsistente: mitigado por lock e status.
- Estorno inconsistente: risco se produto removido fisicamente via DB.
- Taxa errada: modal e constraint DB foram corrigidos localmente e confirmados no Neon main; falta smoke real no deploy promovido.
- Lucro/margem errado: risco residual passa a ser drift de schema/ambiente promovido ou dados legados fora do main validado.
- Vazamento entre orgs: sem IDOR confirmado; RLS bloqueia acesso sem contexto no role runtime e passou `db:smoke:rls`, mas ainda falta configurar env de deploy e rodar job manual/smoke funcional/E2E.
- Imagem perdida/órfã: corridas principais foram corrigidas localmente; falta validar R2 real.
- Auditoria pre-tenant: corrigida localmente; login sem organizacao ativa nao gera auditoria falsa em tenant padrao.

**7. Roadmap Recomendado**
Antes de produção:
1. Acionar `production-preflight`, `rls-smoke`, E2E CI/preview e smoke funcional no deploy promovido; objetos críticos de sessão, idempotency, constraints financeiras, metas, listagem e RLS já foram confirmados no Neon main.
2. Rodar smoke em Vercel Production para confirmar bootstrap 403 em prod-like e envs fortes.
3. Validar limites reais do Upstash e headers confiáveis na borda.
4. Rodar Playwright com Neon branch isolada.
5. Validar flows críticos no preview: auth, onboarding, produto, estoque, venda, cancelamento, imagem e health checks.

Estabilizar MVP:
- Validar índices de paginação com `bun run db:analyze:listings` em dataset real.
- Validar reativação de arquivado em entrada de estoque no preview.
- Validar modal de taxas com E2E.
- Rodar smoke funcional de vendas/metas/taxas no deploy promovido com banco runtime.
- Validar onboarding e paginacao com E2E/smoke.

Pós-MVP:
- Convites/membros reais.
- Billing/planos.
- Exportação.
- Admin/support tooling.
- Acionar job manual `rls-smoke` em deploy real com `RLS_DATABASE_URL` apontando para role runtime sem `BYPASSRLS`.
- Observabilidade com alertas.

**8. Plano de Correção**
Fase 0, P0/P1:
- Confirmar schema do deploy promovido com `production-preflight`, `rls-smoke` e smoke funcional; objetos críticos já foram confirmados no Neon main.
- Rodar `vercel env run -e production -- bun run prod:preflight` com envs reais.
- Acionar job manual `production-preflight` no GitHub Actions com secrets reais antes de promover.
- Rodar `vercel env run -e production -- bun run build` com envs reais.
- Executar smoke de `/api/auth/dev/bootstrap-session` em Vercel Production e confirmar 403.
Aceite: migrations aplicam sem dados legados conflitantes; build Production passa; bootstrap 403 em prod-like real.

Fase 1, tenant/dados:
- Manter advisory lock de onboarding e testar concorrencia contra banco real.
- Validar fluxo de metas no deploy promovido contra a constraint `goals active` já confirmada no Neon main.
- Concluir operacionalizacao de RLS no deploy: `DATABASE_URL`/`RLS_DATABASE_URL` com role sem `BYPASSRLS`, job manual `rls-smoke`, smoke funcional e E2E isolado.
Aceite: testes concorrentes e migrations provam uma org/meta em banco real.

Fase 2, estoque/venda/R2:
- Validar em preview: entrada em produto arquivado limpa `archivedAt`.
- Validar em preview/R2 real: replace com row count/rollback e reconcile com idade minima.
- Validar fluxo de cartão no deploy promovido contra a constraint DB já confirmada no Neon main.
Aceite: testes locais continuam verdes e smoke preview cobre domínio/R2 real.

Fase 3, UX:
- Validar modal de taxa corrigido com E2E/smoke.
- Validar onboarding com erro inline e pending em E2E/smoke.
- Paginação com toast/retry.
Aceite: E2E cobrindo erro e persistência.

Fase 4, QA/ops:
- Rodar `bun run test:e2e` no CI/preview com `E2E_DATABASE_URL`.
- Garantir secret `E2E_DATABASE_URL` no GitHub Actions.
- Manter `knip` verde.
Aceite: CI inclui check/test/knip/build/E2E isolado e todos os jobs passam com banco E2E dedicado.

**9. Test Plan**
Vitest:
- Concorrência: onboarding, metas, replace image.
- DB/schema: sessões únicas, pagador cartão, secrets curtos.
- Estoque: entrada em arquivado reativa.
- R2: update condicional zero linhas limpa objeto novo.
- Auth: bootstrap prod-like 403.

Integration:
- Dois tenants com IDs cruzados em actions e route handlers.
- Imagem de org inativa retorna 404/403.
- Reconcile ignora objetos novos/pending.

Playwright:
- Login técnico em branch E2E isolada.
- Produto → estoque → venda → cancelamento → arquivamento.
- Taxas de cartão salvas/descartadas explicitamente.
- Onboarding erro/pending.
- Upload imagem inválida/válida.
- Permissões por role quando multiusuário voltar.

**10. Perguntas Em Aberto**
- Uma conta pode pertencer a mais de uma organização no futuro?
- Estoque arquivado deve sempre reativar ao receber entrada?
- Regras finais de estorno parcial existem?
- Taxa de cartão é simples percentual ou fórmula por adquirente?
- Billing é necessário antes do primeiro cliente real?
- Imagens devem ser privadas sempre?
- Quais relatórios mínimos o primeiro cliente exige?
- Quem pode arquivar, cancelar venda e alterar taxas?
- Qual política de retenção/auditoria/LGPD?

**11. Próximos Prompts**
1. “Implemente apenas os P1 de produção.”
2. “Corrija bootstrap interno, secrets e sessão.”
3. “Corrija as corridas de onboarding, metas e imagens.”
4. “Crie testes de isolamento multi-tenant.”
5. “Valide migrations de estoque, cartão, metas e idempotency em Neon isolado.”
6. “Configure e rode Playwright com `E2E_DATABASE_URL` isolado.”
7. “Crie checklist final de deploy para produção.”
