---
name: Polaris
description: O Minimalismo Essencial
colors:
  primary: "oklch(0.505 0.213 27.518)"
  primary-foreground: "oklch(0.971 0.013 17.38)"
  secondary: "oklch(0.967 0.001 286.375)"
  secondary-foreground: "oklch(0.21 0.006 285.885)"
  muted: "oklch(0.97 0 0)"
  muted-foreground: "oklch(0.556 0 0)"
  accent: "oklch(0.97 0 0)"
  accent-foreground: "oklch(0.205 0 0)"
  destructive: "oklch(0.577 0.245 27.325)"
  background: "oklch(1 0 0)"
  foreground: "oklch(0.145 0 0)"
  border: "oklch(0.922 0 0)"
  input: "oklch(0.922 0 0)"
  ring: "oklch(0.708 0 0)"
typography:
  display:
    fontFamily: "var(--font-geist-sans), sans-serif"
    fontWeight: 600
  body:
    fontFamily: "var(--font-geist-sans), sans-serif"
    fontWeight: 400
  label:
    fontFamily: "var(--font-mono), monospace"
rounded:
  sm: "calc(0.625rem * 0.6)"
  md: "calc(0.625rem * 0.8)"
  lg: "0.625rem"
spacing:
  sm: "0.5rem"
  md: "1rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
  card:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
---

# Design System: Polaris

## 1. Overview

**Creative North Star: "O Minimalismo Essencial"**

A plataforma atua de forma silenciosa e focada, projetada para que os dados sejam os protagonistas. A interface abandona decorações desnecessárias em favor de clareza, transparência e elegância premium. O objetivo é criar um ambiente confortável para uso diário prolongado, onde a estética obedece à usabilidade. Rejeita-se categoricamente qualquer traço de "slop de IA", gradientes confusos ou ruídos visuais.

**Key Characteristics:**
- Foco absoluto na leitura dos dados.
- Design plano (flat) e estruturado por bordas suaves.
- Densidade refinada para uso constante.

## 2. Colors

As cores servem para demarcar ações críticas ou estados importantes, enquanto a estrutura do sistema descansa sobre os neutros.

### Primary
- **Vermelho Polaris** (`oklch(0.505 0.213 27.518)`): Ação principal, CTAs, indicadores de status ativo. Usado com grande moderação para chamar a atenção apenas onde necessário.

### Secondary
- **Roxo Escuro** (`oklch(0.967 0.001 286.375)`): Ações secundárias, acentos menos importantes.

### Neutral
- **Background** (`oklch(1 0 0)`): Superfície principal da aplicação web e do painel admin.
- **Border / Input** (`oklch(0.922 0 0)`): Bordas suaves para delimitar componentes e separações estruturais.

### Named Rules
**The Silence Rule.** A interface em si deve ser predominantemente neutra e monocromática. A cor primária ("Vermelho Polaris") deve ocupar menos de 5% da superfície visual da tela. A raridade é o ponto.

## 3. Typography

**Display Font:** Geist Sans (com fallback para sans-serif)
**Body Font:** Geist Sans (com fallback para sans-serif)
**Label/Mono Font:** Font Mono

**Character:** Limpa, geométrica e extremamente legível em pequenas escalas, projetada para a leitura rápida e focada em números.

### Hierarchy
- **Display** (600, `text-balance`): Usado raramente em páginas de marketing ou grandes estados vazios (empty states).
- **Headline** (500, `text-balance`): Títulos de seções ou cartões importantes.
- **Title** (500): Títulos de modais ou grandes cabeçalhos de tabela.
- **Body** (400, `text-pretty`): Texto geral e valores numéricos em tabelas.
- **Label** (400, mono): Valores estatísticos cruciais, IDs ou valores que exigem alinhamento numérico exato.

### Named Rules
**The Data-First Rule.** Utilize a variante monoespaçada (ou números tabulares via `tabular-nums`) para exibir dinheiro, SKUs ou dados contábeis.

## 4. Elevation

O sistema utiliza um design totalmente plano (flat), dispensando o uso de sombras decorativas. A profundidade e a separação são comunicadas através de bordas suaves e, em casos raros, escurecimento ou preenchimento de fundo contrastante.

### Named Rules
**The Flat-By-Default Rule.** Superfícies não devem flutuar. Utilize bordas de `1px solid var(--border)` para definir contornos, nunca `box-shadow`. O empilhamento visual deve ser criado escurecendo a superfície de fundo, em vez de elevar a superfície superior.

## 5. Components

### Buttons
- **Shape:** Arredondamento contido (MD = ~8px).
- **Primary:** Background Vermelho Polaris. Sem bordas.
- **Hover / Focus:** Transição suave com `ease-out-strong`. Focus visível através de `outline-ring`.
- **Secondary / Ghost:** Sem preenchimento forte, cores textuais mais fracas e acionamento sutil (apenas fundo leve no hover).

### Cards / Containers
- **Corner Style:** Radius contido (LG = 10px).
- **Background:** Preenchimento igual ou sutilmente diferente do fundo geral.
- **Shadow Strategy:** Zero sombras.
- **Border:** 1px solid neutro macio.
- **Internal Padding:** Confortável, sem ser excessivamente esparso.

### Inputs / Fields
- **Style:** Flat, radius MD, borda neutra fina. Fundo leve ou sem fundo.
- **Focus:** Foco acentuado (`ring` color), mas sem distorcer o espaçamento interno (utilize outline, não border-width).

## 6. Do's and Don'ts

As diretrizes baseiam-se na essência do produto descrita no PRODUCT.md e devem ser seguidas para garantir o padrão visual.

### Do:
- **Do** manter a densidade visual alta para facilitar o trabalho sem uso de "white space" excessivo de landing pages.
- **Do** utilizar componentes contidos, com foco total no conteúdo ao invés da casca visual.
- **Do** aplicar o "Vermelho Polaris" apenas para guiar as interações e reforçar as ações principais.

### Don't:
- **Don't** utilizar designs genéricos gerados por IA ("AI slop").
- **Don't** usar gradientes exagerados, nem em textos nem em fundos.
- **Don't** adicionar "side-stripe borders" (bordas laterais coloridas superdimensionadas) em alertas ou componentes.
- **Don't** empilhar elementos usando `box-shadow` (especialmente `box-shadow` grande >= 16px). O Polaris adota um design flat baseado em bordas sutis.
