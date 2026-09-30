# Polaris

Polaris e um SaaS para operacao de revenda. O app web atende a operacao de cada organizacao, com catalogo, estoque, vendas e metas. O app admin e uma superficie separada para operacao interna da plataforma.

Esta documentacao resume o comportamento observado no codigo versionado. Configuracoes externas, provedores e infraestrutura que nao podem ser comprovados pelo repositorio sao identificados como nao confirmados.

## Stack confirmada

- Bun e Turborepo para o monorepo.
- Next.js 16 e React 19 nos apps `@polaris/web` e `@polaris/admin`.
- Better Auth e Google OAuth para identidade.
- Drizzle ORM e PostgreSQL/Neon para persistencia.
- Cloudflare R2 para imagens de produtos, Upstash Redis para rate limit, Inngest para jobs e Sentry para observabilidade.
- Vitest e Playwright para testes.

Fonte: [package.json](package.json), [apps/web/package.json](apps/web/package.json) e [apps/admin/package.json](apps/admin/package.json). Evidencia: **Confirmado por configuracao**.

## Arquitetura resumida

- `apps/web`: app do cliente, Route Handlers, Server Actions, integracoes e jobs Inngest.
- `apps/admin`: console interno da plataforma; `apps/admin/vercel.json` descreve uma configuracao prevista para projeto Vercel separado. O projeto ativo nao foi confirmado.
- `packages/*`: modulos compartilhados de auth, banco, billing, eventos, plataforma, suporte E2E e UI.

O runtime web protege a area operacional por sessao, contexto de app e guards de action. O admin exige grant de platform admin no app. Os detalhes e limitacoes estao em [docs/architecture/overview.md](docs/architecture/overview.md).

## Requisitos e setup local

- Node.js 24.x para Next.js, CLIs com shebang `node` e runtime Vercel. A versão de desenvolvimento fica em [`.node-version`](.node-version); `engines.node` declara a linha de deploy nos manifests da raiz e do Admin.
- Bun para instalar dependências e executar scripts do projeto. A versão requerida é a de `packageManager` em [package.json](package.json).
- No Windows, confirme `node --version` antes de builds locais. `.node-version` é lido por gerenciadores compatíveis; sem um deles, atualize a instalação Node local manualmente.

1. Crie `.env.local` a partir de [.env.example](.env.example), sem versionar valores reais.
2. Instale dependências com `bun install`.
3. Inicie o web com `bun dev` ou o admin com `bun run dev:admin`.

Categorias de ambiente:

- URLs canonicas e Better Auth/Google;
- PostgreSQL/Neon, incluindo URL de runtime, URL direta de migration e bancos isolados de E2E/RLS;
- R2, Upstash, Inngest, Resend, Woovi, Asaas e Sentry;
- controles internos de bootstrap, health e reconciliacao.

Os nomes, finalidade e requisitos por ambiente ficam em [.env.example](.env.example). Nunca inclua valores, tokens, cookies ou connection strings em documentos, issues ou logs.

## Comandos principais

| Finalidade | Comando |
| --- | --- |
| Desenvolvimento web/admin | `bun dev` / `bun run dev:admin` |
| Check web/admin | `bun run check` / `bun run check:admin` |
| Testes unitarios | `bun run test` / `bun run test:admin` |
| Testes E2E | `bun run test:e2e` / `bun run test:e2e:admin` |
| Typecheck | `bun run typecheck:all` |
| Banco | `bun run db:generate`, `bun run db:migrate`, `bun run db:smoke:rls` |
| Preflight e smoke | `bun run prod:preflight`, `bun run deploy:smoke` |
| Links documentais | `bun run docs:check` |

Os scripts de banco e producao exigem ambiente apropriado. `db:push` so aceita o banco PostgreSQL descartavel local `polaris_push_scratch` pela URL `DATABASE_URL_PUSH_LOCAL`; qualquer banco remoto, inclusive branches Neon, usa migrations versionadas. Nunca execute migrations, smokes ou E2E contra producao. Fonte: [package.json](package.json), [regras do banco](packages/db/AGENTS.md) e [ambientes de banco](docs/architecture/database-environments.md).

## Limitacoes conhecidas

- A certificacao de infraestrutura externa ainda requer evidencia operacional: Vercel Authentication do admin, Neon/RLS em ambiente promovido, R2, Upstash, Inngest, Sentry, Google OAuth, Resend, Woovi e Asaas.
- Billing possui estruturas, reconciliacao e controles internos; checkout self-service nao foi confirmado nesta leitura.
- Gestao multiusuario de membros e convites esta descrita como desativada no estado atual do projeto.

Fontes: [preflight de producao](apps/web/src/ops/production-preflight.ts) e [SOP de ativacao manual de billing](docs/runbooks/manual-billing-activation-sop.md). Evidencia: a implementacao local e **confirmada no codigo/documentacao existente**; a validacao de provedores e **nao confirmada**.

## Documentacao

O [índice documental](docs/README.md) é o mapa de autoridade: direciona às fontes vigentes, ao estado operacional P43 e ao material histórico. As decisões aceitas e a sequência da fundação estão no [plano mestre](plans/fundacao-polaris-erp.md).

Documentos existentes de operacao: [ambientes de banco](docs/architecture/database-environments.md), [R2](docs/architecture/product-images-r2.md), [RLS](docs/architecture/rls-tenant-isolation.md) e [deploy Vercel](docs/runbooks/deploy-vercel.md).

O bootstrap e a configuracao externa do OAuth administrativo estao em [identidade administrativa](docs/runbooks/admin-identity-bootstrap.md).
