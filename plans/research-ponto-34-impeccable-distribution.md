# P34 — distribuição reproduzível da skill Impeccable

**Data da pesquisa:** 2026-10-01
**Pergunta:** como disponibilizar a skill Impeccable para Codex em um checkout limpo, sem depender da instalação global do usuário nem reintroduzir um hook que não esteja versionado e aprovado?

## Estado verificado no Polaris

- A máquina atual tem Impeccable instalado globalmente em `C:\Users\Junior\.agents\skills\impeccable`; o `SKILL.md` global declara versão `4.3.1`.
- O checkout não contém `.agents/skills/impeccable`, `.codex/skills/impeccable` nem `skills/impeccable`.
- A regra `.agents` em `.gitignore` ignora todo o diretório; simplesmente instalar a skill no projeto não a distribuiria por clone.
- O projeto já mantém `.impeccable/design.json`; isso é contexto visual de projeto, não entrega a skill ou seus arquivos auxiliares.
- O runtime declarado do projeto é Node 24; a instalação oficial por `npx` requer Node 22.18 ou superior.

## O que as fontes oficiais dizem

- A documentação Impeccable suporta instalação por projeto ou global e seleciona uma build para o harness. Para Codex, a instalação local exemplificada fica em `.agents/skills/impeccable/SKILL.md`. O comando de atualização substitui os arquivos instalados da skill e preserva `PRODUCT.md` e `DESIGN.md`.
- O instalador também pode adicionar um hook Codex. Esse hook exige aprovação explícita em `/hooks`; skill discovery e permissão de executar hooks são etapas distintas. O parâmetro `--no-hooks` deixa a instalação de skill separada da ativação do hook.
- A alternativa upstream por Git submodule fixa o código-fonte num commit Git, mas cada clone precisa inicializar o submodule e gerar/linkar a build do provider. Essa etapa é adicional e precisa ser verificada no ambiente Windows/Codex do Polaris antes de tratá-la como fluxo simples.
- O projeto upstream publica a skill sob Apache-2.0 e tem `NOTICE.md`. Ao redistribuir os arquivos do upstream, manter a licença e avisos de atribuição aplicáveis; não editar silenciosamente os arquivos distribuídos.
- O formato Agent Skills usa uma pasta por skill com `SKILL.md` e pode carregar referências/scripts auxiliares. Não distribuir apenas o entrypoint se a skill instalada depende de arquivos companheiros.

Fontes primárias: [instalação e primeiro uso](https://impeccable.style/tutorials/getting-started/), [FAQ e atualização](https://impeccable.style/faq/), [repositório upstream](https://github.com/pbakaus/impeccable), [LICENSE](https://github.com/pbakaus/impeccable/blob/main/LICENSE), [NOTICE](https://github.com/pbakaus/impeccable/blob/main/NOTICE.md), [Agent Skills specification](https://agentskills.io/specification).

## Trade-offs

| Opção | Vantagem | Custo/limite |
| --- | --- | --- |
| Usar somente a instalação global atual | Sem arquivos adicionais no repo. | Não aparece num checkout limpo, worktree ou máquina de outro contributor; não satisfaz distribuição clone-safe. |
| Instalar a build Codex no projeto e versionar a cópia completa | O agente encontra os mesmos arquivos após clone; fluxo de contribuição e atualização usa o PR normal. | A skill fica duplicada no repo e pode ficar desatualizada; é preciso revisar a árvore completa e manter licença/NOTICE. Exige uma exceção estreita no `.gitignore`. |
| Submodule upstream mais etapa de link/materialização | Origem e revisão ficam ancoradas num commit upstream; atualização explícita do submodule. | Inicialização adicional em cada clone e geração/provider-link; maior dependência operacional, e portabilidade do link em Windows precisa ser provada antes de escolher esta rota. |

## Recomendação para decisão

Para o Polaris, preferir uma instalação **Codex, local ao projeto, gerada pelo instalador oficial e versionada como cópia completa** em `.agents/skills/impeccable`. Escolher uma versão upstream estável exata no momento da implementação, registrar versão/origem, manter `LICENSE` e `NOTICE`, e permitir no `.gitignore` apenas essa subtree; outros arquivos locais de `.agents/` continuam ignorados. Atualizações futuras devem usar a mesma ferramenta numa PR que revise toda a árvore e seus avisos.

Na primeira instalação, usar `--no-hooks`. A prioridade é distribuir a skill; o hook é uma execução automática separada que chama o detector e exige trust/aprovação no Codex. Reavaliá-lo somente em decisão própria, com launcher presente e teste em clone limpo. Adicionar um ponteiro curto no `AGENTS.md` para invocar `$impeccable` em mudanças/auditorias de UI, após revisão com a skill `writing-for-agents`.

Critérios para fechar P34: checkout novo recebe a pasta rastreada; Codex descobre a skill sem instalação global; todos os arquivos referenciados/launchers estão presentes e não dependem de caminhos `C:\Users\...`; a licença e o NOTICE permanecem; nenhuma hook executável foi ativada nesta etapa; procedimento de atualização fica documentado e reproduzível. Isso conclui distribuição, não prova que todas as telas sigam DESIGN ou que a UI esteja acessível.

**Decisão do usuário registrada em 2026-10-01:** ao delegar a escolha ao agente, aprovou a recomendação de build Codex completa, local ao projeto, fixada em versão estável exata, com licença/NOTICE, allowlist mínima, sem hook automático, ponteiro em `AGENTS.md` e teste em clone limpo. Isso aprova o formato, não a execução do instalador neste turno.
