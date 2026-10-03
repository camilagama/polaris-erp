---
status: accepted
research_status: completed
decision_status: approved
researched_on: 2026-09-26
approved_on: 2026-09-26
---

# Pesquisa P58 — Política de datas e fusos horários

## Recomendação executiva

O ponto do relatório está correto ao exigir uma política de domínio antes que
cada módulo implemente sua própria interpretação de datas. Ele não parte de uma
lacuna total: `@polaris/date` já centraliza `America/Sao_Paulo`, conversão de
instante para data de negócio, rótulos, avanço de datas civis e limites mensais.
O schema também separa vários timestamps de campos `date`.

A questão ainda não resolvida pela implementação é **qual organização define o
calendário de negócio**. `DEC-BR-049` já aprovou `America/Sao_Paulo` globalmente
para o lançamento no Brasil. Essa escolha é simples e coerente entre tenants,
mas a justificativa de que “Brasil somente” permite um único horário não cobre
todo o país: a lei brasileira reconhece regiões em UTC−3, UTC−4 e UTC−5, além
do fuso UTC−2 das ilhas oceânicas. Para um ERP oferecido nacionalmente, um
calendário global pode classificar venda, estoque, meta e relatório no dia errado
para empresas no oeste do país.

**Decisão do usuário (2026-09-26):** manter `America/Sao_Paulo` como fuso
global do lançamento, sem configuração por Organização. Assim, DEC-BR-049 fica
reafirmada e não será reaberta para acrescentar um campo de fuso por tenant. A
decisão aplica o calendário São Paulo a todos os tenants mesmo quando uma
empresa opera em UTC−4/UTC−5; perto da meia-noite, a data de negócio pode diferir
da data civil local daquela empresa. Esse comportamento é uma escolha explícita
do domínio e precisa ser documentado na UI/ajuda onde datas operacionais forem
mostradas.

Se o produto decidir no futuro seguir o dia local de cada empresa, será uma nova
decisão de domínio e uma migração/auditoria com data efetiva e política de
histórico. Não inferir silenciosamente timezone por IP ou dispositivo e não
reclassificar datas já persistidas.

A preferência de exibição de uma pessoa não deve definir datas de venda,
períodos de meta, limites, jobs nem relatórios. Pode ser considerada no futuro
para exibir timestamps em uma timeline, sempre identificada como apresentação.

## O que o relatório acertou e o que já existe

O relatório pede que sejam documentados: timezone de armazenamento, timezone de
negócio, timezone de exibição, semântica de data sem horário, limites de dia e
mês e relatórios. A necessidade de um contrato único é real, mas “timezone de
armazenamento” precisa ser nomeado com mais precisão: um instante é persistido
em UTC; o timezone é usado para interpretar uma hora civil ou para exibir o
instante.

### Evidência no Polaris

- A raiz e `packages/ui` declaram `date-fns` `^4.4.0`. `packages/date` não
  depende de `date-fns`: implementa as funções centrais com `Date`,
  `Intl.DateTimeFormat` e calendário gregoriano.
- `packages/date/src/index.ts` fixa `BUSINESS_TIME_ZONE` em
  `America/Sao_Paulo` e oferece `formatBusinessDate`,
  `formatBusinessDateLabel`, `shiftBusinessDate` e
  `getBusinessMonthBounds`. Os testes existentes cobrem a virada do dia em São
  Paulo, mudança de data civil e fevereiro bissexto.
- `formatBusinessDateLabel` transforma `YYYY-MM-DD` em um `Date` ancorado ao
  meio-dia UTC antes de formatar em São Paulo. Isso não desloca a data nos fusos
  brasileiros atuais; não é um contrato geral para qualquer fuso IANA positivo.
  A semântica recomendada continua sendo formatar datas civis sem transformá-las
  em instantes.
- `packages/db/src/schema.ts` usa `timestamp` com `withTimezone: true` para
  timestamps comuns. Várias datas operacionais são `date`; algumas recebem
  default SQL baseado em `CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'`.
- `packages/db/src/postgres-behavior.test.ts` já verifica uma data de negócio
  sob sessões PostgreSQL em UTC e São Paulo.
- `apps/web/src/lib/domain/date.ts` é um wrapper de compatibilidade para
  `@polaris/date`. O dashboard da plataforma e expressões SQL ainda têm pontos
  próprios de conversão. Uma regra por Organização exigiria que esses caminhos
  recebam a Organização/fuso correto; trocar uma constante não basta.
- `docs/business-rules/decision-register.md`,
  `docs/business-rules/open-questions.md` e
  `docs/business-rules/normative/approved-rules.md` já registram `DEC-BR-049` /
  `TIME-001`: `America/Sao_Paulo` global para datas de negócio, metas, quota e
  jobs no lançamento. `DEC-BR-037` limita o lançamento ao Brasil, mas não
  restringe a estados ou fusos específicos.

Portanto P58 é parcialmente atendido no código. A lacuna principal é validar se
a decisão global aprovada representa corretamente o mercado do ERP, explicitar
semânticas diferentes de data e instante e alinhar todos os consumidores com a
decisão final.

### Comparação com o Hub

O Hub também fixa `America/Sao_Paulo`, usa `date-fns` 4 e adiciona
`@date-fns/tz` para cálculos conscientes de fuso. Sua documentação distingue
instantes UTC de datas civis e impede que o timezone do navegador/runtime mude
relatórios. Esse é um bom precedente para consistência e documentação, mas não
decide o domínio do Polaris: no ERP, venda e estoque representam o calendário
de operação de uma Organização, não apenas uma preferência de apresentação do
usuário.

## Trade-offs de escopo do fuso

| Política | Vantagens | Custos e riscos | Adequação |
| --- | --- | --- | --- |
| Um fuso global `America/Sao_Paulo` | Menos estado e caminhos condicionais; relatórios iguais para todos; corresponde à maioria das unidades federativas e à decisão atual. | Empresas em UTC−4/UTC−5 podem ter o dia operacional deslocado perto da meia-noite. “Brasil-only” não elimina essa divergência. | Boa se a área de lançamento for deliberadamente restrita a UTC−3. Questionável para uma oferta nacional. |
| Um fuso de negócio por Organização, com padrão São Paulo | Mantém vendas, estoque, metas e relatórios coerentes com a localidade do estabelecimento; independe do navegador e de viagens do usuário. | Todos os cálculos por dia/mês precisam de contexto da Organização; defaults SQL globais deixam de bastar; exige política para mudança de fuso e histórico. | Recomendado se o ERP atende empresas de todo o Brasil. |
| Fuso por usuário como autoridade de negócio | Parece simples quando há um único usuário. | Viaja com a pessoa, não com a empresa; o mesmo conjunto de dados pode mudar de dia dependendo de quem vê; fica incompatível com colaboração futura. | Não recomendado para datas operacionais. |
| Fuso do usuário apenas para exibir timestamps | Pode ajudar timelines e pessoas que viajam; não precisa alterar o significado do dado. | Pode deixar tabelas/reportes menos óbvios se a zona não for rotulada; duplica preferências de apresentação. | Opcional futuro; não deve alterar valores civis nem filtros de negócio. |

O modelo de uma Organização por pessoa no lançamento reduz colaboração entre
fusos, mas não resolve empresa e usuário em localidades diferentes. O dado
relevante é a localidade cuja operação o ERP representa.

## Contrato de domínio recomendado

1. **Instante:** evento que aconteceu em um ponto exato do tempo, como criação,
   alteração ou recebimento de webhook. Persistir como timestamp com timezone
   (`timestamptz` no PostgreSQL), que representa um instante normalizado em UTC.
   Não depender do timezone da sessão do banco, servidor ou navegador.
2. **Data civil:** vencimento, data operacional informada, competência ou dia
   de uma meta sem horário. É uma data de calendário sem timezone; manter como
   `DATE`/`YYYY-MM-DD`, sem converter em instante UTC e sem aplicar timezone do
   usuário ao formatar.
3. **Hora local planejada:** se o produto passar a registrar algo como “abrir
   às 08:00”, trata-se de hora de parede e zona IANA, não de instante isolado.
   A conversão para instante exige a data, a zona e uma regra para horários
   inexistentes ou repetidos em transições de relógio.
4. **Calendário operacional:** para uma oferta nacional, a Organização — não o
   navegador nem o perfil individual — escolhe a zona IANA que rege datas
   operacionais. Valor inicial sugerido: `America/Sao_Paulo`. Requer uma decisão
   de produto sobre seleção e alteração antes de implementar.
5. **Relatórios e períodos:** converter timestamps para a zona de negócio ao
   agrupá-los por dia/mês. Campos que já são `DATE` permanecem datas civis e não
   devem ser reconvertidos. Intervalos de timestamp devem ser semiabertos:
   `[início local do período, início local do próximo período)`, convertidos em
   instantes; evitar “23:59:59.999” e somar sempre 24 horas ao início, pois dias
   locais podem ter duração diferente.
6. **Exibição:** usar locale explícito (`pt-BR`) e timezone explícito para
   instantes. A exibição padrão pode seguir o fuso de negócio da Organização.
   Uma preferência pessoal futura pode alterar apenas a apresentação de
   timestamps, nunca a data de venda, meta, fechamento ou relatório.
7. **Zona nomeada:** usar identificador IANA (ex.: `America/Sao_Paulo`), não
   offset fixo como `-03:00`. A base IANA acompanha mudanças legais de regras e
   offsets.
8. **Contexto original:** `timestamptz` preserva o instante, não o timezone ou
   offset originalmente recebido. Se a origem civil for importante para
   auditoria ou reagendamento, persistir também a zona IANA original e, quando
   necessário, o valor/offset de entrada. Isso é específico por domínio, não
   requisito universal para todo timestamp.
9. **Mudança futura da zona da Organização:** definir antes de expor essa
   configuração se a mudança é bloqueada após a primeira transação ou se tem
   efeito a partir de uma data auditada. Sem essa regra, relatórios históricos
   baseados em instantes podem mudar de dia retrospectivamente. Datas civis já
   gravadas não devem mudar silenciosamente.

Esses itens são um contrato de domínio. Não exigem migrar para Temporal ou adotar
uma biblioteca específica nesta etapa.

## Orientação de bibliotecas

O Context7 encontrou documentação oficial do `@date-fns/tz` para `TZDate` e a
função `tz()`, que permitem fazer cálculos `date-fns` v4 em zona IANA explícita.
O Hub usa `@date-fns/tz` `^1.5.0`; Polaris ainda não. Isso é uma opção caso a
decisão por zona da Organização aumente as conversões e os limites locais, não
uma razão isolada para adicionar uma dependência. A consulta Context7 usou o ID
`/date-fns/tz`; a documentação oficial explica que `TZDate` faz os cálculos no
fuso informado e que a função `tz()` integra essa informação ao date-fns v4.

A documentação da proposta Temporal do ECMAScript fornece um vocabulário útil:
`Instant` para ponto exato, `PlainDate` para data sem fuso e `ZonedDateTime` para
instante associado a calendário/zona. A proposta foi elevada a Stage 4 em julho
de 2026; isso não significa que o runtime e a stack atual do Polaris estejam
prontos para substituir `Date`. O modelo conceitual pode orientar o contrato
independentemente da biblioteca.

## Prática de produtos e projetos

- **Shopify:** permite escolher o timezone padrão da loja, separadamente das
  configurações da conta. A documentação de Live View identifica métricas
  “local timezone” da loja. É um exemplo direto de calendário ligado ao negócio,
  não ao navegador de cada usuário.
- **Stripe:** distingue a zona da Dashboard, configurável na conta, da zona dos
  timestamps da API e do agendamento de transferências, que permanecem UTC. A
  Reporting API também tem timezone de saída de arquivo, sem alterar
  `interval_start`/`interval_end`. Isso ilustra que apresentação, intervalos e
  eventos são eixos diferentes.
- **Hub:** usa um fuso global fixo para suas datas do produto e documenta-o.
  É um precedente interno de centralização, mas não invalida o calendário local
  do estabelecimento em um ERP nacional.

Esses exemplos mostram padrões adotados, não uma regra universal de mercado.

## Limitações e pendências da decisão

- `DEC-BR-037` diz “Brasil somente”, mas os documentos não informam quais estados
  compõem a primeira coorte comercial. A recomendação de zona por Organização
  assume oferta nacional; se a coorte for restrita a UTC−3, a relação custo/
  benefício muda.
- Não foi definido como obter a zona do estabelecimento nem se haverá endereço
  da Organização no onboarding. Não se deve inferi-la permanentemente pelo IP
  ou pelo timezone atual do navegador.
- O efeito de uma futura troca de zona sobre relatórios que derivam datas de
  timestamps precisa ser decidido antes de permitir essa troca.
- Pesquisa documental e inspeção do código; sem execução de testes ou migração.

## Fontes

### Especificações e documentação técnica primária

- [PostgreSQL — Date/Time Types](https://www.postgresql.org/docs/current/datatype-datetime.html): `timestamptz` normaliza em UTC, não retém zona original; `date` não tem timezone; nomes IANA carregam regras, diferentemente de abreviações/offsets.
- [Temporal — Time Zones and Resolving Ambiguity](https://tc39.es/proposal-temporal/docs/timezone.html): diferença entre horário de parede e instante; atualização da base IANA; conversões ambíguas perto de mudanças de offset.
- [Temporal — PlainDate](https://tc39.es/proposal-temporal/docs/plaindate.html): data civil é independente de timezone; conversão para horário zonado exige uma zona.
- [Temporal — status da proposta](https://tc39.es/proposal-temporal/): status Stage 4 datado de 2026-07-27.
- [date-fns/tz README e API](https://github.com/date-fns/tz): `TZDate`/`tz()` para operar com fuso explícito e integração com date-fns 4.
- [IANA Time Zone Database](https://www.iana.org/time-zones): regras são atualizadas por mudanças políticas; release mais recente observado durante a pesquisa: 2026d, de 2026-09-11.
- [Lei Federal nº 12.876/2013](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12876.htm): zonas legais brasileiras UTC−3, UTC−4 e UTC−5 no território continental.
- [IBGE — Mapa de fusos horários](https://educa.ibge.gov.br/brasil/federacao-e-territorio/territorio/21763-fuso-horario): representação oficial que inclui o fuso das ilhas oceânicas.

### Exemplos de produto (não normativos)

- [Shopify — configurações da loja e timezone](https://help.shopify.com/en/manual/intro-to-shopify/initial-setup/setup-business-settings).
- [Shopify — Live View usa o timezone local da loja para métricas](https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/live-view).
- [Stripe — timezone da Dashboard](https://support.stripe.com/questions/customize-the-time-zone-on-the-dashboard?locale=en-GB).
- [Stripe — Report Run, timezone da saída e intervalo](https://docs.stripe.com/api/reporting/report_run/object).

## Revalidação de código e filtro de eventos — 2026-10-01

O `cancelSale` atual em `apps/web/src/features/sales/server.ts` grava `cancelledAt` como instante e `cancelledOn` usando `formatDateInputValue`; esse wrapper aponta para `formatBusinessDate`, fixado em `America/Sao_Paulo`. A tabela `sales` contém `cancelled_on DATE` e uma constraint que exige `cancelled_at` e `cancelled_on` para venda cancelada. A migration `20260716150000_temporal_business_dates.sql` fez backfill com `AT TIME ZONE 'America/Sao_Paulo'` e corrigiu o ledger. Porém `getSaleReversalMovements` em `apps/web/src/features/products/queries.ts` ainda usa `sql<string>`date(${sales.cancelledAt})`` para projetar e filtrar a data. O PostgreSQL converte `timestamptz` para a data da sessão; portanto esse achado continua aberto. A correção de leitura é usar `sales.cancelledOn`, mantendo `cancelledAt` para ordenar/exibir o instante. Não editar migrations aplicadas nem criar migration nova para este ajuste.

O Admin Events tem um `EventsDateFilter` que gera datas civis `from/to` em São Paulo; `EventsContent` lê os parâmetros, mas chama `getPlatformEventsOverviewForAdmin(platformAdminId)` sem passá-los. O wrapper `@polaris/platform/events` não aceita período, e `listEventOutbox`/`listWebhookEvents` não recebem limites. A consulta Outbox retorna `available_at` para a coluna “Disponível em” e ordena por `created_at`; Webhooks retornam `created_at` como `receivedAt`.

**Decisão do usuário em 2026-10-01:** o período filtra quando os registros foram criados/recebidos (`event_outbox.created_at` e `webhook_events.created_at`), com datas civis inclusivas em São Paulo traduzidas para `[início de from, início do dia posterior a to)`. `available_at` é apenas agenda de retry/disponibilidade e não determina a janela. A UI deve deixar essa distinção clara.

**Proposta de implementação:** propagar o filtro validado page → platform service → ambas as consultas; comparar as colunas timestamp com limites semiabertos de instantes em `America/Sao_Paulo`, evitando funções/casts na coluna; testar limites de dia e estabilidade em sessões UTC/São Paulo. Para estorno de estoque, projetar/filtrar a coluna `cancelled_on DATE`, sem derivar data de `cancelled_at` no SQL.

A primeira síntese independente considerou o cast de cancelamento superado, mas a inspeção do código encontrou a expressão residual; a revisão focada confirmou que ela permanece. Essa divergência reforça que cada item deve ser validado contra o símbolo concreto. Nenhum arquivo de código foi alterado, nem teste ou comando de banco foi executado nesta revisão.

Fontes oficiais atuais: [PostgreSQL 18 — tipos de data/hora](https://www.postgresql.org/docs/18/datatype-datetime.html) e [PostgreSQL 18 — funções de data/hora, incluindo `AT TIME ZONE`](https://www.postgresql.org/docs/18/functions-datetime.html).

## Revalidação para revisão de implementação — 2026-10-01

Esta revalidação preserva as decisões já aprovadas: `America/Sao_Paulo` continua sendo o fuso global de negócio (DEC-BR-049/TIME-001), e o filtro Admin Events continua significando registros criados/recebidos em datas civis inclusivas de São Paulo, convertidas para o intervalo semiaberto `[início de from, início do dia posterior a to)`. `available_at` continua representando disponibilidade/agendamento de retry, não a data de criação usada no filtro. **Status no momento daquela revalidação:** a implementação ainda não havia sido autorizada nem iniciada. O diagnóstico abaixo é histórico e foi sucedido pela atualização de implementação ao final deste documento.

### Fatos confirmados no código

- `cancelSale` em `apps/web/src/features/sales/server.ts` persiste o instante `cancelledAt` e a data civil `cancelledOn` calculada por `formatDateInputValue`; também grava o movimento `sale_reversal` com `occurredOn: cancelledOn`. `packages/db/src/schema.ts` declara `cancelled_at` e `cancelled_on DATE` e exige ambos quando a venda está cancelada. A leitura em `apps/web/src/features/products/queries.ts:getSaleReversalMovements` ainda projeta e filtra `date(${sales.cancelledAt})`. Isso reintroduz dependência do fuso da sessão PostgreSQL; a correção recomendada permanece usar `sales.cancelledOn` para data/filtros e conservar `cancelledAt` para instante e ordenação.
- Em `apps/admin/src/app/(dashboard)/events/page.tsx`, `EventsContent` lê `from`, `to` e `preset`, mas chama `getPlatformEventsOverviewForAdmin(platformAdmin.platformAdminId)` sem passar o intervalo. O wrapper em `packages/platform/src/platform-events.ts` recebe só o identificador do administrador e chama `listEventOutbox`/`listWebhookEvents` sem limites; ambas as consultas em `packages/events/src/index.ts` também não recebem datas.
- Na mesma página, quando não há query params, `from` e `to` recebem ambos `formatBusinessDate()` (hoje), embora `preset` assuma `last-7-days`. O componente `events-date-filter.tsx` define esse preset como hoje menos seis dias até hoje, inclusive. Assim, os valores iniciais exibidos e o preset declarado não descrevem o mesmo intervalo.
- `listEventOutbox` e `listWebhookEvents` ordenam por `created_at DESC` e limitam cada lista a 50 linhas. Outbox seleciona `available_at`, exibido como “Disponível em”; Webhooks selecionam `created_at` como `receivedAt`. O filtro aprovado deve incidir sobre `event_outbox.created_at` e `webhook_events.created_at`, preservando `available_at` apenas como dado de apresentação/agendamento.
- Os índices versionados em `packages/db/src/schema.ts` e migrations têm `event_outbox(status, available_at)` e `webhook_events(status, created_at)`, mas não há caminho cujo primeiro atributo seja `created_at` para estas listagens globais sem igualdade de status. A documentação PostgreSQL 18 descreve o benefício de prefixos à esquerda em índices B-tree multicoluna; para `webhook_events(status, created_at)`, PostgreSQL 18 pode considerar skip scan em certas distribuições/estatísticas, mas isso é comportamento condicional do planejador, não evidência de plano usado ou de desempenho em produção.

### Escopo mínimo recomendado para revisão

1. Propagar o intervalo civil validado da página Admin Events pelo serviço de plataforma às duas consultas; derivar limites como instantes São Paulo semiabertos e comparar diretamente com `created_at`, sem aplicar cast/função à coluna.
2. Alinhar defaults de `from`/`to` ao preset padrão `last-7-days` (ou alterar explicitamente o preset); manter a distinção visível entre data de criação filtrada e `available_at` exibido.
3. Corrigir a leitura de estornos de venda para `cancelled_on DATE`, sem alterar migration já aplicada e sem remover o timestamp usado para ordenação/apresentação.
4. Considerar uma migration com índice iniciado por `created_at` para cada consulta global se a revisão confirmar que os filtros temporais e ordenação precisam de um caminho dedicado. Isso é uma recomendação a avaliar, não fato medido nem requisito automático: índices adicionais ocupam armazenamento e aumentam o custo de escrita/manutenção; a escolha deve considerar seletividade, volume, plano de execução e estatísticas reais antes de assumir ganho.
5. Cobrir limites inclusivos de datas civis, sessão PostgreSQL em UTC versus São Paulo para a leitura do estorno, propagação do filtro até as duas consultas, e consistência entre preset e datas iniciais. Nenhum teste foi executado nesta revalidação.

### Base documental e limite da pesquisa

A tentativa de consulta via Context7 falhou com `npm EINVALIDTAGNAME` causada pelo override do workspace; foram consultadas diretamente as páginas oficiais do PostgreSQL 18: [tipos de data/hora](https://www.postgresql.org/docs/18/datatype-datetime.html), [funções de data/hora e `AT TIME ZONE`](https://www.postgresql.org/docs/18/functions-datetime.html) e [índices multicoluna](https://www.postgresql.org/docs/18/indexes-multicolumn.html). Esta revisão é inspeção estática do código e da documentação; não houve execução de testes, consulta de banco, `EXPLAIN`, alteração de configuração remota ou medição de produção.

**Intervalo de ano suportado por `@polaris/date`:** `parseCivilDate` usa `Date.UTC` e compara os campos resultantes ao ano de entrada. Como JavaScript remapeia os anos 0–99 no construtor `Date.UTC`, o round-trip rejeita esses anos em vez de produzir silenciosamente outra data. Nenhuma regra de negócio consultada exige anos anteriores a 0100; recomendação: tornar a faixa suportada explícita e testá-la, sem ampliar suporte a datas antigas apenas para contornar esse comportamento.

## Implementação P58 — revisão aprovada; replay PostgreSQL pendente — 2026-10-02

### Mudanças aplicadas na worktree

- `@polaris/date` valida datas civis por calendário, incluindo ano bissexto e faixa suportada a partir de `0100`.
- `getSaleReversalMovements` usa `sales.cancelledOn` para projetar/filtrar a data civil; preserva `sales.cancelledAt` como instante e ordenação.
- Admin Events resolve defaults de sete dias de acordo com o preset, valida parâmetros únicos e datas válidas, rejeita intervalos invertidos com fallback sinalizado, e encaminha o intervalo São Paulo até as duas consultas. As consultas comparam limites semiabertos contra os `created_at` brutos; `available_at` segue separado como agenda de retry. O limite de 50 registros por fonte permanece.
- Adicionados índices B-tree em `event_outbox.created_at` e `webhook_events.created_at`. A migration também renomeia seis constraints FK implicitamente nomeadas pelas migrations SQL para os nomes explícitos esperados pelo schema Drizzle; as relações e ações referenciais não mudam.
- Documentação de migrations/schema e observabilidade atualizada para refletir o contrato e distinguir árvore versionada de estado de banco aplicado.

### Verificação e limites

Testes unitários focalizados passaram em `packages/date`, `packages/events`, `packages/platform`, `apps/web` products queries e `apps/admin` events-date-filter. A revisão independente confirmou que as seis renomeações correspondem às referências das migrations anteriores, os índices e FKs correspondem ao schema, e o journal/snapshot está ligado à última snapshot existente. Isso não prova que a migration foi aplicada em banco algum.

`bun run verify:quick` passou, incluindo `docs:check`, Ultracite, typecheck dos 13 pacotes e testes unitários. A revisão final dos diffs e da cadeia Drizzle foi concluída. O replay PostgreSQL 18 permanece pendente: `bun scripts/require-postgres-behavior-database.ts` recusou continuar porque `POSTGRES_BEHAVIOR_DATABASE_URL` não está configurada; `DATABASE_URL` não foi usado como fallback, e nenhum banco remoto foi acessado. O detector Impeccable não foi executado porque `impeccable.cmd` não está instalado/resolúvel nesta worktree. Status da etapa: **implementação P58 aprovada pelo usuário em 2026-10-02; replay PostgreSQL pendente**. P59 foi implementado localmente e aprovado pelo usuário em 2026-10-02, conforme o registro P59.
### Follow-up P58 identificado — entrada de expiração de grants — 2026-10-02

`apps/admin/src/app/(dashboard)/admin-access/page.tsx` usa `datetime-local`, cujo valor enviado não contém timezone; `apps/admin/src/app/(dashboard)/admin-access/actions.ts` converte o texto com `new Date(value)`. Por isso o instante resultante pode depender do timezone do runtime, enquanto TIME-001/DEC-BR-049 fixa São Paulo para o negócio. Esse ponto não pertence ao P59, que trata apresentação. Nenhum grant, banco ou código desta action foi alterado. Próxima subetapa P58: identificar o campo como horário de São Paulo, converter a hora civil local em instante usando `America/Sao_Paulo`, validar horário inexistente/ambíguo e prazo futuro, e cobrir a conversão em teste.
## Revalidação de follow-up P58 — expiração de grants — decisões pendentes — 2026-10-02

### Fatos no checkout

- `apps/admin/src/app/(dashboard)/admin-access/page.tsx` envia `datetime-local` (`YYYY-MM-DDTHH:mm`) sem timezone. `getFutureExpiration` em `actions.ts` converte com `new Date(value)`, interpretando a string na timezone do runtime do processo; a zona do browser não faz parte do valor enviado. TIME-001/DEC-BR-049 já fixa `America/Sao_Paulo`; a action precisa converter o wall-time nessa zona, nunca inferir do processo/browser. [MDN — `datetime-local`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/datetime-local), [MDN — `Date.parse`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse).
- DEC-BR-060, registrada em `docs/business-rules/post-audit-decisions-2026-07-14.md` e referenciada pelo `decision-register.md`, aprova grant máximo de 90 dias para owner, 30 para operator e 14 para support, sem grant permanente. `packages/platform/src/platform-admin.ts` valida somente que expirações sejam válidas/futuras, sem verificar esses máximos em grant direto, enrollment ou bootstrap. A UI também não tem duração máxima e o schema exige apenas `expires_at IS NOT NULL`.
- `getEnrollmentExpiration` calcula “sete dias” via `Date.setDate()` no timezone do runtime. Nenhuma regra normativa encontrada decide se esse TTL quer dizer sete dias-calendário ou 168 horas decorridas.
- Enrollment conserva `enrollment_expires_at` e `grant_expires_at` separadamente. O enrollment expira em até sete dias mesmo quando o grant embutido expira antes; `admitPlatformAdminSession` consome o enrollment e insere o grant sem revalidar que `grant_expires_at` ainda está no futuro. Isso pode gerar grant já expirado.
- Horário de verão no Brasil foi suspenso em 2019; o MME informa que a política é reavaliada periodicamente. Portanto regras futuras podem voltar a criar local times inexistentes ou repetidos em São Paulo. [MME — horário de verão](https://www.gov.br/mme/pt-br/assuntos/secretarias/secretaria-nacional-energia-eletrica/horario-de-verao/horario-de-verao).

### Conversão e trade-offs

- **Recomendação:** `@js-temporal/polyfill` somente em código server-side do Admin. Converter input estrito `YYYY-MM-DDTHH:mm` para `Temporal.PlainDateTime`, depois `toZonedDateTime("America/Sao_Paulo", { disambiguation: "reject" })`. Isso rejeita gaps e overlaps em vez de normalizar uma hora que não existe ou escolher silenciosamente uma das horas repetidas. A UI passa a rotular o campo “Expira em (horário de São Paulo)” e explica que uma hora local ambígua/inexistente deve ser substituída.
- O engine do Polaris é `Node 24.x`; a documentação oficial de globals do Node 24.21.0 não documenta `Temporal`, então a implementação não deve depender de um global nativo não garantido. O polyfill upstream está em `0.5.1`, declara `node >=12` e uma dependência runtime (`jsbi`). Colocá-lo só no pacote `apps/admin`/caminho server-side evita enviá-lo ao Web ou bundle do browser. [Node v24 globals](https://nodejs.org/download/release/latest-v24.x/docs/api/globals.html), [package upstream](https://github.com/js-temporal/temporal-polyfill/blob/main/package.json).
- `@date-fns/tz` integra com date-fns v4, mas os testes oficiais de `TZDate` demonstram que o construtor normaliza um wall-time inexistente durante spring-forward para o instante da hora válida seguinte; não há opção `disambiguation: "reject"` no construtor. Evitar isso exigiria lógica extra para detectar gaps e overlaps. O pacote não está instalado no Polaris. [Testes oficiais do construtor `TZDate`](https://github.com/date-fns/tz/blob/main/src/date/tests.ts).
- Um conversor próprio com `Intl.DateTimeFormat` evitaria dependência, mas teria de descobrir todos os offsets possíveis e provar unicidade ao redor de transições futuras de TZDB. Para este fluxo de concessão de acesso, recomendo a API Temporal padronizada via polyfill em vez de algoritmo especializado.
- `Temporal` fornece as semânticas e política `reject` para local times duplicados/inexistentes; a proposta foi elevada a Stage 4, mas isso não fornece um global no Node 24 do projeto. [TC39 — time zones e ambiguidade](https://tc39.es/proposal-temporal/docs/timezone.html).

### Escopo recomendado após as decisões

1. Campo e parser: mostrar o fuso São Paulo, validar valor nativo único/estrito, converter explicitamente para instante, rejeitar gap/overlap e datas passadas.
2. Serviço de domínio: aplicar os máximos já aprovados de 90/30/14 dias a enrollment, grant direto e bootstrap, não só à Server Action. Medir os tetos contra `now` usando a unidade temporal escolhida pelo usuário.
3. Enrollment: limitar `enrollment_expires_at` ao menor entre TTL e `grant_expires_at`; ao claim, verificar outra vez que o grant embutido está futuro. Isso mantém o token e o acesso concedido temporalmente coerentes.
4. TTL automático: substituir `Date.setDate()` por duração ou calendário explicitamente definido, independente do runtime.
5. Testes: horário normal; entrada malformada/passada; invariância sob `TZ=UTC` e timezone diferente; gap/overlap histórico de São Paulo; limites inclusivos/exclusivos dos 14/30/90 dias; token não ultrapassa grant; claim de grant vencido recusado. Nenhuma migration deve ser necessária.

### Decisões de Grill-Me pendentes

1. Horário local de São Paulo inexistente ou repetido: rejeitar e pedir outro horário (recomendado), ou escolher earlier/later explicitamente?
2. Semântica de “N dias” para os tetos aprovados (14/30/90) e para o token de enrollment (7): duração decorrida em blocos de 24h (recomendado) ou dias-calendário de São Paulo?
3. Validade do link: capar enrollment ao grant expiration e negar claim depois de grant expirado (recomendado), ou manter o token ativo por seu TTL independente?
4. Dependência de conversão: usar `@js-temporal/polyfill` server-side (recomendado; API com reject e Node >=12, mas release atual ainda 0.5.1) ou não adicionar pacote e implementar/testar resolução própria com `Intl`?

## Follow-up P58 implementado e aprovado pelo usuário — replay PostgreSQL pendente — 2026-10-02

O usuário autorizou seguir as quatro recomendações: rejeitar horário inexistente ou
repetido; medir todos os prazos em períodos decorridos de 24 horas; limitar o
enrollment ao grant e negar claim vencido; usar Temporal apenas no servidor Admin.
As perguntas anteriores permanecem como registro da análise, não decisões pendentes.

Implementação: `@js-temporal/polyfill@0.5.1` fixado em `apps/admin`; helper protegido
por `server-only`, input único e estrito de minuto, conversão São Paulo com rejeição
de ambiguidade; TTL automático como mínimo de 168 horas e expiração do grant.
O formulário identifica fuso, limites e e-mail. O domínio aplica tetos 14/30/90 dias
em todas as entradas de criação, limita enrollment e revalida claim na transação.
Sem migration nova nesta subetapa; nenhum banco remoto acessado.

Verificação Admin: 16 testes focais passaram; parser passou também com `TZ=UTC` e
`TZ=Asia/Tokyo` (11 casos em cada execução); typecheck passou. Detector Impeccable
da tela retornou zero achados. CodeRabbit está desconectado (`auth status`: signed out).
A revisão Luna não encontrou bloqueios no Admin. Na revisão final, o claim de
enrollments antigos também recebeu o limite de papel, validado antes do consumo e
na inserção SQL com intervalos de horas, sem ampliar automaticamente prazo algum.
Os testes de admissão usam mocks: não provam execução SQL nem rollback real.
Esses dois comportamentos entram explicitamente na pendência PostgreSQL 18.

A primeira execução ampla passou docs/lint/typecheck e falhou no Web com quatro
timeouts de 10 segundos e uma contagem de mock divergente; os quatro arquivos
passaram isolados (57 testes), sem alteração de código ou timeout. A repetição
do perfil passou. Isso é evidência de instabilidade nesta execução, não diagnóstico
fechado da causa; investigar em P71, preservando os gates. A verificação do estado
final, após a correção de enrollment antigo, está registrada na atualização abaixo.
P58 permanece parcial até replay e prova SQL em PostgreSQL 18 descartável. O usuário aprovou este follow-up em 2026-10-02. Nenhum commit ou integração foi feito.
**Verificação do estado final (2026-10-02):** `bun run verify:quick` passou após a correção de enrollment legado: documentação (13 testes/122 arquivos), Ultracite (621 arquivos), typecheck do workspace e suites unitárias. Testes focais desta subetapa: 16 no Admin e 25 na plataforma, incluindo limite máximo e máximo +1ms por papel, recusa durante o claim e convite legado excessivo. O Web final passou 578 testes; um teste PostgreSQL permanece condicional e não executado. `git diff --check` também passou. Sem prova de SQL/rollback real até PostgreSQL 18 descartável; sem banco remoto, commit ou push. Implementação aprovada pelo usuário em 2026-10-02.
## Follow-up P58 — integração PostgreSQL implementada, execução real pendente — 2026-10-02

O usuário pediu usar banco de teste isolado, se possível. O URL informado era pooled e remoto; `POSTGRES_BEHAVIOR_DATABASE_URL` permanece obrigatoriamente loopback no guard, e não usamos a URL remota nem a gravamos. A origem isolada esperada é `polaris_behavior`, já migrada pela suite DB do job `postgres-behavior` com imagem `postgres:18.6`. Um helper em `packages/db/scripts/prepare-and-run-platform-postgres.ts` valida origem e destino loopback/distintos, exige que a origem não tenha conexões, cria um clone com identificador aleatório, executa a suite da plataforma num subprocesso com `DATABASE_URL` apenas para o clone e o remove em `finally`.

`platform-admin-admission.postgres.test.ts` chama `admitPlatformAdminSession` com DB/Drizzle reais e verifica: grant/auditoria em claim válido; recusa de grant vencido; recusa de enrollment legado além do teto; rollback de claimed_at e admin quando trigger de teste expira o grant depois da leitura e antes do INSERT condicional. Os fixtures usam user/email UUIDs, e removem audit/grant/admin/enrollment/admin_user. A trigger/função temporárias também são derrubadas em `finally`. O package `pg` é dependência de desenvolvimento da plataforma e `test:postgres` inclui essa suite entre DB migrations e Events/Web.

**Verificação local:** `bun run verify:quick` passou (docs 13 testes/122 MD, Ultracite 623 arquivos, typecheck 13 pacotes e unit suites); plataforma passou 66 testes e quatro integração PostgreSQL foram skipped sem URLs; `docs:check`, typecheck da plataforma e diff check passaram. O teste PostgreSQL foi configurado para não executar fora do job/ambiente com URLs. Tentativa local `bun run test:postgres` recusou antes de conectar: `POSTGRES_BEHAVIOR_DATABASE_URL` ausente. Host sem Docker/psql. Isso é comportamento seguro, não prova que os testes PG18 novos passaram; a execução real aguarda o job CI.

**Estado:** implementação aprovada pelo usuário em 2026-10-03; execução real no job CI PostgreSQL 18.6 pendente. Nenhum banco remoto conectado, migration nova, commit ou push.
CodeRabbit review foi tentado no diff de `packages/platform`, mas a revisão automática de aprovação bloqueou compartilhar o conteúdo potencialmente privado com esse serviço externo por falta de autorização específica para esse payload. Não contornei o bloqueio nem tentei uma rota alternativa. Revisão local independente Luna: sem achados concretos.
**Revisão do usuário:** aprovada em 2026-10-03 (“prossiga”). A implementação local está aceita; P58 como um todo continua parcial até a execução dos quatro testes no job PostgreSQL 18.6 e confirmação da migration/replay.