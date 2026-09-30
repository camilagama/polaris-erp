# Pesquisa do ponto 23 — CI e operações de produção

**Revisado em:** 2026-09-25  
**Escopo:** decidir como organizar os checks de CI e os fluxos manuais de smoke, preflight, certificação e recuperação no GitHub Actions do Polaris. Esta pesquisa não altera workflows, não dispara execuções e não consulta valores de secrets.

## Conclusão

**Recomendação para Polaris: manter a CI de PR/push em `.github/workflows/ci.yml` e mover as operações manuais para um workflow próprio, por exemplo `.github/workflows/operations.yml`.** O critério decisivo é o ciclo de execução: checks de código rodam automaticamente em PR/push; operações usam seleção manual, podem tocar serviços externos e algumas recebem credenciais chamadas `PRODUCTION_*`.

O checkout tem um único workflow, `CI`, acionado por `push` e `pull_request` em `main`, além de `workflow_dispatch` sem inputs. Ele contém quatro jobs de validação (`verify`, `e2e`, `postgres-behavior`, `admin-e2e`) e seis jobs operacionais condicionados apenas a `github.event_name == 'workflow_dispatch'`: `rls-smoke`, `restore-drill-checklist`, `production-certification-checklist`, `deployment-smoke`, `admin-deployment-smoke` e `production-preflight`. Como não há dependências entre esses jobs, um dispatch executa em paralelo todos os seis jobs operacionais e os checks de CI; não há escolha de operação. O gatilho manual também não restringe a ref, e nenhum job impõe que o run use `main`. `production-preflight` mapeia credenciais de produção, e nenhum dos jobs operacionais declara `environment` ou `permissions` no arquivo. A existência dos nomes de secrets não comprova que estejam configurados remotamente.

Separar os arquivos reduz acionamentos acidentais, deixa o botão de execução manual e o histórico operacional próprios, e torna mais simples manter contexts de CI claros para a proteção de `main`. Essa separação é **organização e isolamento por gatilho**, não uma fronteira de segurança por si só. A segurança dos jobs com credenciais vem das permissões mínimas, secrets escopados, branch/ref permitido e configuração real do Environment.

## Quando usar cada forma

### Jobs no mesmo workflow

Faz sentido quando as etapas são partes do mesmo ciclo e compartilham o mesmo evento, candidato e resultado — por exemplo, validar um commit e, após sucesso, publicar o mesmo artefato num ambiente. `needs` permite expressar essa ordem no mesmo run; um job de deploy pode apontar para um Environment e aguardar suas regras. GitHub Actions suporta jobs paralelos ou sequenciais dentro de um workflow.

Também é adequado para jobs de CI com diferentes runtimes ou dependências, como os quatro jobs de validação atuais. Estarem juntos não significa executarem no mesmo runner: cada job roda isoladamente, e as dependências entre eles são explícitas.

### Workflows separados

Faz sentido quando mudam os gatilhos, quem inicia a tarefa, o conjunto de credenciais ou o tipo de resultado. No Polaris, CI é frequente e automático; smoke e preflight são operações manuais contra endpoints/recursos externos. Um arquivo separado faz com que iniciar uma operação não seja necessário para obter checks de PR, e uma execução manual da CI não invoque silenciosamente operações.

Para a fase atual, um `operations.yml` pode agrupar os comandos operacionais existentes. A execução deve exigir uma seleção explícita da operação — por exemplo, input `choice` obrigatório com um valor por job — e cada job deve rodar somente para a opção correspondente. Deixar o default vazio ou em uma operação inofensiva evita uma escolha implícita de preflight live. Separar futuramente uma operação destrutiva, como um restore drill real, em arquivo/job próprio é uma decisão de risco e credenciais; o `restore-drill-checklist` atual é apenas checklist, conforme seu nome e comando.

Não há exigência de criar workflows distintos para cada app nem de adicionar agora workflows reutilizáveis. O recurso de reusable workflows é indicado quando existe lógica repetida que precisa ser centralizada; não resolve a decisão de escopo de triggers e não é necessário para os poucos jobs operacionais deste repositório.

## Organização não equivale a segurança

1. **Restringir refs:** a interface de execução manual permite escolher a branch; `gh workflow run` também aceita `--ref`. O arquivo precisa existir na branch padrão para receber `workflow_dispatch`, mas isso não força a execução a usar `main`. Para jobs com dados de produção, limitar a ref no job e configurar o Environment para aceitar apenas `main` protegida, depois que P3 for implementado. Uma input `environment` na interface é conveniência de seleção, não substitui a política de branches no Environment.
2. **Usar GitHub Environments:** credenciais de produção devem ficar no Environment correspondente, e o job que precisa delas deve referenciá-lo. Regras configuradas precisam passar antes do job e dos secrets daquele Environment ficarem disponíveis. O Polaris é privado; no GitHub Pro pessoal, environments, environment secrets e regras de branch/tag ficam disponíveis, mas required reviewers e wait timers no plano Pro para repo privado não ficam. Isso é compatível com P3, que dispensou aprovação humana independente.
3. **Configurar o Environment antes de referenciá-lo:** GitHub documenta que executar um workflow com um nome de Environment ainda inexistente pode criá-lo sem regras nem secrets. O YAML `environment: production` sozinho não protege nada. O owner deve criar/configurar o Environment nas Settings e conferir branches permitidas antes de mover as credenciais para esse escopo.
4. **Escopo do token:** definir `permissions` explicitamente, preferindo `contents: read` para checkout/CI e aumentando permissões apenas no job que comprovar necessidade. Um `permissions` parcial torna `none` as permissões não listadas. O workflow atual não define permissões explícitas; o default efetivo pode depender das Settings remotas, não auditadas aqui.
5. **Escopo de credenciais:** mapear cada secret apenas no job/step que o consome. Não deixar credenciais `PRODUCTION_*` no escopo geral de repositório quando puderem ser secrets do Environment. Separar `ci.yml` e `operations.yml` não impede um colaborador com write de editar YAML; a policy de branch do Environment é o controle que impede um workflow executado de uma branch não permitida de obter secrets protegidos.
6. **Run rastreável:** registrar o SHA efetivamente inspecionado pelo preflight/smoke e manter a operação ligada à referência escolhida. Se o fluxo futuro produzir artefato a partir de CI e o promover, o mesmo run com `needs` ou um deployment workflow que consuma esse artefato poderá ligar validação e promoção sem acoplar isso agora.

O `workflow_dispatch` só aparece para um workflow cujo arquivo está na branch padrão e requer write access para iniciar. A tela permite selecionar outra branch e o CLI aceita `--ref`; portanto, a guarda de ref continua necessária. Inputs `choice` e `environment` são suportados e permitem tornar a operação/ambiente explícitos, mas o conjunto de ambientes permitido precisa refletir os Environments já configurados.

## Aplicação ao Polaris e ao staging

P4 e P5 orientam PRs curtos para `main`, sem branch Git permanente `staging` por agora, e reconhecem Local, CI, Staging e Produção como ambientes conceituais. Preview por PR é efêmero. A forma exata de criar staging, escolher hospedagem e promover para produção fica para a etapa de deploy; Polaris ainda não está conectado à Vercel.

Logo, a separação CI/operations pode ser aprovada sem escolher branch `staging`, provedor, trigger de deploy ou fluxo de promoção. A decisão futura sobre staging pode adicionar input/Environment próprio e ajustar as regras. Enquanto não houver deploy, os jobs manuais atuais continuam sendo checks/preflights sobre URLs e secrets eventualmente configurados; seus nomes não demonstram que exista produção ativa.

## Limites e recomendação de execução

- Manter `ci.yml` em `push`/`pull_request` para `main`; `workflow_dispatch` pode permanecer apenas se for útil para repetir a suíte de CI, sem operações.
- Mover os seis jobs operacionais para workflow manual separado; exigir escolha explícita da operação e executar só o job escolhido.
- Para smoke/preflight que usa credencial de produção, exigir `main` e um Environment de produção previamente configurado, com secrets específicos desse Environment e permissões mínimas.
- Não criar um fluxo de deploy automático ou um gate de homologação nesta decisão. Revisitá-los quando as escolhas de hospedagem e staging de P4/P5 forem implementadas.
- Depois da separação, confirmar que os contexts de CI desejados passam num PR; configurar a proteção de `main` conforme P3 somente após restaurar o baseline. A workflow separada por si não demonstra que o check seja obrigatório.

## Relato de operador — evidência anedótica

Uma discussão da comunidade GitHub de setembro de 2023 descreve o mesmo dilema: manter `prod-deploy.yml` manual separado ou condicionar um job de produção dentro da CI. O autor preferiu workflow separado para evitar executar o workflow completo ao despachar só a publicação; respostas também citam outros modelos de promoção e proteção de deployment. É uma experiência individual, sem força normativa, mas coincide com o problema concreto encontrado no `ci.yml` do Polaris. [Discussão GitHub Actions #66132](https://github.com/orgs/community/discussions/66132).

## Fontes oficiais

- [Entender GitHub Actions — workflows e jobs](https://docs.github.com/en/actions/get-started/understand-github-actions)
- [Executar um workflow manualmente](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)
- [Sintaxe de workflow — `workflow_dispatch`, inputs e permissões](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [Gerenciar Environments e suas regras](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)
- [Deployment protections, branch/tag rules e secrets do Environment](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
- [Secure use reference — menor privilégio para `GITHUB_TOKEN`](https://docs.github.com/en/actions/reference/security/secure-use)
- [Secrets no GitHub Actions — escopos e permissões](https://docs.github.com/en/actions/concepts/security/secrets)
- [GitHub Blog — aplicação de menor privilégio aos secrets e proteção de branches de produção](https://github.blog/security/application-security/implementing-least-privilege-for-secrets-in-github-actions/)
- [Workflows reutilizáveis](https://docs.github.com/en/actions/concepts/workflows-and-actions/reusing-workflow-configurations)
