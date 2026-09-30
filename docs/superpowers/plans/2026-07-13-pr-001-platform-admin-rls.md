---
execution_status: completed
---

# PR-001: contrato RLS para admin de plataforma

> **Implementação do PR concluída no repositório.** Isso não certifica RLS em Production; consulte [P43](../../operations/production-readiness.md) para evidência por ambiente.

1. Criar uma função SQL estável que valide o ID de admin do contexto contra `platform_admins` ativo e um grant não revogado/não expirado.
2. Substituir policies que aceitam contexto não vazio por policies que chamam essa função, preservando o contexto tenant quando não houver admin válido.
3. Distinguir permissões administrativas: leitura global nas tabelas necessárias; update somente em `organization` e `billing_subscriptions`; escrita de auditoria e notas limitada ao próprio admin.
4. Propagar `platformAdminId` pelas APIs de leitura do pacote platform para que os callers não possam esquecer a transação de contexto.
5. Adicionar testes unitários de propagação; a validação comportamental contra PostgreSQL permanece vinculada à PR-008.
