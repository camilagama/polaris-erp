# Visao arquitetural

- **Status:** fatos arquiteturais confirmados no codigo/configuracao; a matriz registra o contrato aprovado e o guard local aguarda revisao.
- **Ultima verificacao:** 2026-10-01.
- **Base analisada:** checkout local; o novo guard de dependencias do workspace aguarda revisao.

Polaris e um monorepo Bun/Turborepo com dois apps Next.js e pacotes compartilhados. O web concentra a operacao de organizacoes; o admin concentra ferramentas internas da plataforma. A matriz abaixo define a direcao permitida dos imports entre apps e packages. Dependencias compartilhadas observadas ficam em `packages/*`.

```mermaid
flowchart LR
  Browser[Browser] --> Web[apps/web]
  Browser --> Admin[apps/admin]
  Web --> Auth[@polaris/auth]
  Web --> Billing[@polaris/billing]
  Web --> Date[@polaris/date]
  Web --> Db[@polaris/db]
  Web --> E2E[@polaris/e2e-support]
  Web --> Emails[@polaris/emails]
  Web --> Events[@polaris/events]
  Web --> UI[@polaris/ui]
  Web --> External[R2, Upstash, Inngest, Sentry, provedores]
  Admin --> Auth
  Admin --> Date
  Admin --> Platform[@polaris/platform]
  Admin --> PlatformAuth[@polaris/platform-auth]
  Admin --> Db
  Admin --> E2E
  Admin --> UI
  Auth --> Db
  Events --> Db
  Platform --> Billing
  Platform --> Date
  Platform --> Db
  Platform --> Events
  PlatformAuth --> Db
  UI --> Date
```

Fonte do mapa: `package.json:workspaces`, `apps/*/package.json:dependencies`, `packages/*/package.json:dependencies` e `packages/*/package.json:exports`. Evidencia: **Confirmado por configuracao**.

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

## Direcao de dependencias

| Origem | Destino permitido | Regra |
|---|---|---|
| Um app (`apps/web` ou `apps/admin`) | O proprio app | Imports internos por alias ou caminho relativo permanecem dentro do source do app. |
| Um app | `packages/*` | O app declara dependencia direta `workspace:*` e importa somente um entry point publico declarado em `package.json:exports`. |
| Um app | O outro app | Proibido importar source de Web em Admin ou de Admin em Web. |
| Um package | O proprio package | Imports internos permanecem dentro do source do package. |
| Um package | Outro package | Requer dependencia direta `workspace:*` e entry point publico exportado; o grafo de dependencias dos packages deve ser aciclico. |
| Um package | `apps/*` | Proibido importar source de qualquer app. |

`apps/web/src/lib/workspace-boundaries.test.ts` verifica essa matriz para arquivos `.ts`, `.tsx`, `.mts` e `.cts` em `apps/*/src` e `packages/*/src`, resolvendo imports com o `tsconfig.json` de cada projeto. A coleta por AST inclui imports estaticos e type-only, side-effect imports, re-exports, imports dinamicos, `import()` usado em tipos, `import = require()` e chamadas literais a `require()`. O teste inclui fixtures permitidas/proibidas e deteccao de ciclos. `audit:boundaries` continua separado: ele protege a semantica de auditoria transacional, nao o grafo de imports.

## Limites relevantes

- O web usa `proxy` como barreira otimista; layouts e actions precisam continuar impondo sessao/contexto. Fonte: `apps/web/src/proxy.ts:proxy`. Evidencia: **Confirmado no codigo**.
- O admin chama `requirePlatformAdmin` no layout e nas actions. Fonte: `apps/admin/src/app/layout.tsx:getAdminContext`, `apps/admin/src/app/*/actions.ts`. Evidencia: **Confirmado no codigo**.
- Imports entre Web/Admin sao proibidos nos dois sentidos; packages nao podem importar source dos apps. Fonte: `apps/web/src/lib/workspace-boundaries.test.ts:workspace dependency boundaries`. A implementacao local do guard aguarda revisao; os testes focais passaram em 2026-10-01.
- A configuracao da raiz Vercel aponta para build do web. O admin possui `apps/admin/vercel.json`, o que indica projeto separado. A existencia e protecao desses projetos nao foi verificada externamente. Fonte: `vercel.json`, `apps/admin/vercel.json`. Evidencia: configuracao **confirmada**; infraestrutura **nao confirmada**.

## Runtime e qualidade

Turborepo coordena dev, build, testes, check, typecheck e scripts de banco. O workflow CI executa verificacoes web/admin, E2E isolado, testes comportamentais Postgres e gates manuais de operacao. Fonte: `turbo.json:tasks`, `.github/workflows/ci.yml`. Evidencia: **Confirmado por configuracao**.

Para fluxo detalhado, consulte [request lifecycle](request-lifecycle.md); para dependencias externas, [external integrations](external-integrations.md); para a arvore, [repository structure](repository-structure.md).
