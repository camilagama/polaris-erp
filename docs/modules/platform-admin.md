# Admin interno da plataforma

**Status:** guards, grants e ações locais confirmados; Vercel Authentication, projeto/deploy e sessão cross-origin não foram verificados externamente.
**Última verificação:** 2026-07-14.
**Commit analisado:** `886eda0` em `main`.

## Objetivo e separação

`apps/admin` é o console operacional interno, separado do app web no monorepo. Um papel de organização não concede acesso a esse console. O acesso combina uma sessão Better Auth com um grant de platform admin ativo; a interface declara Vercel Authentication como defesa adicional, mas essa configuração não é provada pelo repositório.

Fontes: `apps/admin/src/app/layout.tsx:AdminAppWrapper`, `apps/admin/src/lib/platform-admin-auth.ts:requirePlatformAdmin`, `apps/admin/src/app/forbidden.tsx:ForbiddenPage`, `apps/admin/vercel.json`.

## Identidade de platform admin

`createPlatformAdminAuth` extrai o usuário da sessão e procura um `platformAdmins` ativo, ligado a grant não revogado e não expirado. Quando há vários grants válidos, escolhe o de maior nível.

| Role | Rank | Uso observado |
| --- | ---: | --- |
| `support` | 1 | Leitura do console e criação de notas internas. |
| `operator` | 2 | Tudo de `support`, mais status de organização/billing e retry de outbox. |
| `owner` | 3 | Tudo de `operator`; nenhuma ação exclusiva de owner foi encontrada. |

Fontes: `packages/platform-auth/src/admin-guard.ts:roleRank`, `getPlatformAdminContext`, `requirePlatformAdmin`; `packages/db/src/schema.ts:platformAdmins`, `platformAdminGrants`. O teste confirma que organização admin não é platform admin, que grant ativo é exigido, que o maior grant vence e que role mínima é imposta: `packages/platform-auth/src/platform-admin-auth.test.ts`.

O fallback `PLATFORM_ADMIN_DEV_USER_ID` existe apenas em `NODE_ENV === "development"` e não substitui sessão/grant em produção. `packages/platform-auth/src/admin-guard.ts:createPlatformAdminAuth`.

## Proteção de páginas e respostas negativas

As páginas principais chamam `requirePlatformAdmin` e, em falha, chamam `forbidden()`. A apresentação local é `apps/admin/src/app/forbidden.tsx:ForbiddenPage`; o status HTTP exato do interrupt do framework não foi afirmado aqui.

| Recurso | Sem sessão ou sem grant | `support` | `operator` | `owner` | Evidência |
| --- | --- | ---: | ---: | ---: | --- |
| Dashboard, diretório, usuários, organizações, auditoria, eventos e billing | `forbidden()` | Sim | Sim | Sim | `apps/admin/src/app/layout.tsx`; `apps/web/src/lib/admin-app-protection.test.ts`. |
| Criar nota interna | Ação rejeita antes de mutar | Sim | Sim | Sim | `apps/admin/src/app/support-notes/actions.ts:createSupportNoteAction`. |
| Suspender/reativar organização | Ação rejeita antes de mutar | Não | Sim | Sim | `apps/admin/src/app/organizations/actions.ts:changeOrganizationStatusAction`. |
| Alterar assinatura para `active` ou `past_due` | Ação rejeita antes de mutar | Não | Sim | Sim | `apps/admin/src/app/billing/actions.ts:changeBillingSubscriptionStatusAction`. |
| Retry de outbox | Ação rejeita antes de mutar | Não | Sim | Sim | `apps/admin/src/app/events/actions.ts:retryOutboxEventAction`. |

O E2E demonstra a tela de acesso negado sem autenticação e acesso de roles bootstrapadas ao dashboard, mas não certifica Vercel Authentication ou OAuth real: `apps/admin/tests/e2e/admin-access.e2e.ts`.

## Ações perigosas e auditoria

| Ação | Validações | Efeito e auditoria |
| --- | --- | --- |
| Status de organização | Role mínima `operator`, `organizationId`, status permitido, motivo e confirmação; rate limit. | Atualiza `organization.status` para `active`/`suspended` e grava `organization.status_changed`. |
| Status de billing | Role mínima `operator`, status permitido, motivo e confirmação; ativação exige referência de evidência; rate limit. | Atualiza a assinatura e grava `billing.subscription.status_changed`. |
| Retry de outbox | Role mínima `operator`, ID obrigatório e rate limit. | Solicita retry; não altera o conteúdo do evento manualmente. |
| Nota de suporte | Role mínima `support`, corpo obrigatório e rate limit. | Grava nota interna associada opcionalmente a organização ou usuário. |

Fontes: `apps/admin/src/app/organizations/actions.ts:changeOrganizationStatusAction`, `apps/admin/src/app/billing/actions.ts:changeBillingSubscriptionStatusAction`, `apps/admin/src/app/events/actions.ts:retryEventAction`, `apps/admin/src/app/support-notes/actions.ts:createSupportNoteAction`; `packages/platform/src/platform-organization-mutations.ts:updatePlatformOrganizationStatus`; `packages/platform/src/platform-billing.ts:updatePlatformBillingSubscriptionStatus`; `packages/platform/src/platform-admin.ts:recordPlatformAuditEvent`.

O limite padrão é cinco ações por minuto, por combinação de ação, ator, alvo e IP. Em produção, ausência ou falha de Upstash falha fechado; fora de produção há fallback em memória. `packages/platform-auth/src/admin-rate-limit.ts:assertAdminRateLimit`; testes em `admin-rate-limit.test.ts`.

## Concessão, revogação e suspensão

`platform_admins` possui status `active`/`disabled`; grants têm role, motivo, emissor, expiração e revogação. O helper de bootstrap cria admin/grant e audit event em transação, e o script de bootstrap exige motivo e role válida.

| Capacidade | Estado |
| --- | --- |
| Bootstrap técnico de platform admin | Implementado para operação/script e E2E isolado. |
| Conceder grant pelo console | Não encontrado. |
| Revogar grant pelo console | Não encontrado. O guard respeita `revokedAt` se outro processo o preencher. |
| Desabilitar platform admin pelo console | Não encontrado. O guard respeita `platformAdmins.status`. |
| Ban/desban de usuário | Não encontrado. |
| Impersonation | Não encontrado. |
| Suspender/reativar organização | Implementado para `operator`/`owner`, com confirmação e auditoria. |

Fontes: `packages/platform/src/platform-admin.ts:bootstrapPlatformAdmin`, `scripts/bootstrap-platform-admin.ts`, `packages/db/src/schema.ts:platformAdmins`, `platformAdminGrants`, e ações do admin acima.

## Dados pessoais e isolamento

O diretório mascara emails para exibição, mas o console ainda manipula nome, IDs, roles, organizações, providers e resumo de sessões. Essas informações devem ser tratadas como PII operacional; `support` também pode ler as páginas protegidas, não somente criar notas. Fonte: `packages/platform/src/platform-directory.ts:redactEmail`, `listPlatformUsersForAdmin`, `getPlatformUserDetailForAdmin`.

As queries internas passam `app.platform_admin_id` dentro de transação. A migration versionada valida grant ativo com `has_active_platform_admin()` antes das policies de leitura/atualização aplicáveis. A ativação dessa policy no banco promovido e a role usada pelo deploy não foram verificadas nesta tarefa. Fontes: `packages/db/src/tenant-context.ts:withPlatformAdminContext`, `packages/db/src/migrations/20260713090000_platform_admin_rls_validation.sql`.

## Vercel Authentication e sessão entre origens

O texto da UI e a memória do projeto mencionam Vercel Authentication/deployment protection, e há configuração Vercel separada para o admin. Isso não confirma que a barreira está ativa em preview ou produção. A autenticação in-app continua sendo indispensável.

Além disso, `ADMIN_APP_URL` deve ser origem distinta em produção, mas a factory Better Auth do admin usa a origem canônica do web e não inclui `ADMIN_APP_URL` em `trustedOrigins`. Não existe callback/handler de Better Auth no admin. A sessão real entre as duas origens é **não confirmada** e requer verificação em ambiente controlado.

Fontes: `apps/admin/src/app/page.tsx:AdminDashboard`, `apps/admin/vercel.json`, `apps/web/src/ops/production-preflight.ts:validateProductionPreflight`, `packages/auth/src/auth.ts:createPolarisAuth`.

## Testes e lacunas

Testes locais: `packages/platform-auth/src/platform-admin-auth.test.ts`, `packages/platform-auth/src/admin-rate-limit.test.ts`, `apps/admin/src/app/billing/actions.test.ts`, `apps/admin/src/app/events/actions.test.ts`, `apps/admin/src/app/organizations/actions.test.ts`, `apps/admin/src/app/support-notes/actions.test.ts`, `apps/web/src/lib/admin-app-protection.test.ts` e `apps/admin/tests/e2e/admin-access.e2e.ts`.

Lacunas: login real do admin, Vercel Authentication, concessão/revogação administrativa, desabilitar admin, impersonation, ban/desban, escopo de PII por role e teste de RLS contra banco promovido.

## Referências principais

- `packages/platform-auth/src/admin-guard.ts:createPlatformAdminAuth`
- `apps/admin/src/lib/platform-admin-auth.ts:requirePlatformAdmin`
- `packages/platform-auth/src/admin-rate-limit.ts:assertAdminRateLimit`
- `packages/platform/src/platform-admin.ts:recordPlatformAuditEvent`
- `packages/db/src/tenant-context.ts:withPlatformAdminContext`
