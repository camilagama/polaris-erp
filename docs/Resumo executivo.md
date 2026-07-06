**1. Resumo Executivo**
Status de execucao em 2026-07-06:
- PR 1: validado como skip/sem P0 confirmado neste snapshot.
- PR 2: iniciado. `DB-001`, parte de `RACE-001` e rota de imagem com organizacao ativa foram enderecados nesta fatia.
- PR 2: atores em audit/price changes/goals agora sao tenant-scoped por FK composta contra membership.
- PR 2: convites tambem passam a exigir inviter pertencente a mesma organizacao via FK composta.
- PR 2: arquivar/desarquivar produto agora detecta zero linhas alteradas para bloquear sucesso falso com ID de outro tenant.
- PR 2: remocao de imagem de produto agora falha para produto inexistente/outro tenant em vez de retornar sucesso.
- PR 2: update/delete de categoria agora confirmam linha afetada e evitam auditoria/revalidacao em categoria inexistente/outro tenant.
- PR 2: update/archive/unarchive de metas agora confirmam linha afetada e evitam auditoria/refresh em meta inexistente/outro tenant.
- PR 2/R2: replace de imagem agora desfaz a nova versao quando perde a corrida de update condicional.
- PR 2/R2: reconcile de imagens agora preserva uploads recentes antes de limpar orfaos.
- PR 7: iniciado parcialmente. `SEC-001` e `SEC-002` foram enderecados nesta fatia.
- PR 7: `/api/health` agora verifica banco e retorna 503 em falha sem expor detalhes sensiveis.
- PR 7: Sentry agora tem tracing/replay configuravel e replay em erro no client.
- PR 7: runbook de deploy Vercel atualizado com envs, guardrails, cron, health checks e smoke checklist.
- PR 7: `CRON_SECRET` agora e obrigatorio em Vercel Production para proteger endpoints internos acionados por cron, sem quebrar build local.
- PR 3: iniciado. Entrada de estoque agora reativa produto arquivado ao limpar `archivedAt`.
- PR 3: banco agora rejeita venda de cartao com `payment_fee_payer = not_applicable`.
- PR 3: banco agora limita a uma meta ativa por organizacao com indice unico parcial.
- PR 3: venda agora usa idempotency key opcional para evitar duplicacao por retry/duplo submit.
- Ainda nao declarar producao pronta: PR 2/3/5/7 seguem com pendencias relevantes.

Veredito: **quase pronto para piloto controlado, não recomendado para produção self-serve aberta ainda**.

Maturidade estimada: **72/100**. Confiança: **média-alta**. Limites: não rodei Playwright porque `E2E_DATABASE_URL` está ausente; não rodei migrações contra banco real; 4 subagents bateram limite de uso e foram cobertos manualmente.

Forças reais:
- Multi-tenancy aplicado na maioria das queries e mutations via `organizationId`.
- Vendas/estoque usam transações e `FOR UPDATE`.
- Dinheiro usa `numeric(12,2)` no banco e validações server-side.
- R2 não expõe URL pública direta; imagens passam por rota autenticada.
- `bun run check`, `bun run test` e `bun run build` passaram.

Top bloqueadores antes de clientes reais:
1. `sessions.id` sem PK/unique.
2. Bootstrap interno pode ser habilitado em preview/prod-like.
3. Corridas em onboarding, metas ativas e substituição/reconcile de imagens.
4. Falta de constraint para “1 meta ativa” e “1 membership por usuário” se essa for a regra.
5. Playwright não verificado com banco isolado neste ambiente.

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
- `bun run check` => passou, 218 arquivos.
- `bun run test` => passou, 39 arquivos, 146 testes.
- `bun run build` => passou.
- `bun run knip` => falhou: export não usado `getDb` em `src/db/index.ts:27`.
- `bun run test:e2e` => não executado; `E2E_DATABASE_URL=missing`.

**3. Achados Priorizados**
`DB-001` P1, Banco/Auth  
Evidência: [schema.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/db/schema.ts:56>), migration cria unique só em `sessions.token`.  
Status: Confirmado no código.  
Descrição: `sessions.id` não é PK/unique, mas é usado para atualizar sessão ativa em [app-session.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/lib/app-session.ts:94>).  
Impacto: IDs duplicados podem alterar múltiplas sessões.  
Correção: adicionar PK/unique após checar duplicatas.  
Teste: migration/teste SQL rejeitando dois `sessions.id`.

`SEC-001` P1, Auth/Operação  
Evidência: [route.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/app/api/auth/dev/bootstrap-session/route.ts:10>) e [route.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/app/api/auth/dev/bootstrap-session/route.ts:150>).  
Status: Confirmado no código.  
Descrição: bootstrap interno cria usuário verificado e sessão se `ALLOW_PLAYWRIGHT_BOOTSTRAP=true` em prod-like preview.  
Impacto: bypass de Google OAuth se segredo vazar/fraco.  
Correção: negar sempre em `NODE_ENV=production`, ou restringir a CI/banco isolado com token curto e allowlist.  
Teste: preview/prod-like deve retornar 403 e não criar sessão.

`TENANT-001` P1, Multi-tenancy  
Evidência: ausência de RLS; isolamento está em app code. Schema tenant em [schema.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/db/schema.ts:303>).  
Status: Não encontrado RLS.  
Impacto: uma query futura sem filtro `organizationId` pode vazar dados.  
Correção: planejar RLS ou camada obrigatória de tenant-scoped repository.  
Teste: tenant A não lê/escreve tenant B mesmo com query sem filtro de app.

`RACE-001` P1, Onboarding/SaaS  
Evidência: `createInitialOrganizationForUser` faz select depois insert sem unique global por usuário em [app-session.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/lib/app-session.ts:196>) e [schema.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/db/schema.ts:124>).  
Status: Confirmado no código.  
Impacto: duplo submit pode criar duas organizações para o mesmo owner.  
Correção: unique em `member.userId` se membership única é regra, ou lock/advisory lock por usuário.  
Teste: duas chamadas paralelas de onboarding => uma org apenas.

`R2-001` P1, Imagens/R2  
Evidência: upload final antes do DB em [image-workflow.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/features/products/image-workflow.ts:45>); update condicional sem checar row count em [actions.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/app/(app)/produtos/actions.ts:287>); reconcile apaga não referenciadas em [route.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/app/api/internal/product-images/reconcile/route.ts:59>).  
Status: Confirmado no código.  
Impacto: imagem pode virar 404 ou metadado inconsistente em corrida.  
Correção: estado `pending`, idade mínima no reconcile, `returning` no update e rollback da nova versão se conflito.  
Teste: replace simultâneo e replace vs reconcile.

`GOAL-001` P2, Metas  
Evidência: `MAX_ACTIVE_GOALS = 1`; count-then-insert em [server.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/features/goals/server.ts:240>); índice não único em [schema.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/db/schema.ts:702>).  
Status: Confirmado no código.  
Impacto: duas metas ativas por corrida.  
Correção: unique partial index por organização onde `status='active'`.  
Teste: `Promise.allSettled` de duas criações.

`STOCK-001` P2, Estoque  
Evidência: regra diz que entrada reativa produto arquivado; action atualiza só custo/estoque em [actions.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/app/(app)/produtos/actions.ts:396>).  
Status: Confirmado no código/docs.  
Impacto: produto reposto continua invisível para venda.  
Correção: entrada de estoque deve setar `archivedAt: null`.  
Teste: entrada em arquivado volta para vendas.

`DB-002` P2, Integridade  
Evidência: `paymentFeePayer` permite `card + not_applicable` no DB em [schema.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/db/schema.ts:564>), embora schema/action rejeitem.  
Status: Confirmado no código.  
Impacto: import/manual SQL pode quebrar métricas financeiras.  
Correção: check DB exigindo `seller|customer` para cartão.  
Teste: migration rejeita estado inválido.

`SEC-002` P2, Secrets  
Evidência: validação de `CRON_SECRET` e `INTERNAL_BOOTSTRAP_SECRET` em [env.ts](</c:/Users/Junior/Documents/0 - Dev/Hub Imports/src/lib/env.ts:24>).  
Status: Corrigido localmente.  
Impacto: segredo curto protege endpoints internos destrutivos/sensíveis.  
Correção: `CRON_SECRET` obrigatório em `VERCEL_ENV=production`; secrets internos presentes precisam ter pelo menos 32 caracteres em `NODE_ENV=production`.  
Teste: env production rejeita segredo curto; Vercel Production rejeita ausencia de `CRON_SECRET`; build local sem `VERCEL_ENV` continua aceito.

`PERF-001` P2, Listagens  
Evidência: produtos ordenam por `organizationId/name/createdAt/id`, mas índice ativo é só `name`; vendas ordenam `occurredOn/createdAt/id`, índice não inclui `id`.  
Status: Confirmado por schema/query.  
Impacto: degrada com volume real.  
Correção: índices compostos alinhados à paginação.  
Teste: `EXPLAIN ANALYZE` com dataset multi-tenant.

`UX-001` P2, Taxas de cartão  
Evidência: modal edita taxas em `catalog-settings-panel.tsx`, mas salvar real fica fora do modal.  
Status: Confirmado por subagent.  
Impacto: operador pode acreditar que taxa foi salva, causando venda com taxa errada.  
Correção: salvar/cancelar dentro do modal e estado “alterações não salvas”.  
Teste: E2E fechar modal sem salvar e recarregar.

`TEST-001` P2, E2E  
Evidência: `playwright.config.ts` exige `E2E_DATABASE_URL` em CI; env local está ausente.  
Status: Confirmado por comando.  
Impacto: fluxos críticos não foram validados nesta auditoria.  
Correção: configurar branch Neon E2E e rodar `bun run test:e2e`.  

**4. Checklist Produção**
- Auth/Google/Better Auth: Parcial. Produção exige Google e secret forte; bootstrap preview é risco. P1.
- Sessões/cookies: Parcial. `sessions.id` sem unique. P1.
- Organizações: Parcial. Onboarding tem corrida. P1.
- Multi-tenancy: Parcial. Filtros bons no app, sem RLS. P1.
- RBAC: Parcial. Roles existem, multiusuário/convites desativados. P2.
- Server actions/APIs: Parcial. Boa checagem de contexto, mas bootstrap/internal hardening faltando. P1/P2.
- IDOR: OK nos fluxos revisados. Produtos, imagens, categorias e metas agora tem provas contra sucesso falso em recurso inexistente/outro tenant.
- R2 upload/serve: Parcial. Boa autorização, corrida em replace/reconcile. P1.
- Rate limit: Parcial. Upstash fail-closed em prod, IP spoof possível via header. P3.
- Catálogo/estoque/vendas: Parcial. Núcleo bom; falta reativação por entrada e constraints extras. P2.
- Cancelamento/estorno: OK no fluxo normal. Usa lock e estorna estoque.
- Metas: Parcial. Regra de 1 ativa sem constraint. P2.
- Logs/Sentry: Parcial. Errors, tracing e replay em erro configurados; alertas ainda precisam ser definidos na plataforma. P3.
- Backups/rollback: Parcial. Docs existem; execução não verificada. P2.
- Tests unit/integration: OK razoável. 146 passando.
- E2E: Parcial/não verificado localmente. P2.
- CI/CD: Parcial. CI não roda E2E nem knip. P2.
- LGPD/privacidade/suporte/admin/billing: Ausente/parcial. P2/P3.

**5. Domínio Revenda**
Implementado aceitável: produtos, categorias simples, custo médio, estoque atual, entradas, baixas, venda multi-item, taxa cartão vendedor/cliente, cancelamento com estorno, metas básicas, imagens R2.

Parcial: relatórios, auditoria operacional consultável, exportação, reposição de produto arquivado, consistência DB para cartão, métricas avançadas, conciliação financeira.

Ausente/pós-MVP: billing, planos, suporte/admin, importação CSV, recebimentos, variações/SKU formal, permissões granulares, exportação de dados, termos/privacidade/LGPD operacional.

**6. Riscos Financeiros e Operacionais**
- Estoque errado: baixo no fluxo normal; médio por entrada em arquivado não reativar.
- Venda duplicada: não confirmada; sem idempotency key.
- Venda sem baixa: mitigado por transação.
- Baixa sem venda: fluxo existe por baixa operacional, OK.
- Cancelamento inconsistente: mitigado por lock e status.
- Estorno inconsistente: risco se produto removido fisicamente via DB.
- Taxa errada: risco UX no modal e constraint DB permissiva.
- Lucro/margem errado: risco em dados DB inválidos e métricas divergentes.
- Vazamento entre orgs: sem IDOR confirmado, mas sem RLS.
- Imagem perdida/órfã: risco confirmado por corrida replace/reconcile.
- Auditoria ruim: login pré-tenant cai em org padrão.

**7. Roadmap Recomendado**
Antes de produção:
1. Corrigir `sessions.id`.
2. Fechar bootstrap em prod-like.
3. Segredos mínimos fortes.
4. Unique/lock para onboarding e metas.
5. Corrigir corrida de imagem.
6. Rodar Playwright com Neon branch isolada.

Estabilizar MVP:
- Índices de paginação.
- Reativar arquivado em entrada de estoque.
- Corrigir modal de taxas.
- Adicionar constraints financeiras.
- Melhorar erros/pending no onboarding e paginação.

Pós-MVP:
- Convites/membros reais.
- Billing/planos.
- Exportação.
- Admin/support tooling.
- RLS ou camada tenant hardening.
- Observabilidade com alertas.

**8. Plano de Correção**
Fase 0, P0/P1:
- `src/db/schema.ts`, migration: unique/PK em `sessions.id`.
- `src/app/api/auth/dev/bootstrap-session/route.ts`: bloquear prod-like.
- `src/lib/env.ts`: validar secrets fortes.
Aceite: testes env/auth passando; bootstrap 403 em prod-like.

Fase 1, tenant/dados:
- Unique ou lock para `member.userId`.
- Unique partial para `goals active`.
- Considerar RLS ou camada repository.
Aceite: testes concorrentes provam uma org/meta.

Fase 2, estoque/venda/R2:
- `addProductStockAction` limpa `archivedAt`.
- R2 replace com row count/rollback.
- DB check `card` exige pagador.
Aceite: testes de corrida e domínio.

Fase 3, UX:
- Modal de taxa com salvar/cancelar.
- Onboarding com pending/erro inline.
- Paginação com toast/retry.
Aceite: E2E cobrindo erro e persistência.

Fase 4, QA/ops:
- Rodar `bun run test:e2e` com `E2E_DATABASE_URL`.
- Adicionar E2E ao CI ou workflow nightly.
- Corrigir `knip`.
Aceite: CI inclui check/test/build/E2E isolado.

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
5. “Corrija estoque em produto arquivado e constraint de taxa de cartão.”
6. “Configure e rode Playwright com `E2E_DATABASE_URL` isolado.”
7. “Crie checklist final de deploy para produção.”
