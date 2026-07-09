**Status de Execucao**
- 2026-07-06: PR 1 validado como skip/sem P0 confirmado neste snapshot.
- 2026-07-06: PR 2 iniciado. Concluidos nesta fatia: `DB-001` (`sessions.id` unico com migration), `RACE-001` mitigado por advisory lock transacional no onboarding, e rota de imagem passa a exigir organizacao ativa.
- 2026-07-06: PR 2 avancou em atores tenant-scoped. `audit_events.actor_user_id`, `product_price_changes.changed_by_user_id` e `goals.created_by_user_id` agora ganham FKs compostas contra `member(organization_id,user_id)` com pre-check de dados legados.
- 2026-07-06: PR 2 fechou mais uma borda futura de tenant: `invitation.inviter_id` tambem ganha FK composta contra `member(organization_id,user_id)` com pre-check.
- 2026-07-06: PR 2 adicionou prova tenant A/B em product actions: arquivar/desarquivar produto agora falha quando nenhum produto do tenant atual e alterado, sem auditar nem revalidar.
- 2026-07-07: PR 2 avancou em camada tenant-scoped: arquivar/desarquivar produto agora delega a mutation para dominio (`setProductArchivedState`) e a action tem guardrail estrutural.
- 2026-07-06: PR 2 ampliou prova tenant A/B em imagens de produto: remover imagem agora diferencia produto inexistente/outro tenant de produto existente sem imagem.
- 2026-07-07: PR 2 avancou em camada tenant-scoped de produtos: lock de produto por `organizationId` saiu da action e agora fica no dominio de produtos.
- 2026-07-07: PR 2 avancou em camada tenant-scoped de produtos: criacao de produto com estoque inicial saiu da action e agora persiste via dominio.
- 2026-07-07: PR 2 avancou em camada tenant-scoped de produtos: update de produto e historico de preco sairam da action e agora persistem via dominio.
- 2026-07-07: PR 2 avancou em camada tenant-scoped de produtos: entrada e baixa manual de estoque sairam da action e agora persistem via dominio; action de produtos ficou sem import direto de `db`/schema.
- 2026-07-06: PR 2 avancou em configuracoes/catalogo: update/delete de categoria agora confirmam linha afetada com `returning()` e actions nao auditam/revalidam quando o dominio rejeita categoria inexistente/outro tenant.
- 2026-07-06: PR 2 avancou em metas: update/archive/unarchive agora confirmam linha afetada com `returning()` e actions nao auditam/refresham quando o dominio rejeita meta inexistente/outro tenant.
- 2026-07-06: PR 2 avancou em vendas: cancelamento agora confirma o update final da venda com `returning()` e nao audita/revalida quando a venda nao e atualizada.
- 2026-07-06: PR 2 avancou em estoque de vendas: baixa na criacao e estorno no cancelamento agora confirmam update do produto com `returning()` e bloqueiam auditoria/revalidacao quando o estoque nao e atualizado.
- 2026-07-07: PR 2 avancou em camada tenant-scoped de vendas: lock de produtos por `organizationId` saiu da action e agora fica no dominio de vendas.
- 2026-07-07: PR 2 avancou em camada tenant-scoped de vendas: criacao/cancelamento de venda sairam da action e agora persistem via dominio; action de vendas ficou sem import direto de `db`/schema.
- 2026-07-06: PR 2 avancou em upload de imagens: chaves staged agora incluem organizacao e usuario (`staging/{org}/{user}/...`) e o consumo valida o mesmo escopo.
- 2026-07-06: PR 2/R2 avancou em remocao de imagem: remocao agora confirma update condicional por `imageVersion` antes de apagar o objeto R2, evitando sucesso falso em corrida com replace.
- 2026-07-06: PR 2/R2 avancou em corrida de replace: troca de imagem agora checa `returning()` do update condicional, remove a nova versao se perder a corrida e nao apaga a versao antiga.
- 2026-07-06: PR 2/R2 avancou em reconcile: objetos de imagem recem-enviados agora sao preservados por janela minima antes de limpeza de orfaos.
- 2026-07-07: PR 2/R2 avancou em camada tenant-scoped: reconcile de imagens agora delega consulta de chaves esperadas para dominio e tem guardrail contra import direto de `db` no handler.
- 2026-07-07: PR 2/R2 avancou em camada tenant-scoped: replace/remocao de imagem agora delegam leitura de estado do produto para dominio de imagens.
- 2026-07-07: PR 2/R2 avancou em camada tenant-scoped: replace/remocao de imagem agora delegam writes condicionais de metadata para dominio de imagens.
- 2026-07-06: PR 7 iniciado parcialmente. Concluidos nesta fatia: `SEC-001` (bootstrap bloqueado em qualquer `NODE_ENV=production`) e `SEC-002` (secrets internos fracos rejeitados em producao).
- 2026-07-06: PR 7 avancou em health checks: `/api/health` agora verifica banco com resposta sanitizada e retorna 503 quando a checagem falha.
- 2026-07-07: PR 7 avancou em arquitetura de handlers: `/api/health` delega o ping do banco para `src/lib/health.ts`, removendo o ultimo import direto de `db` em runtime dentro de `src/app`.
- 2026-07-06: PR 7 avancou em observabilidade: Sentry agora usa sampling configuravel para tracing/replay, ativa replay em erro no client e remove log ruidoso de startup.
- 2026-07-07: PR 7 reforcou login Google: falha/throw do Better Auth no inicio do OAuth agora vira redirect sanitizado para `/sign-in?error=google_oauth_unavailable`.
- 2026-07-06: PR 7 avancou em docs de deploy: `docs/deploy-vercel.md` agora cobre envs obrigatorias, sampling Sentry, health checks, cron, build com env de Production e smoke checklist.
- 2026-07-06: PR 7 avancou em guardrails de producao: `CRON_SECRET` agora e obrigatorio em `VERCEL_ENV=production`, sem quebrar build local, alem de rejeitar secrets internos fracos.
- 2026-07-07: PR 7 reforcou guardrail de env: Vercel Preview continua aceito sem `CRON_SECRET`, enquanto Vercel Production exige o segredo.
- 2026-07-06: PR 7 avancou em resiliencia de rate limit: falha transitoria do Upstash agora cai para limiter local em vez de derrubar login/upload, com teste direto em `src/lib/rate-limit.test.ts`.
- 2026-07-06: PR 7 avancou em chaves de rate limit: headers de IP invalidos agora sao ignorados antes de montar o bucket, reduzindo spoof trivial por valor arbitrario.
- 2026-07-06: PR 7 avancou em respostas de rate limit: login Google, presign de imagens e reconcile interno agora retornam `Retry-After` nos 429.
- 2026-07-06: PR 7 avancou em endpoints internos: health do R2 agora tambem tem rate limit com `Retry-After` antes de consultar o bucket.
- 2026-07-06: PR 7 avancou em headers de seguranca: `next.config.ts` agora aplica HSTS, nosniff, frame policy, referrer policy e permissions policy globais.
- 2026-07-06: PR 7 avancou em bootstrap interno: mesmo em development/test, `/api/auth/dev/bootstrap-session` agora tem rate limit com `Retry-After` antes de validar bearer.
- 2026-07-07: PR 7 avancou em templates/runbook: `.env.example` agora lista `VERCEL_ENV`, `ALLOW_PLAYWRIGHT_BOOTSTRAP` e envs de sampling/replay do Sentry; deploy docs mencionam headers globais.
- 2026-07-07: PR 7 reforcou prova de headers: `next.config.ts` agora exporta `baseNextConfig` e `src/lib/next-config-security.test.ts` valida que o baseline global esta ligado no config.
- 2026-07-07: PR 7 reforcou bootstrap interno: payload invalido agora retorna 400 sanitizado antes de tocar adapter de usuario ou criar sessao.
- 2026-07-07: Resumo executivo alinhado ao estado atual: achados DB/R2/metas/estoque agora distinguem corrigido localmente de pendente externo (Neon/Vercel/R2/E2E).
- 2026-07-07: PR 5/CI avancou: job `verify` agora tambem roda `bun run knip` antes do build; docs de CI foram alinhados para check/test/knip/build + E2E isolado.
- 2026-07-07: PR 5/CI reforcou guardrail de Playwright: validacao de `E2E_DATABASE_URL` em CI foi extraida e coberta por teste unitario.
- 2026-07-07: PR 5/CI teve o guardrail Playwright verificado por comando real: `CI=true bun run test:e2e` sem `E2E_DATABASE_URL` falha no load do config antes de subir servidor ou tocar banco.
- 2026-07-07: PR 5/QA estabilizou a suite local apos hardening, refactors seguros, RLS inicial e UX destrutiva: `bun run test` passou com 69 arquivos e 251 testes.
- 2026-07-07: PR 2/RLS teve decisao arquitetural fechada: RLS e obrigatorio antes de producao; `docs/rls-tenant-isolation.md` define escopo, `FORCE RLS`, tenant por transacao e sequencia segura.
- 2026-07-07: PR 2/RLS ganhou plano executavel em `docs/superpowers/plans/2026-07-07-rls-tenant-isolation.md`, ordenando helper tenant-scoped, migration RLS, validacao Neon temporaria e docs.
- 2026-07-07: PR 2/RLS iniciou implementacao: `src/db/tenant-context.ts` define `withTenantContext`/`setTenantContext` com `set_config(..., true)` e teste TDD prova tenant transacional.
- 2026-07-07: PR 2/RLS aplicou o primeiro uso do helper tenant-scoped em `src/features/catalog/server.ts`; settings, categorias e lookup de categoria agora executam dentro de contexto tenant transacional.
- 2026-07-07: PR 2/RLS avancou em analytics: `src/features/dashboard/server.ts` agora executa bounds, metricas, contribution graph e stats globais dentro de contexto tenant transacional.
- 2026-07-07: PR 2/RLS teve a primeira fatia verificada localmente: helper tenant, catalogo e dashboard passaram em `bun run check`, `bun run test` (69 arquivos, 252 testes), `bun run knip` e `bun run build`.
- 2026-07-07: PR 2/RLS avancou em metas: leituras, transicoes automaticas, create/update/archive/unarchive agora executam acessos a `goals` dentro de contexto tenant transacional; gates locais passaram com 253 testes.
- 2026-07-07: PR 2/RLS avancou em produtos: analytics, historico de vendas, create/update/estoque/baixa/archive agora passam por `withTenantContext`; teste TDD validou `set_config` antes do lock e gates locais passaram com 254 testes.
- 2026-07-07: PR 2/RLS avancou em vendas: bounds, analytics, idempotency lookup, create/cancel agora passam por `withTenantContext`; teste TDD validou tenant context antes do lock de produtos e gates locais passaram com 255 testes.
- 2026-07-07: PR 2/RLS fechou a migracao de runtime em `src/features`: products/sales queries e image access agora usam contexto RLS; reconcile de imagens ganhou contexto interno `product_image_reconcile`; scan de imports nao encontrou `from "@/db"` em features runtime; gates locais passaram com 259 testes.
- 2026-07-07: PR 2/RLS inspecionou Neon main antes da migration RLS no projeto `autumn-feather-14038163` (`polaris-erp`): database `neondb`, role `neondb_owner`, PostgreSQL 18.4, branch compute `br-empty-frog-acrcn1aj`, sem policies RLS em `public.pg_policies` naquele momento.
- 2026-07-07: PR 2/RLS avancou para migration: `20260707205000_rls_tenant_isolation.sql` habilita/forca RLS nas tabelas tenant-scoped, cria policies por `app.organization_id`, permite membership lookup por `app.user_id` e restringe reconcile global a `app.internal_job = product_image_reconcile`; suite local passou com 265 testes.
- 2026-07-07: PR 2/RLS adaptou `app-session` e `audit-log` para os contextos RLS pre-tenant/tenant antes da aplicacao em Neon main. Aplicacao efetiva no main deve ser coordenada com deploy desta versao para evitar quebrar runtime antigo sem `set_config`.
- 2026-07-07: PR 2/RLS aplicou a migration RLS no Neon main do projeto `autumn-feather-14038163`; resultado verificado: 14 policies, 13/13 tabelas tenant-scoped com RLS+FORCE.
- 2026-07-07: PR 2/RLS confirmou que `neondb_owner` tem `BYPASSRLS=true` e nao pode ser alterado pela propria conexao (`permission denied to alter role`); foi criada a role runtime `polaris_app` sem `BYPASSRLS`.
- 2026-07-07: PR 2/RLS atualizou o `DATABASE_URL` local para `polaris_app` e validou no Neon main: sem contexto `organization/products/sales = 0`; com contexto transacional `organization = 1` e `member = 1`.
- 2026-07-07: PR 2/RLS validou escrita runtime com rollback no Neon main: insert tenant-scoped sem contexto falha por RLS, enquanto fluxo onboarding-like com user/org/member/categoria/settings/audit funciona com `app.user_id` e `app.organization_id`.
- 2026-07-07: PR 7/deploy alinhou o runbook Vercel para RLS obrigatorio: `DATABASE_URL` deve usar role runtime sem `BYPASSRLS`, e `DATABASE_URL_DIRECT` fica reservado para migrations/admin.
- 2026-07-07: PR 2/RLS teve gates completos reexecutados com `DATABASE_URL` local usando `polaris_app`: `bun run check`, `bun run test` (74 arquivos, 265 testes), `bun run knip` e `bun run build` passaram.
- 2026-07-07: PR 2/RLS ganhou smoke reexecutavel `bun run db:smoke:rls`; o comando valida role sem `BYPASSRLS`, 14 policies, 13/13 tabelas com RLS+FORCE, bloqueio sem contexto e escrita onboarding-like com rollback.
- 2026-07-07: PR 2/RLS validou o smoke reexecutavel e gates finais da fatia: `bun run test` passou com 74 arquivos/265 testes; depois dos ajustes do script, `bun run check`, `bun run db:smoke:rls`, `bun run knip` e `bun run build` passaram.
- 2026-07-07: PR 2/RLS adicionou job manual `rls-smoke` ao GitHub Actions; ele roda `bun run db:smoke:rls` somente por `workflow_dispatch` e usa secret dedicado `RLS_DATABASE_URL`.
- 2026-07-07: PR 2/RLS cobriu o job manual de smoke com teste estrutural em `src/lib/ci-workflow.test.ts`; gates apos a mudanca passaram: `bun run check`, `bun run test` (75 arquivos, 266 testes), `bun run db:smoke:rls`, `bun run knip` e `bun run build`.
- 2026-07-07: PR 2/RLS reforcou guardrail estrutural de features: runtime em `src/features` nao pode importar o root `@/db` diretamente, preservando acesso por `@/db/tenant-context` e schema; helper de boundary agora diferencia root exato de subpaths.
- 2026-07-07: PR 2/RLS revalidou gates apos o guardrail de import root: `bun run check`, `bun run test` (75 arquivos, 268 testes), `bun run db:smoke:rls`, `bun run knip` e `bun run build` passaram.
- 2026-07-07: PR 2/RLS alinhou `docs/database-environments.md` ao modelo pos-RLS, separando `DATABASE_URL`, `DATABASE_URL_DIRECT`, `E2E_DATABASE_URL` e `RLS_DATABASE_URL` por finalidade, branch e role esperada.
- 2026-07-07: PR 2/RLS verificou a fatia de docs de ambientes com `bun run check` e `bun run db:smoke:rls`, ambos verdes.
- 2026-07-07: PR 2/RLS alinhou `.env.example` com os secrets operacionais `E2E_DATABASE_URL` e `RLS_DATABASE_URL`, deixando explicito que E2E usa branch dedicada e smoke RLS usa role sem `BYPASSRLS`.
- 2026-07-07: PR 2/RLS atualizou o README para o estado pos-RLS: script `db:smoke:rls`, runtime sem `BYPASSRLS`, bootstrap sempre bloqueado em production, staging R2 por org/user e CI com `knip`/E2E/rls-smoke.
- 2026-07-07: PR 2/RLS reescreveu `docs/saas-organization-migration-runbook.md` para o fluxo atual com RLS obrigatorio, `DATABASE_URL_DIRECT` para migrations, runtime sem `BYPASSRLS`, smoke RLS, rollback/PITR e resposta a incidente tenant.
- 2026-07-07: PR 2/RLS reconciliou o `Resumo executivo.md`: `TENANT-001` agora reflete RLS aplicada/validada no Neon main, maturidade subiu para 74/100 e CI/CD menciona `rls-smoke`/`RLS_DATABASE_URL`.
- 2026-07-07: PR 2/RLS reforcou guardrail RLS de features: qualquer runtime em `src/features` que importa `@/db/schema` precisa tambem importar `@/db/tenant-context`; helper estrutural agora detecta arquivos com padrao obrigatorio sem companion.
- 2026-07-07: PR 2/RLS revalidou gates apos o guardrail schema+tenant-context: `bun run check`, `bun run test` (75 arquivos, 270 testes) e `bun run db:smoke:rls` passaram.
- 2026-07-07: PR 2/RLS fechou a revalidacao local completa contra `polaris_app`: `bun run check` (276 arquivos), `bun run test` (75 arquivos, 270 testes), `bun run db:smoke:rls`, `bun run knip` e `bun run build` passaram; tentativa pelo MCP Neon ainda retornou 401 `token_invalidated`.
- 2026-07-07: PR 5/QA fechou verificacoes ampliadas locais: `bun run knip` e `bun run build` passaram apos limpar exports mortos das extracoes e ajustar tipo do env E2E.
- 2026-07-07: Resumo executivo alinhado em riscos financeiros: estoque arquivado, idempotency, taxa de cartao e R2 agora constam como mitigados localmente, com validacao externa pendente.
- 2026-07-07: PR 3 reforcou prova de idempotency: teste agora valida que a migration preserva o indice unico parcial apenas para `idempotency_key IS NOT NULL`.
- 2026-07-07: PR 3 avancou em camada tenant-scoped: lookup de venda por idempotency key saiu da action e agora fica no dominio de vendas.
- 2026-07-07: PR 2 ampliou prova tenant A/B em vendas: cancelamento de venda de outro tenant falha antes de estornar estoque, auditar ou revalidar.
- 2026-07-07: PR 2 reforcou rota de presign de imagem: rate limit e payload invalido agora retornam antes de resolver contexto, gerar presign ou auditar.
- 2026-07-07: PR 7 reforcou bootstrap interno: bearer invalido agora tem prova explicita de que nao toca adapter de usuario nem cria sessao.
- 2026-07-08: PR 7 ganhou `bun run prod:preflight` para validar wiring basico de producao antes do deploy: URLs runtime/migration/E2E separadas com `sslmode=verify-full`, `RLS_DATABASE_URL`, bootstrap E2E desligado em Production, secrets fortes, origens canonicas e envs obrigatorios de Google/R2/Upstash.
- 2026-07-08: PR 7 adicionou job manual `production-preflight` ao GitHub Actions, coberto por teste estrutural em `src/lib/ci-workflow.test.ts`.
- 2026-07-07: PR 2 corrigiu auditoria pre-tenant: login sem organizacao ativa nao grava mais evento em `org_dg_imports`; login com organizacao ativa continua auditado no tenant correto.
- 2026-07-07: PR 2 reforcou rota autenticada de leitura de imagem: usuario sem membership na organizacao da URL recebe 404 antes de storage ou auditoria.
- 2026-07-07: PR 2 avancou em camada tenant-scoped: rota autenticada de leitura de imagem agora delega checagem de produto/org/membership para dominio e tem guardrail contra import direto de `db` no handler.
- 2026-07-07: PR 5/E2E tornou o harness executavel localmente: Playwright agora carrega `.env.local` via `@next/env`, usa secrets E2E validos, bootstrap local/CI funciona apenas em loopback com `DATABASE_URL === E2E_DATABASE_URL`, onboarding E2E cria organizacao e seletores foram alinhados a UI atual. `tests/e2e/shell.e2e.ts` passou 4/4; `bun run test:e2e` ficou parcial 5/9 porque o banco E2E esta sem `sales.idempotency_key` e a role runtime nao consegue aplicar migrations no schema `drizzle`.
- 2026-07-07: PR 5/E2E teve gates locais finais verdes apos os ajustes: `bun run check` (276 arquivos), `bun run test` (75 arquivos, 273 testes), `bun run db:smoke:rls`, `bun run knip` e `bun run build`.
- 2026-07-08: PR 3/DB aplicou migrations aditivas criticas no endpoint runtime/main via `DATABASE_URL_DIRECT`; verificacao com `polaris_app` confirmou `sales.idempotency_key`, `sales_organization_idempotency_key_unique_idx` e `sessions_id_unique_idx`.
- 2026-07-08: PR 5/E2E ganhou preflight `scripts/check-e2e-db-schema.ts`; `bun run test:e2e` agora falha antes do Playwright quando o branch E2E esta atrasado, com mensagem acionavel dos objetos ausentes.
- 2026-07-08: PR 5/E2E foi desbloqueado no branch E2E via Neon MCP (`br-flat-cherry-acbnuhz4`): aplicados `sales.idempotency_key`, `sales_organization_idempotency_key_unique_idx` e `sessions_id_unique_idx`; `bun run test:e2e` passou com 9/9.
- 2026-07-08: PR 4/Perf ganhou `bun run db:analyze:listings`, que executa `EXPLAIN ANALYZE` read-only para listagens de produtos/vendas com contexto RLS e falha se dataset representativo nao usar o indice esperado.
- 2026-07-08: PR 4/Perf validou o script com tenant inexistente: `listing-plan-analysis-ok`, role `polaris_app`, `runtimeRoleBypassRls=false`, indices esperados nos planos e `skipped-small-dataset` por volume zero; `bun run check`, `bun run test` (78 arquivos/288 testes) e `bun run knip` passaram.
- 2026-07-08: PR 4/Perf manteve `db:analyze:listings` como diagnostico opcional local/ops; ele nao e gate de `prod:preflight` nem exige secret no GitHub Actions.
- 2026-07-08: PR 7/deploy ganhou `bun run deploy:smoke` para validar `/api/health`, `/sign-in`, redirect Google OAuth, bootstrap 403 e health R2 opcional em URL publica; job manual `deployment-smoke` foi adicionado e coberto por `src/lib/ci-workflow.test.ts`.
- 2026-07-08: PR 7/deploy simplificou os gates de producao: `prod:preflight` exige `DEPLOYMENT_SMOKE_URL`, mas nao cria alias para `CRON_SECRET` nem exige tenant de performance; `deployment-smoke` usa o `CRON_SECRET` existente quando validar R2.
- 2026-07-07: PR 2 consolidou guardrail de arquitetura: arquivos runtime em `src/app` agora tem teste global contra import direto de `@/db` e subpaths.
- 2026-07-07: PR 2 reforcou contexto de app: organizacao inativa retorna contexto nulo e nao reescreve a organizacao ativa da sessao.
- 2026-07-07: PR 4/Perf avancou em indices de listagem: produtos ativos/arquivados e vendas agora tem indices cobrindo paginacao seek por organizacao.
- 2026-07-07: PR 6 teve documentacao reconciliada com o codigo: modal de taxas ja usa rascunho local com cancelar/aplicar; pendencia restante e E2E/smoke.
- 2026-07-06: PR 3 iniciado. `STOCK-001` corrigido: entrada de estoque em produto arquivado agora limpa `archivedAt` e reativa o produto.
- 2026-07-06: PR 3 avancou em `DB-002`: banco agora rejeita venda de cartao com `payment_fee_payer = not_applicable`, com migration e precheck de dados legados.
- 2026-07-06: PR 3 avancou em `GOAL-001`: banco agora limita a uma meta ativa por organizacao com indice unico parcial e precheck de dados legados.
- 2026-07-06: PR 3 fechou decisao de idempotency key de venda: formulario envia UUID por tentativa, action retorna venda existente para chave repetida e banco garante unicidade por organizacao quando a chave existe.
- 2026-07-06: PR 3 reforcou idempotency de venda em corrida: conflito unico `23505` no insert agora busca a venda vencedora e retorna o ID sem auditar/revalidar de novo.
- 2026-07-06: PR 8 iniciado em cleanup seguro: export morto `getDb` de `src/db/index.ts` removido, deixando o helper privado ao proxy `db`.
- 2026-07-06: PR 8 reduziu acoplamento de tipos: `ProductStatusFilter` e `SaleStatusFilter` sairam de `app/**/queries` para contracts de dominio, removendo imports de `queries` pelos componentes.
- 2026-07-06: PR 8 moveu queries de listagem/detalhe de produtos e vendas para `src/features/**/queries.ts`, deixando o App Router apenas como composicao/paginacao.
- 2026-07-07: PR 8 reduziu acoplamento de paginacao: actions de carregar mais produtos/vendas sairam de `src/app/**/pagination` para `features`, removendo tambem os wrappers finos e mantendo guardrail estrutural contra qualquer novo `src/app/**/pagination.ts`.
- 2026-07-07: PR 8 reduziu acoplamento de settings: actions de metas sairam de `src/app/(app)/metas/actions` para `features/goals/actions`, removendo o arquivo morto em `app` e mantendo guardrail estrutural nos componentes.
- 2026-07-07: PR 8 reduziu acoplamento de catalogo: actions de configuracoes/categorias sairam de `src/app/(app)/configuracoes/actions` para `features/catalog/actions`, removendo arquivo morto e mantendo guardrail estrutural no painel de settings.
- 2026-07-07: PR 8 reduziu acoplamento de vendas: actions de criar/cancelar venda sairam de `src/app/(app)/vendas/actions` para `features/sales/actions`, removendo arquivo morto e mantendo guardrail estrutural nos componentes.
- 2026-07-07: PR 8 reduziu acoplamento de produtos: actions de produto/estoque/imagem sairam de `src/app/(app)/produtos/actions` para `features/products/actions`, removendo arquivo morto e mantendo guardrail estrutural nos componentes.
- 2026-07-07: PR 8 reduziu acoplamento de onboarding: action de criacao inicial de organizacao saiu de `src/app/(auth)/onboarding/actions` para `features/onboarding/actions`, removendo arquivo morto e mantendo guardrail no formulario client.
- 2026-07-07: PR 8 reduziu acoplamento da shell autenticada: action de logout saiu de `src/app/(app)/actions` para `features/auth/actions`, removendo o ultimo `actions.ts` da area autenticada em `app` e mantendo guardrail no layout.
- 2026-07-07: PR 8 completou a realocacao dos testes de server actions: `actions.test.ts` de catalogo, metas, produtos, vendas e onboarding sairam de `src/app` para `features`, com guardrail estrutural contra regressao.
- 2026-07-07: PR 8 consolidou o guardrail de componentes: qualquer import de `@/app` em `src/components` agora falha em uma regra estrutural unica.
- 2026-07-07: PR 8 reforcou o boundary do App Router: qualquer novo `src/app/**/actions.ts` agora falha no guardrail estrutural.
- 2026-07-07: PR 8 reforcou o boundary de dominio: qualquer import de `@/app` em `src/features` agora falha em teste estrutural.
- 2026-07-07: PR 8 reforcou separacao dominio/UI: `src/features` tambem nao pode importar `@/components`.
- 2026-07-07: PR 8 reforcou server actions de dominio: `src/features/**/actions.ts` nao pode importar `@/db`, mantendo persistencia em camadas server/domain.
- 2026-07-07: PR 8 reforcou o boundary de infra compartilhada: runtime em `src/lib` nao pode importar `@/app`.
- 2026-07-07: PR 8 removeu acoplamento reverso de `src/lib` para `features`: `OTHERS_CATEGORY_KEY` virou default compartilhado em `src/lib/catalog-defaults.ts` e runtime de `src/lib` nao pode importar `@/features`.
- 2026-07-07: PR 8 reforcou boundaries de base: componentes nao podem importar `@/db`, e `src/db` nao pode depender de `app`, `components` ou `features`.
- 2026-07-07: PR 8 reduziu duplicacao dos guardrails estruturais com helper compartilhado para listagem/leitura de arquivos em testes de boundary.
- 2026-07-07: PR 8 reforcou os guardrails de import: regras de boundary agora cobrem imports estaticos, side-effect imports e imports dinamicos (`import("...")`) para evitar bypass simples.
- 2026-07-07: PR 8 consolidou a regex de imports internos em helper testado diretamente, cobrindo formas estaticas, dinamicas e side-effect sem duplicacao por boundary.
- 2026-07-07: PR 6/QA reconciliou as evidencias atuais apos confirmacao destrutiva de categoria e consolidacao de guardrail: suite local passou com 69 arquivos e 251 testes.
- 2026-07-06: PR 6 iniciado em UX critica: botoes "carregar mais" de produtos e vendas agora exibem toast de erro e liberam o estado de loading quando a paginacao falha.
- 2026-07-06: PR 6 avancou em taxas de cartao: modal de parcelas agora edita rascunho local, permite cancelar sem persistir no estado principal e exige "Aplicar taxas" antes do "Salvar cartao".
- 2026-07-06: PR 6 avancou em acessibilidade: buscas de produtos/vendas e filtro de status de vendas agora tem nomes acessiveis explicitos.
- 2026-07-07: PR 6 avancou em onboarding: validacao invalida agora retorna erro recuperavel, o formulario anuncia a falha com `aria-live` e desabilita controles durante pending.
- 2026-07-07: PR 6 reforcou acoes destrutivas: exclusao de categoria customizada agora abre confirmacao explicita antes de chamar a action de remocao.
- 2026-07-06: PR 5 iniciado em CI/E2E: GitHub Actions agora tem job `e2e` com Playwright, dependente de `E2E_DATABASE_URL` em secret para impedir uso acidental de banco compartilhado.
- 2026-07-06: PR 9 iniciado em produto pos-MVP: `docs/roadmap.md` criado com ordem para convites, billing, exportacao, admin/suporte, LGPD e relatorios sem misturar com hardening.
- Pendencias antes de declarar PR 2 completo: atualizar `DATABASE_URL` do deploy para a role runtime `polaris_app`, ampliar provas tenant A vs tenant B para outros actions/route handlers e rodar job manual `rls-smoke`/`bun run db:smoke:rls` no ambiente promovido.
- PR 3 implementado no codigo; objetos criticos de sessao, idempotency, financeiro, metas e listagem foram confirmados no Neon main via MCP/read-only. Antes de tratar como totalmente pronto para deploy real, ainda falta smoke no deploy promovido e rodar `db:analyze:listings` com dataset representativo.
- PR 7 implementado localmente. Antes de tratar como pronto para deploy real, ainda falta validar `vercel env run -e production -- bun run build` com envs reais, smoke checks no preview/producao, limites reais do Upstash e quais headers de IP sao confiaveis na borda.

**Ordem Recomendada**
1. PR 1 pode ser pulado se continuarmos aceitando que não há P0 confirmado.
2. PR 2 e PR 7 vêm antes de clientes reais porque reduzem risco de vazamento/bypass.
3. PR 3 corrige risco operacional financeiro.
4. PR 4 e PR 5 solidificam regressão.
5. PR 6 melhora uso diário.
6. PR 8 reduz dívida técnica sem misturar com fixes críticos.
7. PR 9 fica pós-MVP.

**PR 1: P0 Bloqueadores**
Objetivo: validar se existe algum P0 real antes de mexer no código.

Achados endereçados:
- Nenhum P0 confirmado no relatório.
- Se você decidir reclassificar algo, candidatos: `DB-001`, `SEC-001`, `RACE-001`, `R2-001`.

Arquivos prováveis:
- Nenhum, salvo se houver reclassificação.
- Possível doc de tracking: `docs/Resumo executivo.md` ou novo checklist, somente se autorizado.

Risco: baixo se for PR vazio/validação; alto se misturar P1 aqui.

Testes exigidos:
- `bun run check`
- `bun run test`
- `bun run build`

Critério de aceite:
- Confirmação explícita: “sem P0 confirmado neste snapshot”.
- Nenhum código alterado neste PR, a menos que você reclassifique P1 como P0.

Ordem: primeiro, ou skip formal.

**PR 2: Multi-Tenancy, Autorização e IDOR**
Objetivo: fechar riscos de isolamento, sessão e autorização.

Achados endereçados:
- `DB-001`: `sessions.id` sem PK/unique.
- `TENANT-001`: isolamento só em app code, sem RLS.
- `RACE-001`: onboarding pode criar múltiplas orgs.
- rota de imagem ignora `organization.status`.
- atores não tenant-scoped em algumas FKs.

Arquivos prováveis:
- `src/db/schema.ts`
- `src/db/migrations/*`
- `src/lib/app-session.ts`
- `src/app/api/product-images/[organizationId]/[productId]/[version]/[variant]/route.ts`
- `src/features/onboarding/actions.ts`
- `src/app/api/**/route.test.ts`
- `src/lib/app-context.test.ts`

Risco: alto. Migration de sessão/membership precisa checar dados existentes antes.

Testes exigidos:
- Vitest para sessão, onboarding concorrente, org inativa em imagens.
- Testes tenant A vs tenant B para actions/route handlers.
- Migration dry-run em branch Neon de preview.

Critério de aceite:
- `sessions.id` único.
- onboarding concorrente gera uma organização só.
- imagem de org inativa retorna 404/403.
- IDs de outro tenant não acessam dados.

Ordem: antes de domínio e UX.

**PR 3: Estoque, Vendas, Cancelamentos e Estornos**
Objetivo: corrigir riscos operacionais financeiros sem mexer em UX ampla.

Achados endereçados:
- `STOCK-001`: entrada de estoque não reativa produto arquivado.
- `DB-002`: DB permite `card + not_applicable`.
- `GOAL-001`: uma meta ativa só por regra de aplicação.
- risco de venda duplicada por retry/duplo submit sem idempotency key.

Arquivos prováveis:
- `src/features/products/actions.ts`
- `src/features/products/stock.ts`
- `src/features/sales/schema.ts`
- `src/features/sales/calculations.ts`
- `src/features/goals/server.ts`
- `src/db/schema.ts`
- `src/db/migrations/*`

Risco: médio-alto. Mexe em invariantes financeiras.

Testes exigidos:
- entrada em produto arquivado limpa `archivedAt`.
- `card + not_applicable` rejeitado no DB.
- duas metas ativas simultâneas: uma falha.
- cancelamento continua idempotente ou falha de forma clara.

Critério de aceite:
- estoque, venda e meta têm invariantes no banco ou em lock/transação.
- testes de domínio passam.

Status local:
- estoque em produto arquivado reativa o produto.
- taxa de cartão inválida é bloqueada também por constraint.
- meta ativa por organização tem índice parcial único.
- venda com mesma idempotency key retorna a venda vencedora em retry concorrente.

Pendente externo:
- objetos criticos de `sessions.id`, idempotency, financeiro, metas e listagem ja foram confirmados no Neon main via MCP/read-only.
- ainda falta smoke no deploy real e `bun run db:analyze:listings` com dataset representativo.

Ordem: depois de PR 2.

**PR 4: Testes de Domínio com Vitest**
Objetivo: aumentar cobertura de regras críticas sem depender de navegador.

Achados endereçados:
- regressões em estoque, vendas, cartão, metas, onboarding, R2.
- lacunas de concorrência e validação de DB.

Arquivos prováveis:
- `src/features/products/actions.test.ts`
- `src/features/sales/actions.test.ts`
- `src/features/goals/actions.test.ts`
- `src/app/api/product-images/**/*.test.ts`
- `src/lib/env.test.ts`
- `src/features/**/**/*.test.ts`

Risco: médio. Pode exigir melhor isolamento/mocks.

Testes exigidos:
- `bun run test`
- focados por arquivo durante implementação.

Critério de aceite:
- testes falhariam no comportamento antigo.
- cobertura dos P1/P2 críticos adicionada.
- suite Vitest verde.

Ordem: depois de PR 3, ou junto com PRs anteriores se usar TDD por PR.

**PR 5: E2E Críticos com Playwright**
Objetivo: validar fluxos reais com banco Neon isolado.

Achados endereçados:
- `TEST-001`: E2E não rodado por ausência de `E2E_DATABASE_URL`.
- fluxos produto → estoque → venda → cancelamento → arquivamento.
- upload de imagem.
- taxas de cartão.
- onboarding.

Arquivos prováveis:
- `playwright.config.ts`
- `tests/e2e/*.e2e.ts`
- `tests/e2e/helpers.ts`
- `.github/workflows/ci.yml`
- `docs/database-environments.md`

Risco: médio. Principal risco é poluir banco se `E2E_DATABASE_URL` faltar.

Testes exigidos:
- `bun run test:e2e` com `E2E_DATABASE_URL` no CI/preview.
- CI deve falhar se tentar rodar E2E sem branch isolada.

Critério de aceite:
- Playwright roda contra branch Neon E2E.
- CI documenta e/ou executa E2E crítico.
- nenhum teste usa banco de produção/preview compartilhado por acidente.

Status local:
- preflight `scripts/check-e2e-db-schema.ts` valida schema critico antes do Playwright.
- branch E2E `br-flat-cherry-acbnuhz4` foi alinhado via Neon MCP em 2026-07-08.
- `bun run test:e2e` passou localmente com 9/9 testes; ainda falta execucao no CI/preview com secrets reais.

Ordem: depois de PR 4.

**PR 6: UX Crítica, Estados e Validações**
Objetivo: reduzir erro operacional de usuário em fluxos financeiros.

Achados endereçados:
- `UX-001`: modal de taxas sem ação clara de salvar.
- paginação “carregar mais” falha sem feedback.
- onboarding sem pending/erro recuperável.
- filtros/search sem labels adequados.
- ações destrutivas sem confirmação suficiente em categorias.

Arquivos prováveis:
- `src/components/settings/catalog-settings-panel.tsx`
- `src/components/products/products-panel.tsx`
- `src/components/sales/sales-panel.tsx`
- `src/components/sales/create-sale-dialog.tsx`
- `src/app/(auth)/onboarding/page.tsx`
- `src/features/onboarding/actions.ts`

Risco: médio. Pode afetar E2E por nomes acessíveis e textos.

Testes exigidos:
- Vitest onde houver lógica isolada.
- Playwright para taxa de cartão, onboarding e erro em paginação.
- `bun run check`

Critério de aceite:
- taxa só persiste por ação explícita.
- errors/loading/empty states são claros.
- controles têm nomes acessíveis.
- ações destrutivas pedem confirmação.

Status local:
- modal de taxas usa rascunho local com cancelar/aplicar antes do save.
- paginação de produtos/vendas exibe erro e libera loading.
- onboarding retorna erro recuperável de validação e mostra pending no formulário.
- exclusão de categoria customizada exige confirmação explícita antes da action destrutiva.

Pendente externo:
- E2E/smoke para taxas, onboarding, paginação e exclusão de categoria com banco isolado.

Ordem: depois de PR 5 para ter E2E protegendo regressão.

**PR 7: Observabilidade, Env, Health Checks e Produção**
Objetivo: endurecer produção e reduzir falhas silenciosas.

Achados endereçados:
- `SEC-001`: bootstrap prod-like.
- `SEC-002`: secrets internos curtos.
- Sentry sem tracing/replays/alertas mínimos.
- health checks limitados.
- cron/reconcile sem guardrails de idade mínima.

Arquivos prováveis:
- `src/lib/env.ts`
- `src/lib/production-preflight.ts`
- `scripts/check-production-readiness.ts`
- `.github/workflows/ci.yml`
- `src/lib/ci-workflow.test.ts`
- `src/app/api/auth/dev/bootstrap-session/route.ts`
- `src/app/api/internal/health/r2/route.ts`
- `src/app/api/health/route.ts`
- `src/instrumentation.ts`
- `src/instrumentation-client.ts`
- `docs/deploy-vercel.md`
- `vercel.json`

Risco: médio. Mudanças em env podem quebrar deploy se secrets atuais forem fracos.

Testes exigidos:
- `src/lib/env.test.ts`
- `src/lib/production-preflight.test.ts`
- `src/lib/ci-workflow.test.ts`
- route tests para bootstrap/health.
- `bun run build` com env mínimo de CI.
- `vercel env run -e production -- bun run prod:preflight` com envs reais antes do deploy.
- job manual `production-preflight` com secrets reais antes do deploy.
- smoke checklist documentado.

Critério de aceite:
- production rejeita secrets fracos e Vercel Production rejeita ausencia de `CRON_SECRET`.
- bootstrap impossível em produção real.
- health checks úteis sem expor segredo/dados sensíveis.
- preflight de producao rejeita `DATABASE_URL` owner/admin, E2E com role owner/admin, URLs iguais entre runtime/migration/E2E, E2E compartilhando URL com `RLS_DATABASE_URL`, URLs Postgres sem `sslmode=verify-full`, ausencia de `RLS_DATABASE_URL`, bootstrap E2E ligado em Production, origens canonicas divergentes e envs obrigatorios de Google/R2/Upstash ausentes.
- deploy docs atualizados.

Ordem: pode vir logo após PR 2 se prioridade for segurança.

**PR 8: Refactors Técnicos Seguros**
Objetivo: reduzir acoplamento sem alterar comportamento.

Achados endereçados:
- regras de domínio pesadas em `src/app/**/actions.ts`.
- queries em route tree importadas por componentes.
- paginação read via Server Actions.
- `knip`: export não usado `getDb`.

Arquivos prováveis:
- `src/features/products/actions.ts`
- `src/features/sales/actions.ts`
- `src/features/products/queries.ts`
- `src/features/sales/queries.ts`
- `src/features/products/*`
- `src/features/sales/*`
- `src/db/index.ts`
- `knip.config.ts`

Risco: médio. Refactor amplo pode introduzir regressão se feito cedo demais.

Testes exigidos:
- `bun run test`
- `bun run check`
- `bun run build`
- `bun run knip`

Critério de aceite:
- comportamento idêntico.
- imports de `components -> app` removidos ou reduzidos.
- domínio fica em `features`.
- `knip` passa.

Ordem: depois dos fixes e testes.

**PR 9: Produto Pós-MVP**
Objetivo: planejar funcionalidades que não devem bloquear hardening inicial.

Achados endereçados:
- billing/planos ausente.
- suporte/admin ausente.
- exportação ausente.
- convites/multiusuário desativados.
- LGPD/privacidade/documentação de usuário parcial.
- relatórios e recebimentos pós-MVP.

Arquivos prováveis:
- `docs/roadmap.md`
- futuras áreas em `src/features/organization`
- futuras telas em `src/app/(app)/configuracoes`
- futuras APIs/admin ainda não existentes

Risco: baixo se for documentação; alto se implementar feature cedo demais.

Testes exigidos:
- Se documentação: revisão de consistência.
- Se feature: PRs separados, cada uma com Vitest/E2E próprios.

Critério de aceite:
- roadmap priorizado.
- itens claramente marcados como pós-MVP.
- nada crítico de segurança/financeiro misturado aqui.

Status local:
- `docs/roadmap.md` criado com corte pos-MVP. Nenhuma feature foi implementada nesta fatia.

Ordem: último.

**Resumo de Corte**
- PR 1: skip/validação, porque não há P0 confirmado.
- PR 2, 3, 7: produção real depende deles.
- PR 4, 5: provam que os fixes não regressam.
- PR 6: reduz erro operacional.
- PR 8: melhora manutenção.
- PR 9: produto depois do MVP.

