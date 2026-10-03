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

## Revalidação do código em 2026-10-01

O `DESIGN.md` agora contém o contrato visual aprovado: data civil sem conversão,
instante em `America/Sao_Paulo`, indicação única do fuso em telas densas e valor
absoluto como principal. A regra documental existe; a revisão abaixo trata da
implementação que ainda falta.

- **Consumidores Web confirmados:** `formatDate` recebe `sale.occurredOn`, datas
  de movimentação (`item.date`) e datas do histórico de produto (`item.date`),
  apresentadas como valores civis pelos contratos consultados. Os usos de
  `formatDateTime` observados recebem `cancelledAt`, `createdAt` ou
  `currentPeriodEnd`, que representam instantes.
- **Defeito confirmado no Admin:**
  `apps/admin/src/app/(dashboard)/organizations/organizations-table.tsx`
  chama `formatDate` em `createdAt`; isso remove a hora e usa o timezone local
  da execução. O campo representa um instante. Deve usar a apresentação de
  instante aprovada, sem conversão de schema.
- **Contrato permissivo demais:** `formatDate(value: Date | string)` não
  distingue uma `DATE` de um timestamp. `formatDateTime` passa strings para
  `new Date(value)`, mas sua assinatura não exige `Z` nem offset. Uma string
  data-hora sem zona é interpretada como horário local do runtime; estreitar o
  tipo ou validar o formato do instante antes de formatar. Os consumidores
  atuais encontrados são compatíveis com a mudança, mas a migração deve
  confirmar tipos nos contratos antes de alterar a assinatura.
- **Dashboard Admin:** `formatEventDate` já usa `BUSINESS_TIME_ZONE`, então não
  foi identificado erro de fuso; é uma implementação paralela que deve chamar o
  helper compartilhado. O rótulo semanal do gráfico transforma `d.date` em um
  timestamp ao meio-dia UTC e depois aplica São Paulo. O resultado atual
  preserva o dia da semana, mas o fluxo deve tratar o valor como data civil e
  formatá-lo diretamente.
- **Nota de fuso ausente:** busca literal em `apps/` e `packages/` não encontrou
  “Horários no fuso de São Paulo”. A implementação deve incluir uma indicação
  uma vez nas telas densas aprovadas; não repetir em cada linha/célula.
- **Cobertura existente:** `packages/ui/src/lib/formatters.test.ts` testa um
  timestamp UTC no `formatDateTime`; `packages/date/src/index.test.ts` cobre
  helpers de negócio, mas não substitui testes do formatter compartilhado nem
  prova seus consumidores Admin/Web sob timezones de runtime distintos. Incluir
  casos de fronteira na implementação, sem declarar que a suíte atual é
  suficiente.

### Revalidação do exemplo Hub

O Hub centraliza `Intl.DateTimeFormat` em `src/lib/formatters.ts` e fixa
`America/Sao_Paulo`, o que é um precedente útil para instantes. Porém seus
helpers genéricos aceitam `Date | string` e convertem strings com `new Date`,
sem distinguir `DATE` de instante. A inspeção de usos encontrou campos de
certificados (`completedAt`, `issuedAt`, `revokedAt`), apresentados como
instantes; não há evidência aqui de que esses chamadores passem `DATE` puro.
Ainda assim, um futuro `YYYY-MM-DD` seria interpretado pelo JavaScript como
meia-noite UTC e formatado em São Paulo no dia civil anterior. Logo, reutilizar
a centralização e o timezone explícito, mas não copiar a assinatura ambígua.
[MDN — parsing de `Date`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse)
documenta a distinção entre ISO date-only (UTC) e data-hora sem zona (local).

### Refinamento da implementação

O contrato P59 continua aprovado e não requer nova pergunta. Implementar os
helpers como tipos semânticos separados (`DATE`/data civil e instante), corrigir
o consumidor Admin incorreto, consolidar o formatter local do dashboard e
garantir que strings de instante sejam inequívocas. Adicionar a nota aprovada
uma vez nas telas densas de auditoria, financeiro e operações, e testar datas
civis sem deslocamento, fronteiras de dia do instante em São Paulo, entrada
ISO sem zona rejeitada e valores iguais sob timezones de runtime diferentes.
Não é necessária migration: os campos e a regra canônica existem; o gap é de
projeção, apresentação e cobertura.

## Fontes

### Revalidação para revisão de implementação — 2026-10-01

O contrato temporal visual já está registrado em `DESIGN.md`, seção “Dates and
times”: data civil `YYYY-MM-DD` aparece como `dd/MM/yyyy` em `pt-BR` sem
conversão de fuso; instantes são apresentados em `America/Sao_Paulo`, sem
dependência do fuso do navegador; telas densas em timestamps indicam uma vez
“Horários no fuso de São Paulo”; valores absolutos permanecem primários nos
fluxos operacionais. Essa revalidação não reabre nem altera as decisões P59
aprovadas.

O contexto visual anterior do usuário estabelece Web como superfície primária
para as tarefas do produto e Admin como superfície operacional interna. Essa
distinção orienta prioridade e exemplos de revisão visual, sem alterar o
contrato temporal compartilhado. Nenhum browser ou URL local foi aberto nesta
revalidação.

**Estado no momento desta fotografia (2026-10-01):** a implementação ainda não
havia sido autorizada nem iniciada. Este diagnóstico histórico foi sucedido pela
implementação de P59, registrada ao final deste arquivo.

#### Inventário confirmado dos formatadores e consumidores

- `packages/ui/src/lib/formatters.ts` define `formatDate(value: Date | string
  | null)`. Para strings, usa `date-fns` `parseISO`; em seguida, `format` sem
  contexto de zona, que usa os campos locais do objeto `Date`. Portanto, a
  representação pode depender do timezone do runtime e a assinatura não
  distingue data civil de instante.
- Os usos de `formatDate` encontrados no Web são: `sale.occurredOn` na página
  de venda e na tabela/formulário de vendas; `item.date` no histórico de
  estoque; `item.date` no histórico de produto. Os contratos consultados
  representam esses campos como datas civis/`DATE` serializadas em strings.
- O único uso de `formatDate` encontrado no Admin é
  `row.original.createdAt` na tabela de organizações. O query de
  `packages/platform/src/platform-directory.ts` lê `organization.created_at`,
  campo timestamp com timezone; o DTO converte o valor em ISO via
  `toIsoString`. A tabela o exibe atualmente apenas como data, descartando a
  hora do instante.
- `formatDateTime` usa `Intl.DateTimeFormat("pt-BR", { timeZone:
  BUSINESS_TIME_ZONE })`, e `BUSINESS_TIME_ZONE` é `America/Sao_Paulo`. Para
  strings, porém, chama `new Date(value)` sem validar a presença de `Z` ou
  offset; uma string ISO de data-hora sem zona pode ser interpretada no fuso do
  runtime antes da formatação explícita.
- Usos de `formatDateTime` encontrados no Web: `sale.cancelledAt`,
  `change.createdAt` no histórico de produto e `billing.currentPeriodEnd` nas
  configurações da conta. Usos encontrados no Admin: validade de grant;
  timestamp de auditoria; fim de período de assinatura e criação de invoice;
  `event.availableAt` e `event.receivedAt` na tela Eventos; timestamps de
  sessões/notas; `organization.createdAt` na página de usuário; e última sessão
  no resumo de usuários. Os nomes dos campos e as queries os identificam como
  instantes.
- `apps/admin/src/app/(dashboard)/page.tsx` mantém um `formatEventDate` local
  com locale e fuso de São Paulo explícitos, duplicando parte do contrato
  compartilhado.
- Na tela Eventos, `availableAt` é a data de disponibilidade do evento outbox;
  `receivedAt` do webhook vem de `webhook_events.created_at` e é apresentado
  como instante recebido. Ambas as células usam `formatDateTime`.
- A cobertura compartilhada observada continua limitada a um timestamp UTC
  que atravessa a fronteira de dia em São Paulo no
  `packages/ui/src/lib/formatters.test.ts`; não cobre data civil, entrada sem
  zona ou invariância entre timezones de runtime.

#### Evidência oficial e limite da recomendação

O comportamento documentado de `Date.parse` e `Date` diferencia strings
date-only, interpretadas como UTC, de strings date-time sem offset, interpretadas
como horário local; `Intl.DateTimeFormat` usa o timezone do runtime se
`timeZone` não for informado. Isso sustenta a distinção P59 entre datas civis e
instantes e a exigência de zona explícita para instantes. [MDN — `Date.parse`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse), [MDN — `Intl.DateTimeFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat).

O projeto declara `date-fns` `^4.4.0`. A documentação oficial da versão 4.4.0
explica que o suporte a timezone está disponível por extensão/contexto via
`@date-fns/tz` e `@date-fns/utc`; não é uma capacidade automática de `format`
para qualquer `Date`. Esse contexto não muda a recomendação P59: não adicionar
agora `@date-fns/tz` nem migrar o formatter para date-fns por causa desta
correção. `Intl.DateTimeFormat` já fornece a projeção de instante necessária;
formatar datas civis deve continuar sem conversão de timezone. [date-fns v4.4.0 — time zones](https://github.com/date-fns/date-fns/blob/v4.4.0/pkgs/core/docs/timeZones.md).

Context7 falhou com `npm EINVALIDTAGNAME` por causa do override do workspace; a
consulta foi encerrada sem fallback ao conhecimento memorizado. Para esta
revalidação, a evidência da API veio das páginas oficiais MDN e a evidência de
date-fns veio do guia oficial versionado no repositório date-fns. Inspeção de
código foi feita localmente, sem executar testes ou abrir interface.

- [ECMA-402 — API internacionalização ECMAScript, edição 2026](https://402.ecma-international.org/): `Intl.DateTimeFormat`, zonas IANA e opções de apresentação de nomes de fuso. Context7 consultado com biblioteca `/mdn/content` para as opções da API; a documentação MDN confirma que omitir `timeZone` usa o timezone do runtime e descreve o fallback para nomes de fuso.
- [MDN — construtor `Intl.DateTimeFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat): locale, `timeZone`, estilos e `timeZoneName`.
- [WHATWG HTML Living Standard — elemento `time`](https://html.spec.whatwg.org/dev/text-level-semantics.html#the-time-element): valor semântico legível por máquina, datas civis, horas locais e instantes globais.
- [W3C WCAG 2.2 — Understanding SC 3.3.2](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html): rótulos e instruções de entrada, incluindo formatos quando necessário.
- [W3C técnica G89](https://www.w3.org/WAI/WCAG21/Techniques/general/G89): exemplo acessível de campo indicando ordem dia/mês/ano.
- [Unicode CLDR — padrões de data/hora](https://cldr.unicode.org/translation/date-time/date-time-patterns): padrões dependentes do locale e ordenação de campos.
- [Shopify — Live View](https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/live-view): horário local da loja em métricas e risco de particionamento por fusos diferentes.

## Limitações

Inspeção direta dos usos de `formatDate`/`formatDateTime` em Web/Admin, dos
formatadores e testes compartilhados, de amostras de chamadas do Hub e de
documentação pública. O inventário cobre consumidores localizados por formatter
compartilhado e não prova a inexistência de qualquer formatação ad hoc fora
deles. A implementação P59 abaixo documenta a CLI Impeccable indisponível; não
foi aberta interface local nem alterado banco/configuração remota. Context7
falhou anteriormente com `npm EINVALIDTAGNAME`; o comportamento de parsing foi
confirmado na página MDN vinculada acima.
## Implementação P59 — aprovada pelo usuário — 2026-10-02

### Alterações

- O pacote `@polaris/ui` exporta formatadores semanticamente separados: `formatCivilDate` aceita data civil válida `YYYY-MM-DD` e projeta os componentes diretamente em `dd/MM/yyyy`; `formatInstantDateTime` aceita `Date` ou string ISO inequívoca com `Z`/offset e apresenta em `America/Sao_Paulo`.
- O parser rejeita hora/minuto/segundo fora do intervalo, frações acima de milissegundos, offset inválido ou desconhecido (`-00:00`), data civil inválida e qualquer string sem fuso. Assim, o valor mostrado e `datetime` não divergem por normalização ou perda de precisão.
- `TimeValue` marca valores civis/instantes com `<time dateTime>` e mantém texto de apresentação exato; `BusinessTimeZoneNotice` padroniza a indicação de fuso. A tabela de Organizações corrigiu `createdAt` para instante; o formatter local do dashboard Admin foi removido; consumidores Web/Admin usam helpers conforme seus contratos.
- Os gráficos formatam datas civis sem converter ao fuso de negócio. A nota de fuso foi aplicada uma vez em telas densas de auditoria, billing, eventos, atividade do dashboard, detalhes de usuários e organizações, e no histórico de preços. Não foi aplicada em superfícies com apenas uma data/instante isolado.
- Nenhuma migration, dependência, mudança de armazenamento ou alteração remota.

### Verificação

`bun run verify:quick` passou: `docs:check` (13 testes de checker; 122 arquivos Markdown), Ultracite sem correções, typecheck dos 13 pacotes e testes unitários do workspace. Os testes novos cobrem DATE válido/inválido, instante UTC e offset, rejeição de data-hora sem fuso, hora/offset inválidos, precisão, invariância a `UTC`/`Pacific/Honolulu` e a marcação `<time>`.

Estado: **implementado e aprovado pelo usuário em 2026-10-02**. Não foi commitado nem integrado. A CLI Impeccable não estava instalada/resolúvel; o repo também proíbe abrir URLs locais, portanto não houve inspeção visual no browser.

### Follow-up P58 descoberto

O controle `datetime-local` em Admin Access envia `YYYY-MM-DDTHH:mm` sem timezone; `apps/admin/src/app/(dashboard)/admin-access/actions.ts` usa `new Date(value)`, que interpreta a hora no timezone do runtime. Isso conflita com a regra P58 de instante não depender do servidor/runtime e fuso global São Paulo. Registrar como subetapa P58 separada: rotular a hora de parede como São Paulo, converter explicitamente essa hora em instante de São Paulo e testar entrada futura/ inválida. Nenhuma mudança de criação de grant foi feita em P59.

## Estado após aprovação P59 e CI — 2026-10-03

O follow-up de integração descoberto no primeiro Admin E2E foi corrigido em
`packages/platform/src/internal/query-results.ts`, mantendo intacto o parser
ISO estrito de `@polaris/ui`. A suíte `query-results.test.ts` cobre o formato
PostgreSQL observado, offsets, precisão de milissegundos e data inválida. O
usuário aprovou a implementação nesta data; o run CI final `37123671646`
passou em `verify`, Web E2E, Admin E2E e PostgreSQL. O código está no PR #7
(SHA de cabeça `9532e7e`), que permanece Draft e não foi mesclado. P59 está
aprovado e verificado na branch; isso não conclui Gate A nem os gates de go-live.
