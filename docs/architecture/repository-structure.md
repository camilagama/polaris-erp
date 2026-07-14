# Estrutura do repositorio

**Status:** confirmado por arquivos versionados.  
**Ultima verificacao:** 2026-07-14.  
**Commit analisado:** `886eda0` em `main`.

```text
apps/
  web/                 app operacional do cliente
  admin/               console interno
packages/
  auth/                Better Auth, sessao e ambiente
  billing/             contratos/adaptadores Asaas e Woovi
  config/              tsconfig compartilhado
  db/                  Drizzle, schema, migrations e contexto tenant
  e2e-support/         ambiente de teste E2E
  emails/              contratos de email
  events/              webhook/outbox/idempotencia
  platform/            consultas e mutations internas
  platform-auth/       guard e rate limit do admin
  ui/                  primitives e hooks de interface
scripts/               gates, smoke, preflight e utilitarios operacionais
docs/                  arquitetura, runbooks, relatorios e plano documental
```

Fonte: `package.json:workspaces`, `apps/*/package.json`, `packages/*/package.json` e `scripts/*`. Evidencia: **Confirmado por configuracao**.

## App web

- Entrypoints App Router: `apps/web/src/app/**`.
- Rotas HTTP: `apps/web/src/app/api/**/route.ts`.
- Modulos do produto: `apps/web/src/features/{catalog,goals,onboarding,products,sales}/`.
- Integracoes: `apps/web/src/integrations/{asaas,resend,webhooks,woovi}/`.
- Runtime transversal: `apps/web/src/lib/{rate-limit,instrumentation,health,inngest-functions}.ts` e `apps/web/src/proxy.ts`.

O nome correto do arquivo de jobs e `inngest-functions.ts`; a grafia acima em qualquer fonte antiga deve ser tratada como erro tipografico. Evidencia: **Confirmado no codigo**.

## App admin

- Entrypoints: `apps/admin/src/app/**`.
- Acoes de operacao: `apps/admin/src/app/{billing,events,organizations,support-notes}/actions.ts`.
- Adaptadores locais: `apps/admin/src/lib/{platform-admin-auth,deployment-smoke}.ts`.
- Health: `apps/admin/src/app/api/health/route.ts:GET`.

## Configuracao transversal

- `turbo.json`: entradas de ambiente e tarefas do monorepo.
- `.github/workflows/ci.yml`: verificacao, E2E, comportamento Postgres e gates manuais.
- `vercel.json` e `apps/admin/vercel.json`: configuracao de build para web e admin.
- `.env.example`: contrato de ambiente sem valores reais.
- `knip.config.ts`, `biome.jsonc` e `lefthook.yml`: higiene de codigo e hooks.

## Fonte historica a evitar

`tree.txt` descreve uma estrutura antiga de app unico e nao corresponde aos caminhos atuais em `apps/` e `packages/`. Deve ser marcado como obsoleto ou regenerado em tarefa futura. Evidencia: **Contradicao entre fontes**.

Veja tambem [visao arquitetural](overview.md) e [ciclo de request](request-lifecycle.md).
