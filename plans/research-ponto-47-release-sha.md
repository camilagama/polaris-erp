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
- `docs/runbooks/deploy-vercel.md` descreve validar Preview e depois executar `vercel deploy --prod`. Esse comando não registra de forma durável o deployment ID/SHA já validado e não deve ser apresentado como promoção do mesmo deployment Preview.
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
2. Executar migration e deploy conforme o fluxo P45/P44 para aquele SHA, mantendo o schema compatível.
3. Criar, por projeto, o build de Production do SHA escolhido sem atribuir automaticamente o domínio (ou usar o fluxo Vercel equivalente configurado); testar o deployment candidato com smoke seguro e protegido.
4. Promover o deployment ID exato validado, sem reconstruir, e registrar resultado/SHA. Se Preview → Production disparar rebuild, tratar o deployment de Production como novo artefato e validar seu ID/SHA antes da promoção.
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

A pesquisa é documental e de repositório. Não foi criado projeto Vercel nem acessadas contas; deployment IDs/SHAs remotos, domínio, planos e variáveis reais seguem desconhecidos. Nenhum teste, deploy ou promoção foi executado.
