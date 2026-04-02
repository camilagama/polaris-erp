# Design: Separacao dos KPIs de custos no dashboard

## Contexto

Hoje o dashboard exibe um unico card de `Custos no periodo`, calculado como a soma de:

- custo dos produtos vendidos
- frete da venda
- taxas da venda

Essa agregacao dificulta a leitura operacional, porque o card mistura natureza de custos diferentes. O pedido e separar essa visao em dois cards para deixar o dashboard mais claro.

## Objetivo

Substituir o KPI agregado de custos por dois KPIs distintos:

- `Custo dos produtos`: soma do custo dos itens vendidos no periodo
- `Frete + taxas`: soma do frete e das taxas pagas pelo vendedor no periodo

O dashboard deve continuar mostrando corretamente:

- total vendido
- resultado no periodo
- quantidade de vendas concluidas
- grafico de vendas x custos

## Regra de negocio validada

- `Custo dos produtos` inclui apenas `quantity * unitCostSnapshot` dos itens vendidos com status `completed`
- `Frete + taxas` inclui `freightAmount` e apenas taxas efetivamente pagas pelo vendedor
- taxas nao pagas pelo vendedor nao entram no card `Frete + taxas`
- `totalCosts` continua existindo como valor agregado interno para preservar o calculo de resultado e a serie de custos do grafico

## Abordagens consideradas

### 1. Dividir apenas os cards na interface

Pros:

- menor mudanca visual
- baixo risco de regressao na UI

Contras:

- manteria a camada de metricas com um contrato menos claro
- aumentaria a chance de duplicar regra de negocio na pagina

### 2. Dividir os cards e explicitar os totais na camada de metricas

Pros:

- regra de negocio fica centralizada
- contrato de dashboard passa a refletir melhor os dados exibidos
- testes conseguem validar cada subtotal

Contras:

- exige atualizar contratos e testes

### 3. Dividir cards e quebrar tambem o grafico em series separadas

Pros:

- detalhamento maximo da composicao de custos

Contras:

- altera mais a experiencia do dashboard
- foge do escopo solicitado

## Decisao

Seguir com a abordagem 2.

Vamos manter `totalCosts` para calculos agregados e adicionar dois novos totais explicitamente no retorno de metricas:

- `totalProductCosts`
- `totalShippingAndSellerFees`

Esses valores serao usados pelos novos cards do dashboard.

## Design tecnico

## Fonte de dados e calculo

O calculo continuara centralizado em `src/features/dashboard/metrics.ts`.

- vendas concluidas dentro do periodo continuam sendo a base do total vendido e do frete/taxas
- itens concluidos dentro do periodo continuam sendo a base do custo de produto
- `totalCosts` sera calculado como `totalProductCosts + totalShippingAndSellerFees`
- a serie `costs` em `periodComparison` continuara usando o custo agregado para nao alterar o grafico nem o resultado financeiro

## Contratos

Atualizar `src/features/dashboard/contracts.ts` para que `DashboardMetrics` exponha:

- `totalProductCosts: number`
- `totalShippingAndSellerFees: number`

Sem remover:

- `totalCosts`
- `totalResult`
- `totalSold`
- `totalSalesCount`

## Interface

Atualizar `src/app/(app)/page.tsx` para substituir o card atual:

- remover `Custos no periodo`

Adicionar:

- `Custo dos produtos`
  - nota: `Custo dos itens vendidos no periodo`
- `Frete + taxas`
  - nota: `Frete e taxas pagas pelo vendedor`

O grid pode passar de 4 para 5 cards, preservando o comportamento responsivo atual.

## Testes

Atualizar `src/features/dashboard/metrics.test.ts` para validar:

- custo de produto isolado
- frete + taxas isolado
- custo total agregado preservado
- resultado final inalterado para os cenarios existentes

## Impacto esperado

- melhora de clareza na leitura dos custos
- nenhuma mudanca no significado de lucro/prejuizo
- nenhuma mudanca no significado da serie de custos do grafico

## Fora de escopo

- alterar o grafico para exibir custos em series separadas
- alterar a modelagem de vendas fora da necessidade dos KPIs
- revisar outros relatórios ou telas
