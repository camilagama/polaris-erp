# Pesquisa do ponto 27 — concorrência de workflows e jobs

**Revisado em:** 2026-09-25  
**Pergunta:** como agrupar execuções, substituir CI obsoleta sem perder o check certo e serializar operações que alteram estado externo?

## Síntese

`concurrency` é um lock cooperativo por grupo dentro do repositório: no máximo um workflow/job executa por grupo. O padrão mantém uma execução pendente; uma nova execução substitui a pendente anterior. `cancel-in-progress: true` também interrompe a execução ativa. Desde a documentação consultada, `queue: max` permite até 100 pendentes, mas não combina com cancelamento do run ativo.

Para CI puro, cancelar verificações antigas do mesmo PR costuma economizar recursos. Para deploys, migrations, backup, reset ou cleanup com efeitos externos, não cancelar a execução ativa: serializar pelo recurso e escolher explicitamente se operações pendentes devem ser substituídas ou processadas. Concurrency não faz rollback e não coordena processos externos ao GitHub Actions.

## Semântica documentada pelo GitHub

- **Workflow-level:** o grupo limita workflows inteiros; cancelar uma execução pode interromper todos os jobs dela. **Job-level:** limita apenas o job nomeado; outros jobs do mesmo workflow podem continuar. Isso permite proteger só o deploy/migration sem serializar build e testes paralelos. ([Controlar concorrência de workflows e jobs](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency))
- **Limite padrão por grupo:** um run/job em execução e, por padrão, no máximo um pendente. Quando chega outro, o pendente existente é cancelado e substituído pelo novo. `cancel-in-progress: true` também cancela o ativo. Portanto, `cancel-in-progress: false` preserva o ativo, mas não garante que todo run pendente seja mantido.
- **Fila maior:** `queue: max` permite até 100 execuções pendentes; as seguintes, quando cheia, são canceladas. A fila é FIFO pela hora em que cada run começou a esperar, não pela hora exata do dispatch; a ordem pode variar. `queue: max` junto com `cancel-in-progress: true` é inválido. ([Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax))
- **Escopo dos nomes:** grupos são case-insensitive e podem coincidir entre workflows do mesmo repositório. O mesmo nome em dois arquivos pode cancelar/serializar execuções entre eles. Incluir `github.workflow` isola CI de outras workflows; compartilhar deliberadamente um nome como `production-deploy` é útil quando workflows distintos precisam travar o mesmo recurso. ([Controlar concorrência](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency))
- **Não é um limite global de runners:** grupos diferentes continuam podendo executar simultaneamente. `concurrency` tampouco serializa scripts disparados fora do grupo, Actions em outro repositório, nem sistemas externos que alterem o mesmo banco.
- **Interrupção:** cancelar um job envia primeiro SIGINT/Ctrl-C ao processo; se ele não encerrar, o runner tenta SIGTERM/Ctrl-Break e depois pode encerrar a árvore de processos. O cancelamento não desfaz, por si só, efeitos já aplicados em Vercel, Neon ou outro serviço. A conclusão sobre ausência de rollback é inferência operacional a partir do processo de cancelamento documentado. ([Workflow cancellation reference](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-cancellation))
- **Ambiente não é lock:** `environment: production` não cria automaticamente um grupo de concorrência. Se a prevenção de deploy simultâneo for necessária, declarar o grupo nos jobs/workflows relevantes; outros workflows que usem o mesmo Environment mas não declarem esse grupo continuam fora do lock. ([Deploying with GitHub Actions](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments))

## `pull_request` e `push` para um PR

GitHub cria uma execução por evento configurado; múltiplos eventos podem gerar múltiplas execuções. `github.ref` não identifica a mesma ref nos dois eventos: em `pull_request` aberto ele é `refs/pull/<número>/merge`, enquanto em `push` é `refs/heads/<branch>`. `github.head_ref` identifica a branch-fonte do PR; `github.ref_name` identifica o nome curto da ref que disparou o evento. ([Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), [contexts](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts))

Uma chave como `github.event.pull_request.number || github.ref` agrupa atualizações repetidas do mesmo PR entre si e pushes repetidos da mesma ref entre si, mas **não** faz um push da branch-fonte compartilhar grupo com o evento de PR correspondente. Os valores são diferentes. Ela também não deve fundir o push pós-merge em `main` com o run do PR: testar o commit integrado em `main` é um resultado distinto e normalmente útil.

### Padrão de CI recomendado

Para PRs direcionados a `main`, agrupar por workflow e número do PR; para pushes, usar a ref. Permitir que um commit novo cancele CI obsoleta do mesmo PR:

```yaml
concurrency:
  group: ci-${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
```

Isso é apropriado para jobs sem efeitos externos cujo resultado do commit anterior já está obsoleto. Se push de feature branch e PR precisarem disparar ambos, não compartilhar grupo automaticamente: o run de push pode cancelar o run `pull_request` que verifica a merge ref e gerar check em outro SHA. É mais seguro não acionar `push` para branches de feature, deixando `pull_request` fazer a validação delas e `push` em `main` validar o resultado pós-merge.

É possível aproximar o agrupamento de PR e push pelo nome da branch-fonte (`github.head_ref || github.ref_name`), mas o evento `push` não traz um número de PR para formar uma chave exata. Isso agrupa por branch, não por PR; PRs distintos da mesma branch (ou branches de forks com o mesmo nome) podem colidir, e os eventos podem testar SHAs distintos. Com `cancel-in-progress: true`, um evento pode interromper o outro; com a fila padrão, um run pendente pode substituir o outro. Só usar se os runs forem realmente intercambiáveis e a política dos checks aceitar esse resultado. É uma inferência da diferença documentada entre `github.ref`, `github.head_ref` e `github.ref_name`, não um padrão explícito prescrito pelo GitHub.

## Padrões para operações com estado

- Se um deployment deve ser serializado por ambiente, limitar a concorrência no **job de deploy** com uma chave estável do recurso, por exemplo `production-deploy`; usar `cancel-in-progress: false`. Um nome compartilhado é necessário para serializar workflows distintos que publicam no mesmo destino.
- Para operações que precisam acontecer em sequência, como migrations, backup antes de reset ou cleanup confirmado, usar `queue: max` quando apropriado e manter cancelamento do ativo desligado. A fila ainda tem teto de 100 e não substitui locks/idempotência do banco/serviço externo.
- Se somente o estado mais recente importa, `cancel-in-progress: false` com a fila padrão mantém o run ativo e o run pendente mais recente; runs pendentes antigos podem ser substituídos. Isso pode servir para deploys idempotentes de Preview, mas não para operações em que cada pedido precisa completar.
- Evitar `cancel-in-progress: true` no workflow inteiro quando ele contém jobs de deploy/operação: push de CI na mesma ref pode interromper também o trabalho que alterava estado. Separar CI e operações, ou definir concorrência apenas no job operacional.
- Caso um processo externo também possa executar migrations/reset, `concurrency` do GitHub não impede essa sobreposição. Manter as próprias operações idempotentes, verificar o alvo imediatamente antes da mutação e usar lock transacional/advisory quando a integridade depender de exclusão mútua entre executores. Essa é uma recomendação operacional, não uma garantia fornecida pelo GitHub.

## Auditoria local

### Polaris

- **Revalidação em 2026-09-27:** no worktree em `ce6d3a7` (P23 implementado localmente), `.github/workflows/ci.yml` dispara somente `push` em `main` e `pull_request` para `main`; seus quatro jobs são `verify`, `e2e`, `postgres-behavior` e `admin-e2e`. `.github/workflows/operations.yml` dispara somente por `workflow_dispatch`. Nenhum dos dois arquivos declara `concurrency`. Isto substitui a descrição anterior, que ainda tratava os jobs manuais como parte de `ci.yml`.
- Como push de branch de feature não aciona CI, cada atualização da branch é validada pelo evento `pull_request`; o push pós-merge em `main` continua sendo uma execução distinta. Após a separação P23, `cancel-in-progress` no grupo de CI não alcança os dispatches manuais de `operations.yml`, desde que os grupos não sejam deliberadamente compartilhados.
- **Decisão aprovada para P27:** cancelar CI obsoleta por grupo do workflow e PR/ref; manter `operations.yml` sem cancelamento ativo; condicionar cancelamento de E2E à prova de que os alvos são descartáveis/isolados. Grupos são case-insensitive e compartilhados entre workflows no mesmo repositório; escolher nomes deliberadamente e incluir identidade da CI para não colidir com outras workflows. ([Controle de concorrência](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency), [sintaxe de workflow](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax))

### E2E e bancos compartilhados

- Os comandos `test:e2e` de Web/Admin executam primeiro `scripts/check-e2e-db-schema.ts`, que chama `requireE2eDatabaseUrl` e conecta somente depois da validação. `playwright.config.ts` também usa `createE2eServerEnv`, que exige o URL. Os jobs recebem respectivamente os secrets `E2E_DATABASE_URL` e `ADMIN_E2E_DATABASE_URL`. A consulta read-only de metadados à API GitHub em 2026-09-27 retornou zero Actions secrets e zero Dependabot secrets. Nenhum valor foi solicitado ou lido. Sem URL, o preflight encerra antes de `pg.Client.connect`; atualmente E2E falha antes de qualquer escrita por falta de URL.
- Isso não demonstra que seja seguro cancelar E2E quando as URLs forem configuradas. Os testes geram identificadores aleatórios, mas não foi encontrado teardown geral; registros e histórico criados antes de um cancelamento podem ficar órfãos. Aleatoriedade reduz colisão de identificadores, mas não prova isolamento do banco nem limpeza de efeitos parciais.
- O job `postgres-behavior` usa um serviço PostgreSQL iniciado pelo próprio job, portanto o alvo de escrita é efêmero por execução; já os E2E dependem de URLs externas. O P5 prevê branches Neon descartáveis por PR quando a hospedagem/Preview forem configurados, porém não há branches provisionadas no estado auditado. Antes de incluir E2E no grupo com `cancel-in-progress: true`, exigir evidência de banco descartável isolado por PR/run e revisar limpeza de dados e outros efeitos laterais. Sem essa evidência, manter E2E fora do escopo de cancelamento ativo; o fato de hoje falhar antes de gravar não vale como garantia futura.
- A documentação oficial informa que o cancelamento envia sinais ao processo e pode encerrar a árvore de processos; não descreve rollback de efeitos já aceitos por banco ou serviço externo. Logo, “cancelar não desfaz efeitos externos já aplicados” é uma inferência operacional documentada, e justifica a barreira de isolamento/cleanup antes de cancelar E2E ou qualquer job operacional. ([Referência de cancelamento](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-cancellation))

### Hub como prática de operador

- No snapshot auditado `origin/main` (`bea618fe759feb16fa77269340bf3c50a283e8b0`), `ci.yml` usa `ci-${github.workflow}-${pull_request.number || github.ref}` com `cancel-in-progress: true`; o workflow tem `pull_request` e `workflow_dispatch`, sem trigger `push`. Isso atualiza checks antigos por PR/ref sem tentar fundir resultados de push e PR.
- Workflows operacionais do Hub usam grupos como `vercel-production`, `production-test-data-cleanup`, `neon-development-migrations` e `reset-staging`, todos com `cancel-in-progress: false`. Os grupos isolam repetições da mesma operação, mas grupos diferentes não são um lock compartilhado para recursos que eventualmente coincidam. Como a fila padrão só mantém um pendente, uma nova solicitação pode substituir outra pendente.
- Esse uso é exemplo local de uma escolha operacional; não prova que todas as operações que acessam um mesmo banco estejam coordenadas. Os workflows/settings remotos não foram executados nem auditados neste ponto.

## Recomendação para Polaris

1. Manter o filtro atual de CI: PR para `main`, push em `main`; não adicionar push de feature só para obter mais um run.
2. Separação de workflows P23 concluída localmente: para a fase atual, aplicar concurrency **job-level** apenas a `verify` e `postgres-behavior`, com grupos distintos contendo workflow, job e PR/ref; cancelar runs ativos obsoletos nesses jobs seguros. Não aplicar workflow-level concurrency nem cancelar `e2e`/`admin-e2e` antes do gate P5.
3. O cancelamento automático dos jobs `verify` e `postgres-behavior` é compatível com a intenção de descartar CI obsoleta, pois não publicam nem alteram alvo externo persistente. Para `e2e` e `admin-e2e`, habilitar cancelamento ativo somente depois de demonstrados banco descartável e isolado por PR/run e tratamento de dados parciais; hoje faltam URLs nos secrets e os jobs falham antes das escritas.
4. Manter `operations.yml` sem cancelamento automático. Quando uma operação persistente for configurada, escolher job-level concurrency com chave estável do recurso, cancelamento ativo desligado e política explícita de fila. `queue: max` permite até 100 pendentes, mas é incompatível com `cancel-in-progress: true`; a fila padrão substitui o run pendente anterior. A ordem FIFO não é garantida pelo horário do dispatch. Não presumir que `environment:` sozinho serializa jobs.
5. Se workflows ou executores externos diferentes puderem mutar o mesmo banco/deployment, `concurrency` do GitHub não basta: compartilhar a chave entre os workflows participantes e manter lock/idempotência no serviço quando houver mutadores fora desse grupo.

## Limites

- Revalidação estática dos workflows/configurações locais e consulta read-only de metadados GitHub em 2026-09-27; não verifiquei limites de runners, execuções atuais nem sobreposições com mutadores fora do Actions.
- Nenhum workflow ou teste foi executado. Foram consultadas somente as contagens de secrets (zero Actions, zero Dependabot); nenhum valor foi lido. A evidência de E2E falhar antes de gravações decorre da validação obrigatória do URL pelo preflight `check-e2e-db-schema.ts` e da ausência atual de secrets.
- Fontes primárias atuais consultadas em 2026-09-27: [controle de concorrência](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency), [sintaxe do workflow](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), [contextos do Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts) e [cancelamento do workflow](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-cancellation).
