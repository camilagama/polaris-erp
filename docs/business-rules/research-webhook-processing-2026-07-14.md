# Pesquisa externa: processamento de webhooks de billing e pagamentos

**Status:** rascunho de pesquisa, **não normativo**.  
**Consulta:** 2026-07-14.  
**Escopo:** fatos e recomendações de fontes externas sobre idempotência, tentativas, duplicidade, ordenação e auditabilidade. Este documento não aprova regras de produto, não substitui contratos dos provedores efetivamente usados e não afirma comportamento do repositório.

## Limites de aplicabilidade

- Stripe é uma referência primária de desenho de webhooks, mas não prova obrigações contratuais de Asaas ou Woovi. Seus prazos de retry e detalhes de entrega são **não aplicáveis** ao produto até validação nas fontes e contas desses provedores.
- RFC 9110 define a semântica HTTP de idempotência; ela não transforma automaticamente o `POST` de um webhook em operação idempotente na aplicação.
- OWASP é orientação técnica, não legislação nem decisão de retenção/auditoria para este produto.

## Achados externos

### Idempotência e duplicidade

- A Stripe informa que um mesmo evento pode ser entregue mais de uma vez. Para evitar novo processamento, recomenda registrar o identificador do evento processado; quando eventos distintos representam o mesmo fato, sugere combinar o identificador do objeto em `data.object` com `event.type`.[^stripe-webhooks]
- A documentação de recuperação de eventos descreve estados equivalentes a “em processamento” e “processado”, com descarte do evento que já tenha esses estados.[^stripe-undelivered]
- A migração de eventos Stripe mostra uma chave de idempotência com `PRIMARY KEY`, `event_type` e `processed_at`; o conflito de unicidade identifica a entrega repetida.[^stripe-migration]

**Implicação técnica candidata, não decisão de produto:** a decisão sobre a primeira execução deveria ser persistente e atômica com os efeitos que ela protege. Uma verificação somente na aplicação antes da escrita deixa uma janela de concorrência.

### Retries, resposta HTTP e ordenação

- Para Stripe, a entrega em produção é repetida por até três dias com backoff exponencial; o reenvio manual não encerra os retries automáticos. Esses prazos são específicos da Stripe e não devem ser copiados para Asaas ou Woovi sem confirmação.[^stripe-webhooks]
- A Stripe não garante a ordem de entrega e recomenda que o consumidor não dependa dela; quando necessário, o consumidor pode consultar o objeto corrente na API.[^stripe-webhooks]
- A mesma fonte recomenda fila assíncrona e retorno rápido de um `2xx` antes de trabalho complexo, para evitar timeout da entrega.[^stripe-webhooks]
- RFC 9110 define uma operação idempotente como aquela cujo efeito intencional de múltiplas requisições idênticas é igual ao de uma única requisição e relaciona essa propriedade ao retry após falhas de comunicação.[^rfc9110]

**Implicação técnica candidata, não decisão de produto:** o intake pode confirmar apenas a aceitação durável do evento e deslocar reconciliação para processamento controlado. O desenho precisa definir explicitamente o que ocorre entre aceitação, processamento, falha e revisão manual, incluindo eventos fora de ordem.

### Autenticidade e replay

- Stripe requer verificação da assinatura contra o corpo bruto e o cabeçalho de assinatura antes de atuar no evento. Para mitigar replay, a assinatura inclui timestamp; cada retry recebe nova assinatura e novo timestamp.[^stripe-webhooks]

**Implicação técnica candidata, não decisão de produto:** assinatura ou timestamp de entrega não são chaves de deduplicação estáveis. A validação de autenticidade vem antes de efeitos; a deduplicação usa a identidade lógica definida pelo provedor ou pela integração.

### Auditabilidade operacional

- O OWASP Logging Cheat Sheet recomenda registrar “quando, onde, quem e o quê”, incluindo identificador de interação/correlação, timestamps, ação, objeto, resultado e motivo quando aplicável. Também recomenda proteger logs contra alteração/exclusão, controlar acesso e registrar o acesso aos próprios logs.[^owasp-logging]

**Implicação técnica candidata, não decisão de produto:** uma trilha de processamento pode precisar correlacionar a entrega do provedor, a decisão de deduplicação, cada tentativa, o efeito de domínio e o desfecho. Retenção, imutabilidade, dados permitidos e acesso são decisões de produto, segurança e, possivelmente, jurisdição.

## Perguntas para decisão posterior

1. Qual identidade de deduplicação vale por provedor: ID de evento, objeto mais tipo, ou ambas?
2. Qual transição e prazo de recuperação se aplicam a `received`, `processing`, `processed`, `failed` e `manual_review`?
3. Quando uma resposta `2xx` significa somente captura durável e quando significa reconciliação concluída?
4. Como eventos fora de ordem reconciliam o estado local com a fonte canônica de cada provedor?
5. Quais dados de webhook e auditoria podem ser retidos, por quanto tempo e por quais papéis, considerando jurisdição e contratos aplicáveis?

## Fontes primárias e autoridade

[^stripe-webhooks]: Stripe, [Receive Stripe events in your webhook endpoint](https://docs.stripe.com/webhooks), documentação oficial do provedor, sem versão indicada, consultada em 2026-07-14. Recomendação e comportamento específico de Stripe; sem jurisdição.

[^stripe-undelivered]: Stripe, [Process undelivered webhook events](https://docs.stripe.com/webhooks/process-undelivered-events), documentação oficial do provedor, sem versão indicada, consultada em 2026-07-14. Recomendação específica de Stripe; sem jurisdição.

[^stripe-migration]: Stripe, [Migrate from snapshot events to thin events: implement idempotency](https://docs.stripe.com/webhooks/migrate-snapshot-to-thin-events#implement-idempotency), documentação oficial do provedor, sem versão indicada, consultada em 2026-07-14. Exemplo técnico específico de Stripe; sem jurisdição.

[^rfc9110]: IETF, [RFC 9110, HTTP Semantics, §9.2.2](https://datatracker.ietf.org/doc/html/rfc9110#section-9.2.2), standard track, junho de 2022, consultado em 2026-07-14. Especificação de protocolo; sem jurisdição.

[^owasp-logging]: OWASP, [Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html), orientação de segurança, sem versão indicada, consultada em 2026-07-14. Recomendação técnica; sem jurisdição.
