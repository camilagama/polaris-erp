# Glossario

Este glossario cobre termos necessarios para navegar a arquitetura. Termos de auth, billing, banco e tenancy ganharao definicoes completas nos documentos especializados.

| Termo | Definicao observada | Fonte e evidencia |
| --- | --- | --- |
| `organization` | Workspace que delimita a operacao do cliente no app web. | `packages/db/src/schema.ts:organization`; **Confirmado no codigo**. |
| `member` | Registro de membership que relaciona usuario e organizacao. | `packages/db/src/schema.ts:member`; **Confirmado no codigo**. |
| `owner`, `admin`, `operator` | Roles mencionadas para a operacao da organizacao. O comportamento completo sera documentado com os guards. | `apps/web/src/lib/app-context.ts:ORGANIZATION_ROLES`; **Confirmado no codigo**. |
| platform admin | Operador interno com grant validado pelo app admin, distinto das roles da organizacao. | `apps/admin/src/lib/platform-admin-auth.ts:requirePlatformAdmin`; **Confirmado no codigo**. |
| tenant | Organizacao usada como escopo de dados e contexto de acesso. Nao e sinonimo de usuario. | `packages/db/src/tenant-context.ts`; **Confirmado no codigo**. |
| RLS | Row Level Security do PostgreSQL. A migration versionada habilita/forca RLS e cria policies tenant-scoped; o teste comportamental usa banco descartavel. A habilitacao no ambiente promovido depende de smoke/metadados externos. | `packages/db/src/migrations/20260707205000_rls_tenant_isolation.sql`; `packages/db/src/postgres-behavior.test.ts`; **Confirmado em migration e por teste**; ambiente promovido **nao confirmado**. |
| Route Handler | Endpoint do App Router exportando verbos HTTP sob `src/app/api`. | `apps/web/src/app/api/**/route.ts`; **Confirmado no codigo**. |
| Server Action | Funcao com diretiva `"use server"` invocada pela interface para mutar ou consultar dados protegidos. | `apps/web/src/features/*/actions.ts`; **Confirmado no codigo**. |
| outbox | Registro persistente de evento que pode ser claimed, processado, observado, reintentado ou ir para `dead_letter`. | `packages/events/src/index.ts:{claimOutboxEvent,markOutboxEventFailed}`; **Confirmado no codigo**. |
| webhook event | Captura deduplicada de evento recebido de um provedor externo. | `packages/events/src/index.ts:captureWebhookEvent`; **Confirmado no codigo**. |
| idempotency key | Chave usada para evitar efeitos repetidos em eventos ou operacoes que a suportam. | `packages/events/src/index.ts:enqueueOutboxEvent`; **Confirmado no codigo**. |
| Inngest | Runtime de jobs duraveis usado pelo endpoint `/api/inngest`. | `apps/web/src/app/api/inngest/route.ts`; **Confirmado no codigo**. |
| staging/final | Buckets R2 de imagem: staging recebe upload temporario; final armazena variantes processadas. | `apps/web/src/features/products/image-workflow.ts:storeProductImageFromStage`; **Confirmado no codigo**. |
| preflight | Validacao local/CI de contrato de ambiente antes de producao. Nao substitui validacao real de provedores. | `apps/web/src/ops/production-preflight.ts:validateProductionPreflight`; **Confirmado no codigo**. |

Nenhum termo adicional e confirmado nesta fundacao.
