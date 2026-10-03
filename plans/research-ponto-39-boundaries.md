# Pesquisa do ponto 39 — contrato executável de fronteiras

**Data da revisão:** 2026-09-25  
**Estado:** aceito em 2026-09-25. Q1–Q2 aprovadas: matriz de dependências e extensão dos testes Vitest com AST do TypeScript.  
**Ponto do relatório:** tornar executável a direção de dependências do workspace: `apps/*` podem usar `packages/*`; aplicações não importam source uma da outra; packages não importam aplicações.

## Resumo

A direção do relatório é correta, mas já existem vários testes de fronteira na suíte Vitest do web. Recomendo estender esses testes e seus helpers com uma matriz curta do workspace, cobrindo lacunas reais, sem adicionar uma segunda ferramenta ou framework. Para novos casos que ultrapassem imports simples, usar AST do TypeScript, já instalado, em vez de ampliar regex frágeis.

Não recomendo adotar agora `turbo boundaries` como gate: a documentação oficial ainda o classifica, junto com tags, como experimental. Nx também não se justifica para este contrato isolado. `dependency-cruiser` é uma alternativa dedicada a avaliar caso as regras cresçam além do que os testes atuais conseguem manter.

## Evidência no Polaris

- A raiz declara os workspaces `apps/*` e `packages/*`; existem duas aplicações (`@polaris/web`, `@polaris/admin`) e packages com fronteiras nomeadas, como `@polaris/db`, `@polaris/billing`, `@polaris/platform`, `@polaris/ui` e `@polaris/date` (`package.json`, `apps/*/package.json`, `packages/*/package.json`).
- Já há verificações locais de arquitetura em `apps/web/src/lib/`: `admin-boundary.test.ts`, `package-boundary.test.ts`, `feature-boundary.test.ts`, `app-boundary.test.ts`, `integration-boundary.test.ts`, `lib-boundary.test.ts` e `db-boundary.test.ts`. Elas protegem regras valiosas: Admin não pode ampliar imports da árvore Web, packages não podem importar source do Web, features não dependem de rotas/UI/banco diretamente e imports da UI devem usar subpaths exportados.
- As verificações são específicas, em sua maioria baseadas em expressões regulares, e moram na suíte da aplicação Web. Não encontrei um check único que cubra ambas as direções app-a-app, todos os packages e a declaração de todas as dependências internas do workspace. `package-boundary.test.ts` verifica a declaração de dependências externas apenas para `@polaris/ui`.
- `audit:boundaries` em `package.json` e `.github/workflows/ci.yml` tem outro objetivo: `scripts/check-core-audit-boundaries.ts` proíbe chamadas best-effort de auditoria em ações transacionais do ERP. Não deve ser tratado como o contrato de imports do monorepo nem ampliado com semânticas diferentes.
- TypeScript já é dependência de desenvolvimento na raiz (`typescript: ^6.0.3`), e `scripts/check-core-audit-boundaries.ts` já usa a API de AST do TypeScript. Um check novo pode evitar adicionar dependência, embora mapear resolução de imports e aliases tenha custo de implementação.
- `apps/web/tsconfig.json` e `apps/admin/tsconfig.json` mantêm aliases que apontam para source de `packages/ui`. A decisão de P37 de importar pelos exports públicos precisa ser efetivada; exports sozinhos não substituem o check quando aliases ou caminhos relativos contornam a fronteira.

## Comparação com Hub

Hub não declara workspaces e não tem diretórios raiz `apps/` ou `packages/`; organiza o produto dentro de uma aplicação, com áreas em `src/features`. Seus testes e regras podem servir de referência para limites internos de features, mas não modelam o grafo de imports entre duas aplicações e packages. A matriz de P39 deve derivar da topologia real do Polaris, não ser copiada do Hub.

## O que dizem as fontes

### Turborepo

A documentação atual descreve `turbo boundaries` como **experimental**. O comando detecta imports para fora do diretório de um package e imports de packages que não estão declarados em `dependencies`. Tags e regras de dependentes/dependências permitem expressar restrições de grafo, inclusive regras transitivas; a referência de configurações marca essas tags como experimentais também. A política de suporte do Turborepo recomenda não usar APIs experimentais onde confiabilidade seja essencial, pois desenho e comportamento ainda podem mudar. É um recurso promissor para reavaliar depois de estável, mas não a base única do gate de CI enquanto mantiver esse status. [Boundaries](https://turborepo.dev/docs/reference/boundaries), [package configurations](https://turborepo.dev/docs/reference/package-configurations), [support policy](https://turborepo.dev/docs/support-policy).

### Checks proporcionais para TypeScript

- **TypeScript Compiler API:** o parser expõe ASTs de `SourceFile` e o compilador acompanha o grafo de módulos. Como Polaris já usa TypeScript no script de auditoria transacional, um verificador próprio pode ser pequeno e sem nova dependência. Deve ler imports, re-exports e imports dinâmicos do AST e resolver os módulos conforme os `tsconfig` reais, para não depender só de regex nem ignorar aliases. A manutenção de regras de resolução é o custo desta opção. [TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API), [module resolution](https://www.typescriptlang.org/docs/handbook/modules/reference.html).
- **`package.json` `exports` e dependências:** exports estabelecem os entry points disponíveis quando consumidores importam pelo nome do package; as dependências do manifesto tornam relações de package explícitas. A documentação de Node explica a encapsulação dos entry points. Isso ajuda a impor a decisão de P37, mas não captura por si só imports relativos, aliases que apontem ao source ou a regra “aplicações não importam outras aplicações”. [Node.js package entry points](https://nodejs.org/api/packages.html#package-entry-points).
- **dependency-cruiser:** oferece regras `forbidden`, `allowed` e detecção de dependências cíclicas, com severidade de erro capaz de falhar um comando de build/CI. É mais flexível e pronto para relações complexas do que um script próprio, mas acrescenta dependência, configuração e curva de manutenção. É uma opção futura se a matriz de imports do Polaris ficar mais rica. [Rules reference](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md), [rules tutorial](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-tutorial.md).
- **Nx:** suporta boundaries por tags, mas trazer Nx só para substituir algumas regras já cobertas pelo Turbo e pelos testes atuais adicionaria superfície de ferramenta sem benefício demonstrado. Não recomendo essa migração.

### Fórum — evidência anedótica

Em uma discussão recente em `r/typescript` sobre estrutura de monorepos, um participante aconselha evitar regras de layout rígidas sem problema técnico concreto; outro comenta que regras específicas de import podem ser verificadas por ferramentas como dependency-cruiser, sem adotar Nx. O contexto do tópico inclui um produto bem maior que Polaris, e as respostas são opiniões individuais, não consenso nem fonte normativa. Isso reforça apenas a escolha de começar por poucas relações verificáveis, em vez de organizar packages para satisfazer uma framework. [Discussão em r/typescript](https://www.reddit.com/r/typescript/comments/1uo498j/im_going_insane_on_how_to_rigorously_structure_my/).

## Recomendação para Polaris

Estender os testes Vitest existentes, mantendo-os sob o gate de testes já executado na CI. A matriz a proteger:

1. `apps/web` e `apps/admin` podem depender de `packages/*`, conforme dependências declaradas nos respectivos manifests.
2. `apps/web` e `apps/admin` não importam source uma da outra, por alias ou caminho relativo.
3. `packages/*` não importam source de `apps/*`.
4. Imports de um package para outro precisam corresponder a uma dependência workspace declarada; packages não podem formar ciclos.
5. Imports de `@polaris/ui` por aplicações devem permanecer em subpaths exportados, alinhado à decisão de P37.

Preservar os testes internos por camada e ampliar os existentes `admin-boundary.test.ts` e `package-boundary.test.ts` para as regras entre workspaces. Reutilizar `boundary-test-helpers.ts`; migrar a extração de imports para AST quando forem cobrir aliases, re-exports e imports dinâmicos, sem implementar um resolvedor genérico. Acrescentar casos de permitido/proibido aos próprios testes e manter as violações reais corrigidas. Não misturar esse contrato com `audit:boundaries`, que verifica auditoria transacional.

Se a implementação do check próprio começar a replicar um grafo/resolvedor extenso, reconsiderar dependency-cruiser. Reavaliar `turbo boundaries` quando a documentação de suporte deixar de marcá-lo experimental. Não adotar Nx para este ponto.

## Trade-offs

| Opção | Vantagens | Custos e limites | Avaliação |
|---|---|---|---|
| Estender os testes Vitest atuais | Sem ferramenta ou job novo; amplia uma suíte que já roda na CI e protege regras locais e do workspace | Cobertura atual é parcial e usa regex; precisa de fixtures e AST para não criar falsos positivos/negativos | Recomendado |
| Check autônomo com TypeScript | Reusa dependência instalada e oferece controle sobre a matriz | Novo script e código de infraestrutura para manter, apesar dos testes existentes | Não é necessário agora |
| `turbo boundaries` e tags | Integra-se ao Turbo; detecta escapes de package e manifesto, permite política por tag/transitividade | Ainda experimental segundo docs e suporte oficial; não é adequado como gate fundamental neste momento | Reavaliar após estabilização |
| dependency-cruiser | Regras ricas de dependência, ciclos e severidade sem migrar para Nx | Nova dependência, configuração e convenções a manter | Reserva se a matriz crescer |
| Nx | Modelo de tags e boundaries integrado | Escopo de migração/ecossistema desproporcional a este contrato; Turbo e guardas já estão no projeto | Não recomendado agora |

## Limite desta recomendação

Os testes não devem validar arquitetura de negócio inteira, impor que cada módulo vire package, nem replicar todos os testes de camada existentes no Web. O alvo é somente o grafo de dependências entre aplicações e packages e o uso das APIs públicas. Nenhum teste foi executado e nenhum código/configuração foi alterado nesta pesquisa.

## Revalidação da cobertura executável — 2026-10-01

O root declara workspaces `apps/*` e `packages/*`; os manifests observados mostram dependências coerentes já declaradas para os packages usados por Web/Admin e relações package-to-package como `auth → db`, `events → db`, `platform → billing/db/date/events`, `platform-auth → db` e `ui → date`. `turbo.json` programa `^build`, `^test`, `^check`, `^typecheck` e outras tasks, mas seu grafo operacional não substitui regra de direção de import.

O guard `apps/web/src/lib/package-boundary.test.ts` cobre parte de packages→Web e os subpaths públicos da UI; a variante Admin cobre alguns imports `@/`/relativos de Web, mas não uma relação app→app simétrica. Os dois não validam de forma geral packages→Admin, dependências internas declaradas para todos os packages, ciclos, imports relativos entre source packages, ou resolução efetiva dos aliases `tsconfig`. `packages/ui/src/package-interface.test.ts` só valida o manifesto da UI e seus imports runtime declarados.

A decisão P39 já aprovou AST TypeScript e os testes Vitest existentes. A execução mínima permanece: expandir os dois guards simetricamente; resolver specifiers por alias com os `tsconfig` reais onde necessário; verificar `workspace:*` para imports package-to-package e ciclos; incluir casos permitidos/proibidos pequenos. Manter `audit:boundaries` separado porque sua finalidade atual é auditoria transacional.

**Revalidação do Turborepo:** o checkout declara Turbo `2.11.5`; a referência oficial ainda marca `turbo boundaries` e tags como experimentais. O recurso detecta imports fora da raiz do package, pacotes não declarados e permite regras `allow`/`deny` por tags; é tecnicamente relevante, mas não deve substituir o gate próprio já aprovado enquanto permanecer experimental. Fontes: [Turborepo Boundaries](https://turborepo.dev/docs/reference/boundaries), [RFC oficial](https://github.com/vercel/turborepo/discussions/9435), [TypeScript module resolution](https://www.typescriptlang.org/docs/handbook/modules/reference), [TypeScript `paths`](https://www.typescriptlang.org/tsconfig/paths.html).

A comparação atual do Hub permanece limitada: o projeto usa um único app com `src/components/ui`, sem `apps/*`, `packages/*` ou workspaces no mesmo sentido. Ele não determina a matriz do Polaris nem justifica adicionar uma ferramenta.

**Estado:** nenhuma implementação ou teste foi executado nesta revalidação; a estratégia aprovada não foi alterada.

## Revalidação após P37, antes da implementação P39 — 2026-10-01

P37 foi implementado e aprovado. O guard `package-boundary.test.ts` agora rejeita os aliases de `@polaris/ui` removidos e imports públicos fora dos exports; o guard package→Web também cobre `@/` em `packages/ui`, cujos imports internos passaram a ser relativos. Neste snapshot anterior à implementação P39, os guards restantes ainda usavam regex, não cobriam simetricamente Web↔Admin nem packages→Admin, não validavam todas as dependências workspace/ciclos e a matriz ainda não estava registrada em `docs/architecture/overview.md` com ponteiro em `AGENTS.md`.

## Implementacao P39 — 2026-10-01 (aprovada)

A implementacao estende os helpers existentes com o parser AST TypeScript, leitura de `tsconfig` e resolucao pelo compiler API. O novo `workspace-boundaries.test.ts` percorre `apps/*/src` e `packages/*/src`, valida imports diretos `workspace:*` e `exports`, proibe imports entre apps e de packages para apps, e detecta ciclos no grafo declarado dos packages. A matriz roda na suite Vitest existente; `audit:boundaries` e mantido separado.

Os testes incluem imports estaticos, type-only, side-effect, re-exports, dinamicos com options, imports em tipos, `import = require()` e chamadas literais a `require()`, resolucao real do alias `@/` e de um export publico da UI, um package DAG valido e fixtures que cobrem imports permitidos e proibidos. A matriz foi registrada em `docs/architecture/overview.md`, com ponteiro em `AGENTS.md`.

**Estado:** P39 concluído e aprovado pelo usuário em 2026-10-01 no escopo implementado, na worktree `codex/foundation-plan-audit`; alterações ainda não commitadas ou integradas. Os 17 testes focais passaram. `bun run verify:quick` passou em 2026-10-01: 12 tarefas de typecheck, 11 tarefas de teste, `docs:check` com 122 arquivos Markdown e Ultracite em 613 arquivos. O novo teste de varredura levou 2,47 s na execução paralela. Os testes PostgreSQL reais permanecem ignorados pelo perfil rápido conforme seu guard existente.
