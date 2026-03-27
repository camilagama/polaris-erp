# Checklist de Operacao Diaria

## Inicio do dia

- Confirmar acesso ao dashboard e verificar indicadores do periodo.
- Revisar alertas de estoque critico.
- Revisar produtos parados no dashboard.
- Confirmar se os parametros em `Configuracoes` continuam corretos.

## Durante a operacao

- Cadastrar produto novo antes de qualquer compra ou venda.
- Registrar compra e marcar como `received` apenas quando a mercadoria chegar.
- Fazer ajuste manual de estoque so quando houver diferenca fisica real.
- Confirmar venda apenas depois de validar saldo disponivel.
- Registrar recebimento em separado para manter caixa coerente.
- Em cancelamento de venda, usar o fluxo que recompõe estoque explicitamente.

## Fechamento do dia

- Revisar vendas criadas no periodo.
- Revisar recebimentos pendentes, parciais, refunds e chargebacks.
- Conferir lucro bruto, lucro liquido e ticket medio no dashboard.
- Validar se nao surgiram produtos com saldo critico inesperado.

## Regras de disciplina

- Nao editar dado historico fora do fluxo previsto.
- Nao usar planilha paralela para estoque ou caixa.
- Qualquer divergencia deve virar ajuste ou recebimento, nunca sobrescrita manual no banco.
