# Polaris

SaaS self-serve em `Next.js 16` para operacao de revenda com organizacoes, isolamento por tenant, catalogo, estoque, vendas e metas.

## Stack

- `Next.js 16` com App Router
- `React 19`
- `Better Auth` com Google OAuth, organization plugin, Infrastructure Dashboard e Sentinel
- `Drizzle ORM` com PostgreSQL/Neon
- `Tailwind CSS 4` e `shadcn/ui`
- `Vitest` para testes unitarios e de integracao
- `Playwright` para fluxos E2E principais
- `Cloudflare R2` para staging e variantes finais de imagem
- `Upstash Redis` para rate limit distribuido em ambientes serverless

## Scripts

```bash
bun dev
bun run build
bun run test
bun run test:e2e
bun run check
bun run fix
bun run knip
bun run db:generate
bun run db:migrate
bun run prod:preflight
bun run deploy:smoke
bun run db:smoke:rls
bun run db:analyze:listings
```

## Modelo de acesso

- Cadastro publico em `/register` com Google.
- Login em `/sign-in` com Google.
- Primeiro acesso sem organizacao redireciona para `/onboarding`.
- Onboarding pede apenas o nome da organizacao e cria membership `owner`, categoria `Outros` e settings padrao silenciosas.
- Roles suportadas: `owner`, `admin`, `operator`. A role `viewer` foi removida.
- Nesta fase, cada workspace opera com um unico usuario `owner`.
- Gestao de membros e convites esta desativada ate o sprint multiusuario.
- `owner` e `admin` gerenciam configuracoes quando houver mais de uma role ativa.
- `operator` acessa operacao de catalogo, estoque e vendas.
- Margens, parcelas e taxas ficam em `Configuracoes`, nao no onboarding.
- Billing fica fora deste sprint.

Em `development` e `test` existe bootstrap interno de sessao em `/api/auth/dev/bootstrap-session`, protegido por `INTERNAL_BOOTSTRAP_SECRET`. Em `production`, esse endpoint e sempre bloqueado, mesmo com `ALLOW_PLAYWRIGHT_BOOTSTRAP=true`.

## Tenancy

O schema principal fica em `packages/db/src/schema.ts` e as migracoes em `packages/db/src/migrations/`. O app web mantem wrappers curtos em `apps/web/src/db/*` para compatibilidade de imports internos.

Tabelas SaaS:

- `organization`: workspace/tenant com `status`
- `member`: membership interna que liga o owner ao workspace
- `audit_events`: trilha de auditoria por organizacao

Tabelas de dominio com `organization_id` obrigatorio:

- `categories`
- `system_settings`
- `products`
- `product_price_changes`
- `product_stock_entries`
- `product_stock_write_offs`
- `sales`
- `sale_items`
- `goals`

Queries/actions por ID devem filtrar por `id + organizationId`. Chaves de imagem finais usam `organizations/{organizationId}/products/{productId}/...`.

RLS e obrigatorio antes de producao aberta. O runtime deve usar uma role sem `BYPASSRLS`, e acessos tenant-scoped devem passar por contexto transacional (`app.organization_id`). Para validar o ambiente promovido, rode `bun run db:smoke:rls`.

## Rate limit

O projeto usa `src/lib/rate-limit.ts`.

- Em `production`, configure `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`.
- Sem Upstash em `production`, endpoints sensiveis falham fechado.
- Em `development`/`test`, ha fallback em memoria para ergonomia local.

Upstash e preferivel aqui porque o app roda em ambiente serverless/multiplas instancias; `Map` local nao limita globalmente e reseta em cold starts.

## Imagens de produto

- Upload vai primeiro para o bucket de staging do R2 com chave namespaced por organizacao e usuario (`staging/{organizationId}/{userId}/...`).
- O app gera variantes finais `detail` e `table`.
- Entrega sempre passa por `/api/product-images/{organizationId}/{productId}/{version}/{variant}`.
- A rota valida sessao, membership da organizacao e posse do produto antes de servir bytes.
- A reconciliacao diaria limpa objetos orfaos sem retornar chaves completas no payload.
- Detalhes operacionais e de CORS: `docs/product-images-r2.md`.

## CI, healthcheck e observabilidade

- CI em `.github/workflows/ci.yml`: `bun run check`, `bun run test`, `bun run knip`, `bun run build`, E2E isolado e jobs manuais `production-preflight`/`rls-smoke`/`deployment-smoke`.
- Healthcheck: `GET /api/health` retorna status sanitizado com `checks.database.ok`.
- Diagnostico R2: `GET /api/internal/health/r2` com `Authorization: Bearer $INTERNAL_R2_HEALTH_SECRET`.
- Sentry baseline: `@sentry/nextjs` com `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, e opcionalmente `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN`.
- Deploy passo a passo: `docs/deploy-vercel.md`.

## Banco, E2E e producao

- Modelo de branches, roles, `E2E_DATABASE_URL` e `RLS_DATABASE_URL`: `docs/database-environments.md`.
- Antes de deploy real, rode `bun run prod:preflight` com envs de producao ou acione o job manual `production-preflight`.
- Para smoke HTTP do deploy promovido, defina `DEPLOYMENT_SMOKE_URL` e rode `bun run deploy:smoke`; ele valida `/api/health`, `/sign-in`, redirect do Google OAuth e bootstrap interno 403. Com `INTERNAL_R2_HEALTH_SECRET`, tambem valida o health interno do R2.
- Opcional: para validar planos de listagem em dataset representativo, defina `PERFORMANCE_ORGANIZATION_ID` e rode `bun run db:analyze:listings`.
- Migracao SaaS e rollback: `docs/saas-organization-migration-runbook.md`.
- Limpeza destrutiva de producao: `docs/production-database-cleanup.md` e `docs/production-database-cleanup.sql`.

## Qualidade atual

Baseline esperado:

- `bun run check`
- `bun run test`
- `bun run build`
- `bun run knip`
- `bun run prod:preflight` com envs de producao
- `bun run deploy:smoke` com `DEPLOYMENT_SMOKE_URL`
- `bun run db:smoke:rls`
- `bun run test:e2e` com `E2E_DATABASE_URL` isolado

Fluxos E2E cobertos hoje:

- redirecionamento publico/protegido
- login tecnico de dev/test com sessao bootstrapada
- cadastro de produto
- entrada e baixa de estoque
- venda, cancelamento e estorno
- alteracao de preco com preservacao de snapshot
- cartao com taxa no cliente e no vendedor
- arquivamento de produto

Gap conhecido: E2E com OAuth Google real depende do provedor externo e deve rodar como smoke controlado em staging.
