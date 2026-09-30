# ADR-0003 — Adaptadores de billing e estados internos normalizados

**Status:** Accepted  
**Registrada e confirmada em:** 2026-09-30  
**Data original da decisão:** desconhecida  
**Implementação observada:** parcial; integrações e reconciliações ainda têm lacunas.

## Contexto

Asaas e Woovi têm contratos e capacidades distintas. A decisão de produto `DEC-BR-064` define Asaas para cartão recorrente e Woovi para PIX Automático, mantendo adaptadores separados e fatos normalizados no domínio interno. Esse registro técnico referencia a decisão de produto; não substitui nem reabre a escolha de providers.

## Decisão

Manter os contratos de cada provider atrás de adaptadores próprios e mapear seus fatos para estados internos de billing, em vez de expor o protocolo externo como estado de domínio. Preservar diferenças de capacidade por provider; a existência de status internos comuns não implica que os fluxos sejam funcionalmente equivalentes.

Esta ADR registra e confirma a arquitetura vigente em 2026-09-30. As fontes consultadas não preservam a data nem o rationale técnico original da escolha.

## Alternativas

Não foi encontrada comparação histórica sobre um único provider, uma interface genérica de adapter ou a localização dos módulos. Não se afirma que essas alternativas tenham sido avaliadas na decisão original. Os providers aprovados e seus papéis permanecem definidos por `DEC-BR-064`.

## Consequências e limites

- Cada integração mantém seus próprios formatos de request/response e mapeamentos de eventos; mudanças de provider devem preservar estados internos e explicitar fatos que não possam ser normalizados sem perda.
- A implementação atual tem adapters de comandos em `packages/billing` e reconciliações específicas em `apps/web`. Não há entrypoint que invoque os adapters de criação de assinatura; o checkout self-service não está completo.
- Somente o fluxo Asaas materializa invoices no código atual; Woovi associa tentativas à invoice existente e não cria invoice. As reconciliações de webhooks são síncronas e seus tópicos no outbox são `capture-only`.
- Testes com `fetch` controlado verificam respostas simuladas; não certificam comportamento de sandbox ou produção. Provider remoto, checkout, ordem/retry real e homologação permanecem sujeitos aos gates registrados em P43.
- `Accepted` descreve a decisão arquitetural vigente, não a implementação completa nem a homologação externa dos dois providers.

## Evidência

- [DEC-BR-064 no registro de decisões](../business-rules/decision-register.md) e [regras normativas aprovadas](../business-rules/normative/approved-rules.md) — decisão de produto/provedor e comportamento alvo.
- [Billing e assinaturas](../modules/subscriptions-and-billing.md) — estado de implementação e diferenças entre providers.
- [`packages/billing`](../../packages/billing/src/index.ts), [adapter Asaas](../../packages/billing/src/providers/asaas.ts) e [adapter Woovi](../../packages/billing/src/providers/woovi.ts) — estados e contratos internos.
- [Reconciliação Asaas](../../apps/web/src/integrations/asaas/billing-reconciliation.ts) e [reconciliação Woovi](../../apps/web/src/integrations/woovi/billing-reconciliation.ts) — mapeamentos observados.
- [Integrações externas](../architecture/external-integrations.md) e [prontidão de produção (P43)](../operations/production-readiness.md) — limites de evidência local e externa.
