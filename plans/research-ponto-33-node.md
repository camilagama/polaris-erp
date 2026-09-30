# Pesquisa do ponto 33 — Padronizar Node.js e Bun

**Data da revisão:** 2026-09-25  
**Estado:** decisão aprovada em 2026-09-25.  
**Ponto do relatório:** Bun está fixado em 1.3.11, mas `prepare` chama `node`; não há major Node declarado. O relatório sugere trocar o hook para Bun e documentar o Node esperado na Vercel.

## Resultado preliminar

Recomendo combinar as duas responsabilidades. Bun continua sendo o package manager e pode executar o hook de instalação; Node continua sendo runtime relevante para Next.js, CLIs com shebang `node` e hosting. Fixar somente Bun ou converter somente o hook não padroniza Node entre local, CI e produção.

Em 2026-09-25, Node 24.x é LTS; Node 26 está no canal Current. Next.js 16 requer Node 20.9+, e Vercel suporta 24.x como default, 22.x e 20.x. Node 24.x é a linha LTS atual alinhada aos dois provedores e à preferência do projeto por releases estáveis.

## Estado observado no Polaris

- Root [`package.json`](../package.json) fixa `packageManager: bun@1.3.11`, mas não declara `engines.node`. Não há `.node-version`, `.nvmrc` ou `.tool-versions`.
- O script `prepare` executa `node scripts/install-git-hooks.mjs`. O arquivo importa `node:child_process` e `node:fs`, faz skip em CI/Vercel e chama `bun x lefthook install`; pode ser executado diretamente por Bun mantendo `.mjs`.
- `.github/workflows/ci.yml` fixa Bun 1.3.11 em seus jobs, mas não fixa Node. Bun respeita shebangs de executáveis JS e normalmente executa binários `node` com o Node disponível no PATH; deixar `ubuntu-latest` escolher esse Node mantém uma variação implícita.
- `vercel.json` define comandos de install/build via Bun, mas não fixa a versão Node. O projeto ainda não está publicado nem vinculado a uma conta Vercel; os settings remotos não foram consultados.
- A auditoria do ambiente de trabalho observou Node 22.20.0 e Bun 1.4.0 enquanto package manager e CI declaram Bun 1.3.11. Reconciliar essa divergência de Bun com a atualização de stack aprovada no P2; não trocar o pin de Bun dentro da decisão Node sem revalidar a stable release adotada.
- Root `package.json` declara `@types/node` `^26.1.0`; se o runtime alvo for Node24, alinhar o major das definições de tipos para evitar APIs de Node26 no typecheck contra runtime Node24.

## Comparação com o Hub

- O Hub declara `engines.node: 24.x` e `packageManager: bun@1.3.11`; o README informa Node24 em produção. O hook `prepare` chama Bun.
- A CI do Hub fixa Bun, mas não usa `actions/setup-node`; portanto, é precedente para separar Bun e runtime Node, não para garantir Node24 no runner.
- Para Polaris, dá para completar esse padrão com `.node-version` e `actions/setup-node` lendo o arquivo. A action deverá ser pinada por SHA verificado conforme P26.

## Documentação atual e trade-offs

- Node.js classifica Node24 como LTS e Node26 como Current; sua orientação de release recomenda Active/Maintenance LTS em produção. [Node.js Releases](https://nodejs.org/en/about/previous-releases)
- Vercel aceita Node24.x, 22.x e 20.x; novos projetos usam 24.x por padrão, e `engines.node` no `package.json` pode sobrescrever a versão selecionada nas settings. [Vercel — versões Node.js](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- Next.js 16 requer Node20.9 ou superior, então Node24 atende ao framework. [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- Bun roda arquivos `.mjs` e o `bun install` executa o `prepare` do projeto; portanto, o hook pode usar `bun scripts/install-git-hooks.mjs`. Bun, porém, respeita shebang `node` em executáveis por padrão, então a troca do hook não elimina a necessidade de uma versão Node consistente para CLIs/frameworks. [Bun install lifecycle](https://bun.sh/docs/pm/cli/install), [Bun runtime](https://bun.sh/docs/runtime)
- `actions/setup-node` aceita `.node-version` por `node-version-file`, permitindo que local/CI compartilhem o major definido no repositório. [actions/setup-node](https://github.com/actions/setup-node)
- `engines.node` documenta compatibilidade e é lido pela Vercel, mas é consultivo para muitos package managers; por isso não substitui o arquivo Node version nem a configuração de CI.
- **Inferência:** alinhar `@types/node` ao major do runtime reduz a chance de TypeScript aceitar chamadas que Node24 não oferece, mesmo que as definições mais recentes sejam do Node26. As versões publicadas seguem os majors das APIs Node. [@types/node versions](https://www.npmjs.com/package/@types/node?activeTab=versions)

## Decisão aprovada em 2026-09-25

1. Usar Node 24.x LTS como versão Node suportada, em vez de Node26 Current.
2. Definir um único arquivo `.node-version` com major 24; ler esse arquivo em `actions/setup-node` nos jobs CI que executam binários Node; declarar `engines.node: "24.x"` no `package.json` relevante para runtime/Vercel. Ao criar os projetos Vercel, confirmar Node24.x nas settings e no manifest do Root Directory efetivo.
3. Trocar `prepare` para `bun scripts/install-git-hooks.mjs`, preservando o arquivo `.mjs`; não convertê-lo para TypeScript apenas para chamar Bun.
4. Alinhar `@types/node` a 24.x, atualizando dentro do major compatível. Reconciliar o pin de Bun local/CI/manifest separadamente com P2.
5. Documentar em README/AGENTS a separação: Bun instala/roda a ferramenta de projeto; Node24 é runtime de Next/CLIs e do deploy.

**Q1 aprovada:** Node 24.x LTS é o runtime Node suportado; `engines.node` e `.node-version` servem Vercel, desenvolvimento e CI; `actions/setup-node` deve usar o arquivo compartilhado nos jobs necessários; `prepare` será invocado por Bun; `@types/node` será alinhado ao major 24. Bun permanece package manager/runtime do projeto, com a divergência local/CI/manifest tratada junto ao P2.

## Fontes oficiais consultadas

- [Node.js Releases](https://nodejs.org/en/about/previous-releases)
- [Vercel Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- [Next.js 16 requirements](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Bun install lifecycle](https://bun.sh/docs/pm/cli/install)
- [Bun runtime](https://bun.sh/docs/runtime)
- [GitHub actions/setup-node](https://github.com/actions/setup-node)

## Revalidação em 2026-09-28

Esta seção atualiza fatos voláteis e o estado do checkout nesta data. A decisão aprovada em 2026-09-25 de suportar Node 24.x permanece válida; os itens de recomendação abaixo refinam como aplicá-la neste monorepo.

### Fatos revalidados

- **Node.js:** a página oficial de releases lista Node 24.21.0 como LTS e Node 26.10.0 como Current em 2026-09-28. A linha 24 recebe suporte até abril de 2028; Node 26 ainda não é LTS nessa data. Node 24 segue sendo a linha estável escolhida na decisão aprovada. [Node.js Releases](https://nodejs.org/en/about/previous-releases), [Node 22 to 24 migration guide](https://nodejs.org/en/blog/migrations/v22-to-v24)
- **Vercel:** a documentação lista 24.x como default, além de 22.x e 20.x. Um `engines.node` válido no `package.json` da raiz do projeto Vercel pode sobrescrever a seleção nas configurações; por exemplo, `24.x` seleciona a linha 24. [Vercel — versões Node.js](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- **GitHub Actions:** `actions/setup-node` aceita `.node-version` em `node-version-file`. O caminho relativo é resolvido a partir de `GITHUB_WORKSPACE`, logo cada job que precisa fixar Node deve executar a action após checkout. A release estável corrente é v7.0.0; o SHA `820762786026740c76f36085b0efc47a31fe5020` foi resolvido pelo tag e a API pública reportou `verified: true`, `reason: valid`. [actions/setup-node — uso avançado](https://github.com/actions/setup-node/blob/main/docs/advanced-usage.md)
- **Bun 1.4.2 e shebangs:** o runtime Bun respeita `#!/usr/bin/env node` por padrão e inicia um processo Node; `--bun` troca esse comportamento. `node_modules/turbo/bin/turbo` também tem shebang `node`, e vários comandos CI executam Turbo, Next, Vitest ou Playwright. Portanto, pin do Bun não fixa por si só a versão do processo Node que executa esses CLIs. [Bun Runtime — shebang behavior](https://bun.sh/docs/runtime)
- **Estado observado do repositório:** o root `package.json` declara `packageManager: bun@1.4.2`; `.github/workflows/ci.yml` fixa Bun 1.4.2 em cada um dos quatro jobs independentes (`verify`, `e2e`, `postgres-behavior`, `admin-e2e`). Nenhum usa `actions/setup-node` atualmente. O script `prepare` ainda invoca `node scripts/install-git-hooks.mjs`; o arquivo também importa `node:` e encerra cedo em CI/Vercel.
- O `apps/admin/package.json` não declara `engines.node`. `vercel.json` da raiz e `apps/admin/vercel.json` configuram comandos de build e diretórios de saída a partir de contextos diferentes (raiz do monorepo e `apps/admin`). **Inferência baseada nesses arquivos:** Web usa o manifest da raiz; Admin pode usar `apps/admin` como Root Directory e manifest efetivo. Para evitar depender de busca ascendente implícita do Vercel, declarar a mesma faixa `24.x` nos dois manifests.
- **Ambiente local observado:** a auditoria inicial retornou `node v22.20.0` e `bun 1.4.2`. Depois, o usuário atualizou Node manualmente; a verificação atual retornou `v24.21.0`, arquitetura `x64`. Não existe `.node-version`, `.nvmrc` ou `.tool-versions` na raiz, nem `nvm`, `fnm`, `volta` ou `mise` no PATH. A atualização manual satisfaz a versão aprovada sem adicionar version manager; futuras trocas de major também precisarão de atualização manual enquanto esse for o setup local.
- `scripts/run-next-with-local-env.ts` chama `spawn("node", ...)` para executar Next no Admin. As quatro jobs independentes de CI executam CLIs com shebang Node (`verify`, `e2e`, `postgres-behavior`, `admin-e2e`). Em `operations.yml`, `rls-smoke`, `deployment-smoke`, `admin-deployment-smoke` e `production-preflight` executam scripts Turbo; `turbo` usa o wrapper Node. Os jobs de checklist/validação que executam somente shell ou scripts Bun não precisam de `setup-node` por esse motivo. Cada job é runner separado, então cada um que precisa de Node deve instalar sua própria versão.

### Refinamento recomendado (inferência)

1. Manter a decisão Node 24 e declarar `engines.node: "24.x"` na raiz e em `apps/admin/package.json`, para cobrir os dois roots Vercel previstos.
2. Adotar `.node-version` com `24`; usar `actions/setup-node` com `node-version-file: .node-version` nos quatro jobs CI e nos quatro jobs operacionais que executam Turbo. Pin por SHA e verificar a release novamente conforme P26. Jobs de checklist Bun-only e dispatch não precisam desse passo.
3. Trocar `prepare` para `bun scripts/install-git-hooks.mjs` e alinhar `@types/node` ao major 24; manter o código `.mjs` e o spawn explícito `node` do Admin porque Next continua executando sob Node.
4. Manter Bun 1.4.2 como package manager, sem alterar o pin em P33; documentar no README/AGENTS que Bun instala e executa scripts próprios, enquanto Node 24 serve Next/CLIs e o runtime Vercel.
5. Não adicionar `fnm`/`mise` ao projeto nesta fundação. O usuário já atualizou manualmente o Node local para 24.21.0; documentar `node --version` e manter `.node-version` como referência para CI e ferramentas compatíveis. Auto-switching continua sendo uma escolha separada se no futuro houver mais desenvolvedores ou mudanças frequentes de major.

**Trade-off:** Node 22 também continua LTS e atende Next.js 16, mas Node 24 é o default Vercel atual e recebe suporte até abril de 2028; Node 26 está no canal Current e não aparece entre os runtimes Vercel disponíveis. `engines.node` nos dois manifests cobre o deploy; `.node-version` centraliza a versão para ferramentas locais compatíveis; `setup-node` configura cada runner. A versão local do Windows ainda depende de uma instalação manual porque não existe version manager no computador.

**Escopo desta atualização:** somente fatos revalidados e refinamento operacional. A decisão aceita de Node 24.x não foi alterada.

## Implementação P33 em revisão — 2026-09-28

- O usuário atualizou o Node local manualmente; `node --version` agora retorna `v24.21.0`, arquitetura x64. Não foi adicionado um version manager.
- O root `package.json` e `apps/admin/package.json` declaram `engines.node: "24.x"`; `.node-version` contém `24`. A raiz Vercel de Web lê o manifesto raiz; Admin tem configuração Vercel própria em `apps/admin`, então seu manifest local também declara o runtime.
- O script raiz `prepare` chama `bun scripts/install-git-hooks.mjs`; o script continua em `.mjs` e mantém seu skip em CI/Vercel. As declarações diretas `@types/node` da raiz e `packages/ui` usam `^24.0.0`, resolvendo 24.19.0; a revisão Luna detectou e ajudou a corrigir a dependência direta 26.1.0 que ainda restava em UI. O lock ainda contém cópias transitivas Node 22.x/25.x trazidas por dependências upstream; não foi aplicado override global. `typecheck:all` passou depois da mudança direta.
- Os oito jobs independentes que invocam Turbo/CLIs com shebang Node agora usam `actions/setup-node` com `.node-version`: CI `verify`, `e2e`, `postgres-behavior`, `admin-e2e`; operações `rls-smoke`, `deployment-smoke`, `admin-deployment-smoke`, `production-preflight`. Os jobs de checklist que executam scripts Bun diretos e o dispatch shell-only não instalam Node. `check-latest: true` mantém o patch 24.x mais recente; o cache de npm/yarn/pnpm fica desabilitado porque o projeto usa Bun.
- A release atual verificada foi `actions/setup-node` v7.0.0. GitHub API resolveu o tag para `820762786026740c76f36085b0efc47a31fe5020`, e o commit retornou assinatura verificada (`verified: true`, `reason: valid`), conforme P26.
- README e AGENTS registram que Bun seleciona o package manager e Node seleciona CLIs com shebang, o launcher Admin e runtime Vercel. A seção local instrui verificar `node --version`; `.node-version` não troca o Node no Windows quando não há manager configurado.

### Verificação

- `node --version` → `v24.21.0`; `bun --version` → `1.4.2`.
- `CI=true bun install --frozen-lockfile` passou e executou o novo hook `prepare` sob Bun.
- `bun run typecheck:all` passou nos 12 tasks.
- `bun x ultracite check`, `bun run docs:check` e `git diff --check` passaram. `actionlint` não está instalado; os trechos YAML foram revisados visualmente e usam a sintaxe documentada.
- Nenhum teste, build ou workflow Actions remoto foi executado.

O código está implementado, mas o ponto permanece aguardando a revisão do usuário. Não foi feito push.
