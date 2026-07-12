# Revisao Pos-Extracao Auth - Monorepo e Admin Interno

> Nota de supersessao, 2026-07-12: este relatorio e um snapshot historico. Qualquer recomendacao de Cloudflare Access para o admin foi substituida pelo plano atual em `docs/superpowers/plans/2026-07-10-production-readiness-pr-plan.md`: admin separado em Vercel com Vercel Authentication/deployment protection e guard in-app de platform admin.

Data: 2026-07-09  
Escopo: `apps/admin`, `apps/web`, packages compartilhados, plano `docs/reports/admin-monorepo-implementation-plan.md`, Neon via plugin, gates de producao e checks locais.

## Veredito

No-go para producao ampla, mas o bloqueio arquitetural principal foi reduzido.

`apps/admin` nao depende mais de `apps/web/src` por alias TypeScript. O alias do admin voltou para `"@/*": ["./src/*"]`, `@polaris/auth` foi extraido para Better Auth/session/env compartilhados, e o source test de boundary agora exige zero imports temporarios do web.

O que ainda bloqueia producao e infraestrutura real: migrations aplicadas no ambiente real via `DATABASE_URL_DIRECT`, runtime role real sem owner/BYPASSRLS, Cloudflare Access, Vercel Preview Protection, OAuth real, Sentry alerts, Upstash, R2 lifecycle, primeiro platform admin auditavel e smokes no deploy promovido.

## Evidencia Verificada

- `apps/admin/tsconfig.json`: alias local apenas para `./src/*`.
- Scan de `packages/*`: nenhum import para `apps/web`, `apps/admin` ou `@/`.
- `apps/web/src/lib/admin-boundary.test.ts`: allowlist temporaria vazia.
- `@polaris/auth`: criado com Better Auth config, env auth/bootstrap, session helpers e workspace policy.
- `apps/web/src/lib/auth.ts`: wrapper que injeta `recordAuthLoginAuditEvent`, preservando audit de login tenant.
- `apps/admin/src/lib/auth.ts`: wrapper admin sem dependencia do web.
- `apps/admin/src/lib/session.ts`: session helper local.
- Neon plugin: projeto `polaris-erp`, regiao `aws-sa-east-1`, PostgreSQL 18, default branch `production`.
- Neon plugin reautenticado nesta sessao: projeto `polaris-erp` (`autumn-feather-14038163`) acessivel por leitura; computes read-write encontrados nos branches `br-empty-frog-acrcn1aj`, `br-quiet-unit-ac8k3rxs` e `br-flat-cherry-acbnuhz4`.

## Achados Bloqueantes

### 1. Gates externos de producao sem evidencia

Ainda pendente:

- Migrations aplicadas em producao via `DATABASE_URL_DIRECT`.
- Runtime `DATABASE_URL` usando role sem owner/admin e sem `BYPASSRLS`.
- Cloudflare Access ativo para `admin.*`.
- Vercel Preview/Deployment Protection ativo.
- Admin inacessivel por URL publica de preview.
- OAuth app/admin validado nas origens reais.
- Sentry alerts para webhook/outbox/admin.
- Upstash configurado em producao.
- R2 lifecycle aplicado no bucket staging.
- Primeiro platform admin criado por script auditavel.

Impacto: o codigo local esta validado, mas a superficie admin ainda pode ficar exposta por configuracao de deploy ou banco.

### 2. Neon production precisa endurecimento

Evidencia do plugin Neon:

- Projeto `polaris-erp` em org `Summit`, regiao `aws-sa-east-1`, PostgreSQL 18.
- Settings do projeto: `allowed_ips` vazio, `block_public_connections=false`, `history_retention_seconds=21600`.
- Branch/compute mais ativo observado: `br-quiet-unit-ac8k3rxs` via compute `ep-cold-flower-achjhx8y`.
- Connection string default do branch ativo usa role `neondb_owner` e `sslmode=require`; nao deve ser usada como runtime.
- Role `polaris_app` existe no branch ativo, mas a connection string gerada pelo Neon tambem vem com `sslmode=require`; URLs reais de producao ainda precisam ser ajustadas para `sslmode=verify-full`.
- Branch default `production` existe e esta `protected: false`.
- Projeto em `free_v3`, `history_retention_seconds=21600`.
- `allowed_ips` vazio e `block_public_connections: false`.
- Connection string default retornada pelo plugin usa role proprietaria; nao deve ser usada como runtime.
- Connection string default usa `sslmode=require`; builds tambem avisam para migrar para `sslmode=verify-full`.

Acao exigida antes de producao:

1. Proteger branch `production`.
2. Criar/confirmar role runtime sem `BYPASSRLS`.
3. Configurar `DATABASE_URL` runtime com role runtime e `sslmode=verify-full`.
4. Reservar `DATABASE_URL_DIRECT` para migrations.
5. Rodar `bun run db:smoke:rls` contra ambiente promovido.

### 3. `@polaris/db` agora possui ownership local de migrations

Status: resolvido localmente apos esta revisao.

- Schema/client/tenant-context, `drizzle.config.ts` e migrations estao em `packages/db`.
- Scripts root `db:generate`, `db:migrate`, `db:push` e `db:studio` rodam contra `@polaris/db`.
- `apps/web/src/db/*` mantem wrappers curtos de compatibilidade para imports internos existentes.

Risco residual: a aplicacao das migrations em producao continua gate externo e deve usar `DATABASE_URL_DIRECT`, nao a role runtime.

## Achados Importantes

### 4. Rate limit admin

Nao esta pendente para as mutacoes admin existentes.

Evidencia: `assertAdminRateLimit` esta em `@polaris/platform-auth/admin-rate-limit` e e usado nas mutacoes sensiveis atuais, incluindo status de organizacao, support notes e retry de eventos. O que falta e validar Upstash real em producao.

### 5. Outbox/Inngest

Faz sentido usar Inngest no lugar de runner caseiro para processamento duravel. A base Inngest existe e os eventos/outbox foram extraidos para `@polaris/events`.

Risco restante: dispatchers reais de email/billing/reconcile e credenciais Inngest precisam ser validados no deploy. Sem isso, a fundacao existe, mas a operacao assincroma ainda nao esta provada fim a fim.

### 6. Testes de packages ainda vivem majoritariamente no web

Os testes passaram, mas muitos testes de platform/auth ainda moram em `apps/web/src/lib`. Agora que `@polaris/auth`, `@polaris/platform` e `@polaris/platform-auth` existem, uma melhoria natural e mover testes para os packages donos.

## Implementado Nesta Passada

- Criado `packages/auth/package.json`.
- Criado `packages/auth/src/auth.ts` com factory `createPolarisAuth`.
- Criado `packages/auth/src/env.ts` com contrato minimo de env para auth/bootstrap.
- Criado `packages/auth/src/session.ts` com `createSessionHelpers`.
- Criado `packages/auth/src/workspace-management-policy.ts`.
- Atualizado `apps/web/src/lib/auth.ts` para usar `createPolarisAuth` e manter audit hook.
- Atualizado `apps/web/src/lib/session.ts` para usar `@polaris/auth/session`.
- Criado `apps/admin/src/lib/auth.ts`.
- Criado `apps/admin/src/lib/session.ts`.
- Atualizado bootstrap admin para usar `@polaris/auth/env`.
- Removido fallback `../web/src/*` do `apps/admin/tsconfig.json`.
- Zerada allowlist temporaria em `apps/web/src/lib/admin-boundary.test.ts`.
- Atualizados workspaces `apps/web` e `apps/admin` para dependerem de `@polaris/auth`.
- Movido Drizzle ownership para `@polaris/db`: `packages/db/drizzle.config.ts`, `packages/db/src/migrations/*` e scripts root filtrando `@polaris/db`.
- Transformados `apps/web/src/db/index.ts`, `schema.ts` e `tenant-context.ts` em wrappers de compatibilidade para `@polaris/db`.
- Declarado `@polaris/db` como dependencia direta de `apps/web`, evitando depender transitivamente de `@polaris/auth`/`@polaris/events` para resolver wrappers e testes.
- Corrigidos manifests dos packages extraidos para declarar dependencias diretas (`dotenv`, `drizzle-orm`, `server-only`, `drizzle-kit`), ampliado `knip.config.ts` para cobrir `apps/admin` e packages server, e adicionado `knip.config.ts` em `turbo.json#globalDependencies` para invalidar cache quando a higiene mudar.
- Adicionados `tsconfig.json` e script `typecheck` aos packages extraidos (`auth`, `billing`, `db`, `emails`, `events`, `platform`, `platform-auth`), fazendo `bun run typecheck`/`typecheck:admin` validarem os packages diretamente pelo `dependsOn` do Turbo.
- Adicionado teste em `apps/web/src/lib/ci-workflow.test.ts` para garantir que `knip.config.ts`, `^knip` e `^typecheck` continuam ligados ao Turbo.

## Validacoes Rodadas

- `bun x vitest run src/lib/admin-boundary.test.ts src/lib/package-boundary.test.ts src/lib/platform-admin-auth.test.ts src/lib/admin-rate-limit.test.ts src/lib/cloudflare-access.test.ts`: 5 arquivos, 12 testes passaram.
- `bun run typecheck`: passou.
- `bun run typecheck:admin`: passou.
- `bun run check`: passou.
- `bun run knip`: passou.
- `bun x knip`: passou sem cache, cobrindo `apps/admin` e packages extraidos.
- `bun run build`: passou, com aviso conhecido de Postgres `sslmode=require`.
- `bun run build:admin`: passou.
- `bun run db:generate`: passou em `@polaris/db`, sem schema changes.
- `bun run db:smoke:rls`: reexecutado apos reautenticacao Neon; passou com `currentUser=polaris_app`, `forcedTables=13/13`, `policies=14` e `tenantCrossCheck=ok`, ainda com aviso de `sslmode=require`.
- `bun x vitest run src/db src/lib/admin-boundary.test.ts src/lib/package-boundary.test.ts`: 15 arquivos, 23 testes passaram.

## O Que Falta Fazer

1. Migrar testes de packages para os proprios packages.
2. Proteger branch Neon `production`.
3. Criar/validar runtime DB role sem `BYPASSRLS` e sem owner no deploy real.
4. Atualizar URLs Postgres reais para `sslmode=verify-full`.
5. Aplicar migrations reais via `DATABASE_URL_DIRECT`.
6. Configurar Cloudflare Access, Vercel Preview Protection e dominios reais.
7. Validar OAuth app/admin nas URLs finais.
8. Configurar Upstash, R2 lifecycle, Sentry alerts e Inngest credentials.
9. Criar primeiro platform admin por `bun run platform-admin:bootstrap` e guardar evidencia.
10. Rodar `prod:preflight`, `db:smoke:rls`, `deploy:smoke`, E2E web/admin contra ambiente promovido.
