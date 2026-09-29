# Migrations de Production

Este é o procedimento canônico para aplicar migrations versionadas em Production. O deploy da Vercel não executa migrations. O estado dos provedores e a evidência de cada execução ficam no [registro P43](../operations/production-readiness.md); este runbook não comprova que qualquer pré-requisito externo já foi configurado ou validado.

## Estado na revisão de 2026-09-29

O job `production-migration` está preparado na PR #2, ainda não integrado à `main`. O alvo Neon de Production, as variáveis do Environment `Production` e o secret `DATABASE_URL_DIRECT` continuam sem configuração confirmada. Nenhuma migration de Production foi executada por esse job. Consulte P43 para o estado operacional vigente; não habilite o job apenas para testá-lo.

## Regras

- Gere migrations com Drizzle, revise o SQL, versione-o e valide o replay em CI. Não edite migrations já aplicadas; faça uma nova migration para corrigir ou avançar o schema.
- `db:push` não faz parte deste procedimento; siga a regra de [migrations do banco](../database/migrations.md) e o ponto P46.
- A CI e o build/deploy Vercel não recebem credenciais de Production nem aplicam migrations.
- O job de Production é acionado manualmente em `Operations`, a partir de `main`, com uma única operação e um SHA completo aprovado. Ele não faz deploy da aplicação.
- `DATABASE_URL_DIRECT` usa endpoint direto e role de migration distinta da role runtime. Nunca configure essa URL no runtime Web/Admin.
- A validação confere o SHA, ref, host, banco, conexão direta, TLS, role e IDs de projeto/branch informados. Ela **não consulta a API do Neon**. Antes de cada dispatch, o operador deve confirmar a associação host/projeto/branch no Neon Console e reconciliá-la com P43; a confirmação digitada no workflow registra essa checagem, não a substitui.
- O job não cancela uma migration ativa e serializa pelo projeto/branch configurados. O GitHub mantém no máximo uma execução pendente por grupo por padrão; um novo dispatch pode substituir outra pendente. Só inicie quando não houver execução ativa ou pendente para o mesmo alvo.
- Não exponha connection strings em argumentos, logs, artefatos ou comentários. A validação imprime apenas evidência sanitizada.

## Pré-requisitos antes de liberar o job

Confirme todos os itens abaixo; registre configuração e evidência no P43.

1. A branch `main` está protegida e o SHA candidato passou nos checks requeridos. O SHA selecionado para homologação e release deve ser o mesmo SHA usado pela operação de migration.
2. As migrations passaram pelo replay completo e pelos testes de PostgreSQL 18 na CI. Revise locks, duração, backfills, índices, constraints, funções, policies RLS e compatibilidade com a versão do app que está no ar.
3. Quando Staging e branches Neon não produtivas estiverem provisionados conforme P4/P5, valide a migration no fluxo não produtivo antes de Production.
4. P44 está realmente validado: cópia/restauração conforme o escopo aprovado, RPO/RTO medidos dentro dos limites, imagens finais cobertas e restore drill concluído em alvo descartável. O sucesso de `ops:restore-drill:checklist` sozinho não satisfaz este gate.
5. A falha e a retomada de migrations da versão de Drizzle Kit fixada pelo lockfile foram caracterizadas em PostgreSQL descartável 18. O comportamento de falha/transação ainda não está comprovado para habilitar Production; não presuma que uma migration parcialmente executada pode ser repetida sem inspeção.
6. O projeto, a branch, o host, o nome do banco e as roles foram confirmados no Neon Console e registrados no P43. O host da URL, isoladamente, não prova a branch.
7. O Environment `Production` contém somente as variáveis necessárias ao job e o secret `DATABASE_URL_DIRECT`; o secret identifica o mesmo host/banco/role aprovados. A configuração do Environment e seu bypass administrativo devem ser reavaliados antes de adicionar credenciais.
8. O SQL é compatível com o fluxo de deploy. Para mudança incompatível, use `expand` → transição/backfill seguro → `contract`; não dependa de rollback do app para desfazer alterações de dados/schema.

Enquanto qualquer item estiver pendente, mantenha o job sem as credenciais de Production e não execute a operação.

## Preparar e validar a mudança

1. Atualize `packages/db/src/schema.ts` e gere a migration:

   ```bash
   bun run db:generate
   ```

2. Leia todo o SQL gerado e ajuste-o deliberadamente. Identifique efeitos de DDL/DML, locks, tamanho das tabelas afetadas, prechecks e compatibilidade para versões antiga e nova do app.
3. Inclua schema, migration e snapshots/journal no mesmo commit. Não reescreva um arquivo que já foi aplicado em algum ambiente.
4. Aguarde o replay e os testes de PostgreSQL da CI. Para mudanças compatíveis, valide primeiro em branch Neon descartável por PR quando provisionada, depois em Staging. Registre exceções e evidências em P43.
5. Antes da operação de Production, confirme P44, o alvo do P43, o SHA homologado e o plano de smoke/recuperação. Para produção, estes são gates operacionais, não apenas uma lista de testes locais.

## Aplicar em Production

1. Confirme no Neon Console que o projeto, a branch Production, o host e o banco continuam correspondendo ao P43. Confira também a role de migration e a role runtime, que devem ser diferentes.
2. Confirme que o SHA aprovado é o `HEAD` atual de `main`. O guard exige `release_sha` igual ao `GITHUB_SHA` da execução; se `main` avançar e o candidato deixar de ser o SHA corrente, re-homologue e aprove um novo candidato antes de continuar.
3. Confirme que não há execução ativa ou pendente de migration para o mesmo alvo.
4. Em GitHub Actions, inicie `Operations` por `workflow_dispatch`, selecione `production-migration`, informe o SHA completo e digite exatamente `<project-id>/<branch-id>` usando os valores atuais confirmados no Neon e registrados no P43.
5. Confira o job `production-migration`: ele deve rodar somente em `main`, no Environment `Production`, validar o alvo sem abrir conexão e então executar `bun run db:migrate` com a URL direta. Uma falha no guard encerra o job antes da migration. Não tente contornar o guard com `db:push` ou execução manual de Production.
6. Se a migration falhar, pare. Não reexecute às cegas. Inspecione, por conexão read-only apropriada, o journal Drizzle e os efeitos do SQL no alvo; decida entre correção para frente ou recuperação P44. Correções de migration são novos arquivos versionados e passam novamente por CI e homologação.
7. Depois do sucesso, registre no P43 o SHA completo, run ID do GitHub, projeto/branch/banco sem credenciais, horário UTC, migrations aplicadas, resultado, smoke e evidência sanitizada.
8. Siga o fluxo de release P47/P48: prepare e valide os staged deployments dos apps afetados a partir do mesmo SHA, promova os IDs exatos sem rebuild quando suportado e execute smokes por app. Registre e interrompa diante de estado parcial; o deploy continua sendo uma operação separada.

## Falha e recuperação

Uma migration não ganha rollback automático por estar em um job separado. Preserve os logs sanitizados e o run ID; não copie logs brutos que possam incluir configuração. Verifique se o journal registra a migration e se seus efeitos foram aplicados integralmente. Não edite nem remova uma migration já registrada como aplicada. Se o schema ficou parcialmente alterado, use correção versionada compatível ou o plano P44; reverta o app somente se a combinação app/schema for compatível.

O estado atual da operação e a decisão de recuperação devem ser registrados no P43. A recuperação de banco nunca deve restaurar dados reais diretamente sobre Production sem o procedimento aprovado de incidente; primeiro valide em alvo isolado.
