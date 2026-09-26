# Pesquisa do ponto 18 — workflow de coding agents

**Data:** 2026-09-24  
**Pergunta:** quais etapas devem orientar o trabalho de agentes de código no Polaris, e quando usar planejamento, checklists, PR, CI e homologação?

## Posição do relatório

O relatório propõe 13 etapas para cada task relevante: localizar documentação canônica, inspecionar código, provar o problema, identificar invariantes, planejar mudanças transversais, implementar o menor ajuste, testar, executar `verify:quick`, revisar diff, atualizar documentação, abrir PR, aguardar CI e homologar. Também recomenda que uma feature grande não seja implementada apenas a partir do prompt.

## Síntese

A direção é boa: esclarecer o resultado esperado, consultar evidências pertinentes, manter o diff focado e verificar o resultado antes de encerrar. A sequência de 13 itens, porém, mistura descoberta, implementação, integração e release, que não se aplicam todas a cada tipo de tarefa.

As fontes first-party convergem em **workflow adaptativo**:

- GitHub recomenda tarefas claras e bem delimitadas, com critérios de aceite; pesquisa e plano antes do PR são especialmente úteis quando é preciso entender o repositório, alinhar a abordagem ou iterar antes de publicar a mudança. ([GitHub Copilot — obter bons resultados](https://docs.github.com/en/copilot/tutorials/cloud-agent/get-the-best-results))
- A Anthropic documenta mais de um fluxo: explorar, planejar, implementar e entregar para problemas que pedem descoberta; teste primeiro para mudanças com resultado facilmente verificável. A página diz explicitamente que Claude Code não impõe um workflow universal. ([Anthropic — Claude Code best practices](https://www.anthropic.com/engineering/claude-code-best-practices))
- As orientações atuais da Anthropic dizem para preferir instruções gerais a passos prescritos, e mencionam que instruções de verificação excessivas podem acrescentar tokens e latência em modelos que já se verificam. Isso não elimina a verificação; recomenda calibrá-la ao modelo e ao trabalho. ([Anthropic — prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices))
- O guia do time Claude Code destaca verificação como prática essencial, mas observa que ela varia por domínio: testes, comandos, simuladores ou navegação. O artigo sobre verification loops descreve o ciclo como contexto → ação → verificação → novo contexto se necessário. ([Anthropic — power-user tips](https://support.claude.com/en/articles/14554000-claude-code-power-user-tips), [verification loops](https://claude.com/blog/building-verification-loops-in-claude-code-with-skills))
- A OpenAI usa planos por marcos e validação após cada marco no exemplo de uma tarefa de longo horizonte, enquanto a documentação de Goals diferencia tarefas bem delimitadas — como corrigir um bug ou adicionar um teste — de tarefas cujo caminho depende do que a investigação revelar. ([OpenAI — long-horizon tasks](https://developers.openai.com/blog/run-long-horizon-tasks-with-codex), [Codex Goals](https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex))

Essas recomendações são exemplos de uso de fornecedores, não estudos comparativos que provem uma sequência ótima para todo repositório. Uma pesquisa recente sobre planos de agentes em projetos open source encontrou usos em manutenção, design, construção, qualidade e processo; os planos observados frequentemente nomeavam arquivos, ordem de implementação e verificações. O estudo é exploratório e o conjunto de dados é concentrado, portanto mostra práticas existentes, não causalidade nem uma obrigação para cada mudança. ([estudo exploratório sobre agent plans](https://arxiv.org/abs/2608.04661))

## Checklists: onde ajudam e onde pesam

Checklists são mais defensáveis em tarefas recorrentes com omissões caras, especialmente lançamento, segurança, migração de dados e recuperação. O guia de launch engineering do Google SRE recomenda que a lista seja leve, adaptável e curada; cada pergunta deve ter importância sustentada, e os lançamentos de baixo risco recebem uma lista quase trivial enquanto os de maior risco recebem controles mais completos. O mesmo guia alerta que processos pesados são contornados e que listas crescem sem curadoria. ([Google SRE — reliable product launches](https://sre.google/sre-book/reliable-product-launches/))

Um experimento controlado de revisão de código com 70 desenvolvedores não sustenta uma regra simples de “mais etapas é melhor”: resultados variaram entre uma mudança pequena e revisões maiores, sem relação geral forte entre o tipo de orientação e o desempenho. O estudo também reconhece limitações de amostra e de desempenho geral. Serve como cautela contra universalizar uma checklist detalhada; não mede coding agents nem prova que checklists sejam ruins. ([Gonçalves et al., *Do explicit review strategies improve code review performance?*](https://doi.org/10.1007/s10664-022-10123-8))

Para etapas determinísticas e repetidas — lint, typecheck, testes, links e políticas — a preferência é automatizar no comando ou CI correspondente. Reservar checklist manual para decisões e operações que ainda exigem julgamento humano. Na checklist, cada item deve ter escopo claro, resposta verificável e ação quando falhar.

Relatos em fóruns são úteis para revelar custo operacional, mas são anedóticos. Em uma discussão de setembro de 2026, um desenvolvedor relata que um fluxo estruturado fez uma feature pequena se arrastar por dias, e pede critérios para decidir entre prompt direto, plano e especificação; outra discussão descreve um gatilho pessoal baseado em objetivo, critérios de aceite e conseguir resumir a mudança em uma frase. Isso não demonstra causalidade, mas reforça que o nível de processo deve acompanhar o tamanho e a incerteza da tarefa. ([Reddit — workflow por tamanho da tarefa](https://www.reddit.com/r/ClaudeCode/comments/1wmax2u/whats_your_actual_claude_code_workflow_by_task/), [Reddit — protocolo de workflow](https://www.reddit.com/r/ClaudeAI/comments/1trn2fe/whats_your_actual_claude_code_workflow_not_tip/))

## Diferenças por tipo de tarefa

| Tipo | Fluxo proporcional | Passos condicionais |
|---|---|---|
| **Bugfix** | Entender o sintoma; reproduzir ou reunir evidência no código/log/teste; identificar o comportamento que precisa permanecer; corrigir com escopo estreito; executar teste focal; revisar o diff. | Planejar se a causa atravessa módulos, persistência, autorização ou integrações. Atualizar documentação se o contrato documentado mudar. PR e CI ao integrar no branch protegido; homologação apenas se a correção participa de um release ou precisa de validação pré-produção. |
| **Feature** | Esclarecer usuário/cenário, resultado e critérios de aceite; localizar regras, arquitetura e implementação relevantes; implementar em mudanças revisáveis; validar os critérios. | Planejamento e alinhamento prévios quando requisitos estiverem incompletos, a solução for transversal ou houver trade-offs de produto/arquitetura. Testes de fluxo/UI quando o comportamento é visível ao usuário. Atualizar docs canônicas afetadas. PR e CI para integrar; preview/homologação quando a validação exigir ambiente. |
| **Mudança transversal** | Fazer descoberta focada de limites, contratos, invariantes e dependências; registrar opções, riscos e ordem; revisar o plano antes de mudanças difíceis de reverter; implementar por etapas e validar em cada marco; revisar o conjunto. | ADR ou alteração de regra/spec se a decisão atingir essas fontes. Testes mais amplos e plano de rollback quando há schema, dados, auth, billing, storage, callbacks ou várias aplicações. Homologação se fizer parte do release. |
| **Release / go-live** | Tratar como operação separada da implementação: identificar release candidate, dependências e migrações; verificar CI; executar checklist de readiness; validar deployment e smoke tests em staging; definir monitoramento, responsáveis, contingência/rollback; promover e observar em produção. | O tamanho da checklist e a estratégia gradual dependem do risco e impacto. Google SRE usa checklists de lançamento e rollouts por etapas porque estão verificando operação sob tráfego e risco de produção, não cada edição local. ([Google SRE — launch checklist](https://sre.google/sre-book/launch-checklist/), [deployment strategies](https://sre.google/sre-book/reliable-product-launches/)) |

Documentação-only, pesquisa, explicação de erro e leitura de PR não devem herdar automaticamente o fluxo de feature. Aplicar o verificador de documentação a arquivos documentais; não rodar suíte de código se ela não for afetada. Se a tarefa só pede análise, não há diff, PR, CI ou homologação a executar.

## PR, CI e homologação

PR e CI são o caminho de integração de uma mudança persistente, não evidências independentes que o agente precisa repetir como ações manuais em cada subtarefa. O CI pertence ao PR; localmente, a verificação deve ser suficiente para encontrar falhas rapidamente e proporcional ao diff. No Polaris, as decisões anteriores estabelecem PR para integrar a `main` protegida e checks requeridos; portanto, quando um trabalho altera o repositório para merge, essa trilha continua aplicável.

Homologação é uma verificação de release/environment. O Google Cloud distingue testes funcionais da finalidade de staging, que é validar que o procedimento de deployment funciona, e a posiciona como último passo antes de produção. Isso não justifica exigir deploy em staging para todo bugfix, mudança documental ou alteração ainda sem release. ([Google Cloud — ambientes de desenvolvimento, teste, staging e produção](https://docs.cloud.google.com/architecture/hybrid-multicloud-patterns-and-practices/environment-hybrid-pattern))

O guia de AI-native SDLC da Anthropic exemplifica um processo muito mais pesado: intent → spec → plano aceito → construção → PR/review → deploy/manutenção. Ele o apresenta como um playbook de organização para um SDLC com artefatos e governance dedicados. É referência para mudanças estratégicas e trabalho de alta escala, não um mínimo obrigatório para uma correção focada. ([Anthropic — AI-Native SDLC playbook](https://claude.com/blog/the-ai-native-sdlc-playbook))

## Recomendação para o Polaris

Substituir as 13 etapas obrigatórias por um **loop curto comum, com aprofundamento por risco e tipo de entrega**:

1. Entender o resultado pedido e como reconhecer que está concluído; para uma mudança de código, ler somente as fontes canônicas, código e testes pertinentes.
2. Escolher a profundidade antes de editar: direto para mudança pequena e clara; descobrir/planejar para tarefa ambígua, transversal, de alto impacto ou difícil de reverter. Não começar feature grande sem critérios de aceite e sem resolver as decisões de produto/arquitetura que alteram sua solução.
3. Fazer a menor mudança coerente e revisar seu próprio diff.
4. Verificar o comportamento pelo sinal mais próximo e suficiente. Ampliar os checks quando o impacto exigir; não repetir uma bateria se ela duplica o teste focal.
5. Atualizar a fonte documental afetada, se houver mudança de regra, contrato, arquitetura, operação ou risco. Descrever comandos e resultados da verificação; indicar claramente o que não foi executado e por quê.
6. Quando a mudança deva entrar na `main`, abrir/atualizar PR e deixar os checks obrigatórios do CI executarem. Acrescentar homologação e checklist de release apenas para a preparação/promoção de um release.

O checklist comum serve como lembrete de **decisões** — escopo, fontes relevantes, verificação, documentação e integração —, não como roteiro de 13 comandos obrigatório. A regra sobre “não começar feature grande só pelo prompt” deve virar critério observável: se falta cenário de uso, aceite, limite do escopo ou decisão que muda a implementação, esclarecer/planejar antes; caso contrário, não exigir uma fase formal de aprovação de plano.

### Evidência e limites

- Estudos e guias divergem em granularidade porque tratam de modelos, contextos e tamanhos de tarefa diferentes. Um estudo de planos open source descreve práticas adotadas; o experimento de checklists examina humanos revisando código; nenhuma das fontes valida o workflow proposto por este relatório no Polaris.
- Os guias de fornecedor são atualizados com frequência e refletem produtos próprios. A recomendação acima usa princípios repetidos entre fontes, não recursos específicos de Claude, Codex ou Copilot.
- Não foi feita neste arquivo uma auditoria atualizada de cada comando de verificação do Polaris nem uma decisão sobre suas políticas de release; isso pertence à validação local e aos pontos de fundação correspondentes.
