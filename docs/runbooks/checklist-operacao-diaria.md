# Checklist de Operacao Diaria

## Inicio do dia

- Confirmar acesso com usuario aprovado ao painel.
- Revisar rapidamente os modulos `Produtos`, `Vendas` e `Configuracoes`.
- Validar se categorias, markup e regras de cartao continuam corretos.
- Conferir se o bucket publico de imagens e a reconciliacao diaria nao apresentaram inconsistencias.

## Durante a operacao

- Cadastrar produto novo antes de movimentar estoque.
- Registrar entrada sempre pelo fluxo de reposicao.
- Registrar baixa sempre pelo fluxo de baixa.
- Registrar venda sempre pelo fluxo de `Vendas`.
- Antes de concluir a venda, confirmar meio de pagamento, parcelas, taxa, frete, desconto e itens.
- Em erro de venda, usar `Cancelar venda` para estornar estoque.
- Em baixas operacionais, detalhar o motivo em observacoes.
- Usar data no formato ISO (`YYYY-MM-DD`) nos fluxos de estoque.
- Se um item sair da operacao diaria, arquivar o produto em vez de tentar remover historico.

## Fechamento do dia

- Revisar historico de movimentacoes dos produtos alterados no dia.
- Revisar vendas concluidas e canceladas no periodo.
- Conferir se as baixas operacionais ficaram com observacoes claras.
- Revisar produtos arquivados que precisem voltar a operar.
- Confirmar que nao ha imagens orfas ou uploads travados em staging fora do esperado.

## Regras de disciplina

- Nao editar historico diretamente no banco.
- Nao usar planilha paralela para controle de estoque.
- Nao usar exclusao fisica de produto como rotina operacional.
- Nao deletar venda para corrigir operacao; usar cancelamento.
- Nao provisionar usuarios por endpoint publico; usar apenas fluxo administrativo autorizado.
