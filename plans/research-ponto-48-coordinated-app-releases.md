# Pesquisa do ponto 48 — deploys separados e release coordenada

**Data:** 2026-09-25  
**Estado:** decisão aceita em 2026-09-25. Web/Admin permanecem projetos separados; candidatos afetados ficam prontos antes de promoções sequenciais e não atômicas.  
**Pergunta:** manter Web e Admin como projetos/deployments independentes, coordenando versões quando há dependências compartilhadas.

## Conclusão provisória

Manter os dois projetos Vercel separados. Coordenar no nível de release conforme o impacto, em vez de exigir redeploy simultâneo dos dois apps para toda alteração: mudança realmente isolada pode promover somente o app afetado e registrar o deployment ativo do outro como inalterado; mudança em migration/schema, auth, pacote compartilhado, configuração global ou contrato consumido por ambos deve construir, validar e promover todos os apps afetados a partir do mesmo SHA antes de declarar a release concluída.

Manter a CI atual rodando checks e builds dos dois apps. Não adicionar otimização `--affected` ou filtro próprio por caminho nesta etapa; qualquer skip de deployment Vercel deve ser habilitado só depois de verificar a detecção de dependências compartilhadas com os Root Directories reais.

As promoções dos projetos são operações distintas e não atômicas. Preparar/verificar todos os candidatos antes de promover o primeiro, executar as promoções em sequência com smoke e registrar explicitamente um estado parcial se uma delas falhar. A compatibilidade temporal deve seguir as migrations expand/contract de P45.

## Evidência no Polaris

- O repositório tem duas aplicações com builds/configurações Vercel separadas: `vercel.json` na raiz para Web e `apps/admin/vercel.json` para Admin. Isso é a intenção versionada; não confirma dois projetos configurados na conta, pois o usuário informou que Polaris ainda não foi publicado.
- Web/Admin compartilham `@polaris/auth`, `@polaris/db`, `@polaris/date`, `@polaris/e2e-support` e `@polaris/ui`. Admin também depende de `@polaris/platform`; `packages/platform` depende de `@polaris/billing` e `@polaris/events`.
- CI não filtra por paths: o job verifica e constrói Web e Admin. Só há `.github/workflows/ci.yml`, sem workflow de release Vercel coordenada.
- `docs/runbooks/deploy-vercel.md` constrói e lista smokes para os dois apps, porém dá apenas comandos `vercel deploy` e `vercel deploy --prod` sem selecionar/provar cada projeto. O runbook não é suficiente como procedimento de duas aplicações.
- A documentação do Polaris exige confirmar Root Directory do Admin e a inclusão de fontes fora do root. Isso afeta o acesso do projeto Admin às workspaces compartilhadas e deve ser registrado em P43 quando Vercel for configurada.

## Comparação com Hub

O Hub tem um único app Next.js e um único deployment Vercel. Seu processo de SHA candidato, Staging, checks e promoção do deployment exato sem rebuild é uma boa referência para integridade e trilha da release, mas não define a coordenação de duas promoções independentes.

## Fontes oficiais atuais

A Vercel documenta um projeto por diretório/app no monorepo, com Root Directory próprio. Por padrão, cada commit conectado pode criar deployment para cada projeto. A plataforma pode pular projetos não afetados com base em código-fonte e dependências internas, desde que esteja conectado via GitHub, o workspace e `package.json` declarem dependências e Root Directories estejam configurados corretamente. Mudanças em dependências internas são consideradas para definir quais apps foram afetados. Fonte: [Vercel Monorepos](https://vercel.com/docs/monorepos) e [Deploying Turborepo to Vercel](https://vercel.com/docs/monorepos/turborepo).

Os Deployment Checks da Vercel podem segurar uma build Production antes de associar os domínios; isso separa criação de build da liberação ao tráfego. A documentação recomenda garantir que os checks correspondam ao commit/deployment que será liberado: [Deployment Checks](https://vercel.com/docs/deployment-checks).

GitHub Actions registra deployments por environment e pode restringir refs, limitar secrets e serializar operações por concurrency group: [Deploying with GitHub Actions](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments). A documentação registra deploys e commits associados, mas não fornece atomicidade entre dois projetos Vercel.

## Trade-offs para P48

- **Sempre promover ambos do mesmo SHA:** simples de explicar e reduz skew; gera builds/promotions mesmo quando só um app foi afetado e ainda não torna a troca entre dois domínios atômica.
- **Deploy por app com release manifest:** evita alterações no app não afetado; exige uma matriz clara de impacto e declarar qual deployment anterior continua ativo.
- **Releases compartilhadas por impacto:** mantém a simplicidade enquanto protege acoplamentos reais. No Polaris, mudanças em `@polaris/db`, migrations/RLS, `@polaris/auth`, dependências efetivamente consumidas por ambos ou configuração global precisam de checks coordenados; código local à Web/Admin pode seguir individualmente depois de confirmar a fronteira.

## Limitações

As configurações remotas de Vercel, Root Directories, deployment skipping, domínios e envs não foram acessadas nem inferidas. O estado de deploy real segue desconhecido. Nenhum workflow, deploy ou teste foi executado.
