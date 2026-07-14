# Assinaturas e billing

**Status:** estado canônico, onboarding, admin e reconciliação de webhooks confirmados. Checkout self-service não foi encontrado. **Commit:** `886eda0`.

## Escopo e dados

O billing pertence à organização. `billing_plans` é catálogo global; `billing_customers`, `billing_subscriptions`, invoices, attempts e provider links são tenant-scoped. Onboarding cria cliente e assinatura no primeiro plano ativo com status `incomplete`. Fonte: `apps/web/src/features/onboarding/server.ts:createInitialOrganizationForUser`, `packages/db/src/schema.ts`.

| Estado de assinatura | Acesso operacional |
| --- | ---: |
| `active` | Sim |
| `trialing`, `past_due`, `paused`, `canceled`, `incomplete` | Não |

`hasBillableAccess` reconhece somente `active`. O schema permite os demais estados, mas não foram encontrados fluxos de checkout, trial, grace period, upgrade, downgrade, cancelamento por cliente ou reembolso que os produzam. Fonte: `packages/billing/src/index.ts:hasBillableAccess`.

## Operação manual

Não há entrypoint que invoque os adaptadores de criação de assinatura Asaas/Woovi. A página bloqueada orienta suporte/ativação manual e o console interno permite a `operator`/`owner` mudar somente `active` ou `past_due`. Ativação exige confirmação, motivo e referência de evidência; a alteração e `billing.subscription.status_changed` são transacionais. Fontes: `apps/admin/src/app/billing/actions.ts:changeBillingSubscriptionStatusAction`, `packages/platform/src/platform-billing.ts:updatePlatformBillingSubscriptionStatus`.

## Webhooks e idempotência

Asaas e Woovi reconciliam eventos para a assinatura local por referência/correlação e podem criar links externos e payment attempts. Somente o fluxo Asaas materializa `billing_invoices` neste código; ele usa advisory lock por pagamento e unicidade de links/attempts. Woovi associa links à assinatura e insere attempt para a invoice mais recente já existente, com `ON CONFLICT DO NOTHING`; não cria invoice. Eventos sem referência reconhecível ficam em `review` e o webhook é marcado `failed` com `manual_review`.

| Provider | Mapeamentos confirmados |
| --- | --- |
| Asaas | confirmação/recebimento → `active`; overdue/captura recusada → `past_due`; subscription `INACTIVE` → `canceled` |
| Woovi | `PIX_AUTOMATIC_APPROVED` → `active`; `PIX_AUTOMATIC_COBR_REJECTED` → `past_due`; `CANCEL` → `canceled`; `PIX_AUTOMATIC_COBR_TRY_REJECTED` registra attempt `failed`, sem transição de assinatura neste mapeamento |

O intake deduplica provider/event e a reconciliação é síncrona; o outbox desses tópicos é `observed` capture-only, não retry assíncrono da reconciliação. Ver também `packages/events/src/index.ts`.

## RLS, testes e lacunas

As cinco tabelas tenant-scoped de billing têm RLS/FORCE versionada, acesso de job interno e leitura de platform admin; somente `billing_subscriptions` recebe update administrativo por policy. Testes cobrem acesso por status, mapeamentos, duplicidade e concorrência Asaas: `packages/billing/src/billing-domain.test.ts`, `apps/web/src/integrations/asaas/billing-reconciliation.test.ts`, `apps/web/src/integrations/woovi/billing-reconciliation.test.ts` e `apps/web/src/integrations/asaas/billing-reconciliation.postgres.test.ts`.

Permanecem não confirmados: provider em produção, ordem/retry real de webhooks, reconciliação periódica, checkout, grace period, planos/entitlements efetivamente aplicados e ambiente RLS promovido.

## Referências

- `packages/billing/src/index.ts`
- `apps/web/src/integrations/asaas/billing-reconciliation.ts`
- `apps/web/src/integrations/woovi/billing-reconciliation.ts`
- `packages/db/src/migrations/20260713090000_platform_admin_rls_validation.sql`
