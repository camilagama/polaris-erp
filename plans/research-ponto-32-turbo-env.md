# Pesquisa do ponto 32 — Escopo de envs e cache no Turborepo

**Data da revisão:** 2026-09-25  
**Estado:** decisão aprovada em 2026-09-25.  
**Ponto do relatório:** auditar `turbo.json` antes de ativar cache remoto; avaliar o escopo amplo de `globalPassThroughEnv` e garantir hash correto para envs que afetam outputs.

## Resultado preliminar

A preocupação do relatório é válida, mas a correção não é mover todas as variáveis para `env` ou apenas reduzir o número de nomes. A classificação precisa ser por tarefa e por efeito:

- `env` / `globalEnv`: valor afeta conteúdo ou sucesso do resultado cacheável e deve participar do hash.
- `passThroughEnv` / `globalPassThroughEnv`: processo precisa receber o valor, mas ele não altera o resultado reproduzível nem deixa um side effect necessário de fora. O valor não participa do hash.
- Tarefas com side effects (migrações, preflight, smoke e uploads externos) devem permanecer não cacheáveis, ou separar o efeito externo da tarefa cacheável.

Manter Remote Cache desativado até aplicar e validar esse mapeamento. O strict env mode já é o padrão do Turbo; adicionar `envMode: "strict"` seria documentação explícita, não uma mudança funcional.

## Estado observado no Polaris

- [`turbo.json`](../turbo.json) lista 11 `globalEnv`, 53 `globalPassThroughEnv` e duas `globalDependencies`. O modo strict é o default documentado.
- `globalDependencies` inclui `.env*` e `knip.config.ts`, invalidando o hash de todas as tarefas quando qualquer um desses arquivos muda. O lock `turbo@2.10.4` suporta configuração por tarefa.
- `build` é cacheável e grava `.next/**`, excluindo `.next/cache/**` e `.next/dev/**`. E2E, Postgres, tarefas de DB, preflight e smoke já são `cache: false`.
- Várias das 53 variáveis pass-through são secrets/URLs operacionais e ficam disponíveis a todas as tasks Turbo; precisam de escopo por tarefa, não de remoção indiscriminada.
- Quatro vars de Sentry pass-through não têm consumidor encontrado em código ou workflows: `SENTRY_TRACES_SAMPLE_RATE`, `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`, `NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE` e `NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE`. Instrumentação atual usa `tracesSampleRate: 0` diretamente; confirmar documentos/configuração antes de remover.
- `ASAAS_CARD_CHECKOUT_ENABLED` aparece em schema/UI mas não na allowlist Turbo; `RLS_SMOKE_EXPECTED_RUNTIME_ROLE` é consumido pelo script de RLS e também não consta no Turbo. Confirmar escopo de task necessário para respeitar strict mode.
- `globalEnv` mistura variáveis de build (`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, DSNs, URL pública do R2, `VERCEL_ENV`) com valores de app/auth (`APP_LOCAL_URL`, `APP_PUBLIC_URL`, `APP_URL_MODE`, `BETTER_AUTH_URL`) que não justificam invalidar todas as tasks. Valores que alteram bundle/config devem ser hasheados nas builds dos apps relevantes; envs de runtime devem ir às tasks que realmente os consomem.

## Achado de maior risco: Sentry source maps

- `apps/web/next.config.ts` e `apps/admin/next.config.ts` habilitam sourcemap upload quando `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` e `SENTRY_PROJECT` estão presentes.
- `build` é cacheável, mas essas três variáveis estão somente em `globalPassThroughEnv`, sem alterar seu hash. Um cache hit pode reutilizar o build e omitir o upload de source maps que ocorreria durante a execução.
- O CI atual não injeta essas credenciais nos jobs de build; apenas comenta que podem ser configuradas opcionalmente. Portanto, o risco é latente até a integração Sentry ser habilitada em CI/deploy.
- Apenas mover o token para `passThroughEnv` por tarefa não corrige o risco: o cache ainda pode pular a execução. A solução deve separar o upload numa operação não cacheável ou desabilitar o cache do build no fluxo em que o upload é exigido.

## Hub

O Hub não tem `turbo.json`, Turbo dependency ou Remote Cache; não é precedente para hashing de envs. Seu padrão transferível é separar CI comum de jobs operacionais e injetar secrets nos jobs/Environments que os consomem, em linha com decisões P23–P25. Nenhum valor de secret foi lido.

## Documentação e trade-offs

- Turborepo documenta strict mode como default. Env vars permitidas por `env` participam do hash; `passThroughEnv` apenas as expõe ao processo e não altera o hash. `globalEnv`/`globalPassThroughEnv` aplicam a política a todas as tasks; preferir escopo local evita invalidação e exposição desnecessárias. [Turborepo — Environment Variables](https://turborepo.com/docs/crafting-your-repository/using-environment-variables), [Configuration reference](https://turborepo.com/docs/reference/configuration)
- Turborepo infere alguns `NEXT_PUBLIC_*` para apps Next.js, mas a configuração efetiva deve ser validada antes de remover entradas existentes. Não remover `.env*` globalmente até confirmar quais apps/tasks leem esses arquivos e quais valores influenciam outputs.
- Vercel Remote Cache armazena outputs e logs como artefatos compartilhados; cache remoto pressupõe hashes corretos e logs sem secrets. [Vercel — Remote Caching](https://vercel.com/docs/monorepos/remote-caching)
- Globalizar tudo reduz o risco de esquecer uma dependência de hash, mas reduz cache hits, expõe valores desnecessariamente e pode esconder side effects. Escopo por tarefa melhora correção e cache hit rate, com custo de inventário e manutenção explícitos.

## Decisão aprovada em 2026-09-25

1. Fazer o inventário variável por variável, sem ler valores de `.env`/secrets; registrar nome, consumidor, tarefa, se afeta hash, e justificativa.
2. Manter strict mode; reduzir `globalPassThroughEnv` para allowlists por task, removendo nomes sem consumidor demonstrável e incluindo as variáveis runtime faltantes onde necessárias.
3. Manter no hash de `build` apenas os valores que alteram output/configuração dos apps correspondentes; usar inferência Next quando confirmada. Restringir `knip.config.ts` à task `knip`; restringir `.env*` às tasks/apps que realmente os consomem.
4. Resolver upload de source maps como side effect: idealmente tarefa não cacheável separada; alternativa, build sem cache quando upload for exigido. Não confiar só em `passThroughEnv` ou hash de presença do token.
5. Manter Remote Cache desligado até concluir o mapeamento, verificar que nenhum log/output cacheável carrega secrets e validar o fluxo de build/Sentry. Depois liberar a implementação de P31.

**Q1 aprovada:** auditar variáveis e consumidores por task; hash para valores que mudam output; pass-through limitado a tarefas consumidoras; `.env*` e `knip.config.ts` com dependências específicas; corrigir o upload Sentry para que cache hit não o omita; manter Remote Cache desabilitado até validar os hashes e artefatos. Após essa validação, habilitar conforme P31.

## Fontes oficiais consultadas

- [Turborepo — Environment Variables](https://turborepo.com/docs/crafting-your-repository/using-environment-variables)
- [Turborepo — Configuration reference](https://turborepo.com/docs/reference/configuration)
- [Turborepo — Remote caching](https://turborepo.com/docs/core-concepts/remote-caching)
- [Vercel — Remote Caching](https://vercel.com/docs/monorepos/remote-caching)

## Revalidação em 2026-09-28

**Escopo:** inspeção feita somente no worktree `C:\Users\Junior\.codex\worktrees\foundation-hook\polaris-erp`. Buscas cobriram `apps/`, `packages/`, `scripts/` e `.github/`, excluindo qualquer arquivo com nome `.env*`, `node_modules`, saídas de build e `.git`. Nenhum valor de `.env.local`, outro `.env*`, GitHub secret ou credencial foi lido ou impresso. Linhas de teste, docs, workflow e runtime foram classificadas separadamente.

### Versão e semântica

- `bun.lock` e binário instalado indicam Turbo **2.11.4** (`node_modules/.bin/turbo --version` => `2.11.4`). A versão estável mais recente verificada em 2026-09-28 é **2.11.5**; o release oficial está marcado “Latest” e datado 28 Sep. A inspeção da config permanece válida para a versão instalada; não encontrei indicação no release de mudança ao modelo de env/cache que altere estes achados. Fonte: [release Turborepo v2.11.5](https://github.com/vercel/turborepo/releases/tag/v2.11.5).
- A documentação atual do Turbo define strict mode como padrão. Somente nomes enumerados ou inferidos pelo framework chegam às tasks; `env`/`globalEnv` entram no hash, `passThroughEnv`/`globalPassThroughEnv` só entram no ambiente. Ver [Environment Variables](https://turborepo.com/docs/crafting-your-repository/using-environment-variables) e [Configuration reference](https://turborepo.com/docs/reference/configuration).
- A config possui **11 `globalEnv`, 53 `globalPassThroughEnv`, 2 `globalDependencies`** e **nenhum** `env` ou `passThroughEnv` em nível de task. Logo, as allowlists globais afetam todas as tasks: `globalEnv` pode invalidar tasks sem consumidor; `globalPassThroughEnv` expõe variáveis a tasks sem consumidor e não corrige hash.

### Inventário de `globalEnv` (11/11)

| Nome | Referências de implementação encontradas | Classificação |
| --- | --- | --- |
| `APP_LOCAL_URL` | `apps/web/next.config.ts`, `apps/admin/next.config.ts`, `apps/web/src/lib/env.ts`, `packages/auth/src/app-url.ts`, `packages/auth/src/env.ts` | Config Next e contrato/app URL. |
| `APP_PUBLIC_URL` | Mesmos arquivos de config/env/app URL acima | Config Next e contrato/app URL. |
| `APP_URL_MODE` | Mesmos arquivos de config/env/app URL acima | Config Next e contrato/app URL. |
| `BETTER_AUTH_URL` | Ambos `next.config.ts`; `packages/auth/src/app-url.ts`, `auth.ts`, `env.ts`; também rota de auth e preflight web | Config e runtime. |
| `NEXT_PUBLIC_APP_URL` | Ambos `next.config.ts`; `apps/web/src/lib/env.ts`, auth, onboarding e integrações web | Config, bundle/client e runtime. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `apps/web/src/lib/auth-client.ts`, `packages/auth/src/auth.ts`, `packages/auth/src/env.ts` | Cliente/bundle web e contrato de env. |
| `NEXT_PUBLIC_SENTRY_DSN` | `apps/web/src/instrumentation-client.ts`, `apps/admin/src/instrumentation-client.ts`, `apps/web/src/app/global-error.tsx`, `apps/web/src/lib/env.ts` | Client/build e contrato de env. |
| `NODE_ENV` | Ambos `next.config.ts`; instrumentação, auth, rate limit e helpers em `apps/`/`packages/` | Framework e runtime. |
| `R2_PUBLIC_BASE_URL` | `apps/web/next.config.ts`, `apps/web/src/lib/env.ts` | Config de imagem Next e runtime. |
| `SENTRY_DSN` | Instrumentação web/admin, rate limit e erros de API; preflight web | Runtime/config. |
| `VERCEL_ENV` | Ambos `next.config.ts`; instrumentação, auth e preflight | Config injeta `NEXT_PUBLIC_VERCEL_ENV`, potencialmente altera bundle. |

Todos os 11 têm ao menos referência de implementação. Isso não demonstra que todos precisam ser hasheados por toda task. `NEXT_PUBLIC_*`, `R2_PUBLIC_BASE_URL` e `VERCEL_ENV` têm evidência direta de influência em bundle/configuração; URL-mode e DSN têm consumidores runtime/config cujo impacto exato no output deve ser decidido por app/task. `globalEnv` atualmente hasheia cada um também para `test`, `check`, `typecheck`, `knip` e outras tasks.

### Inventário de `globalPassThroughEnv` (53/53)

A seguir, todas as referências de código/workflow localizadas. “Runtime/código” identifica referência em implementação, sem afirmar que toda task precisa da variável.

| Nome(s) | Consumidor(es) confirmado(s) |
| --- | --- |
| `ALLOW_PLAYWRIGHT_BOOTSTRAP` | `apps/web/src/lib/env.ts`, rota de bootstrap web/admin, `packages/auth/src/env.ts`, `packages/e2e-support/src/index.ts`; há refs adicionais de teste. |
| `ADMIN_BETTER_AUTH_SECRET` | `packages/auth/src/admin-auth-options.ts`; preflight web; `scripts/verify.ts`; refs de workflow/teste. |
| `ADMIN_DEPLOYMENT_SMOKE_PROTECTED` | `scripts/smoke-admin-deployment.ts`; teste do workflow e `operations.yml`. |
| `ADMIN_DEPLOYMENT_SMOKE_URL` | `apps/admin/src/lib/deployment-smoke.ts`, `scripts/smoke-admin-deployment.ts`; workflow/teste. |
| `ADMIN_APP_URL` | `apps/admin/next.config.ts`, `packages/auth/src/admin-auth-options.ts`, preflight web, smoke admin; workflow/teste. |
| `ADMIN_GOOGLE_CLIENT_ID`, `ADMIN_GOOGLE_CLIENT_SECRET` | `packages/auth/src/admin-auth.ts`, `admin-auth-options.ts`; preflight web e `scripts/verify.ts`; workflow/teste. |
| `ASAAS_API_BASE_URL`, `ASAAS_API_KEY` | `apps/web/src/features/onboarding/pre-signup-checkout.ts`, `apps/web/src/lib/env.ts`, `apps/web/src/lib/inngest-functions.ts`. |
| `ASAAS_WEBHOOK_TOKEN` | `apps/web/src/integrations/asaas/webhook.ts`, `apps/web/src/lib/env.ts`. |
| `BETTER_AUTH_API_KEY` | `packages/auth/src/auth.ts`, `packages/auth/src/env.ts`, `apps/web/src/lib/env.ts`, `scripts/verify.ts`. |
| `BETTER_AUTH_SECRET` | `packages/auth/src/auth.ts`, `admin-auth-options.ts`, `env.ts`; `apps/web/src/lib/env.ts`, preflight e `scripts/verify.ts`. |
| `DATABASE_POOL_MAX` | `packages/db/src/pool-config.ts`; preflight web. |
| `DATABASE_URL` | DB/auth/bootstrap/E2E/health implementations em `apps/`, `packages/db`, `packages/e2e-support`; scripts de migração/DB, RLS smoke e verify; workflows. É necessário por task operacional/teste específica, não por toda task. |
| `DATABASE_URL_DIRECT` | `packages/db/drizzle.config.ts`; scripts de migração/DB e preflight/verify; workflows. |
| `DEPLOYMENT_SMOKE_URL` | `apps/web/src/ops/deployment-smoke.ts`, `apps/admin/src/lib/deployment-smoke.ts`, scripts smoke e preflight; workflow. |
| `E2E_DATABASE_URL` | Rotas bootstrap, schema E2E, `packages/e2e-support`, script de schema e preflight; workflow/testes. |
| `E2E_INTERNAL_BOOTSTRAP_SECRET` | `packages/e2e-support/src/index.ts`, helpers/specs E2E de web/admin. Referência de uso é E2E, não build/runtime comum. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `packages/auth` auth/env/admin-auth; `apps/web/src/lib/auth-client.ts`, env/preflight, verify; workflows. |
| `INTERNAL_BOOTSTRAP_SECRET` | Rotas de bootstrap, `packages/auth/src/env.ts`, `packages/e2e-support/src/index.ts`, helpers E2E. |
| `INTERNAL_R2_HEALTH_SECRET` | Rota health R2, env/preflight web, smoke de deployment; workflow. |
| `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` | Contrato de env/preflight e workflow; não apareceu leitura literal em implementação de runtime. Possível uso implícito pelo SDK permanece **dinâmico/não confirmado**. |
| `PRODUCT_IMAGE_RECONCILE_SECRET` | Rota reconcile, env/preflight web, `packages/platform` dashboard; workflow. |
| `PERFORMANCE_MIN_ROWS`, `PERFORMANCE_ORGANIZATION_ID`, `PERFORMANCE_REQUIRE_REPRESENTATIVE`, `PERFORMANCE_SEARCH_TERM`, `PERFORMANCE_USER_ID` | `scripts/analyze-listing-plans.ts`; também workflow/teste de contrato. Uso específico de análise operacional. |
| `POSTGRES_BEHAVIOR_DATABASE_URL` | `scripts/require-postgres-behavior-database.ts`, `scripts/verify.ts`, testes PostgreSQL e workflow. |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET` | `apps/web/src/integrations/resend/*`, `apps/web/src/lib/env.ts`; testes. |
| `SUPPORT_EMAIL` | `apps/web/src/lib/env.ts`, páginas billing/config e preflight; workflow/testes. |
| `R2_ACCESS_KEY_ID`, `R2_ACCOUNT_ID`, `R2_BUCKET_FINAL`, `R2_BUCKET_STAGING`, `R2_SECRET_ACCESS_KEY` | `apps/web/src/features/products/image-storage.ts`, `image-urls.ts`, `apps/web/src/lib/env.ts`, preflight web, `packages/platform` dashboard. `R2_BUCKET_STAGING` também em workflow de imagem. |
| `RLS_DATABASE_URL` | Preflight web e scripts/contratos de verify/workflow; não apareceu leitura em implementação de acesso DB dedicada (o smoke RLS lê `DATABASE_URL`). Necessidade é limitada a preflight/verify e precisa ser mapeada à task que realmente a injeta. |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Ambos `next.config.ts` habilitam upload source maps com os três juntos; env/preflight/verify e workflows. Ver seção Sentry abaixo. |
| `SENTRY_TRACES_SAMPLE_RATE`, `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`, `NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE`, `NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE` | **Sem match** em source, teste ou workflow; os nomes permanecem declarados em `.env.example`, `turbo.json` e `docs/runbooks/deploy-vercel.md`. Configuração encontrada usa `tracesSampleRate: 0` literal. Sem consumidor executável demonstrado. |
| `UPSTASH_REDIS_REST_TOKEN`, `UPSTASH_REDIS_REST_URL` | `apps/web/src/lib/rate-limit.ts`, `apps/web/src/lib/env.ts`, `packages/platform-auth/src/admin-rate-limit.ts`, preflight; workflows/testes. |
| `WOOVI_API_BASE_URL`, `WOOVI_API_KEY` | `apps/web/src/lib/env.ts`, `apps/web/src/lib/inngest-functions.ts`. |
| `WOOVI_WEBHOOK_SECRET` | `apps/web/src/integrations/woovi/webhook.ts`, `apps/web/src/lib/env.ts`. |

**Separação de classes:** os nomes `E2E_*`, `PERFORMANCE_*`, `POSTGRES_BEHAVIOR_DATABASE_URL`, URLs DB e `RLS_DATABASE_URL` têm consumidores focados em E2E, análise, teste PostgreSQL, migração, smoke ou preflight. Não são evidência para exposição/hash em todas as tasks. Credenciais runtime de Asaas, Google, Resend, R2, Redis, Sentry e Woovi aparecem em implementação de produto; isso também não as torna automaticamente necessárias no ambiente de lint/test/knip. O inventário suporta allowlist por task, sem remover nomes de forma indiscriminada.

### `globalDependencies` e inputs de task

| Entrada global | Efeito/consumidor apurado |
| --- | --- |
| `.env*` | Glob global participa do hash de todas as tasks e cobre arquivos cujos nomes correspondem ao padrão; conteúdo foi deliberadamente não lido. Next configs chamam `loadEnvConfig(...)` para carregar envs, e `build.inputs` inclui também `.env*`, relativo ao pacote da task. Assim, o global glob invalida tarefas sem relação com build e o input local de build representa env files do pacote. Root e arquivos por app podem ter escopos distintos; revisar cobertura real de cada padrão sem abrir os arquivos. |
| `knip.config.ts` | Arquivo de configuração do comando `knip`; no escopo global atualmente invalida toda task, quando a associação direta encontrada é a task `knip`. |

`build.inputs` é `[$TURBO_DEFAULT$, ".env*"]`; outputs são `.next/**`, excluindo `.next/cache/**` e `.next/dev/**`. `globalDependencies` adiciona seus paths globais ao hash das tasks, enquanto `inputs` restringe o conjunto de arquivos input da task; não confundir os dois escopos. Referências: [Turborepo configuration](https://turborepo.com/docs/reference/configuration), [environment variables](https://turborepo.com/docs/crafting-your-repository/using-environment-variables).

### Cache, logs e tasks com efeito externo

- Cacheáveis por padrão (config não define `cache: false`): `build`, `test`, `check`, `typecheck`, `knip`. `test`, `check`, `typecheck`, `knip` definem `outputs: []`: ainda podem ter resultado e logs cacheados e não devem ter efeito necessário preso à execução. `build` armazena `.next/**` com as exclusões indicadas.
- Explicitamente não cacheáveis: `dev`, `start`, `test:e2e`, `test:postgres`, `fix`, `db:generate`, `db:migrate`, `db:push`, `prod:preflight`, `deploy:smoke`, `db:smoke:rls`, `db:analyze:listings`, `db:studio`. `dev`, `start`, `db:studio` também são persistentes.
- Não há env allowlist local por task, portanto mesmo as tasks `cache: false` recebem as 53 vars globais. As cacheáveis `test`/`check`/`typecheck`/`knip` podem ainda ter sucesso/falha dependente de pass-through sem hash se seus scripts/ambiente o usarem; nenhum consumidor deve ser entendido como universal.
- Vercel documenta compartilhamento de artifacts de saída e logs; Turbo recomenda `cache: false` para tasks com side effects. Isso sustenta que cache hit pula efeitos externos que só ocorreriam durante a execução. Fontes primárias: [Vercel Remote Caching](https://vercel.com/docs/monorepos/remote-caching) (atualizada em 2026-08-13) e [Turborepo guidance for side-effect tasks](https://github.com/vercel/turborepo/blob/main/skills/turborepo/references/configuration/gotchas.md).

### Upload de source maps do Sentry

`apps/web/next.config.ts` e `apps/admin/next.config.ts` calculam `sentryCanUpload` pela presença conjunta de `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, passam os três para `withSentryConfig` e usam `sourcemaps.disable: !sentryCanUpload`. Assim, o upload de sourcemaps durante `build` é side effect real quando credenciais estão configuradas. Os três nomes estão somente em `globalPassThroughEnv`, não em `globalEnv`/`build.env`; mudança de credencial não invalida o hash. Como `build` é cacheável, cache hit pode restaurar `.next` e omitir upload. Correção futura deve isolar upload em task não cacheável ou desabilitar cache de build no fluxo que exige upload; `passThroughEnv` sozinho não resolve.

### `SAFE_VERIFY_ENV` e consumidores fora da allowlist

- `scripts/verify.ts` monta child env na ordem `{ ...process.env, ...SAFE_VERIFY_ENV, ...step.env }`. `SAFE_VERIFY_ENV` zera URLs de DB listadas e `TURBO_TEAM`/`TURBO_TOKEN`; um `step.env` específico pode restaurar somente nomes da etapa. O perfil full tem código que pode obter `DATABASE_URL` e `POSTGRES_BEHAVIOR_DATABASE_URL` do `.env.local`; não executamos esse fluxo nem abrimos o arquivo. Builds usam valores sintéticos definidos no próprio script. Nas etapas Turbo de verify, token/time não herdam valores do processo.
- `ASAAS_CARD_CHECKOUT_ENABLED` está fora das 64 variáveis Turbo. Há consumidor de app em `apps/web/src/app/(app)/configuracoes/page.tsx:52`, que lê `serverEnv` e passa a flag ao painel. A página chama `connection()` na linha 24; a documentação Next instalada define isso como renderização em request-time, então esse fluxo é runtime da aplicação, não uma etapa operacional Turbo. Não recomendar inclusão global; só adicionar escopo específico ao build web se outra leitura provar dependência de build, o que não foi encontrado aqui. Referência: [Next.js connection](https://nextjs.org/docs/app/api-reference/functions/connection).
- `RLS_SMOKE_EXPECTED_RUNTIME_ROLE` está fora do Turbo e é lida por `scripts/smoke-rls-runtime.cjs`, chamado por `db:smoke:rls` (`cache: false`). A comparação é condicional: se strict mode filtrar o nome, o smoke continua sem validar a identidade esperada. P43 requer provar o runtime role de produção; portanto é uma entrada candidata **escopada a `db:smoke:rls`** quando esse job for implementado, nunca uma allowlist global automática. `.github/workflows/operations.yml` contém `DATABASE_URL` nas linhas 60 e 195 (a linha 60 o deixa vazio, conforme revisão da workflow) e não tem ocorrência do nome esperado do role. `ADMIN_E2E_DATABASE_URL` é zerada em `SAFE_VERIFY_ENV`, não está na allowlist e não teve consumidor runtime literal encontrado na busca.

### Fontes primárias consultadas

- [Turborepo — Environment Variables](https://turborepo.com/docs/crafting-your-repository/using-environment-variables)
- [Turborepo — Configuration reference](https://turborepo.com/docs/reference/configuration)
- [Turborepo — side effects and cache](https://github.com/vercel/turborepo/blob/main/skills/turborepo/references/configuration/gotchas.md)
- [Vercel — Remote Caching](https://vercel.com/docs/monorepos/remote-caching)
- [Turborepo v2.11.5 release](https://github.com/vercel/turborepo/releases/tag/v2.11.5)

### Confirmação adicional do upload Sentry (2026-09-28)

Condição confirmada pelo código e pela documentação oficial atual:

- O worktree usa `@sentry/nextjs` 10.65.0 e Next.js 16.3.6. Em ambos `apps/web/next.config.ts` e `apps/admin/next.config.ts`, `sentryCanUpload` exige presença conjunta de `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`; `withSentryConfig` recebe esses três valores e `sourcemaps.disable` é `!sentryCanUpload`.
- A doc oficial de Sentry documenta que `withSentryConfig` recebe org, project e auth token; Webpack envia source maps durante as compilações e, com Turbopack, o upload ocorre depois que o build termina (Sentry SDK 10.13.0+ e Next 15.4.1+). Ambos os requisitos de versão são satisfeitos no worktree. Fonte: [Sentry — Next.js source maps](https://github.com/getsentry/sentry-docs/blob/master/platform-includes/sourcemaps/overview/javascript.nextjs.mdx).
- Confirmação independente no pacote instalado: `node_modules/@sentry/nextjs/build/cjs/config/getBuildPluginOptions.js` encaminha `authToken`, `org`, `project` e a flag `sourcemaps.disable` para o plugin de build; `handleRunAfterProductionCompile.js` invoca `uploadSourcemaps([distDir], ...)` no hook pós-compilação. Isso comprova o side effect externo quando habilitado, sem consultar credenciais.
- O mesmo módulo instalado define `deleteSourcemapsAfterUpload` como `false` quando a opção não é especificada; ambos `next.config.ts` omitem essa opção. Portanto, source maps podem permanecer dentro de `.next/**`, que é o output atualmente cacheado. A presença e o local exatos dos arquivos no build Polaris não foram verificados porque nenhum build com credenciais Sentry foi executado; confirmar a exclusão/escopo dos mapas antes de compartilhar outputs em Remote Cache. A opção de configuração é documentada em [Sentry — Next.js source maps](https://github.com/getsentry/sentry-docs/blob/master/platform-includes/sourcemaps/overview/javascript.nextjs.mdx).
- Consequência: se os três nomes forem fornecidos, o upload faz parte da execução de `build`; cache hit do Turborepo restaura outputs/logs sem executar esse código, portanto pode omitir o upload. Se um dos três faltar, as configs desta repo desabilitam source-map upload. Esse achado está confirmado, não apenas inferido pelo nome da opção.
