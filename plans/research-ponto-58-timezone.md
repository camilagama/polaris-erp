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
