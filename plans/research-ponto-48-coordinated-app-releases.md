# Pesquisa do ponto 48 — deploys separados e release coordenada

**Data:** pesquisa inicial 2026-09-25; revalidação 2026-09-29
**Estado:** decisão aceita em 2026-09-25. Web/Admin permanecem projetos separados; candidatos afetados ficam prontos antes de promoções sequenciais e não atômicas. A matriz de impacto e o contrato do manifest foram adicionados ao runbook nesta revalidação; aguardam revisão do usuário.
**Pergunta:** manter Web e Admin como projetos/deployments independentes, coordenando versões quando há dependências compartilhadas.

## Conclusão provisória

Manter os dois projetos Vercel separados. Coordenar no nível de release conforme o impacto, em vez de exigir redeploy simultâneo dos dois apps para toda alteração: mudança realmente isolada pode promover somente o app afetado e registrar o deployment ativo do outro como inalterado; mudança em migration/schema, auth, pacote compartilhado, configuração global ou contrato consumido por ambos deve construir, validar e promover todos os apps afetados a partir do mesmo SHA antes de declarar a release concluída.

Manter a CI atual rodando checks e builds dos dois apps. Não adicionar otimização `--affected` ou filtro próprio por caminho nesta etapa; qualquer skip de deployment Vercel deve ser habilitado só depois de verificar a detecção de dependências compartilhadas com os Root Directories reais.

As promoções dos projetos são operações distintas e não atômicas. Preparar/verificar todos os candidatos antes de promover o primeiro, executar as promoções em sequência com smoke e registrar explicitamente um estado parcial se uma delas falhar. A compatibilidade temporal deve seguir as migrations expand/contract de P45.

## Evidência no Polaris

- O repositório tem duas aplicações com builds/configurações Vercel separadas: `vercel.json` na raiz para Web e `apps/admin/vercel.json` para Admin. O checkout não contém vínculo `.vercel` nem workflow de release; os projetos/settings remotos não foram consultados.
- Os manifests declaram Web → `@polaris/billing`, `db`, `date`, `events`, `emails`, `e2e-support`, `auth` e `ui`; Admin → `auth`, `date`, `db`, `e2e-support`, `platform`, `platform-auth` e `ui`. `@polaris/platform` depende de `billing`, `db`, `date` e `events`, então billing/events também afetam Admin transitivamente. Resultado: `emails` é Web-only; `platform`/`platform-auth` são Admin-only; auth/db/date/e2e-support/ui/billing/events afetam ambos.
- `apps/web/tsconfig.json` e `apps/admin/tsconfig.json` estendem `packages/config/tsconfig/next.json` por caminho relativo, mas nenhum declara `@polaris/config` como dependência. Classificar config/tsconfig como impacto em ambos; essa relação é risco para detecção automática de projeto afetado.
- `.github/workflows/ci.yml` dispara para push/PR em `main`, sem `paths`, e roda builds separados Web/Admin. Não há filtro `--affected` na CI; preservá-la completa conforme decisão P48.
- O runbook P47 já cobre deployment staged, promoção sequencial e smokes, mas não tinha matriz explícita nem exigia registrar o deployment/SHA do app que não muda. A revalidação adiciona ambos ao contrato documental.
- A documentação de Admin exige confirmar Root Directory `apps/admin` e inclusão de fontes fora do root. Verificar essas opções, dependências internas e a branch de Production no provisionamento Vercel e registrar evidência no P43.

## Comparação com Hub

O Hub tem um único app Next.js e um único deployment Vercel. Seu processo de SHA candidato, Staging, checks e promoção do deployment exato sem rebuild é uma boa referência para integridade e trilha da release, mas não define a coordenação de duas promoções independentes.

## Fontes oficiais atuais

A Vercel documenta skip de projetos não afetados em monorepos quando o repositório está conectado ao GitHub, o workspace padrão é reconhecido, os pacotes têm nomes únicos e as dependências internas estão declaradas. Também documenta um Ignored Build Step opcional com `turbo query affected`. Esses mecanismos podem economizar builds, mas dependem de grafo e Root Directories corretos; P48 os mantém desligados até validar a configuração real. `@polaris/config` ainda é uma relação não declarada nos manifests do Polaris. Fontes: [Vercel Monorepos](https://vercel.com/docs/monorepos) e [Turborepo na Vercel](https://vercel.com/docs/monorepos/turborepo).

Os Deployment Checks da Vercel podem segurar uma build Production antes de associar os domínios; isso separa criação de build da liberação ao tráfego. A documentação recomenda garantir que os checks correspondam ao commit/deployment que será liberado: [Deployment Checks](https://vercel.com/docs/deployment-checks).

GitHub Actions registra deployments por environment e pode restringir refs, limitar secrets e serializar operações por concurrency group: [Deploying with GitHub Actions](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments). A documentação registra deploys e commits associados, mas não fornece atomicidade entre dois projetos Vercel.

## Trade-offs para P48

- **Sempre promover ambos do mesmo SHA:** simples de explicar e reduz skew; gera builds/promotions mesmo quando só um app foi afetado e ainda não torna a troca entre dois domínios atômica.
- **Deploy por app com release manifest:** evita alterações no app não afetado; exige uma matriz clara de impacto e declarar qual deployment anterior continua ativo.
- **Releases compartilhadas por impacto:** mantém a simplicidade enquanto protege acoplamentos reais. No Polaris, mudanças em `@polaris/db`, migrations/RLS, `@polaris/auth`, dependências efetivamente consumidas por ambos ou configuração global precisam de checks coordenados; código local à Web/Admin pode seguir individualmente depois de confirmar a fronteira.

## Limitações

As configurações remotas de Vercel, Root Directories, deployment skipping, domínios e envs não foram acessadas nem inferidas. O estado de deploy real segue desconhecido. Nenhum workflow ou deployment foi executado; a revalidação local e a atualização documental não testam a plataforma.
