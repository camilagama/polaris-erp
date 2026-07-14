# Vendas

**Status:** fluxo local, invariantes e testes confirmados. **Commit:** `886eda0`.

## Escopo e permissão

`createSaleAction` e `cancelSaleAction` exigem `sales:write`, portanto `operator`, `admin` ou `owner`, além de sessão, tenant ativo e assinatura `active`. O módulo registra venda, itens com snapshots, impacto no estoque e auditoria. Fonte: `apps/web/src/features/sales/actions.ts`, `apps/web/src/lib/app-session.ts:requireAppContext`.

## Estados e validações

| Elemento | Valores/regras |
| --- | --- |
| `sales.status` | `completed` ou `cancelled`; `cancelled_at` deve acompanhar o estado |
| Pagamento | PIX: zero parcelas e `not_applicable`; cartão: 1–12 parcelas e pagador `seller|customer` |
| Itens | ao menos um; produto não se repete; quantidade inteira positiva |
| Valores | frete, adicional, desconto, taxas e totais não negativos; desconto não supera base |
| Idempotência | UUID opcional única por organização quando preenchida |

## Fluxo de criação

1. A action valida o payload e carrega regras de parcelas do catálogo.
2. `createSaleOnce` retorna a venda existente se a chave idempotente já foi persistida; em conflito concorrente consulta novamente.
3. A transação tenant bloqueia produtos em ordem determinística, rejeita produto inexistente, preço exibido desatualizado ou estoque insuficiente.
4. Persiste `sales`/`sale_items` com snapshots, reduz estoque e grava `sale.created`.

Tarifa do vendedor é custo operacional; tarifa paga pelo cliente aumenta apenas `charged_amount`, não a receita operacional. Fontes: `apps/web/src/features/sales/{server,calculations,schema}.ts`.

## Cancelamento e bordas

Cancelar bloqueia a venda, rejeita uma já cancelada ou sem itens, bloqueia todos os produtos, recompõe estoque e muda para `cancelled` na mesma transação. Se um produto do item não puder ser bloqueado, a venda não é cancelada e a mensagem orienta ajuste manual/suporte. Não há exclusão ou edição da venda após criação encontrada neste módulo.

## Isolamento, concorrência e auditoria

Todas as queries/mutations relevantes passam por `withTenantContext`; RLS versionada cobre `sales` e `sale_items`. `FOR UPDATE`, índice idempotente parcial e FKs compostas complementam o guard de aplicação. O ambiente promovido e a role sem bypass continuam não confirmados.

## Testes e lacunas

`apps/web/src/features/sales/actions.test.ts` cobre autenticação, itens duplicados, idempotência, corrida, estoque, preço desatualizado e cancelamento. `calculations.test.ts` cobre PIX, cartão e arredondamento; `packages/db/src/postgres-behavior.test.ts` confirma a constraint de idempotência no PostgreSQL. Falta prova E2E contra a infraestrutura promovida.

## Referências

- `apps/web/src/features/sales/actions.ts`
- `apps/web/src/features/sales/server.ts:createSaleOnce`
- `apps/web/src/features/sales/server.ts:cancelSale`
- `packages/db/src/schema.ts:sales`
