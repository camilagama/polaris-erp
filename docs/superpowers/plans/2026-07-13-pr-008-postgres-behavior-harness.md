# PR-008: harness PostgreSQL comportamental

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

Status: em implementacao. A execucao real depende de um PostgreSQL isolado;
o ambiente local atual nao possui Docker ou servidor descartavel.
