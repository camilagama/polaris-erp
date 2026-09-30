# ADR-0002 — Outbox transacional para fluxos externos integrados

**Status:** Accepted  
**Registrada e confirmada em:** 2026-09-30  
**Data original da decisão:** desconhecida  
**Implementação observada:** parcial; somente fluxos integrados usam o processamento disponível.

## Contexto

Webhooks e outros eventos externos podem ser repetidos ou interrompidos durante o processamento. As regras aprovadas exigem deduplicação, recuperação durável de falhas, tentativas limitadas e revisão de falhas terminais. O código atual persiste registros de outbox e fornece mecanismos de claim, lease, retry e revisão.

## Decisão

Usar outbox persistido para os fluxos externos que estejam explicitamente integrados a esse mecanismo. No intake de webhook, gravar a captura e seu registro de outbox na mesma transação, com chave de idempotência. Despachadores integrados reivindicam eventos com lease, aplicam retries limitados com backoff/jitter e deixam falhas terminais disponíveis para revisão ou retry manual.

O alcance é deliberadamente limitado ao que está conectado no código. Os tópicos Asaas, Woovi e Resend são `capture-only` no dispatcher atual: o estado `observed` comprova captura, enquanto seus handlers fazem reconciliação síncrona. Isso não significa que a reconciliação já foi processada pelo outbox, nem que todas as mutações de domínio e todos os efeitos externos estejam cobertos.

Esta ADR registra e confirma a arquitetura vigente em 2026-09-30. As fontes consultadas não preservam a data nem o rationale original da adoção.

## Alternativas

Não foi encontrada comparação histórica de alternativas. Não se afirma que processamento exclusivamente síncrono, retry somente por provider ou uma plataforma de jobs sem persistência local tenham sido avaliados na decisão original.

## Consequências e limites

- Para eventos conectados, a persistência permite retomar o despacho após falhas e aplicar deduplicação e política de retry.
- O mecanismo pode executar uma tentativa externa mais de uma vez após interrupção; consumidores e operações externas precisam tratar duplicatas. O outbox não garante execução `exactly-once`.
- O código define limite de cinco tentativas e lease de 300 segundos. Uma entrada em `dead_letter` não equivale a sucesso de processamento de domínio.
- A execução Inngest e sua configuração remota não foram confirmadas em produção. Não inferir entrega ou retry remoto a partir da presença do workflow no repositório.
- As reconciliações atuais de billing são síncronas; o uso do outbox para captura não as transforma em processamento assíncrono. Ampliação da cobertura exige mudança e verificação próprias.

## Evidência

- [Regras normativas aprovadas](../business-rules/normative/approved-rules.md) — contratos `BILLING-001` e `EVENT-004` para recuperação e retries.
- [Ciclo de vida de request](../architecture/request-lifecycle.md) e [API de webhooks](../api/webhooks.md) — distinção entre captura `observed`, reconciliação síncrona e dispatcher.
- [`intake.ts`](../../apps/web/src/integrations/webhooks/intake.ts) — captura e registro na mesma transação.
- [`@polaris/events`](../../packages/events/src/index.ts) e [funções Inngest](../../apps/web/src/lib/inngest-functions.ts) — idempotência, leases, tentativas e despacho.
- [Integrações externas](../architecture/external-integrations.md) — código observado e configuração remota ainda não confirmada.
