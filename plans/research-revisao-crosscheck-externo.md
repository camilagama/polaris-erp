# Crosscheck externo do plano de fundação

**Data da consulta:** 2026-09-26  
**Escopo:** GitHub Pro pessoal/branch protection; Vercel Staging, Custom Environments e promoção; Neon PG18/PITR/snapshots; metas RPO e cópias de backup. Pesquisa documental oficial, sem consultar contas externas e sem editar o plano.

## Achados que afetam execução

### GitHub Pro e proteção de `main`

A decisão é tecnicamente viável: GitHub documenta protected branches em repositórios privados com GitHub Pro. Pro habilita elegibilidade, mas **não cria a regra**, não transfere ownership nem configura os checks. Depois da transferência, o owner precisa habilitar a regra de `main`; a lista de checks deve ser escolhida após CI verde e nomes de job estáveis. O requisito sem aprovação humana é permitido (API aceita `required_approving_review_count` zero); branch rules padrão bloqueiam force-push e deleção. A exceção de admins/bypass deve ser explicitamente avaliada porque regras clássicas não se aplicam a admins por padrão.

Transferência para conta pessoal deixa o proprietário anterior como colaborador e o novo titular como owner único; colaborador privado tem write, mas não controla webhooks e várias configurações owner-only. Isso confirma a política aprovada, com dependência operacional real do irmão manter Pro e administração da conta.

Fontes: [GitHub — protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches), [API branch protection](https://docs.github.com/en/rest/branches/branch-protection), [permissões em repo pessoal](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/permission-levels-for-a-personal-account-repository).

### Vercel: Staging e promoções são fluxos distintos

Custom Environment `staging` requer Vercel Pro ou Enterprise; Pro permite um ambiente customizado por projeto. A alternativa em Hobby continua sendo uma branch persistente associada a Preview, com domínio e variáveis específicas daquela branch. Para qualquer rota, a configuração de Production Branch, domínios e variáveis precisa estar decidida antes de conectar/implantar código: a documentação diz que o primeiro deployment de projeto novo é marcado Production e o associa ao domínio configurado.

**Correção operacional importante:** “promover Preview para Production” recompila o source com variáveis de Production; não promove o mesmo build sem rebuild. “Staged Production” (`--prod --skip-domain`, ou domínio auto-assignment desativado) pode promover o deployment sem rebuild, mas ele já é deployment de Production e usa serviços/variáveis de Production. Portanto, o fluxo aprovado de homologação persistente precisa usar Staging/Preview isolado. O staged Production serve como candidato de Production já validado/sem tráfego, não como ambiente para testes mutáveis/canários com credenciais ou banco de homologação. A promoção sem rebuild deve ser especificada apenas para deployment staged de Production; a promoção de Preview tem rebuild e troca para config production. Isso está parcialmente antecipado em P70, mas a distinção merece ficar explícita no runbook executável.

Fontes: [Vercel — environments](https://vercel.com/docs/deployments/environments), [Custom Environments e limites de plano](https://vercel.com/docs/deployments/environments#custom-environments), [promoting deployments](https://vercel.com/docs/deployments/promoting-a-deployment), [promoting Preview to Production (rebuild)](https://vercel.com/docs/deployments/promote-preview-to-production), [staged Production build](https://vercel.com/docs/cli/deploying-from-cli#deploying-a-staged-production-build), [primeiro deployment e domínio](https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting).

### Neon e PostgreSQL 18

A escolha de PG18 para projeto Neon novo e CI é atual e consistente: changelog Neon registra PG18 como default para projetos criados desde 2026-06-05; PostgreSQL oficial lista 18.6 como versão atual suportada e 19 Beta 4 como pré-release em 2026-09-24. Isso não prova a versão de qualquer projeto existente; verificar a versão remota real no provisioning antes de declarar paridade. Para mudança de major já criado, o material do projeto alerta que não há upgrade in-place Neon e que o caminho é novo projeto/migração; tratar como decisão separada.

No Neon, os valores usados no P44 são coerentes com a tabela atual de planos: Free até 6 h (e limite de histórico), Launch até 7 dias, Scale até 30 dias; snapshots agendados são pagos. Snapshot aumenta retenção além do PITR, mas permanece na autoridade/provedor Neon, não substitui a cópia externa. PITR é ferramenta de restauração dentro do histórico configurado e tem escopo/condições do Neon; não o vender como backup portátil.

Fontes: [Neon changelog — PG18 default](https://neon.com/blog/category/changelog), [Neon plans](https://neon.com/docs/introduction/plans), [Neon history window](https://neon.com/docs/introduction/history-window), [Neon snapshots](https://neon.com/docs/guides/backup-restore/snapshots), [PostgreSQL supported versions](https://www.postgresql.org/docs/18/), [PostgreSQL 19 Beta 4](https://www.postgresql.org/about/news/postgresql-19-beta-4-released-3386/).

### Backups, RPO e restauração

P44 já fixa objetivos de negócio para perda total do Neon: RPO máximo de 1 hora e RTO máximo de 8 horas. Ele está correto em não copiar janela/cadência do Hub sem sizing e exercício. No backup externo `pg_dump` para R2, o RPO efetivo é a idade do último dump completo, legível e verificado no instante do incidente, incluindo atraso ou falha do schedule. PITR limita a recuperação à janela realmente retida e ao estado acessível no Neon; snapshots têm RPO igual à idade do checkpoint escolhido. Medir cada caminho em drill e registrar resultados; backup job/checksum sem restore não comprova recuperabilidade.

A cópia DB não cobre bytes duráveis de imagens finais em R2. A restauração sincronizada de dados e objetos exige preservar/inventariar também os objetos finais ou provar que são reconstruíveis, como P44 já aponta. Se a ameaça inclui perda/compromisso da conta Cloudflare, outro bucket na mesma conta não é independência administrativa suficiente; deixar isso como escolha explícita do modelo de ameaça.

Fontes: [Neon plans/history](https://neon.com/docs/introduction/plans), [Neon snapshots](https://neon.com/docs/guides/backup-restore/snapshots), [PostgreSQL backup/restore](https://www.postgresql.org/docs/current/backup.html), [PostgreSQL `pg_dump`](https://www.postgresql.org/docs/current/app-pgdump.html), [Cloudflare R2 Bucket Lock](https://developers.cloudflare.com/r2/buckets/bucket-locks/).

## Ajustes concretos recomendados para execução

1. P3: após a transferência, owner configura branch protection; escolher checks estáveis com CI verde, manter approvals em zero, confirmar comportamento de admin/bypass.
2. P4/P70: registrar explicitamente que Preview→Production recompila com vars production; só deployment staged de Production pode ser promovido sem rebuild. Não usar staged Production como homologação.
3. Setup Vercel: decidir branch Production, domínio, protection e vars antes do primeiro deployment, que pode assumir Production/associar domínio automaticamente.
4. P54: manter PG18 como alvo no provisionamento; confirmar versão Neon por fonte read-only e registrar paridade, sem inferir a partir do padrão para novos projetos.
5. P44: aprovar RPO/RTO de negócio antes de configurar horários/retenção; medir frescor do último backup externo e recuperar também os objetos R2 necessários ao produto.

## Método e limites

Usei Context7 CLI (lookup `library` antes de `docs`) para documentação Vercel e Neon; consulta direta a fontes oficiais GitHub, Vercel, Neon, PostgreSQL e Cloudflare para detalhes atuais e validação cruzada. Nenhuma conta GitHub, Vercel ou Neon do Polaris foi inspecionada. Não rodei comandos de infraestrutura, alterei configurações ou modifiquei o plano.
