---
status: accepted
research_status: repository-and-decision-crosswalk-completed
decision_status: approved
reviewed_on: 2026-09-26
approved_on: 2026-09-26
---

# P62 — sequência do workflow determinístico

## Conclusão

Os itens técnicos de P62 já têm contratos aprovados em P20/P21/P23/P25–27/P40/P41. P62 precisa ordená-los por dependência, não criar uma política paralela. O usuário aprovou: perfis `verify` primeiro; Lefthook depois de medição; operations split antes de concurrency; token permissions/action pins antes de secrets; template com risco textual; branch names descritivos sem regra obrigatória; sem labels de risco.

## Estado do checkout

- `package.json`: não há `verify:quick` nem `verify`; algumas tarefas têm variantes `:admin`/`:all`, mas não são os perfis aprovados completos.
- `lefthook.yml`: `pre-push` executa `bun run check` e `bun run test`, com cobertura atual concentrada em Web.
- `.github/workflows/ci.yml`: CI e operações manuais no mesmo arquivo; sem `permissions` ou `concurrency`; references de Actions por tag major, não SHA.
- `.github/`: sem template de PR ou configuração local de branch names/risk labels. Configurações remotas do GitHub não foram consultadas.

## Ordem reconciliada

1. Corrigir baseline conforme P22 e implementar `verify:quick`/`verify` conforme P20, full workspace e sem `--affected`.
2. Fazer Lefthook chamar `verify:quick` só depois da confirmação de instalação e medição de tempo (P21).
3. Separar `ci.yml` de `operations.yml` conforme P23.
4. Adicionar concurrency apenas à CI após a separação; não cancelar operações e confirmar isolamento E2E quando cancelamento possa ocorrer. Locks de operações são decididos por recurso quando P4/P5 definirem os alvos (P27).
5. Declarar permissões mínimas e fixar cada Action por SHA antes de ligar secrets operacionais; rotação fica no processo P26/P53.
6. Criar o template de PR aprovado em P40. Classificação de risco é campo curto mais justificativa; P41 não aprovou labels obrigatórias.
7. Nomes de branch ficam descritivos e simples; não há prefixo de tipo, ticket ID ou validação em CI obrigatórios. P3/P19 garantem PR por mudança e worktrees em escrita paralela, não convenção lexical.

## Pesquisa atual

GitHub documenta branch protection para nomes exatos ou patterns (`fnmatch`) e requisitos como status checks, bloqueio de force-push e deleção. A documentação de padronização lista templates de PR como mecanismo para pedir propósito, relação a issue e notas de teste; não impõe convenção de nome de branch. [About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches), [Managing and standardizing pull requests](https://docs.github.com/en/pull-requests/reference/managing-and-standardizing-pull-requests).

Contribuidores usam prefixos de tipo, IDs de tickets, equipes ou apenas um nome descritivo. Discussões comunitárias discordam sobre tornar a forma obrigatória; os benefícios dependem de automações e trackers do time. Como Polaris não aprovou um tracker e tem poucos contribuidores, convenção simples sem enforcement é suficiente. Essa evidência é anedótica, não uma norma. [Discussão em r/devops](https://www.reddit.com/r/devops/comments/1novyn3/), [discussão em r/git](https://www.reddit.com/r/git/comments/xddr5d/).

Um projeto público moderno como GitHub Spec Kit documenta tipos `fix/` e `docs/` com IDs em seu CONTRIBUTING. Isso é uma escolha local associada ao workflow daquele repositório, não uma convenção oficial do GitHub nem requisito para Polaris. [GitHub Spec Kit CONTRIBUTING](https://github.com/github/spec-kit/blob/main/CONTRIBUTING.md).

## Limites

Revisão estática de arquivos locais e reconciliação com decisões anteriores; não consultei Settings/checks/labels remotos, não executei workflows, testes ou hooks e não editei código. Sem nova integração/tecnologia: os detalhes de GitHub Actions, Actions pinning, permissions e concurrency já foram pesquisados e aprovados nos pontos anteriores.
