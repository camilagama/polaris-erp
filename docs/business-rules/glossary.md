# Glossário normativo

| Termo | Definição normativa |
| --- | --- |
| Organização | Tenant único de uma pessoa no lançamento. |
| Owner | Único membro do tenant; pode executar soft delete elegível. |
| Free | Plano ativo sem pagamento, com quotas operacionais. |
| Pago | Plano mensal de R$49,90, com quotas ampliadas. |
| Produto cadastrado | Produto ativo ou arquivado; soft-deletado não conta. |
| Arquivamento | Estado reversível que impede venda e não reduz quota. |
| Soft delete | Retirada final da operação, com estoque zero, motivo e auditoria. |
| Ledger | Registro append-only de cada mudança de saldo, incluindo venda/cancelamento. |
| Tolerância | Sete dias de acesso pago após falha de pagamento. |
| Gate externo | Condição de provider, ambiente ou validação humana que bloqueia release, não a decisão aprovada. |
| Aceito | Provider aceitou mensagem; não significa entregue. |
| Revisão manual | Estado terminal operacional que exige responsável e alerta. |
