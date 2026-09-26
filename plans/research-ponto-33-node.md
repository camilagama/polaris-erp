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
