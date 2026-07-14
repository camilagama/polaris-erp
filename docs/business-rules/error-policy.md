# Política normativa de erros

- Autorização, tenant, plano, quota, estado inválido, saldo insuficiente e transição proibida DEVEM negar a operação sem efeito parcial.
- Comando repetido com chave idempotente DEVE retornar o resultado original; sem chave, somente comandos explicitamente não repetíveis DEVEM ser recusados pela UI e servidor.
- Falha de auditoria em mutação crítica DEVE abortar a transação.
- Falha de provider após captura durável DEVE entrar em retry e depois revisão manual; NÃO PODE depender de novo delivery para recuperação.
- Mensagem ao usuário NÃO DEVE expor segredo, payload bruto, ID de sessão ou detalhe interno. Erro operacional DEVE apresentar referência de suporte quando houver correlação.
