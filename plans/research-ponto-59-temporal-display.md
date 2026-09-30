---
status: accepted
research_status: completed
decision_status: approved
researched_on: 2026-09-26
approved_on: 2026-09-26
---

# Pesquisa P59 — exibição de datas e horários

## Resumo executivo

O relatório identifica corretamente que datas civis, instantes e períodos de
negócio não devem ser formatados como se fossem o mesmo tipo de valor. O P58,
agora aprovado pelo usuário, determina `America/Sao_Paulo` como fuso global de
negócio do lançamento. Portanto, a sugestão “timezone do usuário/organização”
precisa ser refinada: a exibição não deve variar com o relógio do dispositivo ou
com uma futura preferência pessoal enquanto essa regra global estiver vigente.

Contrato recomendado para `DESIGN.md`:

1. **Data sem horário:** valor civil `YYYY-MM-DD` continua sendo uma data civil
   e aparece como `dd/MM/yyyy` na interface atual `pt-BR`. Renderizar seus
   componentes diretamente, sem convertê-los em instante nem aplicar fuso do
   navegador ou de São Paulo.
2. **Timestamp de evento:** valor que representa um instante é formatado em
   `pt-BR` usando explicitamente `America/Sao_Paulo`, como `dd/MM/yyyy, HH:mm`.
   Não usar o fuso implícito do runtime. Uma preferência futura por fuso pessoal
   poderia mudar apenas a apresentação de instantes, por decisão separada e com
   a zona visível; não muda datas operacionais nem períodos.
3. **Períodos de negócio e contabilidade:** classificar instantes por dia/mês
   com as fronteiras de `America/Sao_Paulo`. Exibir valores que já são `DATE`
   diretamente, sem uma segunda conversão.
4. **Identificação da zona:** em telas densas em timestamps ou usadas para
   conciliar auditoria, financeiro e operações, informar em texto claro que os
   horários seguem o horário de São Paulo. Pode ser uma nota por tela/relatório;
   não é necessário repetir a zona em cada célula. Não depender de abreviação
   curta como `BRT` para desambiguar.
5. **Relativo versus absoluto:** timestamps absolutos são primários em auditoria,
   financeiro, vendas, estoque e processamento operacional. Um rótulo relativo
   pode ser acrescentado futuramente em uma lista simples de atividade recente,
   mas o valor absoluto precisa estar visível no próprio item ou em detalhes
   alcançáveis por mouse, teclado e toque; não somente em `title`/hover. Não há
   necessidade de introduzir rótulos relativos na fundação.
6. **Semântica HTML:** quando fizer sentido, usar `<time datetime="...">` para
   manter o valor legível por máquina e o texto de apresentação localizável.
   Para uma data civil, `datetime` contém `YYYY-MM-DD`; para um instante, contém
   uma data/hora inequívoca com `Z` ou offset. O atributo não substitui a
   apresentação humana exata em fluxos que exigem precisão.

Assim, a política do relatório é correta em intenção, mas não deve afirmar que
timestamps seguem “o usuário ou a organização” como alternativas equivalentes.
No lançamento, a zona global já decidida governa períodos e apresentação de
instantes, enquanto o navegador não redefine o significado dos dados.

## Auditoria no Polaris

- `packages/date/src/index.ts:1` define `BUSINESS_TIME_ZONE` como
  `America/Sao_Paulo`; as funções de data de negócio extraem partes nessa zona.
  `formatBusinessDateLabel` (`:58-69`) aceita uma string civil, mas cria um
  `Date` ao meio-dia UTC e então formata na zona de negócio. Para a política
  aprovada, a formatação da data civil deve ser conceitualmente independente de
  qualquer zona, mesmo que esse horário-âncora não mude o resultado em São Paulo.
- `packages/ui/src/lib/formatters.ts:17-22,47-53` já formata
  `formatDateTime` em `pt-BR` com o fuso de negócio explícito. Esse é um bom
  ponto de partida para timestamps.
- O mesmo arquivo define `formatDate(value: Date | string | null)` em `:38-44`
  com `parseISO` e `date-fns/format`, sem declarar se a string é `DATE` ou
  timestamp. Hoje `apps/web/src/app/(app)/vendas/[id]/page.tsx:141` usa essa
  função para `sale.occurredOn` (data civil), e
  `apps/admin/src/app/(dashboard)/organizations/organizations-table.tsx:59`
  usa-a para `row.original.createdAt` (instante). Isso mistura semânticas que o
  P58 deliberadamente separa. Recomendo helpers/tipos distintos na futura
  implementação, por exemplo `formatCivilDate(YYYY-MM-DD)` e
  `formatInstantDate(ISO timestamp)`.
- `apps/admin/src/app/(dashboard)/page.tsx:24-37` tem um formatador de evento
  próprio que usa `BUSINESS_TIME_ZONE`, mostrando que os consumidores ainda não
  passam todos pelo mesmo contrato de apresentação.
- A cobertura observada é parcial, não prova que todo campo da aplicação
  esteja correto. Também não executei testes nem abri interface.

## Comparação com o Hub

`src/lib/timezone.ts:1` define `APP_TIME_ZONE` como
`America/Sao_Paulo`; `src/lib/formatters.ts:3-22` passa esse fuso aos
formatadores e oferece uma função própria para valor de input (`:43-55`) que
preserva uma string de data ISO. É um precedente útil para centralizar locale e
zona explícitos.

O Hub ainda expõe `formatDate(value: Date | string)` e
`formatDateTime(value: Date | string)` (`src/lib/formatters.ts:34-40`), sem o
tipo do domínio na assinatura. Portanto, aproveitar a constante/funções centrais
é útil, mas não copiar a ambiguidade entre data civil e instante. O contrato
aprovado no P58 do Polaris pede distinção explícita.

## Fundamentos e limites das normas

### Locale, zona e nomenclatura

`Intl.DateTimeFormat` aceita locale e identificador IANA explícitos. Se `timeZone`
for omitido, o runtime usa sua zona local, o que pode fazer servidor, navegador
ou dispositivo de uma pessoa que viaja mostrar datas diferentes. A API também
oferece variantes de `timeZoneName` (`short`, `long`, `shortOffset`, entre
outras), mas a localização pode recorrer a uma forma alternativa quando um nome
não está disponível; portanto, não usar apenas uma abreviação curta como
identidade normativa da zona. [MDN — `Intl.DateTimeFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat), [ECMA-402, edição 2026](https://402.ecma-international.org/).

O Unicode CLDR fornece os padrões de data/hora por locale e explica que a ordem
dos campos varia conforme o locale. Para o produto atual em português do Brasil,
`dd/MM/yyyy` é uma convenção explícita e familiar consistente com o relatório e
os formatadores atuais; se a aplicação passar a suportar outros locales, a
ordem/pontuação de exibição deve vir do locale em vez de reaplicar essa máscara
fixa. [Unicode CLDR — padrões de data/hora](https://cldr.unicode.org/translation/date-time/date-time-patterns).

### Instante, data civil e marcação semântica

O HTML Living Standard define `<time>` como conteúdo legível por pessoas junto
de uma forma legível por máquina em `datetime`. Ele permite a interface exibir
“dois dias atrás” enquanto o atributo mantém a data exata, e distingue strings
locais sem offset de strings globais com `Z`/offset. O texto relativo do exemplo
não é uma regra de UX para todos os casos; ele demonstra que apresentação e
valor canônico podem ser diferentes. Para o Polaris, datas civis devem continuar
sem fuso, e instantes devem ter representação inequívoca. [WHATWG HTML — o
elemento `time`](https://html.spec.whatwg.org/dev/text-level-semantics.html#the-time-element).

WCAG 2.2 SC 3.3.2 exige rótulos/instruções quando o usuário precisa fornecer
dados; a explicação recomenda indicar formato quando necessário. A técnica W3C
G89 usa como exemplo um campo de data com formato dia-mês-ano explícito. Isso
apoia rotular corretamente campos e exemplos de entrada, mas não estabelece um
requisito WCAG de anexar um rótulo de fuso a toda data exibida. A proposta de
nota de zona em telas de auditoria/relatórios é, portanto, uma decisão de
clareza do produto, não uma obrigação normativa inventada. [W3C — Understanding
SC 3.3.2](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html),
[W3C técnica G89](https://www.w3.org/WAI/WCAG21/Techniques/general/G89).

### Relativos e exatos

O relatório está correto em evitar tempos relativos onde a precisão importa.
“Há 5 minutos” muda continuamente e não identifica por si só o horário exato;
uma tooltip acionada só por hover também é inadequada como único caminho para
descobrir essa precisão em dispositivos sem ponteiro ou por teclado. Essa
recomendação é julgamento de UX para o domínio, não uma citação de requisito
específico da WCAG sobre todos os timestamps.

Um padrão mais equilibrado para uma futura tela de atividade é usar o relativo
somente como pista de recência e manter o absoluto no próprio item, como
“há 5 min · 26/09/2026, 14:30”. Em fluxos financeiros, de auditoria e
reconciliação, mostrar o absoluto como dado primário reduz etapas e evita
arredondamento temporal. A semântica `<time datetime>` complementa o texto, mas
não torna o valor exato visível por si só.

## Exemplo de mercado

O Shopify documenta que Live View usa o horário local da loja e avisa que, quando
serviços usam fusos diferentes para relatórios, a mesma atividade pode cair em
períodos distintos. É um exemplo direto de produto comercial associando o
calendário de relatório ao negócio. Para o Polaris, a zona escolhida é global
São Paulo, e não configurável por loja/Organização neste lançamento; a lição é
explicitar e centralizar essa autoridade, não copiar a capacidade configurável
do Shopify. [Shopify — Live View](https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/live-view).

## Decisões aprovadas em 2026-09-26

- `DATE`/`YYYY-MM-DD` é exibido como `dd/MM/yyyy` em `pt-BR`, sem conversão de
  fuso. Instantes e períodos usam `America/Sao_Paulo`, independentemente do
  timezone do navegador; armazenamento e limites SQL permanecem na regra P58,
  não no contrato visual de `DESIGN.md`.
- Mostrar “Horários no fuso de São Paulo” uma vez em telas/relatórios densos em
  timestamps, incluindo auditoria, financeiro e operações; não repetir em cada
  célula nem depender de `BRT`.
- Absoluto é principal em finanças, auditoria, vendas, estoque e operações.
  Relativos ficam fora da fundação e só podem voltar como complemento em
  atividade recente, mantendo o valor exato visível e acessível sem hover.

## Fontes

- [ECMA-402 — API internacionalização ECMAScript, edição 2026](https://402.ecma-international.org/): `Intl.DateTimeFormat`, zonas IANA e opções de apresentação de nomes de fuso. Context7 consultado com biblioteca `/mdn/content` para as opções da API; a documentação MDN confirma que omitir `timeZone` usa o timezone do runtime e descreve o fallback para nomes de fuso.
- [MDN — construtor `Intl.DateTimeFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat): locale, `timeZone`, estilos e `timeZoneName`.
- [WHATWG HTML Living Standard — elemento `time`](https://html.spec.whatwg.org/dev/text-level-semantics.html#the-time-element): valor semântico legível por máquina, datas civis, horas locais e instantes globais.
- [W3C WCAG 2.2 — Understanding SC 3.3.2](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html): rótulos e instruções de entrada, incluindo formatos quando necessário.
- [W3C técnica G89](https://www.w3.org/WAI/WCAG21/Techniques/general/G89): exemplo acessível de campo indicando ordem dia/mês/ano.
- [Unicode CLDR — padrões de data/hora](https://cldr.unicode.org/translation/date-time/date-time-patterns): padrões dependentes do locale e ordenação de campos.
- [Shopify — Live View](https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/live-view): horário local da loja em métricas e risco de particionamento por fusos diferentes.

## Limitações

Inspeção do relatório, dos formatadores relevantes de Polaris/Hub e de
documentação pública. A inspeção não é inventário exaustivo de todos os
consumidores de data. Nenhum código foi alterado; nenhum teste foi executado e
nenhuma interface local foi aberta. A pesquisa estabelece uma recomendação para
decisão, não registra P59 como aprovado.
