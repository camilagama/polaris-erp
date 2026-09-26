# Pesquisa do ponto 36 — contrato conciso de acessibilidade

**Data da revisão:** 2026-09-25  
**Estado:** aceito em 2026-09-25. WCAG 2.2 AA, escopo web/admin, revisão antes da primeira produção e verificação Axe + manual aprovados.
**Ponto do relatório:** estabelecer critérios de acessibilidade claros para orientar pessoas e agentes sem criar um processo burocrático.

## Resumo

A recomendação procede. O Polaris deve ter um contrato pequeno que transforme a frase genérica de `PRODUCT.md` sobre legibilidade e contraste em práticas verificáveis durante a construção de interfaces.

Recomendo usar **WCAG 2.2 nível AA como referência-alvo de engenharia para fluxos novos ou alterados**, sem declarar que o produto inteiro está em conformidade antes de uma avaliação de páginas e processos completos. O contrato deve destacar as regras de maior impacto para a rotina do ERP e apontar para os critérios WCAG, sem tentar reescrever o padrão.

O lugar mais simples é uma seção curta de acessibilidade em `DESIGN.md`, conforme a estrutura aprovada no ponto 35. `PRODUCT.md` pode manter o princípio geral e apontar para essa seção. Não recomendo criar agora outro documento nem adicionar um bloqueio global de CI baseado somente em scanner automático.

## O que é requisito e o que é orientação

- A **Recomendação WCAG 2.2** é a fonte normativa para critérios e níveis A, AA e AAA. Uma alegação de conformidade AA exige atender todos os critérios A e AA aplicáveis, além das condições de escopo da WCAG. A conformidade vale para páginas completas e processos completos, não para um componente isolado.
- As páginas **Understanding**, tutoriais WAI, técnicas documentadas e o **ARIA Authoring Practices Guide (APG)** explicam como interpretar e implementar padrões. São orientação informativa, não uma lista de técnicas obrigatórias. O próprio texto de WCAG distingue conteúdo normativo de material informativo.
- Regras de produto podem superar a WCAG, mas devem ser rotuladas como heurísticas. Por exemplo: preferir foco sem qualquer obstrução, embora o critério AA 2.4.11 exija que o componente focado não fique totalmente oculto; ou usar alvos maiores que 24 px para ações importantes em touch. A WCAG 2.2 também tem um critério AAA de tamanho ampliado, mas não é o mínimo AA.

Assim o documento não mistura “requisito de conformidade”, “padrão recomendado pelo WAI” e “preferência visual do Polaris”.

## Contrato recomendado para o Polaris

Manter a lista curta, com links para o critério completo:

1. **Operação por teclado e foco:** todas as funções operáveis por teclado, sem armadilha de teclado; ordem de foco coerente; indicador de foco visível e sem ficar totalmente coberto por conteúdo fixo. WCAG 2.1.1, 2.1.2 e 2.4.3 são nível A; 2.4.7 e 2.4.11 são nível AA. Como preferência de qualidade, buscar manter o foco totalmente visível.
2. **Semântica e nomes acessíveis:** usar HTML nativo para controles e estrutura antes de inventar widgets com ARIA. Controles interativos precisam expor nome, função e estado; títulos e rótulos devem descrever sua finalidade. WCAG 1.3.1, 2.4.6 e 4.1.2.
3. **Formulários e mensagens:** cada campo deve ter rótulo visível associado; instruções relevantes e erros devem ser compreensíveis em texto e associados ao campo. Ações apenas com ícone precisam de nome acessível. Atualizações assíncronas de status devem poder ser anunciadas sem mover o foco. WCAG 3.3.1, 3.3.2 e 4.1.3; quando há texto visível no controle, considerar também 2.5.3, “Label in Name”.
4. **Estados sem depender só de cor:** estados como sucesso, pendente, erro, ativo e selecionado devem ter texto, forma, ícone ou outro sinal além de cor. WCAG 1.4.1 nível A. Isso também se aplica a dados de gráficos quando a cor codifica uma categoria.
5. **Contraste nos temas suportados:** texto normal com razão mínima 4,5:1; texto grande com 3:1; informações visuais necessárias para identificar controles, seus estados e gráficos relevantes com 3:1 contra cores adjacentes. WCAG 1.4.3 e 1.4.11, ambos AA. Avaliar pares reais de tokens nos temas claro e escuro, incluindo foco, texto atenuado, bordas de campo, estados e gráficos.
6. **Alvos de interação:** para entradas por ponteiro, buscar pelo menos 24 × 24 CSS px, ou documentar por que a exceção de espaçamento/equivalência da WCAG 2.5.8 se aplica. Não converter 44 × 44 px em requisito universal AA; alvos maiores podem ser uma heurística para ações importantes ou touch.
7. **Tabelas de dados:** preferir tabela HTML nativa, com cabeçalhos e células semanticamente marcados e relações compreensíveis. Reservar `grid` para uma experiência interativa que realmente ofereça navegação de widget, como edição em planilha. WCAG 1.3.1; WAI Table e Grid Patterns.
8. **Diálogos modais:** dar título/nome acessível e manter a interação de teclado coerente com o padrão de diálogo: foco entra no diálogo, `Tab`/`Shift+Tab` permanecem nele enquanto modal, `Escape` fecha quando apropriado, e o foco retorna ao acionador ou segue para o próximo passo lógico. Incluir um controle visível de fechamento. O APG orienta essa interação; os critérios normativos relacionados incluem operação por teclado, nome/função/estado e foco visível.

Como o Polaris é um ERP, convém também deixar a WCAG 3.3.4 nível AA, sobre prevenção de erros em transações financeiras e operações que alteram/apagam dados, referenciada para fluxos de maior impacto. Isso não exige adicionar um padrão genérico de confirmação a toda ação; o critério permite reversão, revisão/correção ou confirmação, conforme o caso.

## Evidência no Polaris

- `PRODUCT.md` atualmente fala em legibilidade e bom contraste, sem baseline, teclado, foco, formulários ou semântica.
- `packages/ui/src/globals.css` define tokens para temas claro e escuro. O contrato deve exigir verificar os dois temas; esta pesquisa não calculou as razões de contraste dos tokens existentes.
- `packages/ui/src/components/ui/button.tsx` e `input.tsx` já definem estilos `focus-visible`, um bom ponto de partida, mas a presença de uma classe não confirma contraste ou comportamento correto em todos os contextos.
- `button.tsx` inclui variantes de 20 px de altura (`xs` e `icon-xs`), 24 px (`sm` e `icon-sm`) e 28 px (`default`). As variantes menores merecem uma revisão de uso e espaçamento contra WCAG 2.5.8; a dimensão isolada não permite concluir falha, pois existem exceções e o uso concreto importa.
- `packages/ui/src/components/ui/table.tsx` expõe elementos HTML nativos (`table`, `thead`, `th`, `td`), e `data-table.tsx` os compõe. Porém, a opção `onRowClick` registra clique diretamente em `<tr>` e apenas muda o cursor: onde esse caminho for usado, deve-se verificar se a ação é acessível por teclado e tem semântica clara. Em geral, um link ou botão dentro da célula é mais previsível do que tornar a linha clicável apenas por ponteiro.
- A busca atual no código não encontrou usos de `onRowClick`; portanto, isso é um risco latente da API compartilhada, não uma falha confirmada em uma jornada ativa.
- `packages/ui/src/components/ui/dialog.tsx` oferece composição explícita de conteúdo, título, descrição, gatilho e fechamento. A revisão futura deve confirmar que cada uso fornece título adequado e que os fluxos reais atendem ao comportamento esperado; a existência de um wrapper não certifica todas as composições.

Esses pontos são pistas para implementação e revisão da fundação, não um laudo de conformidade nem afirmação de bugs confirmados em páginas usadas.

## Validação e limites de gate

- Tornar os princípios semânticos e de teclado parte do contrato para UI nova ou alterada. Isso é uma regra de implementação, não a obrigação de bloquear o CI por um resultado automático sem classificar seu escopo e falsos positivos.
- Em alterações de fluxo interativo, a revisão humana deve percorrer o caminho por teclado, conferir foco nos diálogos e verificar nomes/rótulos e feedback de erro/status.
- Uma ferramenta automatizada pode ajudar a encontrar problemas repetíveis, mas o W3C afirma que ferramentas não avaliam automaticamente todos os aspectos, podem produzir resultados falsos ou enganosos e não determinam acessibilidade sozinhas. Não usar uma pontuação automática como certificado.
- Antes de afirmar conformidade WCAG 2.2 AA, seria necessário definir o escopo, cobrir páginas responsivas e processos completos, e combinar avaliação semi-automatizada com revisão manual experiente. Essa alegação está fora desta decisão de fundação.
- Não fiz avaliação com leitor de tela, revisão rota por rota, teste de contraste calculado, nem comparação de todas as composições de componentes. Nenhum teste foi executado.

## Fontes primárias

### Critérios normativos

- [WCAG 2.2 — Recomendação W3C](https://www.w3.org/TR/WCAG22/): fonte normativa; ver em especial § 5 sobre interpretação normativa, requisitos de conformidade e processos completos.
- [WCAG 2.2 — 2.1.1 Keyboard](https://www.w3.org/TR/WCAG22/#keyboard), [2.1.2 No Keyboard Trap](https://www.w3.org/TR/WCAG22/#no-keyboard-trap), [2.4.3 Focus Order](https://www.w3.org/TR/WCAG22/#focus-order), [2.4.7 Focus Visible](https://www.w3.org/TR/WCAG22/#focus-visible) e [2.4.11 Focus Not Obscured (Minimum)](https://www.w3.org/TR/WCAG22/#focus-not-obscured-minimum).
- [WCAG 2.2 — 1.4.1 Use of Color](https://www.w3.org/TR/WCAG22/#use-of-color), [1.4.3 Contrast (Minimum)](https://www.w3.org/TR/WCAG22/#contrast-minimum) e [1.4.11 Non-text Contrast](https://www.w3.org/TR/WCAG22/#non-text-contrast).
- [WCAG 2.2 — 1.3.1 Info and Relationships](https://www.w3.org/TR/WCAG22/#info-and-relationships), [2.4.6 Headings and Labels](https://www.w3.org/TR/WCAG22/#headings-and-labels), [2.5.3 Label in Name](https://www.w3.org/TR/WCAG22/#label-in-name), [2.5.8 Target Size (Minimum)](https://www.w3.org/TR/WCAG22/#target-size-minimum), [3.3.1 Error Identification](https://www.w3.org/TR/WCAG22/#error-identification), [3.3.2 Labels or Instructions](https://www.w3.org/TR/WCAG22/#labels-or-instructions), [3.3.4 Error Prevention (Legal, Financial, Data)](https://www.w3.org/TR/WCAG22/#error-prevention-legal-financial-data), [4.1.2 Name, Role, Value](https://www.w3.org/TR/WCAG22/#name-role-value) e [4.1.3 Status Messages](https://www.w3.org/TR/WCAG22/#status-messages).

### Orientação de implementação e avaliação

- [WAI Forms Tutorial — Labeling Controls](https://www.w3.org/WAI/tutorials/forms/labels/): associação de rótulos visíveis e controles; `title` é menos confiável como substituto de label.
- [WAI Tables Tutorial](https://www.w3.org/WAI/tutorials/tables/): marcação de cabeçalhos/células e relações entre eles.
- [WAI-ARIA APG — Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): ordem/foco do teclado, `Escape`, foco ao fechar, nome e uso correto da semântica modal.
- [WAI-ARIA APG — Table Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/table/) e [Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/): tabela estática não é um widget interativo; `grid` exige comportamento de navegação próprio. O APG recomenda HTML nativo quando possível.
- [W3C WAI — Selecting Web Accessibility Evaluation Tools](https://www.w3.org/WAI/test-evaluate/tools/selecting/): ferramentas ajudam, mas não cobrem tudo; julgamento humano é necessário.

## Limitações e trade-offs

WCAG AA é um alvo útil, testável e amplamente entendido, mas não representa todas as necessidades de cada usuário nem substitui pesquisa com pessoas com deficiência. Tornar cada preferência do APG, recomendação AAA ou heurística de ergonomia um gate de CI sem escopo aumentaria custo e falsos bloqueios. O extremo oposto — manter só “bom contraste” — não dá direção suficiente a quem constrói telas.

A solução proporcional é contrato breve, WCAG 2.2 AA como referência para o trabalho de UI, regras explícitas para teclado/semântica/formulários/estados/contraste/alvos/tabelas/diálogos e revisão manual direcionada a fluxos alterados. Um programa de auditoria e qualquer alegação formal de conformidade devem ser decisões separadas, apoiadas por evidência.
