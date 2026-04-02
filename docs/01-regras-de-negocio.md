# Documento de Regras de Negocio
## Plataforma Web de Gestao de Produtos para Revenda
### Versao: V1.4 (estado atual em 02/04/2026)

## 1. Objetivo atual do sistema

O sistema atual tem foco operacional em:

- cadastro e manutencao de produtos
- controle de entradas e baixas de estoque
- controle de custo medio por produto
- registro de vendas concluidas com baixa imediata de estoque
- cancelamento de vendas com estorno de estoque
- configuracao de margens e taxas de pagamento

A aplicacao permanece gerencial e nao fiscal/contabil.

## 2. Escopo implementado hoje

### 2.1 Modulos disponiveis

- autenticacao e shell protegida
- produtos
- estoque
- vendas
- configuracoes de catalogo, markup e pagamento

### 2.2 Funcionalidades disponiveis

- cadastro de produto com estoque inicial opcional
- edicao de nome, categoria, observacoes e preco atual do produto
- arquivamento e desarquivamento de produto
- exclusao fisica de produto
- registro de entrada de estoque com custo unitario e data
- registro de baixa de estoque com motivo simplificado e observacoes
- registro de venda com multiplos itens
- cancelamento de venda com estorno automatico de estoque
- historico de movimentacoes por produto
- calculo de custo medio movel
- sugestao de preco minimo e ideal por markup
- configuracao de parcelamento de cartao com taxa por parcela

## 3. Fora do escopo atual

Nao esta implementado neste momento:

- compras como modulo dedicado
- recebimentos como modulo dedicado
- dashboard com indicadores financeiros consolidados
- anexos de documentos e fotos
- importacao em massa via CSV
- auditoria avancada de alteracoes

## 4. Contexto operacional

- uso previsto por 2 pessoas
- operacao pequena de revenda
- uso em desktop e celular
- estoque unico global
- sem variacoes por produto
- historico leve de alteracao de preco por produto

## 5. Modelo de dominio atual

### 5.1 Produto

Campos operacionais principais:

- nome
- categoria
- observacoes e descricao
- custo medio atual
- preco de venda atual
- estoque atual
- status (`ativo` ou `arquivado`)

### 5.2 Entrada de estoque

Evento de reposicao com:

- produto
- data da entrada
- quantidade inteira positiva
- custo unitario

Impactos:

- aumenta estoque
- recalcula custo medio movel

### 5.3 Baixa de estoque

Evento de saida nao-venda com:

- produto
- data da baixa
- quantidade inteira positiva
- motivo simplificado
- observacoes livres para detalhamento

Motivos oficiais:

- `adjustment`
- `operational`

### 5.4 Venda

Evento de saida comercial com:

- data da venda
- cliente opcional
- `paymentMethod` (`pix` ou `card`)
- `paymentInstallments`
- `paymentFeePayer`
- 1 ou mais itens
- um produto por item, sem repeticao dentro da mesma venda
- quantidade inteira por item
- preco unitario por item capturado automaticamente do produto no momento da venda
- snapshots de custo por item no momento da venda
- frete opcional
- adicional opcional
- desconto opcional
- `totalAmount` como valor operacional da venda
- `chargedAmount` como valor efetivamente cobrado do cliente
- taxa calculada a partir da parcela selecionada quando o pagamento for cartao

Formula oficial:

`valor base da venda = subtotal dos itens + frete + adicional - desconto`

Regras financeiras:

- `pix`: `totalAmount = chargedAmount = valor base`
- `card` com taxa do vendedor:
  - `totalAmount = chargedAmount = valor base`
  - `feeAmount` registra o custo da taxa
- `card` com taxa do cliente:
  - `totalAmount = valor base`
  - `chargedAmount = valor base + acrescimo do cartao`
  - `feeAmount = 0`

Regras do modulo:

- venda nasce como `completed`
- venda concluida reduz estoque imediatamente
- venda nao possui exclusao fisica
- correcao operacional ocorre por cancelamento
- cancelamento muda status para `cancelled`
- cancelamento registra `cancelledAt`
- venda cancelada estorna estoque
- `totalAmount` nao pode ser negativo
- `chargedAmount` nao pode ser menor que `totalAmount`

## 6. Regras oficiais de estoque

1. Estoque e agregado por produto.
2. Estoque nao pode ficar negativo.
3. Toda alteracao de estoque deve acontecer por evento ou por venda.
4. Nao ha sobrescrita manual de saldo fora desses fluxos.
5. Quantidade de entrada, baixa e venda deve ser inteira.
6. Datas recebidas na borda devem estar no formato ISO `YYYY-MM-DD`.
7. Venda concluida reduz estoque; cancelamento de venda estorna estoque.
8. Produto arquivado nao pode ser vendido.

## 7. Regra de custo medio

Ao entrar nova mercadoria:

`novo custo medio = ((estoque anterior x custo medio anterior) + (quantidade de entrada x custo unitario da entrada)) / novo estoque`

Regras:

1. O recalculo ocorre apenas em entrada valida.
2. Baixa de estoque nao recalcula custo medio.
3. Venda tambem nao recalcula custo medio; usa snapshot do custo atual.

## 8. Regra de precificacao

A regra oficial atual usa markup puro sobre custo medio para orientar o cadastro:

### 8.1 Preco minimo

`preco minimo = custo medio x (1 + margem minima/100)`

### 8.2 Preco ideal

`preco ideal = custo medio x (1 + margem ideal/100)`

Observacoes:

- taxas de pagamento nao entram na sugestao de preco de catalogo
- frete, adicional e desconto entram no valor base da venda
- o acrescimo do cartao so altera `chargedAmount` quando a taxa e repassada ao cliente
- alterar o preco atual do produto impacta apenas vendas futuras
- toda alteracao de preco registra valor anterior, valor novo, usuario e data

## 9. Regras de integridade

- `sale_items` nao aceita o mesmo `product_id` repetido para o mesmo `sale_id`
- `sales.status` e `sales.cancelledAt` precisam permanecer consistentes
- `paymentMethod`, `paymentInstallments` e `paymentFeePayer` precisam refletir a escolha capturada na venda
- `feeAmount` so representa custo quando a taxa for absorvida pelo vendedor
- `chargedAmount` pode superar `totalAmount`, mas nunca compoe receita operacional ou lucro

## 10. Regra de exclusao fisica

Decisao operacional atual:

- a exclusao fisica de produto permanece habilitada
- essa operacao e destrutiva e irreversivel
- se houver vendas vinculadas ao produto, essas vendas e seus itens tambem sao removidos

Implicacao operacional:

- preferir arquivamento quando o objetivo for apenas retirar o produto da operacao diaria
- usar exclusao definitiva apenas quando a remocao historica for intencional

## 11. Regras de interface operacional

1. Listagens devem expor navegacao por link ou botao explicito, nao por clique invisivel na linha inteira.
2. Fluxos destrutivos devem usar confirmacao explicita.
3. Dialogs precisam manter foco previsivel e feedback claro.
4. O sistema deve permanecer minimalista, com prioridade para legibilidade e velocidade operacional.
5. No mobile, listagens devem degradar para cards ou blocos mais faceis de tocar.

## 12. Estado atual de qualidade

### Pontos fortes

- custo medio movel implementado
- transacoes para eventos criticos de estoque e venda
- validacoes compartilhadas com Zod
- historico de movimentacoes por produto
- regras de pagamento parametrizadas

### Pendencias atuais

- ampliar a cobertura E2E para fluxos autenticados completos
- ampliar testes de integracao para exclusao destrutiva de produto
- construir dashboard financeiro consolidado

## 13. Criterio para iniciar planejamento de recebimentos

Antes do modulo de recebimentos, manter a base atual com:

1. regras e documentacao alinhadas
2. validacoes de borda estaveis
3. testes de integracao para criacao e cancelamento de venda
4. protecao clara para fluxos destrutivos
5. historico de produto exibindo venda, baixa, entrada e estorno

---

Este documento reflete o estado implementado hoje e substitui premissas antigas que descreviam formulas ou modulos ainda nao presentes no produto.
