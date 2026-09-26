# Pesquisa do ponto 15 — instruções de agente e manutenção da documentação

**Data da pesquisa:** 2026-09-24  
**Escopo:** avaliar a proposta do relatório de usar o `AGENTS.md` para encaminhar ao mapa canônico e exigir atualização documental junto a mudanças relevantes. Esta nota registra práticas externas; a auditoria local do Polaris e do Hub fica no material de revisão do ponto.

## Síntese

A proposta do relatório é bem direcionada, com uma ressalva: a regra de atualização deve ser **condicional ao impacto da mudança** e apontar para documentos canônicos, sem transformar o `AGENTS.md` em cópia do mapa ou da documentação. As fontes favorecem uma entrada pequena e durável, documentos versionados como registro oficial do projeto e carregamento progressivo de contexto. Elas não recomendam ler todo o conjunto de docs em todas as tarefas.

No Polaris, isso se encaixa nas decisões já aprovadas nos pontos 7 e 14: `docs/README.md` é o índice canônico único; `AGENTS.md` encaminha para ele e para as fontes canônicas relevantes; memória em `aidd_docs/` é consultada por necessidade, não carregada inteira por padrão. O ponto 12 também já aprovou atualizar documentação junto à mudança quando o comportamento documentado for alterado, com revisão direcionada para fontes mapeadas.

## O que cabe no `AGENTS.md`

`AGENTS.md` é um formato Markdown aberto de instruções, não um esquema que imponha seções ou níveis de detalhe. O [site do formato](https://agents.md/) o descreve como contexto e instruções para agentes, com exemplos de comandos, estilo, testes e segurança. A documentação oficial do [Codex sobre `AGENTS.md`](https://developers.openai.com/codex/guides/agents-md) explica a descoberta por diretório, o acúmulo de orientações do escopo global ao diretório de trabalho e o limite padrão combinado de 32 KiB. A convenção é útil, mas cada ferramenta define sua própria descoberta e combinação.

A recomendação oficial do Codex para uma orientação que se aplica a todos os pedidos é usar o arquivo raiz; orientações para uma parte específica podem ficar em arquivos aninhados. O guia traz exemplos de convenções de setup, comandos de validação e documentação de utilitários quando seu comportamento muda. Isso favorece manter no arquivo raiz apenas decisões de trabalho realmente persistentes e relevantes a várias tarefas, por exemplo: hierarquia de fontes, como localizar instruções específicas e qual mudança exige atualização documental.

O material oficial recente da OpenAI aconselha revisar o `AGENTS.md` periodicamente porque ele entra em todo trabalho do repositório. Também alerta contra obrigar o agente a ler arquitetura, banco e deploy antes de cada edição: aponte qual fonte usar para cada tipo de tarefa. Uma página oficial de setembro de 2026 diz que modelos mais novos precisam de menos itinerários rígidos, e que instruções excessivas podem desperdiçar contexto ou criar hesitação. ([Rethinking skills and prompts for GPT-6 Astra](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra))

Em outra experiência de primeira parte, a equipe de engenharia da OpenAI descreve o `AGENTS.md` como mapa para uma base de conhecimento versionada em `docs/`, não como enciclopédia. Relata ter abandonado um arquivo monolítico por custo de contexto, orientação diluída, apodrecimento e dificuldade de validação; usa documentação estruturada, links e checks para mantê-la sincronizada. Essa experiência vem de um produto interno desenvolvido intensivamente com agentes, portanto serve como caso prático forte, não como regra universal para todo repositório. ([Harness engineering](https://openai.com/index/harness-engineering/))

## Ponteiros, escopo e autoridade

Um ponteiro precisa informar **qual fonte consultar e em que situação**. “Consulte arquitetura em mudanças de fronteiras entre pacotes” é mais operacional que “leia toda a documentação antes de qualquer tarefa”. Para o Polaris, `docs/README.md` é o mapa; o agente deve selecionar, dentro dele, a fonte de produto, domínio, arquitetura, segurança, banco ou operação ligada à tarefa. A fonte especializada mantém o conteúdo e o `AGENTS.md` mantém a instrução de navegação.

O [Codex](https://developers.openai.com/codex/guides/agents-md) acumula arquivos aplicáveis do escopo global ao diretório corrente e usa os mais específicos para sobrepor orientações anteriores. O [GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions) combina fontes de instrução e diz expressamente que não há precedência geral entre todos os tipos; orientações modulares podem ter aplicação por caminho. Logo, uma política portável deve evitar contradições entre arquivos. Não se deve pressupor que todos os agentes interpretem links Markdown ou sintaxe de importação da mesma maneira: o Copilot CLI, por exemplo, documenta expansão imediata de `@caminho`, mas esse comportamento é específico da ferramenta. Um link relativo visível e uma instrução explícita de quando abri-lo são mais portáveis que depender de importação automática.

Arquivos locais só ajudam quando realmente acrescentam uma regra distinta. O exemplo do [VS Code](https://github.com/microsoft/vscode/blob/main/AGENTS.md) usa um `AGENTS.md` raiz de cinco linhas para apontar às instruções detalhadas, que ficam separadas. O monorepo [Supabase](https://github.com/supabase/supabase/blob/master/AGENTS.md) usa instruções aninhadas em apps com stack, fluxo ou habilidades próprias, e remete as convenções de docs a instruções específicas dessa área. São formas diferentes de organização; a decisão deve acompanhar os limites reais do repositório, sem criar um arquivo em cada diretório por simetria.

## Atualização no mesmo PR

A [guia de documentação do Google](https://google.github.io/styleguide/docguide/best_practices.html) recomenda alterar a documentação no mesmo changelist que a mudança de código, por manter o texto fresco e dar ao revisor contexto do comportamento. Também recomenda documentação mínima útil, remover páginas mortas e evitar duplicação. A equipe da OpenAI relata uma abordagem semelhante: conhecimento em arquivos versionados, links e validadores mecânicos para manter cobertura e atualidade ([Harness engineering](https://openai.com/index/harness-engineering/)).

Aplicação prática: quando uma mudança altera um contrato ou fato documentado, atualizar a fonte canônica na mesma PR. Para o Polaris, candidatos naturais são regras/contratos de produto ou domínio, autorização e limites de segurança, schema/migrations e suas implicações, significado/escopo de variáveis de ambiente, e procedimentos operacionais ou de deploy/callback. A lista deve ser tratada como exemplos de gatilhos, não como obrigação de editar docs em toda alteração de arquivo. Uma refatoração sem mudança de comportamento não exige uma atualização documental artificial. Se a mudança não puder ser explicada sem criar uma nova regra, registrar isso como lacuna e localizar a fonte correta, em vez de duplicar conteúdo no `AGENTS.md`.

## Trade-offs e evidência empírica

Um estudo de 2026 com 10 repositórios e 124 PRs encontrou arquivos `AGENTS.md` associados a menor tempo mediano e menos tokens de saída, sem diferença observada na conclusão das tarefas. ([On the Impact of AGENTS.md Files on the Efficiency of AI Coding Agents](https://arxiv.org/abs/2601.20404)) Um segundo estudo com tarefas de SWE-bench e CTXbench, abrangendo mais modelos e agentes, não encontrou melhora significativa consistente nas taxas de sucesso com arquivos de contexto; eles aumentaram o custo em várias condições e induziram mais exploração e testes. A análise sugere que informação redundante com documentação existente é um risco; quando o repositório não tinha docs, o contexto podia ajudar. Os autores recomendam instruções humanas mínimas, específicas e necessárias. ([Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?](https://arxiv.org/abs/2602.11988))

Os resultados não são uma contradição simples: variam em conjunto de tarefas, agentes, modelos, conteúdo dos arquivos e protocolo. Eles não justificam remover instruções comprovadamente úteis; reforçam evitar checklists obrigatórios e mapas extensos sem gatilho claro. Um estudo de mineração de 100 repositórios identifica como smell comum instruções que repetem formatters e linters já automatizados — “lint leakage” —, sustentando a separação entre orientação humana para casos especiais e gates mecânicos de CI. ([Configuration Smells in AGENTS.md Files](https://arxiv.org/abs/2606.15828))

## Recomendação para o Polaris

1. Manter `docs/README.md` como mapa canônico, conforme aprovado. O `AGENTS.md` deve dar um ponteiro curto e indicar a condição de uso: consultar esse índice para localizar a fonte canônica que governa a área alterada ou a documentação que precisa ser mantida.
2. Acrescentar uma regra concisa de atualização no mesmo PR, usando gatilhos por **mudança semântica**: se comportamento ou contrato documentado mudar, atualizar a fonte canônica relacionada no mesmo PR. Isso incorpora a decisão já aprovada no ponto 12 e concretiza a proposta do ponto 15 sem obrigar um diff documental para refactors sem impacto observável.
3. No `AGENTS.md`, nomear as categorias de maior risco como exemplos claros (domínio/contratos, autorização e segurança, schema/migrations, variáveis de ambiente, operação/deploy). Não transcrever suas regras; apontar para o mapa e documentos especializados.
4. Evitar leitura completa dos docs a cada tarefa. Referenciar fontes com gatilhos específicos e carregar a documentação pertinente à mudança. Usar `AGENTS.md` aninhado somente quando uma subárea possuir instrução durável que difere do padrão global; não criá-lo em cada pasta como inventário.
5. Verificar que as regras de agente, `docs/README.md` e demais arquivos de instrução não mandam ações incompatíveis. A hierarquia de autoridade deve dizer qual documento governa cada espécie de afirmação, em vez de declarar um arquivo que prevalece sobre todo tipo de verdade.
6. Revisar o conteúdo do `AGENTS.md` quando contratos, ferramentas ou automações mudarem; detalhes de execução já codificados em `package.json`, workflows ou configuração devem ser lidos da própria fonte sempre que forem fáceis de consultar. Isso reduz documentação-cache que fica obsoleta.

O ponto 16 do relatório trata separadamente de encurtar o `AGENTS.md` raiz; esta pesquisa não decide seu tamanho nem a remoção de regras existentes. O foco aqui é o contrato documental do ponto 15.

## Decisão após alinhamento

Em 2026-09-24, o usuário aprovou acrescentar ponteiros concisos no `AGENTS.md` para o mapa `docs/README.md` e, em tarefas documentais, para `docs/maintenance.md`; o índice também passará a listar esse guia. A matriz/checklist detalhados ficam no guia de manutenção, não duplicados nas instruções sempre carregadas. O lembrete curto explicará que a fonte canônica deve ser atualizada no mesmo PR quando contrato ou comportamento documentado mudar.

Essa decisão encerra a revisão do P15. A redução geral do `AGENTS.md` e a triagem de suas regras ficam para o P16.

## Fontes

### Fontes oficiais e projetos de primeira parte

- [AGENTS.md — formato aberto e exemplos](https://agents.md/)
- [OpenAI Codex — Custom instructions with AGENTS.md](https://developers.openai.com/codex/guides/agents-md)
- [OpenAI Developers — Rethinking skills and prompts for GPT-6 Astra](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra)
- [OpenAI — Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering/)
- [GitHub Docs — Adding custom instructions for GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions)
- [Google Style Guides — Documentation Best Practices](https://google.github.io/styleguide/docguide/best_practices.html)
- [Microsoft VS Code — root AGENTS.md](https://github.com/microsoft/vscode/blob/main/AGENTS.md) e [instruções de Copilot](https://github.com/microsoft/vscode/blob/main/.github/copilot-instructions.md)
- [Supabase — AGENTS.md de monorepo](https://github.com/supabase/supabase/blob/master/AGENTS.md)

### Estudos

- [On the Impact of AGENTS.md Files on the Efficiency of AI Coding Agents (2026)](https://arxiv.org/abs/2601.20404)
- [Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents? (2026)](https://arxiv.org/abs/2602.11988)
- [Configuration Smells in AGENTS.md Files: Common Mistakes in Configuring Coding Agents (2026)](https://arxiv.org/abs/2606.15828)
