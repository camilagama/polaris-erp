
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
- `src/app/(auth)/onboarding/actions.ts`
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
- risco de venda duplicada sem idempotency key, se decidir incluir.

Arquivos prováveis:
- `src/app/(app)/produtos/actions.ts`
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

Ordem: depois de PR 2.

**PR 4: Testes de Domínio com Vitest**
Objetivo: aumentar cobertura de regras críticas sem depender de navegador.

Achados endereçados:
- regressões em estoque, vendas, cartão, metas, onboarding, R2.
- lacunas de concorrência e validação de DB.

Arquivos prováveis:
- `src/app/(app)/produtos/actions.test.ts`
- `src/app/(app)/vendas/actions.test.ts`
- `src/app/(app)/metas/actions.test.ts`
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
- `bun run test:e2e` com `E2E_DATABASE_URL`.
- CI deve falhar se tentar rodar E2E sem branch isolada.

Critério de aceite:
- Playwright roda contra branch Neon E2E.
- CI documenta e/ou executa E2E crítico.
- nenhum teste usa banco de produção/preview compartilhado por acidente.

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
- `src/app/(auth)/onboarding/actions.ts`

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
- route tests para bootstrap/health.
- `bun run build` com env mínimo de CI.
- smoke checklist documentado.

Critério de aceite:
- production rejeita secrets fracos.
- bootstrap impossível em produção real.
- health checks úteis sem expor segredo/dados sensíveis.
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
- `src/app/(app)/produtos/actions.ts`
- `src/app/(app)/vendas/actions.ts`
- `src/app/(app)/produtos/queries.ts`
- `src/app/(app)/vendas/queries.ts`
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
- `docs/roadmap.md` ou `docs/product-readiness.md`
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

Ordem: último.

**Resumo de Corte**
- PR 1: skip/validação, porque não há P0 confirmado.
- PR 2, 3, 7: produção real depende deles.
- PR 4, 5: provam que os fixes não regressam.
- PR 6: reduz erro operacional.
- PR 8: melhora manutenção.
- PR 9: produto depois do MVP.

