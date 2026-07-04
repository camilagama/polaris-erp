# Documento de Regras de Negocio
## Plataforma Web de Gestao de Produtos para Revenda
### Versao: V1.5 (estado atual em 02/04/2026)

## 1. Objetivo atual do sistema

O sistema tem foco operacional em:

- autenticacao fechada para uso interno
- cadastro e manutencao de produtos
- controle de entradas e baixas de estoque
- controle de custo medio por produto
- registro de vendas concluidas com baixa imediata de estoque
- cancelamento de vendas com estorno de estoque
- configuracao de margens e taxas de pagamento

A aplicacao continua gerencial e nao fiscal/contabil.

## 2. Escopo implementado hoje

### 2.1 Modulos disponiveis

- autenticacao e shell protegida
- produtos
- estoque
- vendas
- configuracoes de catalogo, markup e pagamento

### 2.2 Funcionalidades disponiveis

- login com email/senha e Google para usuarios aprovados
- bootstrap interno de usuario para dev/E2E com segredo administrativo
- cadastro de produto com estoque inicial opcional
- edicao de nome, categoria, observacoes e preco atual do produto
- arquivamento e desarquivamento de produto
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

- exclusao fisica de produto como fluxo operacional suportado
- compras como modulo dedicado
- recebimentos como modulo dedicado
- importacao em massa via CSV
- billing/planos/assinaturas

## 4. Contexto operacional

- SaaS self-serve com organizacoes isoladas por tenant
- operacao de revenda por organizacao
- uso em desktop e celular
- estoque isolado por organizacao
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
- status derivado de `archivedAt`

Regra oficial:

- o ciclo de vida do produto e `ativo` ou `arquivado`
- produto arquivado sai da operacao diaria, mas preserva historico, vendas e vinculos

### 5.2 Entrada de estoque

Evento de reposicao com:

- produto
- data da entrada
- quantidade inteira positiva
- custo unitario

Impactos:

- aumenta estoque
- recalcula custo medio movel
- reativa produto arquivado quando houver nova entrada

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
- preco unitario por item capturado do catalogo no momento da venda
- snapshot de custo por item no momento da venda
- frete opcional
- adicional opcional
- desconto opcional
- `totalAmount` como valor operacional
- `chargedAmount` como valor cobrado do cliente
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
- cancelamento estorna estoque
- `totalAmount` nao pode ser negativo
- `chargedAmount` nao pode ser menor que `totalAmount`

## 6. Regras oficiais de estoque

1. Estoque e agregado por produto.
2. Estoque nao pode ficar negativo.
3. Toda alteracao de estoque deve acontecer por evento ou por venda.
4. Nao ha sobrescrita manual de saldo fora desses fluxos.
5. Quantidade de entrada, baixa e venda deve ser inteira.
6. Datas recebidas na borda devem estar no formato ISO `YYYY-MM-DD`.
7. Venda concluida reduz estoque; cancelamento estorna estoque.
8. Produto arquivado nao pode ser vendido.
9. A tela de vendas deve usar apenas produtos ativos com estoque disponivel.

## 7. Regra de custo medio

Ao entrar nova mercadoria:

`novo custo medio = ((estoque anterior x custo medio anterior) + (quantidade de entrada x custo unitario da entrada)) / novo estoque`

Regras:

1. O recalculo ocorre apenas em entrada valida.
2. Baixa de estoque nao recalcula custo medio.
3. Venda nao recalcula custo medio; usa snapshot do custo atual.

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
- listagens devem usar cursor opaco composto, coerente com a ordenacao da consulta
- busca e filtros de listagem devem ser aplicados no servidor e refletidos na URL quando fizerem parte da navegacao operacional

## 10. Regra de acesso

Decisao operacional atual:

- o sistema cria a conta automaticamente no primeiro login com Google por `/sign-in`
- Google e o metodo de autenticacao suportado para cadastro e login publicos
- usuarios novos concluem onboarding para criar organizacao
- roles suportadas: `owner`, `admin`, `operator`
- o bootstrap interno de usuario existe apenas para desenvolvimento e automacao autorizada

## 11. Regras de interface operacional

1. Listagens devem expor navegacao por link ou botao explicito, nao por clique invisivel na linha inteira.
2. Dialogs precisam manter foco previsivel e feedback claro.
3. Mutacoes devem refletir imediatamente na interface apos `refresh()`.
4. O sistema deve permanecer minimalista, com prioridade para legibilidade e velocidade operacional.
5. No mobile, listagens devem degradar para cards ou blocos mais faceis de tocar.
6. Controles customizados precisam ter nome acessivel estavel para operador e automacao.
7. Detalhes de venda cancelada devem separar valores historicos da venda original do efeito operacional atual.

## 12. Estado atual de qualidade

### Pontos fortes

- custo medio movel implementado
- transacoes para eventos criticos de estoque e venda
- validacoes compartilhadas com Zod
- historico de movimentacoes por produto
- regras de pagamento parametrizadas
- suite Vitest e Playwright cobrindo fluxos centrais

### Pendencias atuais

- dashboard financeiro consolidado mais profundo
- modulo de recebimentos
- observabilidade adicional

---

Este documento reflete o estado implementado hoje e substitui premissas antigas de exclusao destrutiva e app interno fechado.
