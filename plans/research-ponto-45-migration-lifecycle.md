# Pesquisa do ponto 45 — ciclo de vida de migrations

**Data:** 2026-09-25  
**Estado:** decisão aceita em 2026-09-25. Migrations remotas versionadas e deliberadas; sequência de produção e validação de alvo conforme P45/P23; PG18 como alvo CI/ambientes definido posteriormente em P54.  
**Pergunta:** manter migrations fora do build e definir um fluxo deliberado de criação, replay, homologação, backup, aplicação em produção e smoke.

## Conclusão provisória

A recomendação do relatório é adequada ao Polaris: migration deve ser um passo operacional separado do build/deploy da aplicação. Preservar arquivos SQL versionados e revisáveis com Drizzle Kit (`generate` → revisar/ajustar SQL → commit → `migrate`); não gerar/aplicar DDL a partir do schema contra banco real durante o build. O `db:push` existente deve ficar restrito a desenvolvimento/local descartável e nunca ser a operação de produção.

O fluxo final deve usar um job operacional selecionável por `workflow_dispatch`, com uma única operação e um destino explícito por execução, limitado ao SHA aprovado na `main` e a credenciais de produção no Environment `production`. Aplicar exclusão mútua por recurso de banco, sem cancelar uma migration em andamento. Isso segue as decisões já aprovadas em P23–P27: workflows operacionais separados da CI comum, secrets de produção escopados, ref aprovada e concorrência sem cancelamento. Não adicionar revisão humana obrigatória; o usuário definiu que será o único revisor e não quer esse gate.

## Evidência no Polaris

- `vercel.json` define `buildCommand: "bun run build"`; a aplicação web usa `next build`. O job de build valida a aplicação, não precisa ser o executor de mudanças persistentes no banco.
- `packages/db/package.json` já separa `db:generate`, `db:migrate` e `db:push`. `db:migrate` exige `DATABASE_URL_DIRECT` por `scripts/require-database-url-direct.ts` antes de executar `drizzle-kit migrate`; `db:push` usa a mesma proteção de URL direta, portanto sua restrição a bancos descartáveis deve ser política/documentação e, se necessário, uma proteção adicional antes da implementação.
- `packages/db/src/migrations` contém 42 arquivos SQL. Há histórico concreto a preservar e auditar; trocar para schema-sync no build ou regenerar migrations em CI eliminaria a clareza de qual SQL foi revisado e executado.
- `.github/workflows/ci.yml` tem job `postgres-behavior` com PostgreSQL 16 efêmero e `bun run test:postgres`, que aplica o conjunto de migrations desde zero e valida comportamento de PostgreSQL/RLS. Isso já constitui um replay de base limpa; não prova upgrade a partir de um schema/dados já existentes nem aplicação no Neon.
- `docs/architecture/database-environments.md` documenta `DATABASE_URL` de runtime separado de `DATABASE_URL_DIRECT`, roles distintas e branch Neon isolada para migrations/preview/E2E. `docs/runbooks/deploy-vercel.md` descreve execução deliberada de `db:migrate`, migration em branch isolada para alterações destrutivas/precheck e conferência de backup/restore antes de alterações sensíveis.
- Ainda não há workflow versionado de migration para produção e o usuário confirmou que o Polaris não foi publicado na Vercel. Não inferir configuração remota de Neon/Vercel a partir dos arquivos locais.

## Fluxo recomendado para formalizar

1. **Desenvolvimento:** alterar o schema Drizzle; gerar migration SQL; inspecionar nomes, locks, efeitos em dados, RLS e compatibilidade com a aplicação atual; corrigir manualmente o SQL quando necessário; versionar schema, migration e testes juntos. Não editar migration já aplicada; corrigir com nova migration.
2. **CI base limpa:** reaplicar o histórico completo das migrations em PostgreSQL descartável e manter os testes comportamentais existentes. Isso comprova instalação do zero, não upgrade em todos os estados possíveis.
3. **Ensaio de upgrade:** quando houver um ambiente persistente real ou risco de dados, aplicar o mesmo conjunto da PR em branch Neon descartável baseada no schema que receberá a mudança e executar checks/smokes sobre ela. Quando Preview/Staging estiver provisionado, incluí-lo no fluxo de homologação conforme P4/P5; não criar agora uma branch persistente nem alegar que o estágio já existe.
4. **Preparação de produção:** validar SHA/PR aprovado, destino/branch e versão pendente; para mudança de risco alto, confirmar backup recuperável e plano de recuperação conforme P44. Usar conexão direta e role de migration restrita, nunca `DATABASE_URL` de runtime.
5. **Operação separada:** job operacional com dispatch, Environment e secret de migration de produção; uma operação/destino por execução; concorrência serializada por projeto/branch, `cancel-in-progress: false`. A CI de PR/push e o build Vercel não recebem secrets de produção.
6. **Ordem do release:** preferir migration compatível antes da implantação da nova aplicação. Para alterações incompatíveis, renomes, backfills ou remoções, usar fases expand → migrate/backfill → contract em releases distintos, mantendo versões antiga e nova capazes de operar sobre o schema compartilhado até concluir a transição. Uma reversão de código não reverte dados nem torna automaticamente segura uma migration destrutiva; em geral preparar forward-fix/restore em vez de presumir rollback de DDL.
7. **Smoke e evidência:** após migration e deploy, validar readiness e smokes funcionais/RLS contra o ambiente alvo. Registrar SHA, migration IDs, ambiente, resultado/duração, operador e evidência sanitizada no registro P43. Só declarar concluído quando o schema aplicado e a aplicação estiverem compatíveis.

Se uma migration falhar, parar a promoção e inspecionar o estado real do banco e a tabela de histórico antes de qualquer nova execução. Não presumir que todos os statements são atômicos nem que repetir o comando é seguro: a documentação atual consultada não permitiu confirmar a semântica exata de falha/transaction boundary para a versão lockada do Drizzle Kit `0.31.10`. Antes de automatizar produção, verificar isso no código/documentação da versão lockada e demonstrar o comportamento em PostgreSQL descartável; especial atenção a `CREATE INDEX CONCURRENTLY`, que PostgreSQL proíbe dentro de bloco transacional.

## Fundamentação técnica e trade-offs

### Drizzle: gerar e aplicar são etapas diferentes

Os guias oficiais distinguem `generate` (cria SQL de migration e metadados; não aplica ao banco) de `migrate` (aplica migrations pendentes e registra histórico). `push` introspecta o banco, infere DDL e aplica sem gerar arquivos de migration. O FAQ oficial recomenda `push` apenas em desenvolvimento/bancos locais, enquanto a página de `push` também descreve uso em produção e blue/green. Essa diferença de ênfase reforça escolher, para este projeto que já tem 42 SQLs e precisa de trilha auditável, o mecanismo explicitamente versionado `generate` + `migrate`; não basear o fluxo de produção em `push`.

O repositório usa Drizzle Kit `^0.31.10`; a documentação indexada também apresentou material de v1/RC e nova estrutura de migrations. Não migrar o formato de arquivos por causa de docs de v1: verificar especificamente a versão estável/lockada quando implementar e planejar atualização de major separadamente.

### Vercel e build

Vercel descreve Build Command como o comando usado para produzir a saída de cada deployment; no caso de Next.js, o comando `build` é usado se disponível. A recomendação de excluir mutações persistentes desse passo é uma inferência arquitetural: builds pertencem à produção de artefatos e podem servir Preview e Production, enquanto migration precisa de um alvo único, credenciais privilegiadas, exclusão mútua, ordenação com deploy e recuperação. Um job operacional do GitHub permite esses limites sem acoplar uma escrita no banco ao build de cada app/projeto Vercel.

O build não deve rodar migrations via `prebuild`, `postinstall`, `bun run build` ou hooks equivalentes. As duas aplicações (`web` e `admin`) podem ser construídas/deployadas separadamente; usar o build de cada uma como migrator criaria possibilidade de execução duplicada e dificultaria identificar a versão/schema efetivamente aplicado.

### PostgreSQL: migration pode afetar tráfego e tem exceções

PostgreSQL documenta que várias formas de `ALTER TABLE` adquirem `ACCESS EXCLUSIVE` por padrão (com exceções por subcomando), que bloqueia inclusive leituras; `CREATE INDEX` sem `CONCURRENTLY` bloqueia escritas até concluir. `CREATE INDEX CONCURRENTLY` permite escritas concorrentes, mas leva mais tempo, pode deixar índice inválido após falha e não pode rodar dentro de bloco transacional. Portanto, “migration passou no banco efêmero” não garante impacto seguro com volume real. Cada SQL deve ser avaliado pelo efeito/lock e volume esperado; índices, constraints e backfills podem exigir etapa/procedimento próprio.

### Neon e branches

A documentação/tutorial oficial do Neon descreve criar branch para testar migrations, validar o schema e depois descartar a branch. Branching é adequado ao ensaio isolado de PR quando os recursos estiverem configurados. Um exemplo oficial de GitHub Actions também demonstra migração da branch de teste e execução posterior em produção no merge, mas é um padrão de referência, não configuração pronta: para Polaris, o job de produção ainda deve receber credenciais apenas por Environment/ref aprovados, não pela CI ordinária, com operação e recurso serializados, backup/recuperação P44 e evidência P43.

Neon branches são úteis para o schema real e testes de integração, porém branch a partir de produção pode reproduzir dados de produção. Antes de disponibilizar Preview/PR a terceiros, definir se dados serão mascarados/sintéticos e restringir acesso ao branch; não expor URL/dados em logs/comentários de PR. A branch de migration não substitui replay limpo no PostgreSQL local nem o gate de produção.

### Revisão da migration e compatibilidade

Revisar SQL gerado e escrever SQL específico é compatível com o fluxo do Drizzle. A aplicação pode continuar rodando durante uma migration e versões antigas/nova podem coexistir; por isso alterações incompatíveis normalmente precisam de mais de um release. O padrão expand/contract evita renomear/remover coluna em um só passo: adicionar estrutura compatível, publicar código que migra leituras/escritas, preencher dados em batches com progresso/restart seguro, observar, e só depois remover a forma antiga. Aplicar proporcionalmente ao risco P41, não como cerimônia para toda coluna pequena.

O PostgreSQL 16 usado no CI é o alvo de referência atual de comportamento. Se a versão efetiva do Neon for diferente no lançamento, alinhar testes e revisar recursos/DDL dependentes de versão.

## Comunidade: trade-off, não autoridade

Discussão recente no r/nextjs tem respostas divergentes: um participante diz executar `drizzle-kit push` no build para app pequeno/médio; outro recomenda CI/CD e ressalta que mudanças incompatíveis precisam considerar a ordem migration/deploy e expand-contract. Isso confirma que “migrate on build” é uma prática encontrada em projetos pequenos, não um consenso nem uma regra segura geral. O relato não verifica idempotência, credenciais, múltiplas apps/deployments, travas, rollback ou os dados do Polaris; não deve sobrepor o guidance de migrations versionadas do Drizzle e os controles já escolhidos para este ERP.

## Fontes

### Documentação oficial

- Drizzle ORM, [PostgreSQL existente: `push` versus `generate`/`migrate`](https://orm.drizzle.team/docs/get-started/postgresql-existing).
- Drizzle ORM, [FAQ: diferenças entre `generate` e `push` e cautela sobre `push`](https://orm.drizzle.team/docs/faq).
- Drizzle ORM, [`drizzle-kit push`: funcionamento e opções](https://orm.drizzle.team/docs/drizzle-kit-push).
- Neon, [workflow primer de database branching e preview](https://neon.com/docs/get-started-with-neon/workflow-primer).
- Neon, [exemplo de migrations PostgreSQL testadas em branch e GitHub Actions](https://neon.com/docs/guides/golang-db-migrations-postgres).
- Vercel, [Build Command e configuração do build](https://vercel.com/docs/builds/configure-a-build) (documentação atualizada em 2026-08-28).
- GitHub Actions, [Environments, proteção de deployments, secrets e concurrency](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments).
- PostgreSQL 16, [locks explícitos e lock levels](https://www.postgresql.org/docs/16/explicit-locking.html).
- PostgreSQL 16, [`CREATE INDEX CONCURRENTLY`, efeitos e restrição transacional](https://www.postgresql.org/docs/16/sql-createindex.html).
- PostgreSQL 16, [`ALTER TABLE`](https://www.postgresql.org/docs/16/sql-altertable.html).

### Comunidade

- r/nextjs, [“How do YOU handle migrations with Drizzle ORM & Vercel deployment?”](https://www.reddit.com/r/nextjs/comments/1kvw39x/how_do_you_handle_migrations_with_drizzle_orm/), consultado em 2026-09-25. Fonte anedótica, usada apenas para mapear o trade-off build-command versus job de release e complexidade do ordenamento.

## Limitações da pesquisa

- As tentativas do Context7 de abrir detalhes adicionais de transaction boundary do Drizzle Kit e PostgreSQL 16 falharam com `fetch failed`, inclusive em retry fora do sandbox. Não afirmar atomicidade/recuperação de falhas do migrator 0.31.10 sem verificar essa versão ao implementar.
- Vercel/Neon/GitHub não foram acessados como contas; a pesquisa cobre documentação, workflow versionado e recomendações, não estado remoto.
- Não houve mudança de código, workflow, plano principal ou banco; nenhum teste foi executado.
