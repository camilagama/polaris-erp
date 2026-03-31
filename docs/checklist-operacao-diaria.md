# Checklist de Operacao Diaria

## Inicio do dia

- Confirmar acesso aos modulos `Produtos` e `Vendas`.
- Revisar rapidamente produtos ativos e arquivados.
- Validar se os parametros em `Configuracoes` continuam corretos.

## Durante a operacao

- Cadastrar produto novo antes de movimentar estoque.
- Registrar entrada sempre pelo fluxo de reposicao.
- Registrar baixa sempre pelo fluxo de baixa.
- Registrar venda sempre pelo fluxo de `Vendas`.
- Em erro de venda, usar `Cancelar venda` para estornar estoque.
- Em baixas operacionais, detalhar o motivo em observacoes.
- Usar data no formato ISO (`YYYY-MM-DD`) nos fluxos de estoque.
- Em caso de erro operacional, preferir corrigir por nova movimentacao em vez de sobrescrever dados no banco.

## Fechamento do dia

- Revisar historico de movimentacoes dos produtos alterados no dia.
- Revisar vendas concluidas e vendas canceladas no periodo.
- Conferir se as baixas operacionais ficaram com observacoes claras.
- Revisar itens arquivados e exclusoes definitivas realizadas no periodo.

## Regras de disciplina

- Nao editar historico diretamente no banco.
- Nao usar planilha paralela para controle de estoque.
- Usar exclusao fisica apenas quando realmente necessario.
- Nao deletar venda para corrigir operacao; usar cancelamento.
- Antes de deletar produto, confirmar impacto em vendas vinculadas.
