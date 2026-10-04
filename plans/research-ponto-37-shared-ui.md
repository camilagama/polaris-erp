# Pesquisa do ponto 37 — `@polaris/ui` como fundação compartilhada

**Data da revisão:** 2026-09-25  
**Estado:** aceito em 2026-09-25. Q1–Q3 aprovadas: fonte única de primitives/padrões comuns, imports por exports públicos e revisão das composições de domínio existentes.  
**Ponto do relatório:** manter uma fundação de interface comum, colocando primitivas compartilhadas em `packages/ui` e composições específicas na aplicação ou feature.

## Resumo

A recomendação é adequada para o Polaris, com uma ressalva de escopo: `@polaris/ui` deve ser a fonte comum de tokens, primitivas e padrões realmente compartilhados, mas não o destino de toda interface que pareça reutilizável. As aplicações podem compor essas peças localmente para representar seus fluxos de negócio. Isso mantém consistência sem exigir uma abstração genérica prematura.

“Não criar um segundo design system local” deve significar não duplicar primitivas fundamentais, tokens ou regras visuais globais. Não deve impedir componentes de página, formulários, tabelas, gráficos ou fluxos que pertencem a uma feature. Esses componentes locais continuam usando `@polaris/ui` e o contrato visual comum.

## Evidência no Polaris

- O workspace raiz inclui `apps/*` e `packages/*`. `apps/web` e `apps/admin` declaram `@polaris/ui` como dependência `workspace:*`; logo, já existe um ponto de manutenção comum para as duas superfícies.
- `packages/ui/package.json` oferece exports para `components/ui`, `components/shared`, hooks, utilitários e CSS. `packages/ui/src/package-interface.test.ts` verifica parte dessa interface e que os imports externos usados pelo pacote estão declarados. A direção proposta já corresponde à estrutura implementada.
- `packages/ui/src/components/ui/` contém controles e wrappers de interface de baixo nível. `packages/ui/src/components/shared/` contém composições mais altas, como `BaseSidebar`, `PageHeader`, `DataTable`, banners e gráficos.
- A busca de imports mostra compartilhamento real em componentes como `BaseSidebar`, `AlertBanner`, `SignInLayout`, `UrlDateRangeFilter`, `ContributionGraph`, `RevenueProfitChart` e `SalesCountChart`. Porém, outros arquivos em `components/shared` aparecem somente no web ou somente no admin. O nome da pasta, por si só, não comprova que um componente seja transversal.
- As aplicações já mantêm composições de feature em seus próprios diretórios, por exemplo `apps/web/src/components/dashboard`, `products` e `sales`, além de componentes de rotas administrativas em `apps/admin/src`. Isso é uma fronteira saudável: telas e regras de domínio ficam perto do fluxo que as conhece, enquanto usam os controles compartilhados.
- Alguns gráficos no pacote compartilhado têm semântica de negócio, como `RevenueProfitChart` e `SalesCountChart`. Como são importados pelas duas aplicações, podem ser compartilhados quando os dados, comportamento e interpretação visual forem realmente os mesmos. Componentes de métrica específicos de uma feature não deveriam migrar para o pacote apenas por usarem Recharts ou uma estrutura visual parecida.
- Os dois `tsconfig.json` mapeiam `@/components/ui/*`, `@/hooks/*` e `@/lib/utils` diretamente para `packages/ui/src`. O teste em `apps/web/src/lib/package-boundary.test.ts` verifica imports com `@polaris/ui`, mas não detecta imports feitos por esses aliases locais; a fronteira de exports declarados, portanto, é contornável.
- O dashboard admin se apresenta como métricas de atividade da plataforma, mas envia séries de `salesCount`, `costs`, `result` e `sold` preenchidas com zero a `SalesCountChart` e `RevenueProfitChart`. Isso é um candidato concreto a desalinhamento semântico entre composição compartilhada e contexto administrativo. `ContributionGraph` também usa “vendas” como rótulo padrão, embora seja consumido pelo admin.
- `ThemeToggle` e `AdminThemeToggle` são quase cópias com nomes/IDs diferentes; podem ser consolidados se a política de temas continuar igual nas duas aplicações.
- `apps/web/src/features` tem uma fronteira própria e não deve ser interpretada como destino automático de componentes visuais. O local atual para composições visuais específicas é `apps/<app>/src/components/<área>` ou `_components` junto à rota.

Como as duas aplicações consomem o pacote, uma mudança em um componente compartilhado pode afetar ambos os produtos. Essa consequência decorre do grafo local de dependências; ela pede validação dos consumidores afetados quando `@polaris/ui` mudar, não uma camada de abstração extra.

`aidd_docs/memory/project-state.md` foi revisado em 2026-07-13 e diz que `@polaris/ui` não foi extraído. Essa afirmação está ultrapassada e deve ser reconciliada no trabalho de atualização de memória/documentação já aprovado.

## Comparação com Hub

O Hub é uma aplicação única e não possui um `packages/ui`; seus componentes ficam em `src/components/ui`. Seu `DESIGN.md` sustenta a disciplina de não criar um design system paralelo e reutilizar tokens/componentes existentes. É uma referência para consistência, mas não determina a divisão de pacote adequada ao Polaris, que mantém duas aplicações no mesmo workspace.

## O que dizem as fontes primárias

- A documentação do Turborepo descreve Internal Packages como bibliotecas internas para compartilhar código, reconhecidas pelas dependências do workspace. Na orientação para criação de pacotes, recomenda um propósito por pacote e dá `@repo/ui` como exemplo de pacote para componentes compartilhados. A mesma página ressalta que isso é uma prática recomendada, não uma regra mecânica: escala, repositório e equipes importam. Isso sustenta uma fundação UI única e coesa, não um pacote sem limites. [Turborepo — Creating an Internal Package](https://turborepo.dev/docs/crafting-your-repository/creating-an-internal-package), [Turborepo — Internal Packages](https://turborepo.dev/docs/core-concepts/internal-packages)
- O guia do Turborepo sobre a estrutura do repositório recomenda `apps/` para aplicações e `packages/` para bibliotecas e tooling, e explica que `exports` define os pontos de entrada do pacote. Também trata dependências de pacote como relações explícitas no workspace. [Turborepo — Structuring a repository](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository)
- A documentação oficial de monorepo do shadcn/ui mostra a divisão com clareza: um `Button` é instalado em `packages/ui`, enquanto uma composição de tela, como `LoginForm`, fica em `apps/web/components`. Os imports entre workspaces passam pelos exports do pacote UI. Esse exemplo é diretamente comparável à distinção proposta no relatório. [shadcn/ui — Monorepo](https://ui.shadcn.com/docs/monorepo), [shadcn/ui — Package Imports](https://ui.shadcn.com/docs/package-imports)
- A documentação do next-forge descreve um pacote `@repo/design-system` baseado em shadcn/ui e direciona a instalação de novos componentes de design system para esse pacote. É um exemplo atual de uma fundação compartilhada em um monorepo, não uma exigência de que as páginas de negócio também morem ali. [next-forge — Design System Components](https://www.next-forge.com/docs/packages/design-system/components)
- O Radix descreve suas peças como primitivas de baixo nível para serem usadas como base de um design system e adotadas incrementalmente. Seu guia de composição mostra como combinar primitivas com componentes próprios, preservando os comportamentos acessíveis. Isso apoia compartilhar a interação fundamental e deixar a composição do produto ser específica. [Radix Primitives — Introduction](https://www.radix-ui.com/primitives/docs/overview/introduction), [Radix Primitives — Composition](https://www.radix-ui.com/primitives/docs/guides/composition)

Os exemplos são padrões de organização, não prova de que o Polaris deva copiar a estrutura interna, bibliotecas ou políticas de publicação de outro projeto.

## Trade-offs

### Compartilhar primitivas e padrões estáveis

- Uma correção de semântica, foco, tema ou comportamento comum pode melhorar web e admin ao mesmo tempo.
- Agentes e desenvolvedores encontram um lugar canônico para controles fundamentais, o que reduz divergência de estilo e variantes quase duplicadas.
- `@polaris/ui` pode evoluir sem publicar um pacote externo: é um pacote interno do workspace.

### Manter composições de feature perto do domínio

- A tela pode adaptar filtros, ordenação, validações, ações e explicações ao fluxo específico sem sobrecarregar a API compartilhada com props de uma única feature.
- Uma exigência exclusiva da aplicação não impõe mudanças nem exceções de estilo aos demais consumidores.
- A semelhança visual não obriga duas experiências a compartilhar o mesmo componente quando seus contratos ou significados diferem.

### Riscos de um pacote sem fronteira

- Um diretório `shared` pode crescer por conveniência e misturar primitiva visual, infraestrutura de gráfico e componentes de uma área do produto.
- “Generalizar para o futuro” tende a produzir componentes com muitas flags ou variantes específicas de uma tela; depois, todo consumidor paga o custo de manutenção.
- Um pacote abrangente demais acumula dependências e dificulta descobrir onde uma responsabilidade pertence. A orientação do Turborepo sobre propósito único e dependências por pacote aponta esse custo.
- Copiar e adaptar um componente já existente dentro de `@polaris/ui` não resolve automaticamente o risco: a abstração ainda precisa representar uma necessidade comum e ter consumidores verificáveis.

## Experiências da comunidade

- Uma [discussão de usuários do shadcn/ui sobre instalação de componentes em monorepo](https://github.com/shadcn-ui/ui/discussions/6399) registra fricção entre o destino pretendido `packages/ui` e o que a ferramenta gerava dentro da aplicação; a resposta sugere configurar `paths` no `tsconfig`. É uma pergunta comunitária com uma resposta, então ilustra atrito operacional, não define uma política de arquitetura. No Polaris, aliases semelhantes existem e tornam mais fácil contornar os exports públicos.
- Uma [discussão de desenvolvedores Next.js sobre compartilhar componentes entre várias aplicações](https://www.reddit.com/r/nextjs/comments/1s28tdy/those_who_manage_3_nextjs_apps_how_do_you_handle/) reúne experiências variadas com pacotes UI e monorepos. São relatos anedóticos, não consenso; reforçam que quantidade de apps, significado comum e contrato importam mais que copiar uma estrutura por moda.

## Regra recomendada para promover e reutilizar

1. **Manter em `@polaris/ui`:** tokens e componentes fundamentais de interface escolhidos como padrão do produto; primitivas acessíveis; e padrões de nível intermediário cujo comportamento, intenção visual e API permaneçam consistentes entre consumidores.
2. **Manter junto da feature/aplicação:** layout de página, regras de negócio, filtros, textos, combinações de campos, tabelas ou gráficos cuja semântica e interação pertençam a um fluxo específico. Compor essas interfaces usando `@polaris/ui`, sem reconstruir localmente as primitivas básicas.
3. **Promover após evidência:** extrair quando já houver uso em mais de um contexto ou quando houver uma decisão deliberada de tornar um primitivo a implementação canônica do produto; confirmar que o conceito e o comportamento são estáveis, que a API não depende de nomes/regras de uma feature e que todos os consumidores podem ser revisados.
4. **Evitar um limiar cego de contagem:** “duas telas” não basta quando o significado é diferente; “um único consumidor” não impede um `Button` canônico que o sistema escolheu adotar desde o início. A justificativa deve ser a responsabilidade estável e explícita, não a expectativa de reutilização futura.
5. **Preservar a interface de pacote:** consumidores devem importar pelas entradas declaradas de `@polaris/ui`, não depender de caminhos relativos para dentro do pacote. Mudanças na fundação precisam ser verificadas nos apps consumidores afetados.
6. **Não dividir o pacote agora apenas por estética arquitetural:** primeiro manter fronteiras internas claras entre primitivas e composições compartilhadas. Considerar uma separação só se responsabilidades passarem a ter ciclos de mudança, dependências ou consumidores incompatíveis.

## Conclusão para o plano

Registrar a regra do relatório, com a interpretação acima: `shared primitive → @polaris/ui`; `feature-specific composition → app/feature`; não manter um segundo conjunto de tokens/primitivas locais. Tratar os componentes de `components/shared` que têm um único consumidor como itens para avaliação individual, não como falha automática. A inclusão no pacote deve ser decidida pela responsabilidade e pelo contrato compartilhado, e não pelo nome da pasta.

Esta nota é pesquisa para apoiar a decisão. Não altera o plano principal, o código ou a estrutura dos componentes. Nenhum teste foi executado.

## Revalidação da fronteira implementada — 2026-10-01

`apps/web/tsconfig.json` e `apps/admin/tsconfig.json` continuam direcionando `@/components/ui/*`, `@/hooks/*` e `@/lib/utils` a `packages/ui/src`. A auditoria independente encontrou aproximadamente 150 desses imports em Web e nenhum consumidor atual em Admin; ambos os apps ainda mantêm as entradas de alias. Os dois manifests já declaram `@polaris/ui` por `workspace:*`; `packages/ui/package.json` declara exports para componentes, hooks, utils e CSS.

Há dois guards existentes, com escopos distintos: `packages/ui/src/package-interface.test.ts` compara exports esperados e dependências do pacote; `apps/web/src/lib/package-boundary.test.ts` verifica imports `@polaris/ui/*` em relação ao mapa `exports`. O segundo não reprova `@/components/ui`, `@/hooks`, `@/lib/utils` nem paths equivalentes em `tsconfig`. O plano P37 já aprovou retirar os aliases e usar imports públicos; a revalidação adiciona o alias wildcard `@polaris/ui/*` à lista de entradas redundantes a remover.

`packages/config/tsconfig/base.json` usa `moduleResolution: "bundler"`. A referência TypeScript atual explica que quando `paths` casa com um specifier, a resolução segue o caminho configurado e deixa de usar as regras de lookup de pacote, incluindo `exports`; workspaces tornam o lookup de pacote real. As aplicações usam App Router. O guia Next incluído em `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/transpilePackages.md` para Next `16.3.6` informa que Turbopack transpila pacotes workspace automaticamente e que Webpack também faz isso no App Router; portanto não adicionar `transpilePackages` como tentativa preventiva nesta mudança.

O Hub atual não contém `packages/ui`; mantém componentes em um app único. Esse contraste confirma que as topologias diferem e não justifica remover o pacote compartilhado do Polaris. A revalidação anterior à implementação não alterou código nem executou checks de aplicação.

## Implementação P37 — concluída e aprovada pelo usuário (2026-10-01)

- Migradas 153 referências de alias nos apps (149 import/export/dynamic specifiers e quatro `vi.mock`), todas no Web; Admin não tinha consumidores ativos. Ambos os `tsconfig.json` dos apps perderam `@/components/ui/*`, `@/hooks/*`, `@/lib/utils` e `@polaris/ui/*`; `@/*` permanece para código local.
- Os typechecks revelaram mais 45 imports internos `@/...` em `packages/ui/src`, dependentes do `tsconfig` do app consumidor. Foram convertidos a caminhos relativos e o alias local removido do `packages/ui/tsconfig.json`.
- `ThemeToggle` tornou-se um padrão compartilhado em `@polaris/ui`; o wrapper Admin mantém seu ID. O Admin informa que o total do gráfico são eventos e remove o card de desempenho que mostrava valores de vendas/receita zerados como dados reais.
- O guard Vitest passou a rejeitar os aliases privados e suas entradas nos três `tsconfig.json`. A memória `project-state.md` já reconhece o pacote UI existente.
- Verificação local: Web (47 testes/4 arquivos), Admin layout (1 teste), UI package (10 testes), `verify:quick` (570 testes passaram; 1 Postgres ignorado), typecheck Web/Admin/UI, builds Web/Admin, Ultracite e `docs:check` (13 testes/122 Markdown) passaram. Os builds usaram valores CI sintéticos sem credenciais de provider; o Web exibiu avisos de Better Auth por chave API ausente. O detector Impeccable examinou 80 alvos TSX alterados e não reportou achados.

P37 foi implementado e aprovado pelo usuário em 2026-10-01 no commit `106ee87`, no PR #7. A reauditoria de 2026-10-03 encontrou o cartão de Billing com 0 hardcoded no dashboard Admin; o resumo usa o helper canônico `getPlatformBillingTotals` no mesmo contexto Admin; commit `e466ab6` e CI #119 (run 37169673318) passaram, incluindo o Admin E2E. O usuário aprovou P37 em 2026-10-03; a consulta adicional teve custo não medido. P39 também já foi implementado e aprovado em 2026-10-01 no mesmo commit; ver seu registro de pesquisa.
