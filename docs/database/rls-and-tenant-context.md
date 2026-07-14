# RLS e contexto tenant

**Status:** coverage abaixo confirmada em migrations versionadas. O plano documental registra metadados Neon read-only em `dev`, mas esta tarefa não os reconsultou; isso não prova produção. **Commit:** `886eda0`.

As policies são permissivas e `FORCE ROW LEVEL SECURITY` é versionado para as 18 tabelas listadas como RLS. A variável `app.organization_id` é definida localmente em transação por `withTenantContext`; platform admin e jobs têm exceções explicitamente delimitadas. Fonte: `packages/db/src/tenant-context.ts`.

| Tabela/grupo | RLS versionada | Policies/operações | Isolamento alternativo ou observação |
| --- | ---: | --- | --- |
| `organization` | Sim | tenant ALL; select/update de platform admin válido | leitura pré-tenant por `app.user_id` |
| `member` | Sim | tenant ALL; select de platform admin válido | leitura por `app.user_id` para resolver membership |
| `invitation`, `audit_events` | Sim | tenant ALL; select de platform admin | contexto tenant |
| `categories`, `system_settings` | Sim | tenant ALL; select de platform admin | contexto tenant |
| `products` | Sim | tenant ALL; select platform admin; select job de imagem | `product_image_reconcile` é exceção explícita |
| `product_price_changes`, `product_stock_entries`, `product_stock_write_offs` | Sim | tenant ALL; select platform admin | contexto tenant |
| `sales`, `sale_items`, `goals` | Sim | tenant ALL; select platform admin | contexto tenant |
| `billing_customers`, `billing_invoices`, `billing_payment_attempts`, `billing_provider_links` | Sim | tenant ALL; job billing; select platform admin | contexto interno `billing_webhook_reconcile` |
| `billing_subscriptions` | Sim | tenant ALL; job billing; select e update platform admin | update administrativo é versionado |
| `users`, `sessions`, `accounts`, `verifications` | Não encontrada | sem policy versionada | auth/pre-tenant depende da aplicação e FKs |
| `platform_admins`, `platform_admin_grants`, `platform_audit_events`, `platform_support_notes` | Não encontrada | sem policy versionada | guard de plataforma e conexão |
| `event_outbox`, `webhook_events`, `email_messages`, `email_events`, `billing_plans` | Não encontrada | sem policy versionada | operações internas; `billing_plans` é catálogo global |

> RLS não foi encontrada ou confirmada para as tabelas marcadas como “Não encontrada”. O isolamento depende da camada de aplicação, conexão e controles operacionais; isso não equivale a acesso público.

## Platform admin e job interno

`public.has_active_platform_admin()` é `SECURITY DEFINER` e verifica admin ativo, grant não revogado e não expirado. Policies de plataforma a usam em vez de confiar apenas em uma variável não vazia. Jobs internos aceitos pelo tipo TypeScript são `billing_webhook_reconcile` e `product_image_reconcile`.

## Testes e lacunas

`packages/db/src/postgres-behavior.test.ts` aplica migrations em PostgreSQL descartável e prova leitura tenant, escrita cross-tenant negada e aceitação apenas de grant ativo. `packages/db/src/platform-admin-rls-policy.test.ts` verifica o predicado da migration. Não há prova nova de grants, owners, runtime `NOBYPASSRLS`, policies reais ou drift no ambiente promovido.

## Referências

- `packages/db/src/migrations/20260707205000_rls_tenant_isolation.sql`
- `packages/db/src/migrations/20260710041000_billing_rls_platform_admin.sql`
- `packages/db/src/migrations/20260713090000_platform_admin_rls_validation.sql`
