# Isolamento por tenant e RLS

**Status:** policies e helpers versionados confirmados; aplicação no banco promovido e a role efetiva do runtime não foram revalidadas nesta documentação.
**Última verificação:** 2026-07-14. **Commit:** `886eda0` em `main`.

O isolamento do Polaris é deliberadamente composto: guards do app determinam o contexto, helpers transacionais configuram variáveis PostgreSQL locais e RLS protege as tabelas cobertas pela migration. Um filtro `organization_id` no código não é, por si, prova de RLS.

## Contextos transacionais

| Contexto | Helper | Uso versionado |
| --- | --- | --- |
| Tenant | `withTenantContext` / `setTenantContext` define `app.organization_id` | leituras e escritas do app web |
| Pré-tenant | `setUserContext` define `app.user_id` | resolução de membership e onboarding |
| Plataforma | `withPlatformAdminContext` define `app.platform_admin_id` | console interno após grant válido |
| Job interno | `withInternalJobContext` define `app.internal_job` | reconciliação de billing e de imagens |

`set_config(..., true)` limita cada valor à transação. Fontes: `packages/db/src/tenant-context.ts:setTenantContext`, `setUserContext`, `setPlatformAdminContext`, `withInternalJobContext`.

## Cobertura versionada

As 13 tabelas de domínio/tenancy receberam `ENABLE` e `FORCE ROW LEVEL SECURITY` na migration `20260707205000_rls_tenant_isolation.sql`; cinco tabelas de billing receberam o mesmo tratamento em `20260710041000_billing_rls_platform_admin.sql`. A policy posterior `20260713090000_platform_admin_rls_validation.sql` valida o grant ativo por `public.has_active_platform_admin()` antes de liberar as operações de plataforma previstas.

| Grupo | Tabelas | Policy principal |
| --- | --- | --- |
| Tenant | `organization`, `member`, `invitation`, `audit_events`, `categories`, `system_settings`, `products`, `product_price_changes`, `product_stock_entries`, `product_stock_write_offs`, `sales`, `sale_items`, `goals` | igualdade com `app.organization_id`; `organization` e `member` também têm leitura pré-tenant por `app.user_id` |
| Billing | `billing_customers`, `billing_subscriptions`, `billing_invoices`, `billing_payment_attempts`, `billing_provider_links` | tenant; job `billing_webhook_reconcile`; leitura de platform admin válida; update administrativo apenas onde a policy o permite |
| Exceção de job | `products` | select adicional para `product_image_reconcile` |

O runtime sem `BYPASSRLS`, grants PostgreSQL, branch e schema reais permanecem controles externos a confirmar. A referência detalhada de cada tabela e policy está em [RLS e contexto tenant](../database/rls-and-tenant-context.md).

## Evidência e limites

`packages/db/src/postgres-behavior.test.ts` exercita migrations em PostgreSQL descartável, isolamento cross-tenant, idempotência de venda, lease do outbox e grant de platform admin ativo. `packages/db/src/tenant-context.test.ts` testa a configuração local de contexto. Esses testes não provam o estado de um ambiente Neon promovido.

Não há RLS/policy versionada para as tabelas de auth, platform admin, eventos/outbox, e-mail ou `billing_plans`; a ausência não deve ser interpretada como acesso público. O controle dessas tabelas depende do código, da conexão e/ou de políticas externas não verificadas aqui.

## Referências

- `packages/db/src/migrations/20260707205000_rls_tenant_isolation.sql`
- `packages/db/src/migrations/20260710041000_billing_rls_platform_admin.sql`
- `packages/db/src/migrations/20260713090000_platform_admin_rls_validation.sql`
- `packages/db/src/postgres-behavior.test.ts`
