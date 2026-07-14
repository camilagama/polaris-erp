# Invariantes observados

**Status:** rascunho de descoberta, **não normativo**. “Parcial” significa que a proteção existe somente em alguma camada ou não cobre acesso privilegiado/integrado.

| ID provisório | Invariante | Estado | Camada que impõe | Prova/teste | Risco se violado |
| --- | --- | --- | --- | --- | --- |
| TENANT-001 | Registro tenant-scoped pertence a uma organização e relações sensíveis usam chave composta de organização. | Confirmado | FKs compostas e RLS versionado | migrations RLS; `packages/db/src/postgres-behavior.test.ts` | leitura/escrita cross-tenant |
| TENANT-002 | Ação do app requer sessão, membro, org ativa e billing liberado. | Confirmado no app | `requireAppContext` | testes de actions/contexto | acesso operacional indevido |
| STOCK-001 | Saldo de produto não é negativo. | Confirmado | check no banco; baixa/venda com lock | `products_stock_non_negative`; testes de ações | saldo impossível e margem enganosa |
| STOCK-002 | Entrada/baixa persistem movimento e saldo na mesma transação. | Confirmado | `withTenantContext` e `FOR UPDATE` | testes de produto/estoque | divergência entre saldo e evento |
| STOCK-003 | Toda mudança de saldo possui movimento unificado. | Não confirmado | vendas/cancelamentos alteram saldo fora de entries/write-offs | ausência de ledger único | reconciliação e auditoria custosas |
| SALE-001 | Uma venda não contém produto repetido. | Confirmado | índice único composto e schema | testes de venda; schema `sale_items` | dupla baixa/snapshot inconsistente |
| SALE-002 | Cancelamento não acontece duas vezes e recompõe estoque atomicamente. | Confirmado | lock na venda, status e transação | testes de ações de venda | estoque duplicado |
| SALE-003 | Total, taxa, itens e snapshots formam equação financeira consistente. | Parcial | cálculo de aplicação | `calculations.test.ts`; sem constraint relacional | escrita privilegiada economicamente incoerente |
| EVENT-001 | Uma entrega de webhook não deve produzir efeitos duas vezes. | Parcial | unicidade de intake/outbox | testes nominais | falha pós-captura impede recuperação; redelivery vira duplicate |
| EVENT-002 | Lease obsoleto não pode finalizar outbox já reclamado por outro worker. | Confirmado | token/tempo de lease | `event-outbox-lease.postgres.test.ts` | dupla finalização |
| GOAL-001 | Só existe uma meta ativa por organização. | Confirmado | índice parcial + validação de aplicação | `goals-active-unique.test.ts` | progresso ambíguo |
| GOAL-002 | Transição automática não sobrescreve uma alteração concorrente. | Não confirmado | update sem lock/status condicional | ausência de teste de corrida | estado terminal incorreto |
| AUDIT-001 | Ação administrativa sensível deixa trilha transacional. | Confirmado nos fluxos admin vistos | `platform_audit_events` na transação | testes platform | perda de responsabilização |
| AUDIT-002 | Ação sensível do tenant sempre é auditada. | Parcial | guard AST em lista fechada; helper legado é best-effort | `check-core-audit-boundaries.ts` | lacunas silenciosas de auditoria |
| DATA-001 | Recurso com histórico financeiro não é removido sem regra explícita. | Parcial/contraditório | app não expõe delete; FKs usam cascade | schema de `products`/`sale_items` | deleção SQL privilegiada remove histórico |
| BILLING-001 | Uma organização não possui subscriptions simultâneas em estados não terminais. | Confirmado | índice parcial | schema `billing_subscriptions` | cobrança/acesso ambíguos |
| BILLING-002 | Uma subscription só recebe evento mais novo e transição permitida. | Não confirmado | updates diretos de reconciler/admin | ausência de teste de ordem | evento atrasado pode regredir acesso |
| IMAGE-001 | Só metadados da versão atual podem ser substituídos/removidos. | Confirmado no app | compare-and-set de versão | testes de storage/access | imagem de outro escritor é apagada |
| EMAIL-001 | Evento de email duplicado não é gravado duas vezes. | Confirmado para identificador de provider | índice/serviço | integration tests | lifecycle da mensagem não é atualizado |

## Proteção no banco ainda a avaliar

As seguintes exigem decisão técnica antes de qualquer mudança: restringir exclusão de produto/histórico, reforçar integridade financeira em escritas privilegiadas, tornar transições de meta condicionais, e definir um ledger de estoque. Não se assume que trigger, constraint ou RLS adicional seja a solução sem avaliar impacto operacional e migração.
