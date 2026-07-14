# Identidade, sessão e tenancy

## Visão, objetivo, atores e escopo

Google é a única identidade pública. Visitante inicia login; owner opera seu único tenant; plataforma não herda papel de tenant. Cobre AUTH-001, ACCOUNT-001, SESSION-001, ORG-001/002 e RBAC-001.

## Regras, transições e proibições

- Conta DEVE usar `(google, sub)`; e-mail não PODE vincular conta implicitamente.
- Sessão DEVE expirar após 7 dias inativos ou 30 dias absolutos. Logout/revogação/suspensão/encerramento DEVEM negar acesso.
- Organização DEVE possuir um owner e um usuário DEVE pertencer a uma organização; `active ↔ suspended`, `active → closed`; billing NÃO usa suspensão.
- Convite, troca de tenant, impersonation e restauração de soft delete NÃO PODEM existir no lançamento.

## Fluxos, erros, concorrência e idempotência

Login validado cria sessão; colisão segue recuperação auditada. Onboarding serializado cria tenant Free. Suspenso recebe estado dedicado, não onboarding. Recuperação e revogação são idempotentes por usuário/sessão; criação concorrente usa lock e constraint. Erros de sessão, estado e tenant não expõem token.

## Banco, segurança, auditoria e aderência

Exige constraint user→org/owner, estado de org e revogação de sessão; RLS e contexto transaction-local protegem tenant. Auditoria: login, falha relevante, logout, revogação e linking. Implementação é pendente/contraditória para linking, TTL, one-owner e suspensão; testes obrigatórios: colisão, expiração, revogação, onboarding concorrente e RLS promovido. Referências: DEC-BR-001,002,030,043,053,059; [aderência](../adherence-by-rule.md).
