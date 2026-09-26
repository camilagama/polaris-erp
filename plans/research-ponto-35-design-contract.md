# Pesquisa do ponto 35 — contrato de interface e `DESIGN.md`

**Data da revisão:** 2026-09-25  
**Estado:** decisão aprovada em 2026-09-25.  
**Ponto do relatório:** expandir `DESIGN.md` para orientar a construção consistente das interfaces do Polaris.

## Resumo

A recomendação do relatório procede quanto às lacunas de um contrato de interface, mas sua caracterização do arquivo atual como mero manifesto é incompleta: `DESIGN.md` já contém regras, valores e exemplos parciais. A ação adequada é revisar o que existe com evidência do código e acrescentar padrões que facilitem decisões de implementação. O `DESIGN.md` do Hub serve como referência de organização e clareza, não como conteúdo a copiar.

## Evidência local

- `DESIGN.md` descreve tokens e decisões visuais, mas omite ou contradiz aspectos importantes da implementação atual.
- `packages/ui/src/globals.css` contém tokens para temas claro e escuro e é compartilhado por `apps/web` e `apps/admin`. Os dois layouts configuram tema escuro como padrão.
- O valor chamado “Roxo Escuro” no texto é um cinza-claro no CSS. O documento descreve superfícies brancas como padrão embora a interface abra no tema escuro.
- A regra absoluta contra sombras entra em conflito com sombras funcionais usadas por menus, popovers, tooltips, sheets e notificações. A regra de fonte monoespaçada para todo valor monetário também é ampla demais: há `tabular-nums` global e formatadores compartilhados.
- Há componentes compartilhados de tabela e uso de Recharts. Isso permite documentar alinhamento numérico e padrões de apresentação baseados no código, sem inventar contratos abstratos.
- `.impeccable/design.json` está versionado e repete parte dos dados de design. Impeccable ainda precisa ser instalado como skill do projeto, conforme P34.

## Decisão

Manter `DESIGN.md` como um contrato conciso para pessoas e agentes, ligado a implementação verdadeira:

1. Registrar escopo, precedência e links para as fontes relevantes.
2. Documentar tokens semânticos, tipografia, foco, raio e espaçamento nos temas claro e escuro, corrigindo nomes que não correspondem aos valores.
3. Descrever o shell compartilhado e as diferenças de layout de web/admin, incluindo largura, densidade e comportamento responsivo que o código realmente suporta.
4. Definir padrões práticos para dados, tabelas, formulários, status, gráficos e estados da interface.
5. Usar números tabulares e os formatadores existentes. Não impor fonte monoespaçada a todo valor monetário.
6. Permitir elevação quando ela comunica uma camada funcional; evitar elevação decorativa como regra geral.
7. Escolher baseline e apresentação de gráfico de acordo com a semântica da métrica. Um baseline zero não é regra universal independente do tipo de dado.
8. Manter detalhes de acessibilidade normativa no ponto 36 e referenciar o contrato correspondente em vez de duplicá-lo.
9. Tratar heurísticas estéticas como heurísticas, não como limites medidos ou gates sem uma razão verificável.

Instalar Impeccable no projeto conforme P34. O comando `/impeccable document` é uma ferramenta para produzir ou revisar um rascunho; revisar o resultado antes de incorporá-lo e reconciliar `.impeccable/design.json` com o CSS e o contrato aprovado. CSS custom properties continuam sendo a fonte implementada dos tokens. Não adotar o formato DTCG sem uma necessidade de intercâmbio entre ferramentas.

## Pesquisa e fontes

- [Google — Material 3 design theming](https://developer.android.com/codelabs/m3-design-theming): usa papéis semânticos para conectar tokens a componentes e apoiar decisões de tema e acessibilidade.
- [Design Tokens Community Group — Format 2025.10](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/): formato de intercâmbio de tokens. A publicação esclarece que é um relatório do grupo comunitário, não um padrão W3C nem uma recomendação da trilha de padrões; não há motivo para migrar tokens CSS funcionais apenas para adotar esse formato.
- [Carbon Design System — Empty states](https://preview.carbondesignsystem.com/building-blocks/core/patterns/empty-states): estados vazios devem explicar o que se esperaria ver e qual ação o usuário pode tomar. Para uma tabela sem linhas, a apresentação deve evitar estrutura vazia que confunda a leitura assistiva.
- [Impeccable — Hooks](https://impeccable.style/docs/hooks/): descreve geração/gestão de hooks e verificação de caminhos ausentes; em conjunto com a instalação aprovada em P34, `/impeccable document` pode ajudar a registrar o sistema visual observado.
- [Reddit — tokens como fonte de verdade e deriva](https://www.reddit.com/r/DesignSystems/comments/1uqmpq1/has_anyone_tried_using_design_tokens_as_a_source/) e [discussão sobre fonte de verdade em design systems](https://www.reddit.com/r/DesignSystems/comments/1whjmvq/what_does_your_designsystem_source_of_truth_look/): relatos informais apontam valor em tokens e ferramentas de assistência, mas também divergência sobre uma fonte canônica universal. São evidência anedótica, não base para substituir a fonte CSS adotada no Polaris.

## Limites

Este ponto aprova o conteúdo e a organização a estabelecer na fundação; não aprova alterações visuais de produto ou uma migração automática de tokens. A redação final de `DESIGN.md` deve ser feita após a introdução de Impeccable e reconciliada com o código existente.
