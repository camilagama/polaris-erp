# Jobs e workflows

O repositório usa Inngest como adaptador de execução assíncrona. A configuração remota de cron, retenção e retries não é evidência local; este documento cobre apenas funções registradas e transições implementadas.

## Consumidores de outbox

`/api/inngest` registra `inngestFunctions` e `productImageInngestFunctions`. A função `process-outbox-event` reage a `OUTBOX_EVENT_PENDING`, verifica que existe identificador de outbox e executa o dispatcher em uma etapa Inngest.

| Condição após claim | Resultado local | Observação |
| --- | --- | --- |
| Dispatcher conclui | `processed` | Consumidor de domínio terminou. |
| Evento de captura sem dispatcher | `observed` com motivo | Evidência recebida, sem processamento de domínio. Não é retry pendente. |
| Evento sem dispatcher fora da categoria de captura | `failed` | Indica configuração/consumer ausente. |
| Dispatcher lança erro | `failed` ou `dead_letter`, conforme tentativas | O pacote de eventos controla limite de cinco tentativas e lease de 300 segundos. |

Após claim aceito, uma exceção é relançada pela função, permitindo a política do Inngest. Não há no código uma promessa de quantidade ou intervalo de retry remoto.

## Reconciliação de imagens

`reconcile-product-images` é agendada pelo cron `0 4 * * *`. A função chama `reconcileProductImages`, que trata objetos de staging e referências persistidas. A mesma rotina pode ser acionada pelos handlers internos protegidos, úteis para diagnóstico e operação controlada.

## Operação manual observada

O admin permite solicitar retry de evento de billing para papel de plataforma autorizado. Isso não garante que o provedor remoto aceite ou reencontre o recurso; a tela e a action apenas iniciam a transição local permitida.

Fontes: `apps/web/src/lib/inngest-functions.ts:processOutboxEvent`, `apps/web/src/features/products/image-reconcile-inngest.ts:productImageInngestFunctions`, `apps/web/src/features/products/image-reconcile.ts:reconcileProductImages`, `apps/admin/src/app/events/actions.ts:retryOutboxEventAction`, `packages/events/src/index.ts:claimOutboxEvent`, `packages/events/src/index.ts:markOutboxEventObserved`, `packages/events/src/index.ts:markOutboxEventFailed`.
