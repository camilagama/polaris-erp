# Pesquisa do ponto 54 — major PostgreSQL de CI e Production

**Data:** 2026-09-26  
**Estado:** decisão aceita em 2026-09-26. PostgreSQL 18 escolhido como alvo novo; alinhar CI/E2E/Staging/Production e confirmar major real do Neon no provisionamento.  
**Pergunta:** escolher o major PostgreSQL do próximo ambiente Production e manter CI representativa.

## Conclusão provisória

P54 está correto no princípio: o PostgreSQL efêmero da CI que aplica migrations e verifica RLS/constraints deve usar o mesmo major previsto para Production. O repositório Polaris usa atualmente PostgreSQL 16 na CI, mas não prova a versão de qualquer branch Neon remota. A pesquisa oficial aponta PostgreSQL 18.6 como a major estável atual; a Neon informa que projetos novos usam PG18 por padrão. PostgreSQL 19 está em Beta 4 e fica fora da política de releases estáveis aprovada em P2.

Como o Polaris ainda está na fundação e não tem Production implantado segundo o estado de projeto informado, recomendo selecionar PG18 como alvo inicial de Neon/Production e atualizar o container do job CI para PostgreSQL 18. Se uma branch Neon persistente já existir, sua versão deve ser lida por verificação autorizada read-only antes de decidir migração; não presumir versão por snapshot de julho, branch name ou container local. A conferência final de Production deve ser registrada em P43.

## Auditoria no Polaris

- `.github/workflows/ci.yml:108-138` executa `postgres-behavior` em serviço `postgres:16` e roda `bun run test:postgres`; o job aplica migrations e exercita comportamento PostgreSQL/RLS. Os URLs PostgreSQL dummy nos builds não indicam versão do servidor.
- `packages/db/package.json` usa `drizzle-orm ^0.45.2` e `pg ^8.22.0`; `packages/db/drizzle.config.ts` declara o dialeto `postgresql`.
- As migrations visíveis incluem `pg_trgm`; os comportamentos verificados incluem RLS, grants, constraints e migrations. A auditoria não encontrou uma dependência que por si só force PG18 ou PG16; o motivo para escolher PG18 é P2 (release estável atual no início do produto), suportabilidade Neon e fidelidade entre CI e Production.
- `docs/operations/environments-and-deployment.md` e `docs/database/migrations.md` dizem que estado remoto/migration aplicada não se infere do checkout. `aidd_docs/production-closed-test.md` é snapshot histórico reconhecido em P50 e não é evidência de versão Neon atual.

## Comparação com Hub

O Hub configura PostgreSQL 18 no serviço da CI, mas isso não define a versão latest nem prova sua configuração Neon remota atual. Usá-lo somente como confirmação de que o harness de migrações e RLS já roda nessa major, não como autoridade para o Polaris.

## Fontes oficiais atuais

- PostgreSQL, [Versioning Policy](https://www.postgresql.org/support/versioning/): major 18 está suportada e atual em 2026-09-26; a política oficial dá suporte a cada major por cinco anos. A página lista 18.6 como minor atual, 17/16/15/14 ainda suportadas e 19 ainda fora da tabela estável.
- PostgreSQL, [Release Notes](https://www.postgresql.org/docs/release/): PostgreSQL 19 Beta 4 saiu em 2026-09-24; isso não é release estável.
- PostgreSQL, [Upgrading a PostgreSQL Cluster](https://www.postgresql.org/docs/current/upgrading.html): major upgrades podem alterar formato de armazenamento e requerem `pg_upgrade`, dump/restore ou outro método de migração; minor upgrades permanecem dentro do major.
- Neon, [Postgres 18 by default for new projects](https://neon.com/blog/category/changelog): changelog de 2026-06-05 informa PostgreSQL 18 por padrão em projetos Neon novos.
- Neon, [Introducing Neon Labs](https://neon.com/blog/introducing-neon-labs): project major é fixado na criação; mudança de major exige novo projeto e migração de dados, pois `pg_upgrade` in-place não está disponível. As ferramentas Labs de assessment/migration ainda são experimentais e não são recomendadas para workloads de produção.

## Decisão a propor

1. Para projeto Neon Production novo, escolher PG18 como target atual e configurar o job CI em `postgres:18`; manter CI, E2E, Staging e Production no mesmo major.
2. No provisioning, verificar versão real de cada branch relevante por fonte read-only aprovada e guardar versão/data no P43. Não declarar paridade até essa evidência existir.
3. Se houver branch persistente em PG16, não deixar CI18 e Production16 divergirem em silêncio: avaliar nova branch/projeto PG18 e replay/migração antes de gravar dados reais; testar compatibilidade e extensão `pg_trgm`. Se existir requisito que obrigue permanecer em PG16, documentar exceção e manter CI16 até resolver a diferença.
4. Revalidar o alvo se outro major estável GA for lançado antes do provisionamento; excluir PG19 Beta da base. Após o go-live, upgrade de major será change planned, com branch de ensaio, teste de migrations/queries/RLS/extensões, backup/restore P44, plano de corte/rollback/forward-fix e atualização da CI coordenada.

## Limitações

Nenhuma conta ou endpoint Neon foi consultado; versão remota do Polaris continua desconhecida. Nenhum CI image, código, migration ou banco foi alterado/executado. O registro é uma proposta de planejamento, não evidência de que Neon Production está em PG18.
