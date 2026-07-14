# Máquinas de estado observadas

**Status:** rascunho de descoberta, **não normativo**.

## Organização

`active ↔ suspended`, alterada por administração interna com motivo e auditoria. A transição é tecnicamente reversível; a experiência do membro suspenso é lacuna aberta. `packages/platform/src/platform-organization-mutations.ts:45`.

## Subscription

Estados modelados: `incomplete`, `trialing`, `active`, `past_due`, `paused`, `canceled`. Acesso operacional reconhece somente `active`. Onboarding cria `incomplete`; webhooks e administração atualizam parte do lifecycle. Não foram confirmadas tabelas de transição, versionamento de evento ou proteção contra evento fora de ordem. `packages/billing/src/index.ts:1`, `packages/db/src/schema.ts:532`.

## Produto e estoque

```text
active --archive--> archived
archived --unarchive--> active
archived --stock entry--> active
active --sale/write-off--> active
```

Entrada aumenta saldo e recalcula custo médio; baixa e venda reduzem saldo; cancelamento de venda recompõe saldo. O produto arquivado não é vendável. `apps/web/src/features/products/server.ts:347`, `apps/web/src/features/sales/server.ts:242`.

## Venda

```text
create --> completed --cancel--> cancelled
```

`completed → cancelled` é a única transição confirmada. Cancelar novamente é negado. Não há refund financeiro, edição, exclusão ou reativação encontrados. `apps/web/src/features/sales/server.ts:420`.

## Meta

```text
create --> active --target met--> completed
                 ├--period ended--> expired
                 └--archive--> archived --unarchive--> active
```

`completed` e `expired` não são reativáveis. `archive` é aceito também para metas já resolvidas e é idempotente para uma meta já arquivada; somente `archived` pode voltar a `active`. A resolução acontece em leitura de dashboard/configurações, não por job independente. A concorrência entre resolução e archive/update é lacuna. `apps/web/src/features/goals/server.ts:100`, `:379`, `:435`.

## Webhook e outbox

```text
webhook: received -> processed|failed
duplicate delivery -> resposta de sucesso sem reprocessar a linha existente

outbox: pending -> processing -> processed|observed
                        \-> failed -> pending | dead_letter
```

`processing` e `duplicate` existem no enum, mas não são transições observadas no fluxo atual. As transições de webhook estão incompletamente recuperáveis: captura e processamento não formam uma única transação, e o console oferece retry apenas ao outbox. `apps/web/src/integrations/webhooks/intake.ts:50`, `packages/events/src/index.ts:273`, `packages/platform/src/platform-events.ts:67`.
