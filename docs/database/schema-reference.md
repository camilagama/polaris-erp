# Referência do schema

**Status:** schema Drizzle e migrations versionados confirmados. `docs/documentation-plan.md` registra metadados Neon read-only no branch `dev`, mas esta Tarefa 3 não os reconsultou; esse registro não comprova produção. **Commit:** `886eda0`.

Fonte canônica: `packages/db/src/schema.ts`. O schema PostgreSQL usa `public` para tabelas da aplicação e `drizzle.__drizzle_migrations__` para o histórico Drizzle configurado em `packages/db/drizzle.config.ts`.

| Grupo | Tabelas | Finalidade e chave de tenant |
| --- | --- | --- |
| Auth e tenancy | `users`, `sessions`, `accounts`, `verifications`, `organization`, `member`, `invitation` | identidade Better Auth; `organization` é o tenant; `member.organization_id` vincula usuário e tenant |
| Auditoria e plataforma | `audit_events`, `platform_admins`, `platform_admin_grants`, `platform_audit_events`, `platform_support_notes` | trilhas tenant/platform e grants internos; `audit_events.organization_id` é tenant-scoped |
| Eventos e e-mail | `event_outbox`, `webhook_events`, `email_messages`, `email_events` | captura, idempotência, entrega e observação operacional; não possuem chave tenant obrigatória |
| Billing | `billing_plans`, `billing_customers`, `billing_subscriptions`, `billing_invoices`, `billing_payment_attempts`, `billing_provider_links` | plano global e estado canônico de cobrança; exceto `billing_plans`, as tabelas possuem `organization_id` |
| Catálogo e operação | `categories`, `system_settings`, `products`, `product_price_changes`, `product_stock_entries`, `product_stock_write_offs`, `sales`, `sale_items`, `goals` | dados ERP por `organization_id` |

## Enums e estados armazenados

| Enum | Valores |
| --- | --- |
| `platform_admin_role` | `owner`, `operator`, `support` |
| `sale_status` | `completed`, `cancelled` |
| `sale_payment_method` | `pix`, `card` |
| `sale_payment_fee_payer` | `not_applicable`, `seller`, `customer` |
| `product_write_off_reason` | `adjustment`, `operational` |
| `goal_metric` | `revenue`, `profit`, `sales_count` |
| `goal_status` | `active`, `completed`, `expired`, `archived` |
| `goal_display_mode` | `percentage`, `absolute` |

Os estados textuais de billing, outbox, webhook e e-mail são protegidos por `CHECK`, não por enum. Detalhes e constraints estão em [Relações e constraints](relationships-and-constraints.md).

## Colunas relevantes

- `products`: preço/custo/estoque, categoria, imagem versionada e `archived_at` para soft delete.
- `sales` e `sale_items`: snapshots de produto, preço e custo; valores financeiros, pagamento, cancelamento e `idempotency_key`.
- `goals`: métrica, valor alvo, período, resolução e status.
- `billing_subscriptions`: organização, plano, status, períodos e cancelamento; `billing_provider_links` guarda identificadores externos e somente marca/últimos quatro dígitos de cartão quando presentes.
- `event_outbox`: status, tentativas, lease e token de claim; `webhook_events` armazena hash do body e headers/payload redigidos.

Timestamps são `timestamp with time zone` onde declarados pelo helper `timestamps`; IDs de domínio são UUID e IDs Better Auth são texto. Não foram encontrados views, materialized views ou triggers versionados nas migrations analisadas. A extensão versionada é `pg_trgm` para busca textual.

## Limites

Esta referência não lista linhas reais, credenciais ou URLs privadas. Views, functions, grants, owners e extensões adicionais do banco real exigem reconfirmação read-only antes de serem tratados como produção.

## Referências

- `packages/db/src/schema.ts`
- `packages/db/drizzle.config.ts`
- `packages/db/src/migrations/20260710115000_add_trigram_search_indexes.sql`
