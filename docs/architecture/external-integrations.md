# Integracoes externas

**Status:** contratos e chamadas locais confirmados; credenciais, configuracao remota e certificacao de ambientes nao foram verificadas.  
**Ultima verificacao:** 2026-07-14.  
**Commit analisado:** `886eda0` em `main`.

| Integracao | Uso observado | Fonte | Evidencia e lacuna |
| --- | --- | --- | --- |
| PostgreSQL/Neon | Drizzle, runtime, migrations, RLS smoke e analise de planos. | `packages/db/src/index.ts`; `package.json`; `scripts/smoke-rls-runtime.cjs` | **Confirmado no codigo/configuracao**. Branch, role e ambiente promovido: **nao confirmados**. |
| Better Auth e Google | Sessao, auth handler e inicio do OAuth Google. | `packages/auth/src/auth.ts`; `apps/web/src/app/api/auth/[...all]/route.ts`; `apps/web/src/app/api/auth/google/route.ts` | **Confirmado no codigo**. Provider remoto e callback cadastrado: **nao confirmados**. |
| Cloudflare R2 | Upload pre-assinado para staging, processamento, variantes finais e reconciliacao. | `apps/web/src/features/products/{image-storage,image-workflow,image-reconcile}.ts` | **Confirmado no codigo**. Buckets, CORS e lifecycle reais: **nao confirmados**. |
| Upstash Redis | Rate limit distribuido; producao falha fechado sem provider. | `apps/web/src/lib/rate-limit.ts:checkRateLimit` | **Confirmado no codigo**. Redis remoto: **nao confirmado**. |
| Inngest | Endpoint de jobs, processamento de outbox e cron de imagens. | `apps/web/src/app/api/inngest/route.ts`; `apps/web/src/lib/inngest-functions.ts`; `apps/web/src/features/products/image-reconcile-inngest.ts` | **Confirmado no codigo**. Registro/sincronizacao remota: **nao confirmado**. |
| Asaas | Adaptador de assinatura de cartao e webhook com token. | `packages/billing/src/providers/asaas.ts:createAsaasBillingAdapter`; `apps/web/src/integrations/asaas/webhook.ts:handleAsaasWebhook`; `apps/web/src/integrations/asaas/webhook.test.ts:Asaas webhook foundation` | **Confirmado no codigo e por teste unitario/source**. Sandbox/producao e checkout exposto: **nao confirmados**. |
| Woovi | Adaptador Pix recorrente e webhook HMAC. | `packages/billing/src/providers/woovi.ts:createWooviBillingAdapter`; `apps/web/src/integrations/woovi/webhook.ts:handleWooviWebhook`; `apps/web/src/integrations/woovi/webhook.test.ts:Woovi webhook foundation` | **Confirmado no codigo e por teste unitario/source**. Sandbox/producao: **nao confirmados**. |
| Resend | Email transacional e webhook Svix. | `apps/web/src/integrations/resend/{email-service,webhook}.ts`; `apps/web/src/integrations/resend/email-service-source.test.ts:email service and Resend webhook` | **Confirmado no codigo e por teste source**. Dominio/remetente e webhook remotos: **nao confirmados**. |
| Sentry | Instrumentacao de erros, traces e replay condicional. | `apps/web/src/instrumentation*.ts`; `apps/admin/src/instrumentation*.ts` | **Confirmado no codigo**. DSN, alertas e retencao: **nao confirmados**. |
| Vercel | Build web na raiz e configuracao separada do admin. | `vercel.json`; `apps/admin/vercel.json`; `apps/*/next.config.ts` | **Confirmado por configuracao**. Deploy ativo e Vercel Authentication: **nao confirmados**. |

## Contratos operacionais

`.env.example` classifica variaveis por finalidade sem armazenar valores. `validateProductionPreflight` valida presenca, separacao de origens e algumas propriedades do ambiente de producao. Fonte: `.env.example`, `apps/web/src/ops/production-preflight.ts:validateProductionPreflight`. Evidencia: **Confirmado no codigo/configuracao**.

O preflight nao e uma prova de disponibilidade, configuracao de console ou certificacao dos provedores. A documentacao operacional deve preservar essa diferenca.

## Webhooks

Os handlers limitam tamanho de request, validam assinatura/token antes do intake e redigem cabecalhos sensiveis na captura. Fonte: `apps/web/src/integrations/{asaas,woovi,resend}/webhook.ts`, `packages/events/src/index.ts:{redactWebhookHeaders,captureWebhookEvent}`, `apps/web/src/integrations/{asaas,woovi}/webhook.test.ts` e `apps/web/src/integrations/resend/email-service-source.test.ts`. Evidencia: **Confirmado no codigo e por testes unitarios/source**; nao ha prova de recebimento por provedor real nesta leitura.

Nenhum segredo, URL interna ou dado de cliente e documentado aqui.
