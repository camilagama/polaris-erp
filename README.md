# DG Imports

SaaS self-serve em `Next.js 16` para operacao de revenda com organizacoes, isolamento por tenant, catalogo, estoque, vendas e metas.

## Stack

- `Next.js 16` com App Router
- `React 19`
- `Better Auth` com Google, magic link e organization plugin
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
```

## Modelo de acesso

- Cadastro publico em `/register` com Google ou magic link.
- Login em `/sign-in` com Google ou magic link.
- Primeiro acesso sem organizacao redireciona para `/onboarding`.
- Onboarding pede apenas o nome da organizacao e cria membership `owner`, categoria `Outros` e settings padrao silenciosas.
- Roles suportadas: `owner`, `admin`, `operator`. A role `viewer` foi removida.
- Nesta fase, cada workspace opera com um unico usuario `owner`.
- Gestao de membros e convites esta desativada ate o sprint multiusuario.
- `owner` e `admin` gerenciam configuracoes quando houver mais de uma role ativa.
- `operator` acessa operacao de catalogo, estoque e vendas.
- Margens, parcelas e taxas ficam em `Configuracoes`, nao no onboarding.
- Billing fica fora deste sprint.

Em `development` e `test` existe bootstrap interno de sessao em `/api/auth/dev/bootstrap-session`, protegido por `INTERNAL_BOOTSTRAP_SECRET`. Em `production`, esse endpoint so aceita bootstrap quando `ALLOW_PLAYWRIGHT_BOOTSTRAP=true`, para E2E com banco isolado.

## Tenancy

O schema principal fica em `src/db/schema.ts` e as migracoes em `src/db/migrations/`.

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

## Rate limit

O projeto usa `src/lib/rate-limit.ts`.

- Em `production`, configure `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`.
- Sem Upstash em `production`, endpoints sensiveis falham fechado.
- Em `development`/`test`, ha fallback em memoria para ergonomia local.

Upstash e preferivel aqui porque o app roda em ambiente serverless/multiplas instancias; `Map` local nao limita globalmente e reseta em cold starts.

## Imagens de produto

- Upload vai primeiro para o bucket de staging do R2 com chave namespaced por usuario (`staging/{userId}/...`).
- O app gera variantes finais `detail` e `table`.
- Entrega sempre passa por `/api/product-images/{organizationId}/{productId}/{version}/{variant}`.
- A rota valida sessao, membership da organizacao e posse do produto antes de servir bytes.
- A reconciliacao diaria limpa objetos orfaos sem retornar chaves completas no payload.
- Detalhes operacionais e de CORS: `docs/product-images-r2.md`.

## CI, healthcheck e observabilidade

- CI em `.github/workflows/ci.yml`: `bun run check`, `bun run test`, `bun run build`.
- Healthcheck: `GET /api/health` retorna `{ ok: true, timestamp }`.
- Diagnostico R2: `GET /api/internal/health/r2` com `Authorization: Bearer $CRON_SECRET`.
- Sentry baseline: `@sentry/nextjs` com `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, e opcionalmente `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN`.
- Deploy passo a passo: `docs/deploy-vercel.md`.

## Banco, E2E e producao

- Modelo de branches, `E2E_DATABASE_URL` e opt-in de banco compartilhado: `docs/database-environments.md`.
- Migracao SaaS e rollback: `docs/saas-organization-migration-runbook.md`.
- Limpeza destrutiva de producao: `docs/production-database-cleanup.md` e `docs/production-database-cleanup.sql`.

## Qualidade atual

Baseline esperado:

- `bun run check`
- `bun run test`
- `bun run build`
- `bun run knip`
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

Gap conhecido: E2E com OAuth/magic-link real depende do provedor externo de email/OAuth e deve rodar como smoke controlado em staging.
