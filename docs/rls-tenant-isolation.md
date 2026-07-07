# RLS tenant isolation

## Decisao

RLS e obrigatorio antes de producao aberta.

O caminho aprovado e implementar isolamento em duas camadas:

1. Repository/app code continua filtrando por `organizationId`.
2. PostgreSQL RLS passa a ser a barreira obrigatoria no banco para tabelas tenant-scoped.

Essa decisao substitui o pendente anterior de "RLS ou repository tenant-scoped": repository sozinho nao e suficiente para producao.

## Evidencia atual

- Banco inspecionado em 2026-07-07: `neondb`.
- Projeto Neon inspecionado via plugin em 2026-07-07: `autumn-feather-14038163` (`polaris-erp`).
- Branch/compute main observado: `br-empty-frog-acrcn1aj` / `ep-quiet-mode-acv41t95`.
- Role proprietaria/migration: `neondb_owner`.
- Role runtime criada em 2026-07-07: `polaris_app`, sem `BYPASSRLS`.
- PostgreSQL: `18.4`.
- Policies existentes em `public.pg_policies`: 14 apos a migration RLS.
- Tabelas tenant-scoped com `ENABLE ROW LEVEL SECURITY` e `FORCE ROW LEVEL SECURITY`: 13/13.
- App usa `pg.Pool` via `drizzle-orm/node-postgres` em `src/db/index.ts`.
- `DATABASE_URL` local foi atualizado para o role runtime `polaris_app`; `DATABASE_URL_DIRECT` permanece para migrations com `neondb_owner`.

## Docs consultadas

- PostgreSQL current: Row Level Security e `CREATE POLICY`.
- Neon docs via ctx7: branching temporario/schema-only para testar schema sem aplicar direto em producao.

## Arquitetura escolhida

As policies devem usar tenant de transacao, nao estado de sessao solto.

Motivo: em ambiente serverless/pooler, um `SET` de sessao pode vazar entre requests se usado incorretamente. O padrao seguro e executar queries tenant-scoped dentro de uma transacao que define:

```sql
select set_config('app.organization_id', '<organization-id>', true);
```

O terceiro argumento `true` limita o valor a transacao atual. As policies consultam:

```sql
current_setting('app.organization_id', true)
```

Se o valor nao existir, a policy deve negar acesso por padrao.

Jobs internos sem tenant unico precisam de contexto proprio e explicito. O reconcile de imagens usa:

```sql
select set_config('app.internal_job', 'product_image_reconcile', true);
```

Policies podem permitir apenas as leituras necessarias para esse job quando `current_setting('app.internal_job', true) = 'product_image_reconcile'`. Esse caminho nao deve ser usado para fluxos de usuario.

## Escopo inicial de RLS

RLS deve cobrir tabelas com dados de organizacao:

- `organization`
- `member`
- `invitation`
- `audit_events`
- `categories`
- `system_settings`
- `products`
- `product_price_changes`
- `product_stock_entries`
- `product_stock_write_offs`
- `sales`
- `sale_items`
- `goals`

Auth base do Better Auth fica fora do primeiro corte:

- `users`
- `sessions`
- `accounts`
- `verifications`

Motivo: login, callback OAuth, criacao de sessao e onboarding pre-tenant precisam funcionar antes de existir organizacao ativa. A protecao desses fluxos continua em app code e FKs; RLS entra onde ha `organization_id` ou equivalencia direta com tenant.

## FORCE RLS

Como a aplicacao conectava como `neondb_owner`, habilitar RLS sem separar o runtime ainda deixava uma falha: `neondb_owner` tem `BYPASSRLS=true` no Neon e nao pode ser alterado pela propria conexao da aplicacao.

O corte aplicado no Neon main usa duas camadas:

1. Role runtime nao proprietaria `polaris_app`, sem `BYPASSRLS`, para `DATABASE_URL`.
2. `neondb_owner` preservado para `DATABASE_URL_DIRECT` e migrations.
3. `FORCE ROW LEVEL SECURITY` nas tabelas tenant-scoped.

Tentativa direta de `ALTER ROLE neondb_owner NOBYPASSRLS` falhou com `permission denied to alter role`; por isso a separacao de role runtime deixou de ser hardening posterior e virou requisito de producao.

## Sequencia segura

1. Criar testes locais que provam a migration RLS esperada.
2. Criar helper `withTenantDb(organizationId, callback)` que abre transacao, seta `app.organization_id` com `set_config(..., true)` e executa queries via `tx`.
3. Migrar reads/writes tenant-scoped para usarem o helper ou receberem `tx` ja tenant-scoped.
4. Criar migration com `ENABLE ROW LEVEL SECURITY`, policies e `FORCE ROW LEVEL SECURITY`.
5. Testar a migration em branch Neon temporaria.
6. Aplicar no Neon main somente junto do runtime RLS-aware.
7. Criar/trocar `DATABASE_URL` para uma role runtime sem `BYPASSRLS`.
8. Rodar smoke contra branch isolada/main:
   - login/onboarding sem tenant ainda funciona;
   - tenant A nao le tenant B;
   - inserts/updates sem `app.organization_id` falham;
   - inserts/updates com tenant errado falham;
   - fluxos produto, estoque, venda, cancelamento e imagem funcionam com tenant correto.
9. Rodar E2E com `E2E_DATABASE_URL` isolado antes de declarar producao aberta.

## Criterio de aceite

- Nenhuma tabela tenant-scoped listada acima fica sem RLS.
- Queries sem `app.organization_id` nao retornam nem escrevem dados tenant-scoped.
- Queries com `app.organization_id` de outro tenant nao retornam nem escrevem dados.
- App continua funcionando nos fluxos principais quando passa pelo wrapper tenant-scoped.
- Better Auth continua funcional antes e depois de selecionar organizacao ativa.
- Migration foi validada em branch Neon temporaria antes de qualquer aplicacao em branch principal.

## Riscos

- Aplicar `FORCE RLS` antes de adaptar app code quebra reads/writes tenant-scoped.
- RLS em tabelas de auth neste corte pode quebrar login/onboarding.
- Usar `SET` de sessao em vez de `set_config(..., true)` pode vazar tenant em conexao reutilizada.
- Policies permissivas com fallback para `true` quando `app.organization_id` esta ausente anulam a protecao.

## Status

Decisao tomada. Implementacao em andamento.

Concluido:

- Helper transacional `withTenantContext`/`setTenantContext` em `src/db/tenant-context.ts`.
- Teste TDD do helper validando `set_config('app.organization_id', ..., true)`.
- Catalogo em `src/features/catalog/server.ts` executando leituras e escritas tenant-scoped dentro do contexto transacional.
- Dashboard em `src/features/dashboard/server.ts` executando consultas analiticas tenant-scoped dentro do contexto transacional.
- Metas em `src/features/goals/server.ts` executando leituras, transicoes automaticas e writes dentro do contexto transacional.
- Produtos em `src/features/products/server.ts` executando analytics, historico de vendas, create/update/estoque/baixa/archive dentro do contexto transacional.
- Vendas em `src/features/sales/server.ts` executando bounds, analytics, idempotency lookup, create/cancel dentro do contexto transacional.
- Products/sales queries e image access executando dentro de contexto transacional.
- Reconcile de imagens executando query global via contexto interno `product_image_reconcile`.
- Scan de runtime em `src/features` sem import direto de `@/db`.
- `src/lib/app-session.ts` usando `app.user_id` para resolver membership pre-tenant e `app.organization_id` no onboarding antes de inserir dados tenant-scoped.
- `src/lib/audit-log.ts` gravando eventos dentro de contexto tenant.
- Migration `src/db/migrations/20260707205000_rls_tenant_isolation.sql` criada com `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY` e policies para as tabelas tenant-scoped.
- Teste estatico `src/db/rls-tenant-isolation.test.ts` cobre tabelas, `FORCE RLS`, `app.organization_id` e contexto interno de reconcile.
- Verificacao local apos trocar `DATABASE_URL` para `polaris_app`: `bun run check`, `bun run test` (74 arquivos, 265 testes), `bun run knip` e `bun run build`.
- Migration RLS aplicada no Neon main do projeto `autumn-feather-14038163`.
- Role runtime `polaris_app` criada no banco `neondb` sem `BYPASSRLS` e com DML no schema `public`.
- `.env.local` teve `DATABASE_URL` atualizado para o role runtime; `DATABASE_URL_DIRECT` continua para migrations.
- Smoke direto no Neon main:
  - `polaris_app.current_user_bypassrls = false`;
  - sem contexto: `organization = 0`, `products = 0`, `sales = 0`;
  - com `app.organization_id`/`app.user_id` em transacao: `organization = 1`, `member = 1`.
- Smoke de escrita em rollback com `polaris_app`:
  - insert em `organization` sem contexto foi negado por policy RLS;
  - fluxo onboarding-like com `users`, `organization`, `member`, `categories`, `system_settings` e `audit_events` funcionou com contexto transacional.
- Smoke reexecutavel `bun run db:smoke:rls` criado em `scripts/smoke-rls-runtime.cjs`; resultado local contra Neon main: `rls-runtime-smoke-ok`, `policies = 14`, `forcedTables = 13/13`, `currentUser = polaris_app`.
- Revalidacao final local contra `polaris_app`: `bun run check` (276 arquivos), `bun run test` (75 arquivos, 270 testes), `bun run db:smoke:rls`, `bun run knip` e `bun run build` passaram.
- MCP Neon/plugin ainda nao esta operacional nesta sessao: tentativa de buscar `autumn-feather-14038163` retornou 401 `token_invalidated`. A evidencia de banco desta fatia vem do smoke direto via `DATABASE_URL`.

Ainda pendente antes de producao:

- Atualizar o `DATABASE_URL` do ambiente de deploy para usar `polaris_app`; manter `DATABASE_URL_DIRECT`/migrations com `neondb_owner`.
- Coordenar deploy desta versao RLS-aware e rodar `bun run db:smoke:rls` contra o ambiente promovido. Aplicar/usar RLS antes do runtime com `set_config` quebra reads/writes tenant-scoped.
- Rodar smoke pos-migration para login, onboarding, dashboard, produtos, vendas, imagens e reconcile.
- Rodar E2E com `E2E_DATABASE_URL` isolado.
