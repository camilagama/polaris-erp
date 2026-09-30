# Pesquisa — autoridade documental e memória de agentes

**Ponto avaliado:** se `aidd_docs/` deve continuar como autoridade e ser carregado por padrão, ou se o agente deve localizar contexto atual por meio dos documentos canônicos do repositório.

## Auditoria local

- O [`AGENTS.md`](../AGENTS.md) afirma que documentação, memória, specs e planos vivem em `aidd_docs/`. Seu bloco de memória atual está vazio; por isso, a instrução de carregamento manda listar e ler todo `aidd_docs/memory/`.
- Essa pasta contém `project-state.md`, revisto em 2026-07-13, que afirma haver um projeto Vercel admin ativo e protegido. O usuário confirmou que Polaris ainda não está conectado/publicado na Vercel; portanto, essa lembrança não pode ser fonte de estado atual.
- `aidd_docs/` também contém `production-closed-test.md` (12/07/2026) e `codebase-deep-review-2026-07-13.md`, snapshots de operações/auditoria anteriores. Eles podem ajudar em consultas históricas, mas seus estados e planos exigem verificação contra fontes atuais.
- Há documentação canônica versionada fora de `aidd_docs/`: `README.md`, `PRODUCT.md`, `DESIGN.md`, `docs/` e `plans/`. O usuário já aprovou `docs/README.md` como mapa documental único e uma hierarquia de autoridade por tipo de afirmação.
- No Hub local, `AGENTS.md` manda usar `docs/README.md` para localizar o guia relevante, consulta produto/arquitetura somente quando a tarefa cruza essas fronteiras e trata material histórico/tooling como evidência, não autoridade atual. Isso é uma comparação de snapshot; não implica copiar a árvore ou os conteúdos do Hub.

## Fontes e distinções

A documentação oficial do GitHub para Copilot CLI lista `AGENTS.md` como arquivo de instrução e permite que ele referencie outro arquivo por caminho relativo. Ela também explica que as instruções aplicáveis podem ser combinadas e que não existe uma precedência geral entre arquivos: recomenda evitar conflitos. Essa é evidência do comportamento de Copilot CLI, não uma especificação universal de todos os agentes. Ela reforça que o ponteiro no `AGENTS.md` deve dizer claramente qual fonte é canônica e em que tarefa consultá-la. [GitHub Docs: adding custom instructions](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions)

A skill local `writing-for-agents` (em `C:\Users\Junior\.codex\skills\writing-for-agents\SKILL.md`) trata ponteiros como instruções condicionais: cada ponteiro deve dizer que tipo de tarefa exige carregar o material. No Polaris, ler automaticamente toda a memória quando o bloco está vazio carrega um snapshot operacional antigo sem que a tarefa precise dele.

## Recomendação para Polaris

1. Declarar como fontes canônicas os documentos raiz atuais de produto/design e o mapa `docs/README.md` com seus guias. Depois de implementadas as decisões P8/P9, `CONTEXT.md` também entra nessa lista.
2. Corrigir o `AGENTS.md`: substituir a afirmação de que docs, specs e planos vivem em `aidd_docs/` por um ponteiro para `docs/README.md` e regras de carregamento por tarefa. Ler o guia de domínio, operação ou ADR relevante quando a mudança o exigir.
3. Remover a leitura obrigatória de todos os arquivos de `aidd_docs/memory/`. Manter `aidd_docs/` preservado como histórico/contexto auxiliar; consultá-lo somente quando a tarefa pedir histórico ou uma lacuna real exigir evidência adicional. Informação de estado deve ser revalidada contra o checkout, configuração ou fonte canônica.
4. Não migrar/deletar em massa os três arquivos agora. Corrigir ou arquivar o project-state obsoleto e promover somente informação ainda válida depois de revalidação. Isso elimina a autoridade implícita sem perder trilha histórica nem criar diretórios novos prematuramente.

**Limite:** “não autoritativo” não significa “inútil”. Um snapshot pode explicar por que uma decisão foi investigada, mas não substitui regra aprovada, código atual, configuração remota datada ou runbook canônico.

## Decisão após alinhamento

Em 2026-09-24, o usuário aprovou `docs/README.md` como rota para as fontes atuais e removeu a autoridade implícita de `aidd_docs/` sobre docs/specs/planos atuais. `AGENTS.md` deixará de exigir a leitura da memória inteira; `aidd_docs/` será preservado no lugar como material histórico/contextual sob demanda. Memória operacional de julho deve ser revalidada antes de ser tratada como estado presente. Não haverá migração nem exclusão em massa.

Essa decisão fecha o P14. O P15 decide como o `AGENTS.md` comunica a regra canônica e a manutenção de documentos no fluxo de mudanças.
