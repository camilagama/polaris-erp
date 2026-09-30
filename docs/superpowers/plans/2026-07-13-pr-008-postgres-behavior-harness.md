---
execution_status: completed
---

# PR-008: harness PostgreSQL comportamental

> **Harness concluído em CI não produtiva:** migrations e testes comportamentais rodam em PostgreSQL efêmero; a CI validada em 2026-09-28 usou PostgreSQL 18.6. Isso não prova RLS ou configuração de Neon Production; consulte [P43](../../operations/production-readiness.md).

1. Criar um comando exclusivo que recuse `DATABASE_URL` e aceite somente
   `POSTGRES_BEHAVIOR_DATABASE_URL` para impedir uso acidental de banco
   compartilhado.
2. Aplicar todas as migrations em banco vazio com o migrator oficial do Drizzle.
3. Criar uma role de runtime sem `BYPASSRLS`, conceder somente os privilegios
   necessarios e executar fixtures transacionais com rollback.
4. Provar isolamento tenant, a constraint de idempotencia de vendas e o grant
   ativo de platform admin pela interface PostgreSQL real.
5. Executar o comando em PostgreSQL efemero no GitHub Actions e documentar a
   alternativa local descartavel.

**Validação:** a CI executou o harness em PostgreSQL efêmero 18.6 em 2026-09-28. A máquina local ainda pode não ter servidor PostgreSQL descartável; isso não bloqueia o gate de CI. P43 continua separando essa prova não produtiva da validação RLS/Production.
