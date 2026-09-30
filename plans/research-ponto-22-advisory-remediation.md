# Pesquisa: advisories de dependências após Next.js 16.3.6

Data de consulta: 2026-09-26. Escopo: os 12 nomes (26 registros no audit report informado), com as resoluções encontradas em `bun.lock` no checkout. A nota recomenda destinos de atualização; não altera manifests nem lockfile.

## Resumo executivo

| Pacote | Resolução no lock | Recomendação | Avaliação |
| --- | --- | --- | --- |
| `@babel/core` | 7.29.0 | 7.29.6 ou mais recente em 7.x | Vulnerável ao GHSA-4x5r-pxfx-6jf8; patch na mesma major. |
| `@vitest/mocker` | 4.1.10, alinhado com `vitest` | Atualizar `vitest` para 4.1.11+ | Corrigir juntos, sem override isolado do pacote interno. |
| `brace-expansion` | 5.0.7 | 5.0.9+ para esta resolução | .7/.8 ainda atingidos por advisories posteriores. Preservar a major de cada consumidor. |
| `browserslist` | 4.28.2 | 4.28.7+ | Duas falhas corrigidas em 4.28.7; atualização patch dentro de 4.x. |
| `esbuild` | 0.25.12 direto do Drizzle Kit; 0.27.4 via `tsx`; 0.18.20 via `@esbuild-kit/core-utils` | Atualizar `tsx` para 4.23.9+ (esbuild `>=0.28.1`) e conter core-utils com override restrito para esbuild 0.25.12 ou retirar o loader legado | 0.18.20 é afetado pelo GHSA-67mh; 0.27.4 cai na faixa do GHSA-g7r4 segundo metadados REST do GitHub; 0.25.12 está corrigido para ambos. |
| `fast-uri` | 3.1.2 | 3.1.8+ em 3.x | Várias correções após 3.1.2; 3.1.8 é o piso atual da linha 3.x. |
| `nanoid` | 3.3.15 | 3.3.19+ em 3.x | Permanecer em 3.x preserva compatibilidade; atualizar a resolução transitiva. |
| `postcss` | 8.5.19 | 8.5.23+ | Override e devDependency na raiz estão fixados; ambos precisam avançar. |
| `sharp` | 0.34.5 direto; `next/sharp` 0.35.4 aninhado | Atualizar direto para 0.35.4+ | A dependência aninhada do Next já está na versão corrigida; a raiz continua vulnerável e `^0.34.5` não aceita 0.35.x. |
| `smol-toml` | 1.6.1 | 1.7.1+ | Fix no mesmo major para loop infinito ao analisar entrada malformada. |
| `undici` | 7.28.0 | 7.30.0 recomendado; 7.29.1 é piso para os advisories de 4 de setembro | Manter v7 evita upgrade de major. |
| `vitest` | 4.1.10 | 4.1.11+ | Patch/minor na linha 4.1; resolve também o alinhamento de `@vitest/mocker`. |

## Evidência local do lockfile

Os dados abaixo vêm dos registros de pacotes em `bun.lock` (não de uma nova execução do audit):

- `@babel/core@7.29.0`, `@vitest/mocker@4.1.10`, `vitest@4.1.10`, `brace-expansion@5.0.7`, `browserslist@4.28.2`, `esbuild@0.25.12`, `fast-uri@3.1.2`, `nanoid@3.3.15`, `postcss@8.5.19`, `sharp@0.34.5`, `smol-toml@1.6.1` e `undici@7.28.0` aparecem como seletores na seção `packages`.
- Há cópias adicionais de `esbuild`: `@esbuild-kit/core-utils/esbuild` resolve a `0.18.20` e `tsx/esbuild` resolve a `0.27.4`.
- Caminhos no lock: `drizzle-kit@0.31.10` → `@esbuild-kit/esm-loader@2.6.5` → `@esbuild-kit/core-utils@3.3.2` → `esbuild@0.18.20`; `drizzle-kit` também declara `esbuild ^0.25.4` e `tsx ^4.21.0`; `tsx@4.21.0` declara `esbuild ~0.27.0`.
- Há também `next/sharp@0.35.4`, além do `sharp@0.34.5` do workspace. Atualizar somente o pacote aninhado do Next não corrige o `sharp` direto.
- A raiz tem overrides explícitos para `brace-expansion@5.0.7`, `fast-uri@3.1.2` e `postcss@8.5.19`; o pacote raiz também declara `sharp: ^0.34.5`, `postcss: 8.5.19` e `vitest: ^4.1.10`.
- Revalidação pelo agente principal após atualizar Next: `bun audit --json` retorna 26 registros por pacote/advisory (16 high, 8 moderate, 2 low) e não lista mais `next`. Os nomes/quantidades foram `@babel/core` 1, `@vitest/mocker` 1, `brace-expansion` 2, `browserslist` 2, `esbuild` 2, `fast-uri` 6, `nanoid` 2, `postcss` 1, `sharp` 2, `smol-toml` 1, `undici` 5 e `vitest` 1. `@vitest/mocker`/`vitest` compartilham o mesmo GHSA, então 26 são entradas por pacote, não 26 GHSA únicos.
- `bun pm why` confirma que `sharp@0.34.5` é dependência direta da raiz e usado em `apps/web/src/features/products/image-processing.ts`; `fast-uri` vem por `ajv` sob `schema-utils`/webpack/Sentry; `brace-expansion` está sob minimatch/glob em cadeias de Sentry, Ultracite e Inngest/OpenTelemetry; `postcss` está fixado na raiz e é dependência de Next/Tailwind/Vite; `browserslist` e `nanoid` estão na cadeia de Babel/Webpack e PostCSS; `smol-toml` vem de Knip; `undici` vem de jsdom; e Vitest/mocker são dependências de desenvolvimento no root e `packages/ui`.

## Detalhes por advisory

### Babel

`@babel/core@7.29.0` é afetado pelo [GHSA-4x5r-pxfx-6jf8](https://github.com/babel/babel/security/advisories/GHSA-4x5r-pxfx-6jf8): entrada de código maliciosa com `sourceMappingURL` pode levar Babel a ler um sourcemap local, sob as condições descritas pelo mantenedor. A correção é `7.29.6` ou `8.0.0-rc.6`; para este projeto, `7.29.6` conserva Babel 7. Nenhuma mudança de peer dependency ou quebra de major foi indicada pelo advisory.

### Vitest e mocker

`vitest@4.1.10` e seu `@vitest/mocker@4.1.10` devem subir juntos para pelo menos `4.1.11`. O [GHSA-82fw-gwwq-j7x9](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9) envolve redirects de mocks para fora do projeto via socket HMR em uma superfície específica de plugins/mocker. Atualize pelo pacote Vitest, que fixa seus pacotes internos na mesma versão; evitar override independente de `@vitest/mocker`. O peer existente do mocker aceita Vite `^6 || ^7 || ^8`, coerente com o Vite 8 registrado no workspace. O [GHSA-5xrq-8626-4rwp](https://github.com/advisories/GHSA-5xrq-8626-4rwp), corrigido em Vitest 4.1.0, já está coberto por 4.1.10.

### Brace expansion

`5.0.7` aparece no lock e é objeto de uma override exata. A correção inicial para o [GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp) não é suficiente para os advisories que vieram depois: o [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg) exige releases corrigidas por linha, e o [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895) deixa `5.0.7` e `5.0.8` vulneráveis. Para o seletor atual da linha 5, usar `5.0.9` ou posterior.

Não forçar indiscriminadamente a linha 5 em todo o grafo: versões antigas são CommonJS e versões 3+ são ESM; consumidores que usam `require()`/export default podem quebrar. A correção mais segura é escolher a versão corrigida compatível com a linha exigida por cada pai (por exemplo, `1.1.18`, `2.1.4`, `3.0.6` e `5.0.9`, conforme o range e a árvore efetivos). A fonte mais recente do advisory aponta a falha de DoS, não uma alteração funcional geral.

### Browserslist

Os advisories [GHSA-73wf-gq98-2v4g](https://github.com/advisories/GHSA-73wf-gq98-2v4g) e [GHSA-c83g-rgw3-j3cx](https://github.com/advisories/GHSA-c83g-rgw3-j3cx) incluem resoluções até `4.28.6`; a primeira trata de prototype write/crash ao processar estatísticas personalizadas e a segunda de crescimento não limitado de cache. Ambas são corrigidas em `4.28.7`. O seletor atual `4.28.2` deve ser atualizado. É patch na linha 4; a página de segurança do [projeto Browserslist](https://github.com/browserslist/browserslist/security) informa que a versão mais recente é a suportada.

### esbuild

O lock contém três cópias com caminhos distintos. `esbuild@0.18.20`, por `drizzle-kit` → `@esbuild-kit/esm-loader` → `@esbuild-kit/core-utils`, é afetado pelo [GHSA-67mh-4wv8-2f99](https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99) (dev-server CORS; affected `<=0.24.2`, patched `>=0.25.0`). O `esbuild@0.25.12` direto do Drizzle Kit já supera esse piso. `tsx@4.21.0` declara `esbuild ~0.27.0` e o lock resolve `0.27.4`.

Há divergência entre as apresentações do [GHSA-g7r4-m6w7-qqqr](https://github.com/evanw/esbuild/security/advisories/GHSA-g7r4-m6w7-qqqr): a página HTML mostra `0.27.3` como versão afetada e `>=0.28.1` como corrigida, sem exibir a faixa; a fonte estruturada oficial [GitHub REST Advisory API](https://api.github.com/advisories/GHSA-g7r4-m6w7-qqqr) registra `vulnerable_version_range: >= 0.27.3, < 0.28.1` e `first_patched_version: 0.28.1`. Como o audit Bun reporta a mesma faixa estruturada, tratar `0.27.4` como afetado. O advisory descreve o dev-server de Windows; essa condição delimita exploração, mas não torna a resolução limpa para o audit.

**tsx:** a versão estável atual consultada no registry é `4.23.15`, cuja dependência `esbuild ~0.28.0` aceita o patch `0.28.1`. O mantenedor confirma que desde `tsx@4.23.9` uma instalação nova resolve esbuild `0.28.1`. O range existente `tsx ^4.21.0` do Drizzle Kit aceita essa atualização sem major; garantir que o lock selecione `esbuild >=0.28.1`, pois `0.28.0` permanece afetado. Fontes: [metadata npm de tsx](https://registry.npmjs.org/tsx/latest), [package.json oficial](https://github.com/privatenumber/tsx/blob/master/package.json), [confirmação do mantenedor](https://github.com/privatenumber/tsx/issues/808).

**@esbuild-kit/core-utils:** o ecossistema `@esbuild-kit` foi movido para tsx e não é mantido ([README upstream](https://github.com/esbuild-kit/esm-loader)). A versão estável atual do Drizzle Kit consultada (`0.31.11`) ainda declara `@esbuild-kit/esm-loader ^2.5.5`, `esbuild ^0.25.4` e `tsx ^4.21.0`; portanto, apenas atualizar Drizzle Kit dentro da linha estável não remove `esbuild@0.18.20`. Contenção local possível: override aninhado `"@esbuild-kit/core-utils>esbuild": "0.25.12"`. Bun documenta overrides por pai ([documentação](https://bun.sh/docs/pm/overrides)); usar `0.25.12` corrige ambos os advisories listados sem afetar as cópias destinadas a tsx/Vite. É fora do range original `~0.18.20`, logo requer verificação posterior do CLI/config do Drizzle Kit. Alternativa estrutural: aguardar release estável upstream sem o loader legado ou aplicar patch upstream/local para substituí-lo por tsx; o beta `1.0.0-rc.3` ainda o declara conforme a [issue do projeto](https://github.com/drizzle-team/drizzle-orm/issues/5825).

Em resumo: manter `drizzle-kit` direto em `0.25.12`; atualizar `tsx` a pelo menos `4.23.9` e resolver para esbuild `>=0.28.1`; usar override aninhado em core-utils para `0.25.12` enquanto a dependência abandonada persistir. Assim o audit trata cada resolução separadamente, sem um override global que altere os ranges de Vite/tsx.

### fast-uri

O lock e a override exata mantêm `3.1.2`. Advisories anteriores de parsing/canonicalização têm correções por sequência de patch na série 3.x; posteriormente o [GHSA-qw65-cvwx-89v3](https://github.com/fastify/fast-uri/security/advisories/GHSA-qw65-cvwx-89v3) corrige injeção de autoridade via porta inválida em `3.1.7`, e o [GHSA-hrr3-gc8f-f4qj](https://github.com/fastify/fast-uri/security/advisories/GHSA-hrr3-gc8f-f4qj) requer `3.1.8`. Recomenda-se `3.1.8` ou superior mantendo a linha 3. A atualização da override é necessária porque a versão exata atual impede o lock de resolver a correção. Sem evidência do caminho completo, não atribuo aqui um consumidor específico.

### nanoid

O [GHSA-28wg-ghj8-5hjv](https://github.com/advisories/GHSA-28wg-ghj8-5hjv) afeta versões `3.x` anteriores a `3.3.16`: geradores não seguros podem entrar em loop infinito com tamanho negativo. O changelog oficial registra a correção em `3.3.16`, outra falha de tamanho zero em `3.3.17`, e releases subsequentes na linha; recomenda-se `3.3.19` ou mais recente dentro de `3.x`. A versão `3.3.15` está abaixo do piso corrigido. O PostCSS do lock declara `nanoid ^3.3.12`, range compatível com esse bump; conferir se outras cópias têm constraints diferentes. Permanecer na linha 3 preserva compatibilidade CJS.

### PostCSS

O `postcss@8.5.19` atual fica abaixo da correção do [GHSA-fxqj-rqcc-2cmp](https://github.com/postcss/postcss/security/advisories/GHSA-fxqj-rqcc-2cmp), que documenta uma correção incompleta dos problemas de carregamento de sourcemap anteriores e fixa em `8.5.23`. Recomenda-se `8.5.23` ou superior da série 8.5. Como tanto override quanto devDependency raiz prendem em `8.5.19`, atualizar apenas um pode deixar o outro no lock vulnerável. A mudança é patch e não indica incompatibilidade de API.

### sharp

Há duas resoluções distintas: `sharp@0.34.5` direto e `next/sharp@0.35.4`. O [GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c) afeta versões anteriores a `0.35.4` por vulnerabilidades herdadas da libheif; a versão do Next já está no piso corrigido, mas a direta não. O workspace declara `^0.34.5`, que não seleciona `0.35.x`: será necessário atualizar a dependência direta, com destino `0.35.4` ou posterior. Essa passagem muda a minor 0.x e os binários/plataformas nativas associados; conferir requisitos Node/plataforma e changelog oficial do [sharp v0.35.4](https://github.com/lovell/sharp/releases/tag/v0.35.4) no upgrade. Não há motivo para baixar o sharp já corrigido que pertence ao Next.

### smol-toml

O [GHSA-7w5x-hrqm-74c2](https://github.com/advisories/GHSA-7w5x-hrqm-74c2) corrige em `1.7.1` um loop infinito ao analisar certos documentos malformados terminados em comentário após valores de array/inline-table. O lock está em `1.6.1`; recomenda-se `1.7.1` ou posterior, dentro da mesma major. O comportamento passa a falhar com erro TOML em vez de ficar preso, mudança compatível com tratamento normal de erro de parsing.

### undici

`undici@7.28.0` fica afetado pelo [GHSA-w293-vg96-wgc3](https://github.com/nodejs/undici/security/advisories/GHSA-w293-vg96-wgc3) divulgado em 2026-09-04, que descreve perda de opções de conexão e bypass de validação TLS em `BalancedPool`; mínimo corrigido reportado para a linha 7: `7.29.1`. Releases oficiais já incluem `7.30.0` (25 de setembro), recomendado como destino atual dentro de v7. O pacote permanece na mesma major. Revisar consumidores de API de baixo nível e interceptors, embora não haja major break indicado para esta atualização.

## Sugestão de batches pequenos

1. **Próximo batch, `sharp` direto:** atualizar `sharp` da raiz de `^0.34.5` para `^0.35.4` ou a versão estável atual compatível. A aplicação passa bytes recebidos em upload para `sharp(...).metadata()` antes de verificar o formato; logo, conteúdo controlado pelo usuário chega ao parser. O GHSA de alta severidade afirma que quem processa entrada não confiável com versões anteriores a `0.35.4` é afetado e descreve RCE sob condições específicas em Linux glibc. A cópia aninhada `next/sharp@0.35.4` já está corrigida, mas não corrige o `sharp` direto usado pelo fluxo do Polaris. Validar com `apps/web/src/features/products/image-processing.test.ts`, builds Web/Admin e nova auditoria. Fonte: [GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c); [image-processing.ts no Polaris](../apps/web/src/features/products/image-processing.ts).
2. **Overrides e transitivos patch/minor:** corrigir `brace-expansion` (override 5.x existente, 5.0.12 atual), `fast-uri` (manter linha 3, até 3.1.8; o latest geral 4.x não satisfaz Ajv `^3.0.1`) e `postcss` (atualizar devDependency e override da raiz para 8.5.28, em vez de deixar Next 16.3.6 ser forçado de 8.5.23 para 8.5.19). Atualizar também `browserslist` para 4.29.1 e `nanoid` para 3.3.19 dentro das faixas dos pais. É um batch focado nos overrides e ferramentas de build, com lockfile a conferir.
3. **Outros patch/minor de ferramenta:** atualizar `@babel/core` a 7.29.7, `smol-toml` a 1.9.0 e `undici` a 7.30.0 (lock-only quando o pai permitir); confirmar paths, audit e checks afetados.
4. **Vitest como batch major próprio:** a versão estável atual resolvida é 5.0.2. O mínimo para eliminar o GHSA atual seria 4.1.11, porém P2 autoriza estáveis latest inclusive majors. Vitest 5 requer Node ≥22.12 e Vite ≥6.4; o workspace usa Vite 8.1.4, e P33 prevê Node 24. A migration documenta `clearMocks: true` por padrão em 5.0; revisar testes que observam chamadas de mocks entre casos e executar a suíte completa ao adotar 5.0.2. [Migração oficial Vitest 5](https://vitest.dev/guide/migration/#migrating-to-vitest-5-0).
5. **esbuild por resolução:** atualizar `tsx` para pelo menos 4.23.9 e confirmar resolução `esbuild ≥0.28.1` para retirar 0.27.4. O `@esbuild-kit/core-utils/esbuild@0.18.20` legado é outro caminho via Drizzle Kit; o override aninhado para 0.25.12 está fora do range original `~0.18.20`, então validar o CLI/config do Drizzle Kit com esse override antes de adotá-lo. A versão estável do Drizzle Kit consultada ainda contém o loader legado.

## Limites e incertezas

- Context7 respondeu para npm CLI: sua documentação confirma que `npm audit` reporta vulnerabilidades e paths/remediações e que `npm audit fix` roda uma instalação completa, portanto não foi executado nesta pesquisa. A descoberta de biblioteca também localizou a documentação de Bun, mas o limite de três comandos Context7 foi usado para library/docs de npm e library de Bun; não foi obtida página de docs do Bun.
- Não foi possível conferir os 26 registros do audit porque o JSON/saída com advisory IDs e caminhos não estava no checkout/contexto. As versões e aliases foram lidos diretamente do `bun.lock`; recomendações cobrem advisories oficiais encontradas até 2026-09-26, mas a lista exata deve ser cruzada com o audit original para garantir que não haja advisory diferente para o mesmo nome.
- HTML e metadata REST do GHSA-g7r4 não apresentam a mesma faixa: HTML mostra só `0.27.3`, API registra `>=0.27.3 <0.28.1`. O audit Bun coincide com a API; a nota segue a faixa estruturada e considera `0.27.4` afetado.
- O override proposto para core-utils está documentado pelo Bun, mas não foi validado executando o CLI do Drizzle Kit; confirmar compatibilidade quando a atualização for implementada. A release estável do Drizzle Kit consultada ainda contém o loader legado.
- Não foram instalados pacotes, alterados manifests/lockfile, executados testes ou feitos commits.

## Fontes primárias adicionais

- [npm CLI: audit](https://github.com/npm/cli/blob/latest/docs/lib/content/commands/npm-audit.md) (Context7): sem `fix`, o comando reporta sem modificar; `audit fix` usa a árvore completa de instalação.
- [Bun documentation](https://bun.sh/docs/pm/lockfile): referência oficial de lockfile. Descoberta de biblioteca via Context7; a consulta de docs não foi executada dentro do limite disponível.
- Links de advisories e releases oficiais junto a cada pacote acima.
