# Visao arquitetural

**Status:** confirmado no codigo e configuracao versionada, salvo observacoes de infraestrutura.  
**Ultima verificacao:** 2026-07-14.  
**Commit analisado:** `886eda0` em `main`.

Polaris e um monorepo Bun/Turborepo com dois apps Next.js e pacotes compartilhados. O web concentra a operacao de organizacoes; o admin concentra ferramentas internas da plataforma. O teste de fronteira impede que o admin importe diretamente o source tree do web; ele nao prova uma regra geral de dependencia reciproca entre os apps. Dependencias compartilhadas observadas ficam em `packages/*`.

```mermaid
flowchart LR
  Browser[Browser] --> Web[apps/web]
  Browser --> Admin[apps/admin]
  Web --> Auth[@polaris/auth]
  Web --> Db[@polaris/db]
  Web --> Events[@polaris/events]
  Web --> Billing[@polaris/billing]
  Web --> External[R2, Upstash, Inngest, Sentry, provedores]
  Admin --> Platform[@polaris/platform]
  Admin --> PlatformAuth[@polaris/platform-auth]
  Admin --> Db
  Events --> Db
```

Fonte do mapa: `package.json:workspaces`, `apps/web/package.json:dependencies`, `apps/admin/package.json:dependencies` e `packages/*/package.json:exports`. Evidencia: **Confirmado por configuracao**.

## Responsabilidades

- `apps/web`: paginas do cliente, Route Handlers, Server Actions, fluxos de produtos/vendas/metas, imagens e webhooks. Fontes: `apps/web/src/app/api/inngest/route.ts:GET`, `apps/web/src/features/products/actions.ts:createProductAction`, `apps/web/src/integrations/webhooks/intake.ts:observeWebhookIntake`.
- `apps/admin`: paginas internas para diretorio, organizacoes, usuarios, auditoria, eventos e billing. Fonte: `apps/admin/src/app/layout.tsx:AdminAppWrapper`.
- `@polaris/auth`: factory Better Auth, contrato de ambiente, sessao e politica de workspace. Fonte: `packages/auth/src/auth.ts:createPolarisAuth`.
- `@polaris/db`: cliente Drizzle/PostgreSQL, schema, migrations e contexto tenant. Fonte: `packages/db/src/index.ts:db`.
- `@polaris/events`: captura de webhook, outbox, lease, retry e deduplicacao. Fonte: `packages/events/src/index.ts:captureWebhookEvent`.
- `@polaris/platform` e `@polaris/platform-auth`: consultas/mutations internas e validacao de grant/rate limit do admin. Fonte: `packages/platform-auth/src/admin-guard.ts:createPlatformAdminAuth`, `apps/admin/src/lib/platform-admin-auth.ts:requirePlatformAdmin`.
- `@polaris/billing`: contratos e adaptadores de billing. Fonte: `packages/billing/package.json:exports`.
- `@polaris/emails`: templates transacionais e factory de sender compatível com Resend; nao e o handler de webhook nem o modulo de persistencia de email. Fonte: `packages/emails/src/index.ts:{renderWelcomeEmail,createResendEmailSender}`.
- `@polaris/e2e-support` e `@polaris/ui`: suporte de ambiente E2E e elementos de UI compartilhados. Fonte: `packages/e2e-support/package.json:exports`, `packages/ui/package.json:exports`.

## Limites relevantes

- O web usa `proxy` como barreira otimista; layouts e actions precisam continuar impondo sessao/contexto. Fonte: `apps/web/src/proxy.ts:proxy`. Evidencia: **Confirmado no codigo**.
- O admin chama `requirePlatformAdmin` no layout e nas actions. Fonte: `apps/admin/src/app/layout.tsx:getAdminContext`, `apps/admin/src/app/*/actions.ts`. Evidencia: **Confirmado no codigo**.
- O admin nao pode importar diretamente o source tree do web; o teste nao estabelece o inverso. Fonte: `apps/web/src/lib/admin-boundary.test.ts:admin app boundaries`. Evidencia: **Confirmado por teste**.
- A configuracao da raiz Vercel aponta para build do web. O admin possui `apps/admin/vercel.json`, o que indica projeto separado. A existencia e protecao desses projetos nao foi verificada externamente. Fonte: `vercel.json`, `apps/admin/vercel.json`. Evidencia: configuracao **confirmada**; infraestrutura **nao confirmada**.

## Runtime e qualidade

Turborepo coordena dev, build, testes, check, typecheck e scripts de banco. O workflow CI executa verificacoes web/admin, E2E isolado, testes comportamentais Postgres e gates manuais de operacao. Fonte: `turbo.json:tasks`, `.github/workflows/ci.yml`. Evidencia: **Confirmado por configuracao**.

Para fluxo detalhado, consulte [request lifecycle](request-lifecycle.md); para dependencias externas, [external integrations](external-integrations.md); para a arvore, [repository structure](repository-structure.md).
