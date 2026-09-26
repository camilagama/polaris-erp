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

- No snapshot local `main` (`5f3f91a4ca47d7105a2cfc84ae63d12f3eb1912e`), `.github/workflows/ci.yml` dispara `push` apenas em `main`, `pull_request` direcionado a `main` e `workflow_dispatch`; não declara `concurrency`.
- Como push de branch de feature não aciona esse workflow, o CI já evita a duplicação push + PR para cada commit de feature. O push a `main` depois do merge é um run separado e útil. P23 registrou jobs operacionais manuais ainda no mesmo workflow; enquanto permanecerem ali, uma regra workflow-level com `cancel-in-progress: true` pode cancelar um dispatch manual na mesma ref se uma nova execução automática entrar no mesmo grupo. Ver [pesquisa P23](research-ponto-23-ci-operations.md).
- **Recomendação:** depois de separar CI e operações conforme P23, adicionar concurrency workflow-level ao CI para descartar execuções antigas por PR/ref. Até essa separação, evitar cancelamento global em `ci.yml` ou restringi-lo apenas a runs de `pull_request`, preservando os jobs manuais de operação.

### E2E e bancos compartilhados

- A auditoria estática dos testes web/admin encontrou IDs aleatórios para usuários e produtos, mas não encontrou teardown geral. As operações criam registros e preservam histórico; um cancelamento pode deixar dados de teste órfãos. Os testes web usam um worker por run; admin permite paralelismo interno. Isso reduz algumas colisões de IDs, mas não coordena diferentes PRs que atinjam as mesmas URLs E2E.
- Não foram lidos `.env*`/secrets, então não foi possível confirmar se `E2E_DATABASE_URL` e `ADMIN_E2E_DATABASE_URL` apontam para bancos realmente distintos. P5 já prevê branches Neon descartáveis por PR quando Preview for configurado; esse isolamento reduziria o risco de concorrência entre PRs. Antes de depender de cancelamento frequente, verificar cleanup de runs interrompidos ou ativar o isolamento por PR no ambiente final.
- Limite da análise: o bootstrap web e os seletores de onboarding aparentam possível divergência, e não executei Playwright; portanto não afirmo quais cenários chegam a criar esses dados em todos os runs.

### Hub como prática de operador

- No snapshot auditado `origin/main` (`bea618fe759feb16fa77269340bf3c50a283e8b0`), `ci.yml` usa `ci-${github.workflow}-${pull_request.number || github.ref}` com `cancel-in-progress: true`; o workflow tem `pull_request` e `workflow_dispatch`, sem trigger `push`. Isso atualiza checks antigos por PR/ref sem tentar fundir resultados de push e PR.
- Workflows operacionais do Hub usam grupos como `vercel-production`, `production-test-data-cleanup`, `neon-development-migrations` e `reset-staging`, todos com `cancel-in-progress: false`. Os grupos isolam repetições da mesma operação, mas grupos diferentes não são um lock compartilhado para recursos que eventualmente coincidam. Como a fila padrão só mantém um pendente, uma nova solicitação pode substituir outra pendente.
- Esse uso é exemplo local de uma escolha operacional; não prova que todas as operações que acessam um mesmo banco estejam coordenadas. Os workflows/settings remotos não foram executados nem auditados neste ponto.

## Recomendação para Polaris

1. Manter o filtro atual de CI: PR para `main`, push em `main`; não adicionar push de feature só para obter mais um run.
2. Após a separação das operações, aplicar concurrency no CI puro, agrupando runs de PR pelo número do PR e runs de push por ref. Usar cancelamento para substituir validações obsoletas; revisar separadamente como `workflow_dispatch` deve se comportar.
3. Para uma operação persistente futura, escolher job-level concurrency com chave do recurso/ambiente, cancelamento desligado e política explícita para pendentes. Não presumir que `environment:` sozinho serializa jobs.
4. Se várias workflows mutarem o mesmo banco ou deployment, usar uma chave idêntica entre elas deliberadamente ou um lock no serviço externo; manter o lock externo quando houver executores fora do GitHub Actions.

## Limites

- A auditoria é dos YAMLs locais; não verifiquei limites de runners/Actions da conta, executions atuais, Settings remotas nem sobreposições com sistemas externos.
- Nenhum workflow ou teste foi executado e nenhum secret foi lido. Referências oficiais do GitHub consultadas em 2026-09-25.
