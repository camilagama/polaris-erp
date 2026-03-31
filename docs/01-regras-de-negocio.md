# Documento de Regras de Negocio
## Plataforma Web de Gestao de Produtos para Revenda
### Versao: V1.2 (estado atual em 31/03/2026)

## 1. Objetivo atual do sistema

O sistema atual tem foco operacional em:

- cadastro e manutencao de produtos
- controle de entradas e baixas de estoque
- controle de custo medio por produto
- registro de vendas concluidas com baixa de estoque
- configuracao de margens para sugestao de preco

A aplicacao permanece gerencial e nao fiscal/contabil.

## 2. Escopo implementado hoje

### 2.1 Modulos disponiveis

- autenticacao e area protegida
- produtos
- estoque (entrada e baixa)
- vendas
- configuracoes de catalogo e margens

### 2.2 Funcionalidades disponiveis

- cadastro de produto com estoque inicial opcional
- edicao de nome, categoria e observacoes do produto
- arquivamento e desarquivamento de produto
- exclusao fisica de produto
- registro de entrada de estoque com custo unitario e data
- registro de baixa de estoque com motivo simplificado e observacoes
- registro de venda com multiplos itens
- cancelamento de venda com estorno automatico de estoque
- historico de movimentacoes por produto
- calculo de custo medio movel
- sugestao de preco minimo e ideal por markup
- busca na listagem por nome ou categoria

## 3. Fora do escopo atual

Nao esta implementado neste momento:

- compras como modulo dedicado
- recebimentos como modulo dedicado
- dashboard com indicadores financeiros consolidados
- anexos de documentos/fotos
- importacao em massa via CSV
- auditoria avancada de alteracoes

Esses pontos permanecem como evolucao futura.

## 4. Contexto operacional

- uso previsto por 2 pessoas
- operacao pequena de revenda
- uso em desktop e celular
- estoque unico global
- sem variacoes por produto (cor/tamanho/memoria)

## 5. Modelo de dominio atual

### 5.1 Produto

Campos operacionais principais:

- nome
- categoria
- observacoes/descricao
- custo medio atual
- preco de venda atual
- estoque atual
- status (ativo/arquivado)

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

Motivos oficiais (minimos e simplificados):

- `adjustment`
- `operational`

Regra de detalhamento:

- detalhes especificos (ex.: avaria, perda, devolucao, estorno) devem ir em observacoes

### 5.4 Venda (MVP)

Evento de saida comercial com:

- data da venda
- cliente opcional (texto livre)
- 1 ou mais itens
- quantidade inteira por item
- preco unitario por item
- total calculado por snapshot dos itens

Regras do MVP:

- venda nasce como `completed`
- venda concluida reduz estoque imediatamente
- venda nao e excluida fisicamente
- correcao operacional ocorre por cancelamento
- cancelamento muda status para `cancelled` e estorna estoque

## 6. Regras oficiais de estoque

1. Estoque e agregado por produto.
2. Estoque nao pode ficar negativo.
3. Toda alteracao de estoque deve acontecer por evento (entrada ou baixa).
4. Nao ha sobrescrita manual de saldo fora desses fluxos.
5. Quantidade de entrada e baixa deve ser inteira.
6. Datas recebidas na borda devem estar no formato ISO `YYYY-MM-DD`.
7. Venda concluida reduz estoque; cancelamento de venda estorna estoque.

## 7. Regra de custo medio

Ao entrar nova mercadoria:

`novo custo medio = ((estoque anterior x custo medio anterior) + (quantidade de entrada x custo unitario da entrada)) / novo estoque`

Regras:

1. Recalculo ocorre apenas em entrada valida.
2. Baixa de estoque nao recalcula custo medio.

## 8. Regra simplificada de precificacao

A regra oficial atual foi simplificada para markup puro sobre custo medio:

### 8.1 Preco minimo

`preco minimo = custo medio x (1 + margem minima/100)`

### 8.2 Preco ideal

`preco ideal = custo medio x (1 + margem ideal/100)`

Observacao importante:

- taxas e custos variaveis nao entram nesta formula nesta fase
- quando necessario, essa camada sera reintroduzida no modulo de vendas/financeiro

## 9. Regra de exclusao fisica

Decisao atual de produto:

- a exclusao fisica de produto permanece habilitada
- ao excluir produto, os registros dependentes relacionados ao produto sao removidos por cascata

Implicacao operacional:

- usar exclusao definitiva com criterio
- preferir arquivamento quando o objetivo for apenas retirar da operacao diaria

## 10. Regras de interface operacional

1. A listagem de produtos deve permitir busca por nome e categoria.
2. Fluxos de entrada/baixa devem ter feedback de sucesso/erro.
3. O modulo deve manter linguagem simples e foco operacional.

## 11. Estado atual de qualidade

### Pontos fortes

- custo medio movel implementado
- validacoes de integridade no banco
- transacoes para eventos criticos de estoque
- historico de movimentacoes por produto

### Pendencias atuais

- testes E2E completos
- cobertura mais ampla de testes de integracao de actions
- dashboard financeiro consolidado

## 12. Criterio para iniciar planejamento de recebimentos

Antes do planejamento do modulo de recebimentos, manter vendas com:

1. regras e documentacao alinhadas
2. validacoes de borda estaveis
3. testes de integracao para criacao e cancelamento
4. comportamento concorrente minimamente coberto em testes
5. historico de produto exibindo eventos de venda e estorno

---

Este documento reflete o estado real implementado hoje e substitui premissas antigas que descreviam modulos ainda nao disponiveis no produto.
