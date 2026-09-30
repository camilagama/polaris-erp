# Pesquisa do ponto 28 — Dependency Review em PRs

**Revalidado em:** 2026-09-27
**Checkout auditado:** worktree `codex/foundation-hook`, HEAD `a0306e1d3fc6f02b8043826855b79df1a89d1d58`
**Pergunta:** Dependency Review acrescenta cobertura útil ao Polaris, que usa Bun e `bun.lock`, e está disponível no plano/forma de propriedade previstos?

## Conclusão

Manter a decisão aprovada: **não adicionar GitHub Dependency Review como gate nesta fundação**. A documentação atual limita o recurso em repositórios privados a repositórios pertencentes a organizações com GitHub Team/Enterprise Cloud e GitHub Code Security/Advanced Security habilitado. A transferência para uma conta pessoal GitHub Pro, por si só, não satisfaz esse requisito. Além disso, a tabela de ecossistemas do Dependency Graph não lista Bun nem `bun.lock`; o suporte explícito do Dependabot a Bun para atualizações não demonstra cobertura equivalente pela Dependency Review.

O gate proporcional já existente é o `bun audit` executado pelo script `audit:baseline`. No checkout auditado, a baseline não contém advisories aceitos; a execução local de `bun run audit:baseline` passou com zero advisories atuais. Isso prova somente o resultado produzido pelo Bun audit nessa execução, não uma garantia de ausência de vulnerabilidades fora da cobertura da ferramenta/registry nem o estado da CI remota. O código compara os advisories retornados pelo Bun com uma allowlist vazia e deve falhar se encontrar qualquer advisory.

## Fatos em documentação oficial

### Elegibilidade de Dependency Review

- A página de Dependency Review lista repositórios públicos e repositórios pertencentes a organizações no GitHub Team com GitHub Code Security habilitado. O quickstart oficial também descreve organizações em Team ou Enterprise Cloud com Code Security para ativar Dependency Review em privados/internos. Para um repo privado em conta pessoal GitHub Pro, a documentação consultada não mostra elegibilidade; transferi-lo entre contas pessoais não o torna organização-owned nem concede licença Code Security. [Dependency review: disponibilidade e funcionamento](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review) · [Quickstart de segurança: habilitação em privados](https://docs.github.com/en/code-security/getting-started/quickstart-for-securing-your-repository)
- Com Dependency Review habilitada, a comparação por PR cobre mudanças em manifests/lockfiles reconhecidos e pode mostrar dependências indiretas e vulnerabilidades conhecidas. A documentação explica o comportamento do recurso, mas não amplia a lista de ecossistemas reconhecidos. [Dependency review](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review)

### Dependency Graph, Bun e Dependabot não são a mesma tabela de suporte

- A tabela do Dependency Graph documenta `npm` com `package-lock.json` como arquivo recomendado e `package.json` como arquivo adicional. Ela lista diversos outros ecossistemas, mas **não lista Bun nem `bun.lock`**. Portanto, a cobertura documentada não garante que o grafo estático inclua as dependências resolvidas e transitivas específicas de `bun.lock`. A possível interpretação de `package.json` como npm não prova cobertura equivalente ao lockfile Bun. [Ecossistemas suportados pelo Dependency Graph](https://docs.github.com/en/code-security/reference/supply-chain-security/dependency-graph-supported-package-ecosystems)
- Separadamente, a tabela do Dependabot aceita `package-ecosystem: bun` a partir de Bun 1.1.39 e declara que o lockfile texto `bun.lock` é suportado para **version updates**. A própria página remete à tabela do Dependency Graph para recursos de security updates; isto não altera a tabela de arquivos/formatos documentada para Dependency Graph e não comprova cobertura de Dependency Review sobre `bun.lock`. [Ecossistemas e repositórios suportados pelo Dependabot](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories)
- A documentação atual do Bun diz que `bun.lock` é sua lockfile e que `bun audit` a lê diretamente, sem exigir `node_modules`. Também documenta consulta ao endpoint de advisories do registry, saída JSON, opções de escopo/severidade e exit code 1 quando há vulnerabilidades consideradas pelo comando. Pacotes de registries com advisory endpoint ausente podem ser listados como ignorados sem afetar o exit code; logo, `bun audit` não prova cobertura de fontes sem endpoint. [Bun `audit`](https://bun.sh/docs/pm/cli/audit) · [Formato da lockfile Bun](https://bun.sh/docs/pm/lockfile)

### Gate local versus revisão do diff

- Dependency Review é uma análise de alterações introduzidas/atualizadas em PRs e pode gerar um check. Ele só bloqueia merge quando a configuração do repositório exige esse check. Não substitui automaticamente uma auditoria da árvore completa. [Dependency review](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review)
- `bun audit` avalia os pacotes da lockfile corrente contra dados de advisories disponíveis no registry consultado. A baseline do Polaris pode tornar findings conhecidos uma exceção explícita e detectar findings fora dessa lista; isso complementa Dependabot/Dependency Review conceitualmente, mas não oferece o diff visual, os metadados de licença nem o conjunto de registros do GitHub.
- Bun documenta `--prod` como escopo apenas das dependências alcançáveis por `dependencies`, `optionalDependencies` e `peerDependencies`. O script Polaris auditado não passa `--prod`, portanto seu contrato configurado é audit da árvore completa retornada pelo Bun, incluindo dependências de desenvolvimento conforme a saída da ferramenta. [Opções do Bun `audit`](https://bun.sh/docs/pm/cli/audit)

## Evidência local no Polaris

Auditei o worktree indicado no cabeçalho. Não rodei a suíte de testes nem workflows, não consultei configurações remotas e não li secrets. Executei `bun run audit:baseline`, que chamou localmente o audit do Bun.

- `.github/workflows/ci.yml` contém o passo `Dependency advisory baseline` com `run: bun run audit:baseline` no job `verify`.
- `package.json` define `audit:baseline` como `bun scripts/check-bun-audit-baseline.ts`.
- `scripts/check-bun-audit-baseline.ts` executa `bun audit --json`, compara os URLs retornados com `acceptedAdvisories` e encerra com erro para advisories não presentes na allowlist. Se a lista de aceitos está vazia, todo advisory que o comando reportar é novo para a baseline.
- `docs/security/dependency-advisory-baseline.json` contém `generatedAt: 2026-09-27` e `acceptedAdvisories: []`. A função local aceita ausência de `reviewBy` quando a allowlist está vazia; não há prazo de exceção vigente porque não há exceções registradas. `bun run audit:baseline` passou em 2026-09-27 com a saída `bun audit baseline accepted 0 current advisories.`
- Existe `bun.lock`. Não existe `.github/dependabot.yml` neste checkout. A busca nos workflows não encontrou `dependency-review-action` nem etapa chamada Dependency Review.
- Esses fatos confirmam presença do gate e ausência de exceções configuradas. Não confirmam que uma execução atual de `bun audit` retornaria zero findings, que o registry está acessível ou que a CI remota passou. Não leio valores de secrets.

## Implicação da transferência de conta

A mudança prevista para uma conta pessoal GitHub Pro pode servir aos recursos de branch protection e Environments discutidos em P3/P24, mas não deve ser tratada como habilitação de Dependency Review para um repositório privado. Para reevaluar essa decisão, fatos necessários seriam: tornar o repositório público ou movê-lo para uma organização elegível com GitHub Code Security/Advanced Security habilitado; e obter evidência de que o Dependency Graph efetivamente representa o grafo Bun desejado. Transferência de proprietário pessoal, isoladamente, não prova nenhuma dessas condições.

## Recomendação para Polaris

1. Manter Dependency Review fora dos workflows e dos required checks enquanto o repositório continuar privado sob conta pessoal Pro sem entitlement documentado de Code Security.
2. Manter `bun audit:baseline` como controle de vulnerabilidades do grafo Bun. A baseline atual sem advisories aceitos é uma política de zero exceções; considerar o gate efetivamente saudável somente mediante execução observada e bem-sucedida de `bun audit:baseline`/CI.
3. Tratar suporte Dependabot `bun` como suporte a version updates, não como prova de Dependency Review. Dependabot pode ser avaliado separadamente quando as condições E2E e secrets específicas para PRs de Dependabot, já identificadas em P26, forem resolvidas.
4. Reabrir Dependency Review apenas se a elegibilidade mudar ou se houver nova documentação oficial de Bun no Dependency Graph. Antes de torná-lo gate, validar num PR que o grafo cobre dependências diretas e transitivas do `bun.lock`; conservar o audit Bun como cobertura da árvore corrente.
5. Não adicionar política de licenças sem política de licenciamento do Polaris validada. A utilidade de metadados de licença não equivale a autorização jurídica, e a documentação não garante metadados para todos os pacotes.

## O que as fontes não provam

- A ausência de Bun na tabela prova que não há suporte de `bun.lock` **documentado** nessa tabela; não prova que nenhum pacote declarado em `package.json` possa aparecer no Dependency Graph por alguma inferência/importação de outro formato.
- A documentação de Dependabot prova suporte a updates para Bun e `bun.lock`; não prova que Dependabot e Dependency Review usem o mesmo parser, dados ou critérios de elegibilidade.
- O resultado local de `bun run audit:baseline` prova somente que a auditoria reportada pelo Bun passou naquele momento. Não prova status da CI remota, cobertura de registry/fontes que a ferramenta não consegue consultar ou ausência de falsos negativos.
- A inspeção local prova o conteúdo versionado no worktree e a presença do passo CI; não prova status da execução remota nem configuração de segurança/entitlement no GitHub.

## Fontes primárias consultadas

- [GitHub Docs — Dependency review](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review)
- [GitHub Docs — Quickstart for securing your repository](https://docs.github.com/en/code-security/getting-started/quickstart-for-securing-your-repository)
- [GitHub Docs — Dependency graph supported package ecosystems](https://docs.github.com/en/code-security/reference/supply-chain-security/dependency-graph-supported-package-ecosystems)
- [GitHub Docs — Dependabot supported ecosystems and repositories](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories)
- [Bun Docs — `bun audit`](https://bun.sh/docs/pm/cli/audit)
- [Bun Docs — Lockfile](https://bun.sh/docs/pm/lockfile)
