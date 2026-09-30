# Pesquisa do ponto 25 — permissões mínimas do `GITHUB_TOKEN`

**Revisado em:** 2026-09-25  
**Pergunta:** quais permissões de `GITHUB_TOKEN` são necessárias para CI e operações, e onde os escopos podem ser reduzidos por job?

## Síntese

Para o Polaris, o único uso do `GITHUB_TOKEN` visível no workflow atual é o checkout do repositório; o mínimo recomendado para isso é `contents: read`. O YAML não revela o default efetivo nas Settings do GitHub, portanto declarar a permissão explicitamente evita depender dessa configuração externa.

O Hub já explicita permissões: CI usa `contents: read`; operações acrescentam leitura de checks, deployments e pull requests quando consultam a API, e escrita de contents, pull requests e Actions quando publicam uma branch, abrem PR ou disparam outro workflow. Existem permissões `actions: read` sem uso visível e blocos workflow-level que concedem scopes a jobs que não precisam deles.

## Fatos documentados

- GitHub permite declarar permissões no nível do workflow, aplicando-as a todos os jobs, ou no nível do job. Se qualquer escopo é declarado, os não listados ficam sem acesso; `write` também inclui `read`. O default inicial depende das Settings da organização/repositório, e PRs de forks têm restrições adicionais. ([Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax))
- Em jobs que chamam reusable workflows, os scopes concedidos no chamador limitam o workflow chamado; ele não pode elevá-los. Workflows reutilizáveis aninhados podem manter ou reduzir as permissões. Por isso, scopes extras precisam estar autorizados no job chamador e ser conferidos ao definir cada workflow reutilizável. ([Reusable workflow permissions](https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations))
- `actions/checkout` recomenda `contents: read`. `persist-credentials` é `true` por padrão e permite que comandos Git posteriores usem a credencial configurada pelo checkout; pode ser desligado quando esses comandos autenticados não forem necessários. O README atual registra que v6 mudou o armazenamento da credencial para um arquivo sob `$RUNNER_TEMP`; Polaris usa `actions/checkout@v4` e Hub usa `@v5.1.0`, então essa mudança de armazenamento não descreve essas versões. ([README de `actions/checkout`](https://github.com/actions/checkout/blob/main/README.md))
- O workflow corrente de build/deploy do repositório `vercel/next.js` exemplifica permissões por job: jobs de build usam `contents: read` e `id-token: write`; `publishRelease` acrescenta `contents: write`; um job de notificação declara `permissions: {}`. É um exemplo de escopo granular, não uma política normativa nem um template para copiar sem analisar os usos de cada job. ([`build_and_deploy.yml`, branch `canary`](https://github.com/vercel/next.js/blob/canary/.github/workflows/build_and_deploy.yml))
- Na API REST, abrir PR requer `Pull requests: write`; consultar check runs requer `Checks: read`; consultar deployments/statuses requer `Deployments: read`; e disparar workflow manualmente requer `Actions: write`. ([PRs](https://docs.github.com/en/rest/pulls/pulls), [check runs](https://docs.github.com/en/rest/checks/runs), [deployments](https://docs.github.com/en/rest/deployments/deployments), [workflow dispatch](https://docs.github.com/en/rest/actions/workflows))

## Perspectiva de operadores

Uma discussão do GitHub Community de julho de 2025 relata confusão sobre `packages: read` e permissões em workflows reutilizáveis. Ela ilustra a dificuldade prática de rastrear scopes entre chamador e workflow chamado, mas não é orientação normativa; para a regra efetiva, prevalecem os docs oficiais de reusable workflows acima. ([GitHub Community #166525](https://github.com/orgs/community/discussions/166525))

## Auditoria dos repositórios

### Polaris

- Snapshot local em `main`, commit `5f3f91a4ca47d7105a2cfc84ae63d12f3eb1912e`. O único workflow encontrado é `.github/workflows/ci.yml`; ele não declara `permissions` e contém dez usos de `actions/checkout` para os dez jobs.
- Não encontrei no YAML chamadas a `github.token`, `GH_TOKEN`, `gh`, API REST do GitHub ou `git push`. Pelo que o workflow mostra, `contents: read` basta para obter o código. Como não há bloco `permissions`, não é possível concluir pelo arquivo se o token atual tem apenas leitura ou um default mais amplo.

### Hub

- Snapshot auditado: `C:\Users\Junior\Documents\0 - Dev\hub`, remote `https://github.com/NeuroCapacitar/hub.git`; `origin/main` e o remoto `main` estavam em `bea618fe759feb16fa77269340bf3c50a283e8b0`. `origin/staging` estava em `432011868541c77f765e6fae619ccbd9fe2d815e`; o diff da pasta `.github/workflows` entre as duas refs estava vazio, embora o checkout local de `staging` estivesse 20 commits atrás.
- O Hub tinha 11 blocos `permissions`, todos no nível do workflow e nenhum no nível do job. `ci.yml` declara somente `contents: read` (linhas 12–13). `migrate-development.yml` acrescenta `checks: read`; `cleanup-production-test-data.yml` também declara `checks: read` e `actions: read`.
- `deploy-vercel.yml` declara `actions: read`, `checks: read`, `contents: write`, `deployments: read` e `pull-requests: read` (linhas 23–28). `verify_staging` consulta deployments/statuses; `deploy` consulta check runs e PR associado ao commit, depois faz o `git push` que avança `main` para o SHA candidato (linha 316). Não encontrei uso da API de Actions que justifique `actions: read` nesse workflow. Como o bloco é global, `verify_staging` herda `contents: write`, `checks: read` e `pull-requests: read` sem precisar deles.
- `prepare-production-release.yml` declara `actions: write`, `contents: write` e `pull-requests: write` (linhas 10–13): a execução publica branch de reconciliação (linha 150), cria PR (linha 165) e dispara CI por `gh workflow run` (linha 174). Esses três writes têm uso correspondente no YAML.
- Em `cleanup-production-test-data.yml`, `actions: read` não tem chamada visível correspondente; o job consulta check runs, faz checkout e chama a API externa do Neon. `deploy-staging.yml` e `run-staging-jobs.yml` concedem `contents: read` a todo o workflow, embora seus jobs de smoke/curl não façam checkout. Esses casos são candidatos a restringir as permissões por job.

## Recomendação

1. No Polaris, declarar explicitamente no workflow atual, pois todos os jobs fazem checkout e nenhum uso de escrita do token foi encontrado:

   ```yaml
   permissions:
     contents: read
   ```

   Se aparecer um job sem checkout e sem leitura de repositório, dar a esse job `permissions: {}`. Considerar `persist-credentials: false` nos jobs em que nenhum comando posterior precise autenticar Git.
2. No Hub, remover `actions: read` de `deploy-vercel.yml` e `cleanup-production-test-data.yml` após confirmar que não foi adicionado outro uso de API. Mover scopes para jobs: `verify_staging` precisa de `contents: read` + `deployments: read`; `deploy` precisa de `checks: read`, `pull-requests: read` e `contents: write` no fluxo atual.
3. Preservar os writes usados hoje: `contents: write` para pushes; `pull-requests: write` para criar PR; `actions: write` para disparar CI. No `deploy-vercel`, o job com Environment `vercel-production` reúne o push de `main` e credenciais operacionais. Se reduzir o impacto de comprometimento for prioridade, avaliar mover o push para um job curto com `contents: write` e sem secrets de produção; exige verificar as dependências de release antes de redesenhar o fluxo.
4. Em jobs que não precisam de token, preferir `permissions: {}`. A permissão do `GITHUB_TOKEN` controla acesso à API/repositório; não cria nem limita por si só os secrets de Neon, Vercel ou outros provedores. O escopo de secrets continua dependendo dos Environments e dos mapeamentos `secrets.*` usados pelo job.

## Limites

- A auditoria de configuração remota não foi feita: defaults de Actions, proteções de branch e regras/segredos de Environments não podem ser inferidos dos arquivos. O Hub foi avaliado nas refs indicadas acima; a branch `staging` remota avançou desde o checkout local, apesar de os workflows serem iguais entre as duas refs naquele snapshot.
- Referências a names de secrets/Environments no YAML não comprovam que valores existam nem revelam seus destinos. Nenhum valor de secret ou `.env.local` foi lido.
- A nota registra configuração e comandos declarados, sem validar execução. Nenhum workflow ou teste foi executado. O exemplo `canary` do Next.js e o README `main` do `actions/checkout` são referências mutáveis; foram consultados em 2026-09-25.
