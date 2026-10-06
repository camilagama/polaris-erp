# Migrations Drizzle

**Status:** inventário local atualizado para incluir a migration P58 `20261001220238_long_hammerhead.sql`; ela ainda não foi aplicada a nenhum banco nesta etapa. A revisão remota documentada em `886eda0` é um snapshot anterior e não prova o estado atual de qualquer ambiente.

O procedimento canônico para Production está em [Migrations de Production](../runbooks/production-migrations.md). Na revisão de 2026-09-29, a operação separada estava preparada na PR #2, ainda não integrada à `main`; credenciais/alvo não foram configurados nem migrations de Production executadas. Consulte P43 para o estado operacional vigente.

Drizzle lê `packages/db/src/schema.ts`, grava migrations em `packages/db/src/migrations/` e registra aplicação em `drizzle.__drizzle_migrations__`. `db:migrate` exige a URL direta; não foi executado nesta tarefa.

| Marco | Migrations | Efeito relevante |
| --- | --- | --- |
| Base | `20260704051610_initial.sql` e incrementais de 06/07 | auth, domínio ERP, FKs, checks e índices iniciais |
| RLS tenant | `20260707205000_rls_tenant_isolation.sql` | RLS/FORCE para 13 tabelas |
| Plataforma/eventos/billing | migrations de 09/07 | tabelas platform, outbox/webhook/e-mail e billing |
| Billing RLS | `20260710041000_billing_rls_platform_admin.sql` | RLS/FORCE nas cinco tabelas billing tenant-scoped |
| Seed e busca | `20260710052000_seed_initial_billing_plan.sql`, `20260710115000_add_trigram_search_indexes.sql` | plano inicial idempotente e `pg_trgm` |
| Outbox e identidade | migrations de 10/07 a 14/07 | status `observed`, normalização técnica, validação platform admin e leases |
| P58 — consultas temporais de eventos | `20261001220238_long_hammerhead.sql` | índices B-tree em `created_at` para Outbox/Webhooks e alinhamento de seis nomes de FK com o schema Drizzle, sem mudar relações |

Há DML versionado: seed de plano, normalização de identidade de organização e atualização de eventos capture-only. Esses efeitos devem ser tratados como parte das migrations, não como comportamento que este documento executou.

## `db:push` local

`db:push` só aceita a URL dedicada `DATABASE_URL_PUSH_LOCAL` para PostgreSQL loopback e banco scratch `polaris_push_scratch`. Use uma instância realmente descartável; o guard verifica host e nome do banco, mas não consegue provar o ciclo de vida do servidor. O banco comportamental `polaris_behavior`, E2E e qualquer alvo remoto não são destinos de `db:push`. Para toda branch remota, inclusive Neon temporária, use `db:generate`, SQL versionado/revisado e `db:migrate`. A regra operacional completa está em [`packages/db/AGENTS.md`](../../packages/db/AGENTS.md).

## Drift e validação

O journal Drizzle e snapshots em `packages/db/src/migrations/meta/` mostram a sequência local; eles não demonstram que uma branch Neon específica está no mesmo estado. Confirme metadados read-only de schema, policies, índices e `__drizzle_migrations__` antes de afirmar ausência de drift. Branch `dev` não é prova de produção.

`packages/db/src/postgres-behavior.test.ts` é a prova automatizada mais próxima: aplica todas as migrations em PostgreSQL descartável. A migration P58 acrescenta asserts para os dois índices e os seis nomes de FK. A suíte não foi executada nesta etapa porque `POSTGRES_BEHAVIOR_DATABASE_URL` não está configurada; não substitui uma certificação do ambiente promovido.

## Referências

- `packages/db/drizzle.config.ts`
- `packages/db/src/migrations/meta/_journal.json`
- `packages/db/src/postgres-behavior.test.ts`
