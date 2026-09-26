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
