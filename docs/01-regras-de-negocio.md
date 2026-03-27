# Documento de Regras de Negócio
## Plataforma Web de Gestão de Produtos para Revenda
### Versão: V1

## 1. Objetivo do sistema

O sistema tem como objetivo permitir o controle gerencial de produtos comprados para revenda, com foco em:

- cadastro de produtos
- controle de entradas e saídas de estoque
- registro de compras
- registro de vendas
- controle de recebimentos
- cálculo de faturamento, lucro bruto, lucro líquido e margem
- visualização de indicadores relevantes para uma operação pequena de revenda

O sistema **não tem objetivo fiscal ou contábil oficial** nesta versão. Seu uso é exclusivamente **gerencial**.

---

## 2. Contexto de uso

- O sistema será utilizado por **2 pessoas**, compartilhando o mesmo ambiente.
- O uso será feito em **desktop e celular**.
- A operação é de **revenda de produtos importados**.
- Não há necessidade, nesta versão, de múltiplos estoques físicos, múltiplos workspaces ou gestão de filiais.
- Não há necessidade, nesta versão, de controle fiscal, emissão de nota, CRM avançado ou gestão formal de fornecedores/clientes.

---

## 3. Escopo da V1

A V1 deve contemplar:

- cadastro e edição de produtos
- upload de fotos dos produtos
- registro de compras
- entrada de estoque por compra
- ajuste manual de estoque
- registro de perdas e avarias
- registro de vendas com múltiplos itens
- desconto no pedido
- registro de frete cobrado do cliente
- registro de taxas da venda e do recebimento
- controle de recebimentos parciais
- registro de cancelamento, reembolso e chargeback
- cálculo automático de indicadores gerenciais
- alertas internos
- anexos de documentos
- importação em massa via CSV

---

## 4. Fora do escopo da V1

Não faz parte da V1:

- emissão de nota fiscal
- cálculo tributário/fiscal
- integração com marketplaces
- integração com gateways de pagamento
- integração bancária
- cadastro detalhado de clientes
- cadastro detalhado de fornecedores
- histórico/auditoria avançada de alterações
- múltiplos estoques/localizações
- variações de produto (cor, tamanho, memória etc.)
- serial, IMEI, código de barras ou rastreio unitário por item

---

## 5. Premissas de negócio

1. Os produtos são tratados como **itens simples**, sem variações.
2. O estoque é controlado por **quantidade agregada** por produto.
3. Todas as compras são registradas em **Real Brasileiro (BRL)**.
4. O mesmo produto pode ser comprado várias vezes por preços diferentes.
5. O sistema deve utilizar **custo médio móvel** como regra padrão de valuation do estoque.
6. O sistema deve bloquear, por padrão, vendas com estoque insuficiente.
7. O sistema é gerencial, portanto números e relatórios são voltados à tomada de decisão operacional.
8. O frete cobrado do cliente compõe a receita da venda.
9. O sistema deve suportar venda com mais de um item.
10. O sistema deve suportar recebimento parcial da venda.

---

## 6. Conceitos principais do domínio

### 6.1 Produto
Item revendido pela operação.

### 6.2 Compra
Registro de aquisição de um produto, com quantidade e composição de custos.

### 6.3 Movimento de estoque
Evento que altera o saldo em estoque de um produto.

### 6.4 Venda
Pedido de venda realizado para um cliente/canal, contendo um ou mais itens.

### 6.5 Recebimento
Evento financeiro vinculado a uma venda, representando entrada de dinheiro total ou parcial.

### 6.6 Canal de venda
Origem comercial da venda, como:
- WhatsApp
- OLX
- Facebook Marketplace

### 6.7 Anexo
Arquivo relacionado a compra, venda ou produto, como comprovantes, imagens ou documentos.

---

## 7. Perfis de acesso

### 7.1 Usuários
A V1 terá 2 usuários compartilhando o mesmo ambiente.

### 7.2 Permissões
Na V1, ambos os usuários terão **acesso total** ao sistema, incluindo:

- visualizar dados
- cadastrar
- editar
- cancelar
- ajustar estoque
- excluir registros apenas quando permitido pelas regras

Não haverá gestão granular de permissões nesta fase.

---

## 8. Regras de negócio por módulo

## 8.1 Produtos

### Regras
1. Todo produto deve possuir, no mínimo:
   - nome
   - status ativo/inativo
2. O produto pode possuir:
   - descrição
   - categoria
   - fotos
   - observações
3. O sistema deve gerar ou manter um identificador interno único para cada produto.
4. O produto não terá variações na V1.
5. O produto poderá ser inativado, mas não deve ser excluído se já possuir movimentação.
6. O sistema deve exibir para cada produto, no mínimo:
   - estoque atual
   - custo médio atual
   - preço sugerido
   - preço mínimo sugerido
   - data da última venda
7. O sistema deve permitir anexar uma ou mais fotos ao produto.

---

## 8.2 Compras

### Objetivo
Registrar a entrada de mercadoria e atualizar custo/estoque do produto.

### Campos mínimos
- produto
- data da compra
- quantidade
- valor do fornecedor
- frete
- taxa do cartão
- outros custos
- status
- observações opcionais
- anexos opcionais

### Regras
1. Uma compra sempre estará vinculada a **um único produto**.
2. Uma compra pode ter quantidade maior que 1.
3. O custo total da compra será:
   
   `custo total = valor do fornecedor + frete + taxa do cartão + outros custos`

4. O custo unitário da entrada será:

   `custo unitário de entrada = custo total / quantidade`

5. Ao confirmar uma compra recebida, o sistema deve:
   - gerar movimento de estoque de entrada
   - recalcular o custo médio do produto
   - atualizar o saldo do estoque
6. O sistema deve permitir anexar comprovantes à compra.
7. O sistema deve permitir status de compra.
8. Compras canceladas não devem afetar o estoque.
9. Compras em rascunho não devem afetar o estoque.

### Status de compra
- `rascunho`
- `registrada`
- `recebida`
- `cancelada`

### Regra de impacto no estoque
Somente compras com status `recebida` impactam o estoque.

---

## 8.3 Cálculo do custo médio

### Regra oficial da V1
O sistema deve utilizar **custo médio móvel**.

### Fórmula
Ao entrar nova mercadoria:

`novo custo médio = ((estoque anterior × custo médio anterior) + custo total da nova entrada) / novo estoque total`

### Regras
1. O custo médio deve ser recalculado apenas em eventos que aumentem estoque por entrada válida.
2. A venda não recalcula custo médio; ela apenas consome estoque pelo custo médio vigente no momento.
3. O custo médio histórico usado numa venda deve ser salvo como snapshot no item vendido.

---

## 8.4 Estoque

### Objetivo
Controlar saldo disponível de cada produto.

### Regras
1. O estoque será controlado por **quantidade agregada por produto**.
2. Haverá apenas **um estoque global** na V1.
3. O sistema deve manter saldo de estoque sempre consistente com os movimentos registrados.
4. O sistema não deve permitir estoque negativo, salvo se isso vier a ser habilitado futuramente. Na V1, deve ser **bloqueado**.
5. Todo ajuste de estoque deve gerar movimento de estoque com motivo.
6. O sistema deve permitir registrar:
   - ajuste positivo
   - ajuste negativo
   - perda
   - avaria
   - devolução de cliente
   - cancelamento com retorno ao estoque

### Tipos de movimento de estoque
- `entrada_por_compra`
- `saida_por_venda`
- `ajuste_positivo`
- `ajuste_negativo`
- `perda`
- `avaria`
- `devolucao_cliente`
- `estorno_cancelamento`

### Regras adicionais
1. Nenhuma alteração manual de saldo deve ocorrer sem registro de movimento.
2. A exclusão de um movimento que já impactou estoque deve ser evitada; o correto é registrar movimento compensatório quando aplicável.
3. A venda só pode ser concluída se houver estoque suficiente de todos os itens.

---

## 8.5 Vendas

### Objetivo
Registrar pedidos vendidos, saída de estoque e resultado operacional.

### Campos mínimos da venda
- data da venda
- canal de venda
- itens
- quantidade por item
- preço unitário de venda por item
- desconto no pedido
- frete cobrado do cliente
- observações opcionais
- anexos opcionais
- status da venda

### Regras
1. Uma venda pode conter **um ou mais itens**.
2. O desconto será aplicado no nível do pedido, não por item.
3. O frete cobrado do cliente deve ser registrado separadamente.
4. Ao confirmar uma venda válida, o sistema deve:
   - gerar saída de estoque para cada item
   - capturar o custo médio vigente de cada item no momento da venda
   - congelar esse custo como base histórica do lucro da venda
5. O sistema deve permitir informar o canal de venda.
6. O sistema deve permitir anexar comprovantes ou prints relacionados à venda.
7. O sistema deve permitir cancelamento, reembolso e chargeback conforme regras financeiras.

### Status da venda
- `rascunho`
- `aguardando_pagamento`
- `parcialmente_paga`
- `paga`
- `finalizada`
- `cancelada`
- `reembolsada`
- `chargeback`

### Regras de atualização de status
1. A venda pode iniciar em `rascunho` ou `aguardando_pagamento`.
2. Ao receber parte do valor, pode ir para `parcialmente_paga`.
3. Ao receber integralmente, pode ir para `paga`.
4. `finalizada` representa venda concluída operacionalmente.
5. `cancelada`, `reembolsada` e `chargeback` são estados finais específicos.
6. Uma venda finalizada não deve ser livremente editada; correções devem ocorrer por cancelamento, estorno ou eventos complementares.

---

## 8.6 Recebimentos

### Objetivo
Controlar entradas financeiras associadas às vendas.

### Métodos aceitos
- Pix
- dinheiro
- cartão
- link de pagamento

### Campos mínimos
- venda vinculada
- data prevista
- data efetiva
- valor bruto
- taxa
- valor líquido
- método
- status
- observações opcionais

### Regras
1. Uma venda pode ter **um ou mais recebimentos**.
2. O sistema deve permitir recebimento parcial.
3. O valor líquido do recebimento será:

   `valor líquido = valor bruto - taxa`

4. O somatório dos recebimentos efetivos compõe a visão financeira de caixa da venda.
5. O sistema deve permitir registrar:
   - recebimento pendente
   - recebimento parcial
   - recebimento concluído
   - cancelamento
   - reembolso
   - chargeback
6. Recebimentos via Pix ou dinheiro podem ser lançados já como recebidos.
7. Recebimentos por cartão ou link de pagamento podem nascer pendentes e ser liquidados depois.
8. Chargeback deve afetar o resultado financeiro da venda.
9. Reembolso deve reduzir o resultado da venda.
10. O sistema deve permitir registrar taxa do meio de pagamento.

### Status de recebimento
- `pendente`
- `parcial`
- `recebido`
- `cancelado`
- `reembolsado`
- `chargeback`

---

## 8.7 Cancelamento, reembolso e chargeback

### Cancelamento
1. Venda cancelada antes da efetiva conclusão deve:
   - estornar a saída de estoque, se já tiver ocorrido
   - invalidar o resultado operacional daquela venda
2. O retorno do item ao estoque deve ocorrer por movimento explícito de estorno/cancelamento.

### Reembolso
1. Reembolso representa devolução de valores ao comprador.
2. Reembolso pode ocorrer total ou parcial.
3. Reembolso afeta negativamente o resultado financeiro da venda.
4. O retorno do produto ao estoque deve depender de devolução física do item.

### Chargeback
1. Chargeback é um evento financeiro negativo associado a um recebimento/venda.
2. Chargeback não deve retornar estoque automaticamente.
3. Caso o produto retorne, isso deve ocorrer via devolução ou ajuste específico.
4. Chargeback deve impactar os indicadores financeiros da venda e do período.

---

## 8.8 Precificação

### Objetivo
Ajudar na sugestão de preço de venda com base em custo e margem.

### Regras
1. O sistema deve exibir:
   - preço sugerido
   - preço mínimo aceitável
2. O preço sugerido deve considerar:
   - custo médio atual
   - taxas estimadas de venda/recebimento
   - margem alvo
3. O preço mínimo aceitável deve representar o menor preço que cobre custo e margem mínima.

### Fórmulas sugeridas

#### Preço mínimo
`preço mínimo = (custo médio + custo variável estimado por unidade) / (1 - percentual de taxa - margem mínima)`

#### Preço sugerido
`preço sugerido = (custo médio + custo variável estimado por unidade) / (1 - percentual de taxa - margem alvo)`

### Observação
As fórmulas devem ser implementadas de modo parametrizável, para que margem mínima e margem alvo possam ser configuradas.

---

## 8.9 Alertas

### A V1 deve prever alertas internos para:
- estoque baixo
- produto parado
- venda com margem líquida abaixo do mínimo
- venda com lucro negativo
- recebimento em atraso

### Regras padrão sugeridas
- estoque baixo: `2 unidades ou menos`
- produto parado: `45 dias sem venda e com estoque disponível`

Esses valores devem preferencialmente ser configuráveis no futuro, mas podem iniciar fixos na V1.

---

## 8.10 Anexos

### Regras
1. O sistema deve permitir anexos em:
   - produtos
   - compras
   - vendas
2. Exemplos:
   - foto do produto
   - comprovante
   - print
   - nota/recibo
3. O sistema deve armazenar metadados básicos do arquivo:
   - nome
   - tipo
   - tamanho
   - data de upload
4. O sistema deve permitir visualização e remoção do anexo quando permitido.

---

## 8.11 Importação em massa

### Objetivo
Acelerar cadastro e/ou atualização inicial de dados.

### Regras
1. O sistema deve aceitar importação em massa via CSV.
2. Na V1, a importação deve cobrir ao menos:
   - produtos
   - compras
3. O sistema deve validar estrutura mínima do arquivo antes de importar.
4. O sistema deve exibir erros por linha quando houver inconsistência.
5. O sistema não deve importar parcialmente de forma silenciosa; deve informar exatamente o que foi aceito e o que falhou.

---

## 9. Indicadores gerenciais obrigatórios

A V1 deve exibir os seguintes indicadores:

- faturamento
- lucro bruto
- lucro líquido
- margem
- ticket médio
- produtos parados
- capital empatado em estoque

### Definições

#### Faturamento
Valor total vendido, considerando itens e frete cobrado do cliente, menos desconto aplicado.

`faturamento = soma dos itens + frete cobrado - desconto`

#### CMV (Custo da Mercadoria Vendida)
Soma do custo histórico capturado em cada item vendido.

#### Lucro bruto
Resultado da venda antes de taxas e eventos financeiros.

`lucro bruto = receita dos itens - CMV`

#### Lucro líquido
Resultado após considerar taxas, reembolsos, chargebacks e demais custos da venda.

`lucro líquido = receita total líquida - CMV - taxas - reembolsos - chargebacks - custos acessórios`

#### Margem
Percentual do lucro líquido sobre a receita.

`margem = lucro líquido / receita total`

#### Ticket médio
Valor médio por venda.

`ticket médio = faturamento / quantidade de vendas`

#### Produtos parados
Produtos com estoque maior que zero e sem venda nos últimos 45 dias.

#### Capital empatado em estoque
Valor financeiro atualmente preso em estoque.

`capital empatado = estoque atual × custo médio atual`

---

## 10. Visões de resultado

O sistema deve trabalhar com duas visões complementares:

### 10.1 Visão principal: resultado operacional
Usada para entender se a venda foi boa ou ruim.

Base:
- receita da venda
- custo da mercadoria vendida
- taxas
- frete/custos acessórios
- descontos
- reembolso/chargeback quando aplicável

### 10.2 Visão secundária: caixa
Usada para entender entrada real de dinheiro no período.

Base:
- recebimentos efetivos
- reembolsos
- chargebacks

### Regra
Os relatórios devem deixar claro quando o usuário está olhando:
- resultado operacional
- ou fluxo financeiro/caixa

---

## 11. Regras de validação essenciais

1. Produto não pode ser vendido sem estoque disponível.
2. Compra recebida deve ter quantidade maior que zero.
3. Compra recebida deve ter custo total maior ou igual a zero.
4. Venda deve possuir ao menos um item.
5. Item da venda deve ter quantidade maior que zero.
6. Recebimento deve possuir valor bruto maior que zero, salvo exceções tratadas como estorno/reembolso.
7. Cancelamento de venda deve seguir regra de impacto no estoque.
8. Produto com movimentação não deve ser excluído fisicamente.
9. Registros cancelados devem permanecer visíveis para fins gerenciais/históricos.
10. O sistema deve evitar edição destrutiva de eventos já consolidados.

---

## 12. Fluxos principais

## 12.1 Fluxo de compra
1. Usuário cadastra ou seleciona produto.
2. Usuário registra compra com quantidade e custos.
3. Compra fica em rascunho ou registrada.
4. Ao marcar compra como recebida:
   - sistema calcula custo total
   - sistema calcula custo unitário da entrada
   - sistema recalcula custo médio
   - sistema gera movimento de entrada
   - sistema atualiza estoque

## 12.2 Fluxo de venda
1. Usuário cria venda.
2. Adiciona itens e quantidades.
3. Sistema valida estoque.
4. Usuário informa desconto, frete cobrado e canal.
5. Sistema captura custo histórico dos itens.
6. Sistema gera saída de estoque.
7. Venda segue ciclo de pagamento até ficar paga/finalizada.

## 12.3 Fluxo de recebimento
1. Usuário registra recebimento vinculado à venda.
2. Informa método, valor bruto, taxa e data.
3. Sistema calcula valor líquido.
4. Venda atualiza status conforme total recebido.

## 12.4 Fluxo de cancelamento/reembolso
1. Usuário informa cancelamento, reembolso ou chargeback.
2. Sistema aplica efeito financeiro.
3. Quando houver retorno físico do produto, sistema gera movimento de entrada correspondente.

---

## 13. Requisitos de interface e experiência

1. O sistema deve funcionar bem em desktop e celular.
2. O sistema deve priorizar simplicidade operacional.
3. Telas principais esperadas:
   - dashboard
   - produtos
   - compras
   - estoque/movimentações
   - vendas
   - recebimentos
   - alertas
   - importação
4. O dashboard deve destacar:
   - faturamento
   - lucro bruto
   - lucro líquido
   - margem
   - ticket médio
   - capital empatado
   - produtos parados
5. As listagens devem permitir busca e filtros básicos.

---

## 14. Requisitos técnicos implícitos para o desenvolvimento

1. Toda movimentação relevante deve ficar persistida e rastreável.
2. Cálculos de custo e resultado não devem depender apenas do frontend.
3. O backend deve preservar integridade de estoque e consistência financeira.
4. A modelagem deve permitir evolução futura para:
   - cadastro de clientes
   - cadastro de fornecedores
   - múltiplos estoques
   - permissões
   - integrações com canais
   - configuração de margens e alertas

---

## 15. Estrutura conceitual mínima de entidades

A implementação deve considerar pelo menos as seguintes entidades:

- usuário
- produto
- foto/anexo de produto
- compra
- anexo de compra
- movimento de estoque
- venda
- item da venda
- recebimento
- anexo de venda
- configuração básica do sistema

---

## 16. Configurações iniciais recomendadas

Na V1, podem existir parâmetros padrão como:

- margem alvo padrão
- margem mínima padrão
- percentual estimado de taxa por canal/meio de pagamento
- limite de estoque baixo
- prazo para considerar produto parado

---

## 17. Critérios de sucesso da V1

A V1 será considerada bem-sucedida se permitir ao usuário:

1. saber quanto tem em estoque
2. saber quanto custou, em média, cada produto
3. registrar compras e vendas sem fricção excessiva
4. identificar lucro bruto e lucro líquido de forma confiável
5. saber quanto dinheiro entrou e quanto ainda falta receber
6. enxergar produtos parados
7. enxergar capital empatado em estoque
8. usar o sistema no dia a dia sem precisar de controles paralelos em planilha

---

## 18. Resumo executivo para o dev

A V1 deve ser construída como um sistema gerencial simples, porém consistente, centrado em:

- produto
- compra
- estoque
- venda
- recebimento
- indicadores

A principal regra estrutural do domínio é:

- **estoque por quantidade agregada**
- **custo médio móvel**
- **snapshot do custo no momento da venda**
- **resultado operacional separado da visão de caixa**

Esse conjunto é o núcleo que garante números confiáveis sem transformar a aplicação em ERP.