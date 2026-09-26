# Pesquisa do ponto 42 — Definition of Done por risco

**Data:** 2026-09-25  
**Estado:** aceito em 2026-09-25: `docs/testing/strategy.md` será a fonte canônica; `AGENTS.md` terá ponteiro curto e `docs/README.md` a indexará.  
**Pergunta:** manter toda a matriz `Low/Medium/High` em `AGENTS.md` ou guardar o contrato operacional numa fonte canônica com ponteiro condicional?

## Recomendação

Usar uma composição curta:

1. Manter em `AGENTS.md` apenas o critério universal de conclusão já existente: executar a verificação pertinente, revisar o resultado e declarar limitações quando ela não puder ser executada. Não duplicar a matriz de risco ali.
2. Usar `docs/testing/strategy.md` como fonte canônica para a matriz `Low/Medium/High` e sua evidência proporcional. O documento já descreve as camadas e limites dos testes do Polaris, portanto é mais adequado que criar outro guia ou tratar uma nota de pesquisa como regra operacional.
3. Acrescentar a `AGENTS.md` um ponteiro curto e acionável: antes de declarar concluída uma implementação, refatoração ou mudança em PR, classificar o impacto e consultar a seção de verificação por risco em `docs/testing/strategy.md`.
4. Tratar CI, hooks e checks como mecanismos de bloqueio; a matriz instrui e organiza evidência, mas não impede sozinha um agente de omitir etapas.

O ponteiro deve indicar o gatilho e a ação, sem sintaxe de importação que carregue o conteúdo inteiro. Na documentação do Copilot CLI, referências `@arquivo` dentro de `AGENTS.md` são incluídas imediatamente; isso anularia a intenção de carregamento condicional nesse cliente.

## Por que essa divisão se encaixa no Polaris

- O `AGENTS.md` atual tem 246 linhas e 9.268 bytes. Sua seção `Verification Standard` já exige check/test/build pertinente, revisão documental para mudanças só de docs e declaração explícita de bloqueios. O problema é que ela não aponta hoje para os níveis e exemplos aprovados no P41.
- `docs/testing/strategy.md` tem 23 linhas e uma tabela de camadas reais de CI (checks estáticos, Vitest, PostgreSQL comportamental, E2E, docs e env), além das limitações de cobertura. A matriz por risco complementa essa finalidade.
- `docs/maintenance.md` já cobre quando atualizar documentação e a responsabilidade do autor do PR, mas não é o lugar natural para definir evidência de testes por impacto.
- P15 aprovou ponteiros condicionais no `AGENTS.md`; P16 aprovou preservar acordos duráveis sem limite artificial de linhas; P17 aprovou não criar `AGENTS.md` aninhados nesta fase.
- P20/P21 aprovaram `verify:quick` como base uniforme e P41 aprovou validação proporcional por risco, sem bypass da CI comum. Os nomes `verify:quick` e `verify` são decisões do plano e ainda não existem como scripts neste checkout. A futura regra deve apontar para comandos implantados e para a evidência disponível, sem alegar que comandos planejados já foram executados.
- A pesquisa do P41 é uma decisão aprovada e referência de rationale; não deve ser a fonte operacional que agentes precisam consultar a cada implementação.

## Critérios por risco que a fonte canônica deve preservar

O relatório propõe testes focados e exige `verify` para Medium/High; sua lista de documentos, ADR e staging para High, porém, precisa respeitar os refinamentos aprovados no P41:

- **Low:** `verify:quick`; executar teste focal ou checagem manual quando a mudança altera comportamento. Para documentação isolada, a revisão e `docs:check` podem ser suficientes, sujeito ao fluxo de `pre-push` aprovado.
- **Medium:** `verify` e evidência focal da regra, rota ou integração afetada; atualizar docs quando semântica/contrato mudar.
- **High:** `verify` e evidência dirigida ao invariante de maior risco (por exemplo, PostgreSQL/RLS para tenancy ou migration, casos negativos de autorização, fluxo controlado de billing/webhook, ou inspeção do workflow e escopo de credencial). Fazer auto-revisão de segurança conforme os guias pertinentes. Atualizar ADR/runbook apenas se decisão, contrato ou operação mudarem; executar smoke de staging apenas quando o ambiente existir e for relevante. Antes disso, usar ambiente não produtivo local/CI e declarar o limite da evidência.

Todos os níveis continuam sujeitos aos checks de integração acordados. Revisão por IA é assistiva e não substitui a responsabilidade do autor; High não introduz um segundo aprovador nem exige ferramenta de IA.

## Inline integral vs. fonte canônica com ponteiro

| Opção | Vantagem | Custo/risco | Adequação ao Polaris |
| --- | --- | --- | --- |
| Matriz inteira sempre em `AGENTS.md` | Alta visibilidade; não depende de uma busca adicional ao atuar em código. | Codex carrega a cadeia de instruções ao iniciar; detalhes específicos de implementação ocupam contexto também em tarefas de docs/perguntas. A matriz repetiria decisões mantidas noutro lugar e poderia divergir dos scripts e da CI. | Parcial. Deixar só o mínimo universal inline; usar ponteiro para critérios que dependem do tipo de mudança. |
| Fonte canônica com ponteiro condicional | Uma fonte para os níveis, verificações, exceções e evidência; atualização em um lugar; só tarefas de mudança de software carregam a matriz. | Se o ponteiro for vago ou não for seguido, a matriz pode passar despercebida; mais um salto de leitura. | Melhor equilíbrio. O gatilho deve dizer explicitamente que implementação/refatoração/PR exige classificação e consulta à seção indicada. |

O custo de discoverability do ponteiro é real: um arquivo canônico não ajuda se nenhum agente souber quando abri-lo. A mitigação é manter o ponteiro raiz curto, concreto e perto do critério universal de conclusão, e manter o destino em `docs/README.md`/estrutura documental. Não usar texto do tipo “consulte docs relevantes”.

## Documentação de agentes e exemplos

- **OpenAI Codex:** a cadeia de instruções é montada no início da execução; arquivos aplicáveis de projeto entram no contexto e Codex deixa de buscar ao atingir o diretório de trabalho. O limite padrão combinado é 32 KiB. A orientação de code review recomenda regras concisas e reserva formatação/lint para CI. Isso favorece manter o necessário em todas as tarefas na raiz e fazer disclosure do que depende do tipo de mudança. [Codex — custom instructions with `AGENTS.md`](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- **GitHub Copilot CLI:** descobre `AGENTS.md` em locais padrão, aceita instruções específicas por caminho e combina arquivos aplicáveis; não define precedência geral e recomenda evitar conflitos. Referências `@` em `AGENTS.md` são carregadas imediatamente. Para o Polaris, um ponteiro condicional em texto simples é melhor que importar a matriz em todas as sessões. [GitHub — add custom instructions](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions)
- **Claude Code:** seus arquivos de instrução podem ser carregados a cada sessão; regras com `paths:` podem restringir conteúdo por área. O suporte direto a `AGENTS.md` depende da versão/configuração e a presença de `CLAUDE.md` pode mudar qual fonte é lida. O comportamento entre agentes não é idêntico, reforçando que o destino do ponteiro seja documentação Markdown normal e versionada. [Claude Code — memory and instructions](https://code.claude.com/docs/en/memory)
- **Supabase JS:** o `AGENTS.md` raiz se define como entry point, diz que o conteúdo canônico vive em outras fontes, encaminha para convenções, testes e release e evita duplicar documentação da API. É exemplo maduro de índice de instruções pequeno; sua necessidade de espelhamento de Skills para compatibilidade com ferramentas específicas não deve ser copiada ao Polaris sem motivo. [supabase-js `AGENTS.md`](https://github.com/supabase/supabase-js/blob/master/AGENTS.md)
- **Supabase monorepo:** combina comandos/gates globais no arquivo raiz com ponteiros para skills por gatilho e `AGENTS.md` de subáreas especializadas. É um exemplo híbrido; a existência de muitos apps/stacks explica a especialização, mas o Polaris aprovou não criar instruções aninhadas agora. [supabase `AGENTS.md`](https://github.com/supabase/supabase/blob/master/AGENTS.md)
- **Opinião de fórum (anedótica):** em discussão no r/cursor, participantes descrevem dois custos: regras antigas podem continuar direcionando o agente a caminhos mortos, e arquivos longos consomem contexto; outra pessoa recomenda separar material que muda com frequência e vinculá-lo desde o `AGENTS.md`. É experiência individual, com discordância no tópico, não evidência normativa. [Discussão sobre instruções stale em `AGENTS.md`/`CLAUDE.md`](https://www.reddit.com/r/cursor/comments/1uldhvv/anyone_else_find_their_claudemd_agentsmd_files/)

## Limites

Um ponteiro explícito melhora a chance de consulta, mas `AGENTS.md` continua sendo orientação comportamental, não controle determinístico. As verificações executáveis, workflows e proteções aprovadas devem bloquear o que realmente precisa ser obrigatório. O conteúdo exato da seção de risco depende dos comandos P20 e das verificações que forem implementados; este ponto decide localização e acesso à regra, não afirma que a fundação já está aplicada.
