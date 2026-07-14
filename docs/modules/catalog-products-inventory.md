# Catálogo, produtos e estoque

**Status:** fluxos locais, schema e testes confirmados. **Commit:** `886eda0`.

## Objetivo, atores e dados

O módulo mantém categorias, configurações comerciais, produtos e movimentos de estoque por organização. Usuários com `products:write` (`operator`, `admin`, `owner`) mutam produto/estoque; `settings:write` (`admin`, `owner`) administra categorias e configurações. Todos os fluxos exigem sessão, organização ativa e billing com acesso. Fonte: `apps/web/src/lib/app-context.ts:canRolePerform`, `apps/web/src/lib/app-session.ts:requireAppContext`.

| Dados | Finalidade |
| --- | --- |
| `categories` | classificação; nome e key únicos por tenant; `is_system` protege a categoria padrão |
| `system_settings` | markup e regras de taxa de cartão, chave lógica `global` por tenant |
| `products` | produto, preço/custo, estoque, imagem e `archived_at` |
| `product_stock_entries` / `product_stock_write_offs` | entradas e baixas com snapshots de custo |
| `product_price_changes` | histórico somente quando o preço muda |
| `audit_events` | eventos de catálogo, produto e estoque |

## Fluxos e regras

| Fluxo | Regras e efeitos | Evidência |
| --- | --- | --- |
| Categoria | cria key aleatória; não renomeia/remove `Outros`; não remove categoria com produtos | `features/catalog/{actions,guards,server}.ts` |
| Configurações | normaliza regras de parcelas, faz upsert de `system_settings` e audita | `features/catalog/server.ts:saveCatalogSettings` |
| Criar produto | valida categoria do tenant; cria produto, entrada inicial se estoque positivo e audit; imagem staged é processada antes da persistência | `features/products/{actions,server,schema}.ts` |
| Alterar produto | bloqueia produto; grava `product_price_changes` apenas quando preço mudou; audita | `features/products/server.ts:updateProductWithPriceHistory` |
| Entrada | bloqueia linha, calcula custo médio ponderado, registra entrada, soma estoque e desarquiva | `features/products/{server,stock}.ts:addProductStock` |
| Baixa | bloqueia linha, rejeita quantidade maior que saldo, registra motivo/custo e reduz saldo | `features/products/{server,stock}.ts:writeOffProductStock` |
| Arquivo | grava/limpa `archived_at`; não apaga produto | `features/products/server.ts:setProductArchivedState` |

As constraints do banco reforçam custo, preço e estoque não negativos e quantidade positiva nas movimentações. A relação composta organização-produto impede associar o histórico a produto de outro tenant. Ver [Relações e constraints](../database/relationships-and-constraints.md).

## Concorrência, isolamento e auditoria

Mutations de estoque usam `FOR UPDATE` dentro de `withTenantContext`; a atualização e o audit event compartilham a transação. A criação/alteração sempre filtra `productId` e `organizationId`. RLS versionada cobre essas tabelas, mas o uso da role runtime em ambiente promovido não foi confirmado. Fonte: `packages/db/src/tenant-context.ts:withTenantContext`, `packages/db/src/migrations/20260707205000_rls_tenant_isolation.sql`.

## Testes e lacunas

Testes cobrem categoria protegida, validação, custo médio, baixa sem saldo negativo, corridas de estoque, categoria cross-tenant, imagem e soft delete: `apps/web/src/features/products/*.test.ts`, `apps/web/src/features/catalog/*.test.ts`. Não foi localizado teste PostgreSQL de ponta a ponta para todos os fluxos de catálogo/estoque no banco promovido.

## Referências

- `apps/web/src/features/catalog/server.ts`
- `apps/web/src/features/products/server.ts`
- `apps/web/src/features/products/stock.ts`
- `packages/db/src/schema.ts:products`
