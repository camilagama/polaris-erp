# Pesquisa do ponto 47 — identidade de release por SHA

**Data:** 2026-09-25  
**Estado:** decisão aceita em 2026-09-25. Registrar SHA, migrations e deployment IDs; staged Production pode ser promovido sem rebuild, enquanto Preview→Production recompila.  
**Pergunta:** definir como ligar o SHA validado ao que está implantado em `web`, `admin` e banco, evitando liberar apenas o estado mais recente de uma branch.

## Conclusão provisória

O SHA Git completo deve ser a identidade primária do candidato de código, mas SHA sozinho não identifica o build Vercel nem prova a migration aplicada. O registro de release precisa complementar o SHA com um deployment ID/URL por projeto Vercel, o `githubCommitSha` observado em cada deployment, o conjunto ordenado e o estado das migrations, e as evidências de verificação/promoção.

A promoção Preview → Production da Vercel não é necessariamente promoção do mesmo artefato: a documentação diz que ela gera um deployment de produção com rebuild e troca de variáveis Preview pelas Production. A Vercel também oferece o caminho de staged Production build: construir já como Production, impedir atribuição automática de domínio, validar o deployment e promover esse deployment sem rebuild. Para o Polaris, recomendar o segundo se o objetivo for validar/promover o mesmo artefato. Se o fluxo escolhido reconstruir após validação de Preview, registrar o novo deployment de Production e verificar que seu SHA corresponde ao candidato; não declarar identidade do artefato anterior.

## Evidência no Polaris

- O usuário informou que o projeto ainda não foi publicado na Vercel; nenhum estado remoto foi consultado nem inferido.
- `.github/workflows` contém somente `ci.yml`, com build de web/admin, sem deploy ou promotion. `vercel.json` configura o build web e `apps/admin/vercel.json` configura o projeto admin em separado.
- Na pesquisa inicial, `docs/runbooks/deploy-vercel.md` descrevia validar Preview e depois executar `vercel deploy --prod`. A revisão documental P47 substitui esse fluxo pelo staged Production por SHA, proteção do deployment candidato e promoção explícita do ID validado.
- `docs/operations/environments-and-deployment.md` alerta que projetos/promoções remotas não são inferíveis do repositório.
- `packages/db/src/migrations/` e `_journal.json` versionam migrations, mas não há registro que una release SHA, deployments web/admin e migrations aplicadas.

## Comparação com Hub

O Hub documenta release no mesmo SHA: CI/Staging validam o candidato, `main` avança para ele, a automação espera o deployment de Production cujo `meta.githubCommitSha` corresponde ao candidato, aplica/audita o conjunto de migrations, roda smoke e promove o deployment identificado. O fluxo também registra deployment anterior para rollback, que não desfaz migrations. Esses controles são referência; não copiar a automação inteira nem tratar `docs/operations/release-state.md` (snapshot de 2026-09-03) como estado remoto atual.

## Registro de release recomendado

Para cada versão de release, guardar sem secrets ou URLs com tokens:

- SHA Git completo do candidato e link/id da execução de CI/checks que o validou;
- para cada projeto Vercel (`web`, `admin`): deployment ID, URL/target, estado, ambiente de build e SHA reportado (`meta.githubCommitSha`); cada deployment deve corresponder ao SHA do release;
- lista ordenada/identificadores e hashes dos arquivos de migration do candidato em relação à release anterior, mais o estado aplicado verificado no alvo;
- resultado de smoke funcional e gates/evidências sanitizadas, data/operador;
- deployment e SHA anteriores usados como referência de rollback, anotando a compatibilidade com o estado do banco.

Não usar nome de branch, `latest`, timestamp de build ou apelido `production` como substituto de SHA/deployment ID. Também não exigir semver para cada release neste momento; SHA é a referência imutável disponível.

## Estratégia de promoção e limites

1. Validar o commit SHA exato em CI e Staging/Preview não produtivo quando configurado.
2. Depois de Staging e dos gates P43/P44 aplicáveis, criar para cada projeto afetado o build staged de Production do SHA escolhido sem atribuir automaticamente o domínio; proteger a URL candidata e registrar seu ID/SHA.
3. Executar a migration de Production isoladamente, com alvo e SHA validados, mantendo o schema compatível com os candidatos preparados.
4. Após a migration, fazer smoke seguro nos candidatos protegidos e promover os deployment IDs exatos sem reconstruir; registrar resultado/SHA. Se Preview → Production disparar rebuild, tratar o deployment de Production como novo artefato e validar seu ID/SHA antes da promoção.
5. Web e admin são projetos/deployments independentes. Registrar ambos sob o mesmo release; não presumir promoção atômica entre projetos nem que o mesmo SHA prova compatibilidade de contrato. A ordem, coordenação e recuperação parcial pertencem ao P48.

Como ainda não há projeto Vercel ligado, seleção entre Git integration e CLI/prebuilt, proteção do deployment staged e desenho operacional só serão fechados após configurar hosting. A política de release deve ser definida agora, mas os detalhes remotos não são fatos confirmados.

## Fontes primárias atuais

- Vercel, [Promoting a deployment](https://vercel.com/docs/deployments/promoting-a-deployment): Preview promotion rebuilda e usa variáveis Production; staged Production deployment pode ser promovido sem rebuild.
- Vercel, [`vercel promote`](https://vercel.com/docs/cli/promote): promoção por deployment ID/URL.
- Vercel, [Deployment Checks](https://vercel.com/docs/deployment-checks): separar build Production da liberação ao tráfego usando checks.
- Vercel, [environments](https://vercel.com/docs/deployments/environments) e [system environment variables](https://vercel.com/docs/environment-variables/system-environment-variables): diferenças de ambiente e metadados de commit/deployment.
- GitHub Actions, [events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows): `workflow_dispatch` usa a ref selecionada, com SHA correspondente ao commit da execução.
- GitHub Actions, [deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments): Environment pode restringir refs e controlar acesso a secrets.

## Limitações

A pesquisa é documental e de repositório. Não foi criado projeto Vercel nem acessadas contas; deployment IDs/SHAs remotos, domínio, projetos e variáveis reais seguem desconhecidos. Nenhum teste, deploy ou promoção foi executado.

## Revalidação documental e contrato P47 — 2026-09-29

- O mapa de ambientes permanece em quatro: Local, CI, Staging e Production. No plano Hobby, Preview é a opção Vercel padrão para a função não produtiva de Staging; variáveis podem ser específicas da branch. Custom Environments, como um ambiente Vercel chamado `staging`, requerem Pro/Enterprise. Validar isolamento da branch e das integrações no provisionamento; não usar o staged Production como homologação, pois ele usa variáveis Production. [Vercel — environments](https://vercel.com/docs/deployments/environments), [variáveis por branch](https://vercel.com/docs/environment-variables/manage-across-environments).
- A pessoa que importa/conecta um repositório GitHub pessoal à Vercel precisa ser owner desse repo; logo, `camilagama` deve autorizar a conexão. Uma única conta Vercel pode conter os projetos Web e Admin. A Vercel cria um deployment Production cada vez que há merge para a branch Production configurada; isso contornaria a migration operacional seguida da promoção. O provisionamento deve manter Preview e provar que o auto-deploy Production por merge está bloqueado/gated antes de aceitar releases. A política Hobby também documenta que o autor do commit deve corresponder ao owner da conta Hobby; validar essa identidade com um deployment de teste. CLI de deploy é fallback documentado caso a integração não permita o gate manual aprovado. [Vercel for GitHub](https://vercel.com/docs/git/vercel-for-github), [deploys por merge e restrições Hobby](https://vercel.com/docs/git), [deploy de projeto por CLI](https://vercel.com/docs/cli/deploying-from-cli).
- `vercel --prod --skip-domain` cria deployment de Production sem atribuir os domínios; `vercel promote <deployment-id-or-url>` conclui a promoção. As URLs de deployments geradas são públicas por padrão e devem ser protegidas antes de expor um candidato de Production. Vercel Authentication está disponível em todos os planos; confirmar a configuração que protege a URL gerada sem manter o domínio público bloqueado no go-live. [Vercel CLI deploy](https://vercel.com/docs/cli/deploying-from-cli), [URLs geradas](https://vercel.com/docs/deployments/generated-urls), [proteção](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments).
- Ordem reconciliada com P45/P65: preparar todos os staged candidates do SHA afetado após Staging e gates P43/P44, executar a migration Production isolada, realizar smoke seguro depois da migration e promover os IDs exatos sequencialmente. O staged candidate não recebe domínio, mas é construído com variáveis Production; smokes não mutáveis só depois que migration e compatibilidade estiverem confirmadas.
- Registro futuro: `release-manifest.json` + resumo do run GitHub Actions com SHA/CI, deployment IDs e SHAs Web/Admin, migrations exatas/aplicadas, smokes, evidências sanitizadas e referência ao deployment anterior. A documentação GitHub consultada em 2026-09-29 informa retenção padrão de 90 dias e opção de 1–400 dias para repositórios privados, sujeita ao limite da conta/organização; o fluxo deve configurar retenção explícita e não tratar o artifact como arquivo permanente. P43 conserva snapshot dos gates e ponteiro para runs, não um diário ilimitado. Não há deployment workflow implementado nesta etapa. [GitHub — retenção de Actions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository).
- Revalidação local: `.vercel` ausente e nenhum workflow de deploy encontrado no checkout; a configuração remota continua não consultada. A revisão é documental e não executa Vercel/GitHub.
