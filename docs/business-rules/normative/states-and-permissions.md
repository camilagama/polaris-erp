# Estados e permissões

**Versão:** 1.0.0  
**Status:** normativa aprovada, implementação parcial.

## Atores

| Ator | Pode | Não pode |
| --- | --- | --- |
| Visitante | iniciar Google OAuth | acessar operação de tenant |
| Owner | operar o tenant único, inclusive soft delete elegível | delegar membership, trocar tenant ou restaurar soft delete |
| Plataforma support/operator/owner | usar permissões administrativas próprias | herdar papel de tenant ou impersonar usuário |
| Provider/job | entregar evento ou executar transição autorizada | conceder acesso sem transição válida/auditoria |

## Estados principais

| Entidade | Estados | Transições aprovadas |
| --- | --- | --- |
| Organização | `active`, `suspended`, `closed` | plataforma: `active ↔ suspended`; owner: `active → closed`; billing não usa `suspended` |
| Plano de acesso | `Free`, `paid`, `paid-grace`, `free-over-quota` | onboarding → Free; pagamento → paid; falha → paid-grace; prazo → Free; excesso → free-over-quota |
| Produto | `active`, `archived`, `soft-deleted` | `active ↔ archived`; entrada pode reativar; `active|archived → soft-deleted` somente sob pré-condições; soft-deleted não retorna |
| Venda | `completed`, `cancelled` | `completed → cancelled` uma vez; nenhuma transição inversa |
| Meta | `active`, `completed`, `expired`, `archived` | active → completed/expired/archived; archived → active; completed/expired não retornam |
| Webhook | capturado, processado, falho/reprocessável, revisão | evento repetido não duplica efeito; falha pós-captura é reprocessada até sucesso ou revisão |

## Regras de negação

- Tenant suspenso, fechado ou sem entitlement não opera recursos.
- Free acima da quota de produto não cria vendas nem altera estoque até voltar ao limite.
- Produto com estoque diferente de zero não sofre soft delete.
- Produto soft-deletado não aparece em catálogo, venda, estoque ou listas normais.
- Repetição de comando manual de estoque com mesma chave não gera novo movimento.
- Evento de provider atrasado não regressa subscription/entitlement.

## Efeitos obrigatórios

| Gatilho | Efeito mínimo |
| --- | --- |
| Movimento de estoque | ledger unificado, saldo consistente, auditoria |
| Venda/cancelamento | snapshot, movimento de estoque, auditoria; cancelamento não chama provider financeiro |
| Mudança de billing | transição válida, auditoria, comunicação idempotente e estado visível |
| Soft delete | validação de saldo, motivo, auditoria, retirada operacional e lifecycle de imagem conforme retenção |
| Incidente | registro, contenção, avaliação e fluxo regulatório aplicável |
