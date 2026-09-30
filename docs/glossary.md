# Glossário técnico e arquitetural

Este glossário registra termos técnicos observados no código, no schema e nas operações. O vocabulário de produto e domínio está em [`CONTEXT.md`](../CONTEXT.md); o comportamento aprovado está em [Regras de negócio normativas](business-rules/normative/README.md).

| Termo técnico | Definição observada | Fonte e evidência |
| --- | --- | --- |
| `organization` | Identificador técnico do registro que persiste uma Organização; o significado de domínio está em `CONTEXT.md`. | `packages/db/src/schema.ts:organization`; **Confirmado no código**. |
| `member` | Registro de vínculo entre usuário e organização no schema. | `packages/db/src/schema.ts:member`; **Confirmado no código**. |
| `OrganizationRole` | O contrato atual contém somente a role `owner` em `ORGANIZATION_ROLES`; não indica `admin` ou `operator` como roles ativas de organização. | `apps/web/src/lib/app-context.ts:ORGANIZATION_ROLES`; **Confirmado no código**. |
| platform admin | Operador interno com grant validado pelo app admin, distinto das roles da organização. | `apps/admin/src/lib/platform-admin-auth.ts:requirePlatformAdmin`; **Confirmado no código**. |
| `tenant` | Termo técnico para o mecanismo que delimita dados e contexto de acesso por organização; não é sinônimo de Organização no vocabulário de produto. | `packages/db/src/tenant-context.ts`; **Confirmado no código**. |
| RLS | Row Level Security do PostgreSQL. A migration versionada habilita/força RLS e cria policies tenant-scoped; o teste comportamental usa banco descartável. A habilitação no ambiente promovido depende de smoke/metadados externos. | `packages/db/src/migrations/20260707205000_rls_tenant_isolation.sql`; `packages/db/src/postgres-behavior.test.ts`; **Confirmado em migration e por teste**; ambiente promovido **não confirmado**. |
| Route Handler | Endpoint do App Router exportando verbos HTTP sob `src/app/api`. | `apps/web/src/app/api/**/route.ts`; **Confirmado no código**. |
| Server Action | Função com diretiva `"use server"` invocada pela interface para mutar ou consultar dados protegidos. | `apps/web/src/features/*/actions.ts`; **Confirmado no código**. |
| outbox | Registro persistente de evento que pode ser claimed, processado, observado, reintentado ou ir para `dead_letter`. | `packages/events/src/index.ts:{claimOutboxEvent,markOutboxEventFailed}`; **Confirmado no código**. |
| webhook event | Captura deduplicada de evento recebido de um provedor externo. | `packages/events/src/index.ts:captureWebhookEvent`; **Confirmado no código**. |
| idempotency key | Chave usada para evitar efeitos repetidos em eventos ou operações que a suportam. | `packages/events/src/index.ts:enqueueOutboxEvent`; **Confirmado no código**. |
| Inngest | Runtime de jobs duráveis usado pelo endpoint `/api/inngest`. | `apps/web/src/app/api/inngest/route.ts`; **Confirmado no código**. |
| staging/final | Buckets R2 de imagem: staging recebe upload temporário; final armazena variantes processadas. | `apps/web/src/features/products/image-workflow.ts:storeProductImageFromStage`; **Confirmado no código**. |
| preflight | Validação local/CI de contrato de ambiente antes de produção. Não substitui validação real de provedores. | `apps/web/src/ops/production-preflight.ts:validateProductionPreflight`; **Confirmado no código**. |

Este glossário descreve evidência técnica local; não confirma configurações externas ou estado de produção.
