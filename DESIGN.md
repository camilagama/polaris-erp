---
name: Polaris
description: O Minimalismo Essencial
colors:
  primary: "oklch(0.444 0.177 26.899)"
  primary-light: "oklch(0.505 0.213 27.518)"
  primary-foreground: "oklch(0.971 0.013 17.38)"
  background: "oklch(0.16 0.006 264)"
  background-light: "oklch(1 0 0)"
  surface: "oklch(0.2 0.006 264)"
  surface-light: "{colors.background-light}"
  foreground: "oklch(0.985 0 0)"
  foreground-light: "oklch(0.145 0 0)"
  secondary: "oklch(0.27 0.008 264)"
  secondary-light: "oklch(0.967 0.001 286.375)"
  secondary-foreground: "oklch(0.985 0 0)"
  secondary-foreground-light: "oklch(0.21 0.006 285.885)"
  border: "oklch(1 0 0 / 8%)"
  border-light: "oklch(0.922 0 0)"
  input: "oklch(1 0 0 / 12%)"
  input-light: "oklch(0.922 0 0)"
  ring: "oklch(0.556 0 0)"
  ring-light: "oklch(0.708 0 0)"
  destructive: "oklch(0.704 0.191 22.216)"
  destructive-light: "oklch(0.577 0.245 27.325)"
typography:
  display:
    fontFamily: "Geist Sans, sans-serif"
    fontWeight: 600
  body:
    fontFamily: "Geist Sans, sans-serif"
    fontWeight: 400
  mono:
    fontFamily: "Geist Mono, monospace"
    fontWeight: 400
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "16px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    height: "28px"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.md}"
    height: "28px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
---

# Sistema visual Polaris

## Overview

**Creative North Star: "O Minimalismo Essencial"**

Web e Admin são superfícies de operação diária. A interface mantém os dados legíveis e a hierarquia previsível, com densidade suficiente para tarefas frequentes e sem ornamentos que disputem atenção. A base visual é compartilhada, mas cada app conserva sua navegação e suas tarefas. O tema escuro é o padrão; o tema claro também é suportado.

**Key Characteristics:**
- Hierarquia visual construída com tipografia, espaço, superfícies e bordas.
- Vermelho usado com intenção nas ações principais e estados definidos.
- Componentes compartilhados com padrões coerentes entre Web e Admin.

## Colors

Os valores selecionados no frontmatter acompanham os tokens semânticos de [packages/ui/src/globals.css](packages/ui/src/globals.css). As cores mudam entre os temas claro e escuro; o dark é o tema inicial configurado nos dois apps.

### Primary
- **Vermelho Polaris:** ação primária e ênfase pontual. Não use a cor como único indicador de estado.

### Secondary
- **Neutros Polaris:** superfícies secundárias e informação de menor ênfase. O token secundário é cinza neutro no tema claro e cinza azulado escuro no tema escuro; não é roxo.

### Semantic states
- Estados destrutivos usam o token semântico destrutivo. Estado, erro e seleção devem ter rótulo ou outra indicação além da cor.
- Os seis tokens de série de gráfico vivem no CSS compartilhado. A cor distingue séries, mas não substitui legenda, rótulo ou escala apropriada à métrica.

### Named Rules
**The Semantic State Rule.** Nenhum estado ou significado depende apenas da diferença de matiz.

## Typography

- **Display Font:** Geist Sans (com fallback sans-serif)
- **Body Font:** Geist Sans (com fallback sans-serif)
- **Mono Font:** Geist Mono (com fallback monospace), para identificadores e valores técnicos compactos.

Os números usam dígitos tabulares quando o alinhamento de colunas melhora a leitura. Fonte monoespaçada não é requisito geral para valores monetários.

### Named Rules
**The Data-First Rule.** Alinhe números pela posição dos dígitos; reserve a fonte monoespaçada para os casos em que ela esclarece o tipo de informação.

## Layout

Os apps usam os mesmos tokens e primitivas de @polaris/ui, com shells e navegação próprios. Web prioriza catálogo, estoque e vendas; Admin prioriza operações internas da plataforma. A densidade de dados deve preservar cabeçalhos, alinhamento e leitura em larguras menores. A navegação compartilhada oferece tratamento móvel em painel deslizante; mantenha as ações acessíveis nos modos expandido e recolhido.

Use o espaçamento já presente nos componentes compartilhados. Não force uma largura máxima ou composição de página global onde os shells e as tarefas atuais não a estabelecem.

## Elevation & Depth

Superfícies comuns usam contraste tonal e bordas para se separar. Sombras discretas aparecem em camadas funcionais — menus, popovers, tooltips, sheets e feedback — e em alguns cartões existentes. Não aplique elevação decorativa indiscriminadamente; preserve a hierarquia que esses overlays precisam mostrar.

### Named Rules
**The Flat-By-Default Rule.** Prefira cor de superfície e bordas; use sombra quando a camada ou o estado interativo precisar de separação.

## Shapes

O raio base compartilhado é 10 px; os tamanhos comuns são 6 px e 8 px, com formato de cápsula para badges. Botões e campos usam cantos contidos; cards usam o raio maior. Siga os componentes compartilhados em vez de inventar um formato por tela.

## Components

### Buttons

- A variante primária usa a cor primária e a altura padrão compacta do componente compartilhado.
- Variantes menores de 20 px e 24 px existem. Para alvos de ponteiro, confira o tamanho efetivo ou o espaçamento permitido pela WCAG 2.2 AA; não presuma que o tamanho visual pequeno está automaticamente conforme.
- Focus é visível e acompanha o token de foco. Preserve foco de teclado nos estados hover, pressed, disabled e invalid.

### Fields and forms

- Campos compartilham borda, preenchimento, estados de foco e erro. Mantenha labels, instruções e mensagens associados ao controle.
- Estados disabled e invalid permanecem distinguíveis por texto e semântica, além da cor.

### Cards and navigation

- Cards usam a superfície semântica e uma borda leve; variações funcionais podem ter sombra discreta.
- A navegação Web e Admin compartilha primitivos, sem tornar idênticos os fluxos de cada app. Em telas estreitas, a navegação compartilhada usa painel deslizante.

### Tables and charts

- Tabelas mantêm cabeçalhos e relações semânticas; alinhe valores numéricos à direita com dígitos tabulares.
- Escolha escala e baseline de gráfico conforme o tipo de métrica. Não imponha baseline zero a toda série.
- Legendas e rótulos identificam as séries sem depender somente das cores.

### Dates and times

- **Data civil:** YYYY-MM-DD é exibida em pt-BR como dd/MM/yyyy, sem conversão de fuso.
- **Instante:** exiba data e hora em America/Sao_Paulo, independentemente do fuso do navegador.
- Em telas densas em timestamps, indique uma vez “Horários no fuso de São Paulo”; não repita em cada célula.
- Horários absolutos são primários em vendas, estoque, financeiro, auditoria e operações. Rótulos relativos não entram na fundação e, se forem adicionados depois, nunca substituem nem ocultam o valor absoluto.
- Use o elemento time com atributo datetime quando agregar semântica legível por máquina sem remover o valor exato visível.

A semântica de datas civis, instantes e períodos permanece em TIME-001/DEC-BR-049 nas [regras de negócio normativas](docs/business-rules/normative/approved-rules.md). Este contrato trata somente da apresentação.

## Do's and Don'ts

### Acessibilidade — WCAG 2.2 AA

WCAG 2.2 AA é o alvo interno para interfaces novas ou alteradas; este documento não certifica conformidade do produto inteiro. Revise teclado, foco visível, nome/semântica/estado, labels e instruções, erros e mensagens de status, contraste nos dois temas, tabelas e diálogos. Para alvos de ponteiro, use pelo menos 24 × 24 CSS px ou verifique uma exceção prevista pelo critério, incluindo a de espaçamento. [W3C: WCAG 2.2](https://www.w3.org/TR/WCAG22/); [Target Size (Minimum), 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

### Do

- Mantenha os dados como foco principal; use vermelho para ação ou ênfase definida.
- Dê nome acessível, estado e feedback a controles interativos.
- Mostre sinais de carregamento, vazio, erro, sucesso e permissão negada com linguagem e semântica claras.

### Don't

- Não dependa somente de cor para transmitir erro, sucesso, seleção ou série de gráfico.
- Não use gradientes decorativos, faixas laterais coloridas exageradas ou sombras grandes como ornamento.
- Não use um rótulo relativo de tempo sem o instante absoluto disponível e acessível.
- Não faça alegação de conformidade WCAG AA com base apenas em um scanner ou neste contrato.
