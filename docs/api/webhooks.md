# Webhooks

Asaas, Woovi e Resend entram por handlers distintos e são capturados antes de qualquer reconciliação. O desenho separa recebimento verificável de processamento de domínio, mas a entrega remota e os payloads reais de sandbox não foram comprovados pelo repositório.

## Fluxo comum de intake

1. O handler limita o corpo e valida a assinatura exigida pelo provedor.
2. `observeWebhookIntake` registra metadados redigidos, hash do corpo e a chave `provider:event`.
3. Uma entrega já observada não cria novo encaminhamento.
4. Uma entrega nova cria evento de outbox no estado `observed` e o handler executa sua reconciliação síncrona.
5. O término da reconciliação marca o intake como processado; falhas ficam registradas para revisão manual conforme cada handler.

O estado `observed` não significa que um trabalho está aguardando retry. Ele é a evidência de captura/observação do webhook. O mecanismo de retry do outbox usa estados e contadores próprios, descritos abaixo.

## Provedores

| Provedor | Autenticação e validação | Reconciliação | Erros observados |
| --- | --- | --- | --- |
| Asaas | Cabeçalho de token do provedor, corpo bruto e tamanho máximo. | Executa reconciliação de billing em contexto de job interno. | Assinatura/entrada inválida é rejeitada; erro de reconciliação marca o intake para revisão e retorna falha HTTP. |
| Woovi | HMAC do corpo com assinatura recebida e limite de payload. | Executa reconciliação de billing em contexto de job interno. | Assinatura/entrada inválida é rejeitada; falha de reconciliação é marcada para revisão. |
| Resend | Verificação Svix pelo SDK, com cabeçalhos requeridos e corpo bruto. | Registra o evento de e-mail e marca intake processado. | Evento inválido ou erro de processamento retorna falha HTTP. |

Os nomes de cabeçalhos e segredos são definidos no código dos handlers. Valores de assinatura, payload e credenciais não devem ser registrados em documentação, logs ou tickets.

## Deduplicação e tentativa do outbox

`@polaris/events` trata a chave de idempotência na criação do outbox. Conflito de uma entrada pendente a torna novamente `observed`; uma entrada já observada não é reenfileirada pelo intake duplicado.

Para consumidores Inngest, `processOutboxEvent` faz claim com lease de 300 segundos. Eventos de captura sem dispatcher são marcados como observados com motivo explícito: isso preserva a evidência e não equivale a sucesso de processamento de domínio. Eventos sem dispatcher fora dessa categoria falham.

Uma falha de dispatcher fica pendente enquanto as tentativas forem menores que cinco; ao atingir esse limite, vai para `dead_letter`. O retry manual é permitido para eventos `failed` ou `dead_letter`. A função Inngest também pode relançar erro após um claim aceito, mas a política remota de retries do Inngest não está versionada aqui.

Fontes: `apps/web/src/app/api/webhooks/asaas/route.ts:POST`, `apps/web/src/app/api/webhooks/woovi/route.ts:POST`, `apps/web/src/app/api/webhooks/resend/route.ts:POST`, `apps/web/src/integrations/webhooks/intake.ts:observeWebhookIntake`, `apps/web/src/integrations/webhooks/intake.ts:markWebhookIntakeProcessed`, `apps/web/src/lib/inngest-functions.ts:processOutboxEvent`, `packages/events/src/index.ts:claimOutboxEvent`, `packages/events/src/index.ts:markOutboxEventFailed`, `packages/events/src/index.ts:retryOutboxEvent`.
