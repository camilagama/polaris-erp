# Pesquisa do ponto 26 — referências imutáveis para GitHub Actions

**Revisado em:** 2026-09-25  
**Pergunta:** usar SHA completo ou tag em `uses`, quais são os limites do pinning e como manter as referências atualizadas?

## Síntese

Para a base do Polaris, a opção mais segura é fixar cada action externa e reusable workflow referenciado por `owner/repo@ref` a um SHA completo do repositório oficial e manter a versão legível em comentário na mesma linha. A referência executada fica imutável; o comentário facilita revisão. Habilitar Dependabot para `github-actions` faz as atualizações chegarem como PRs, mas não substitui a revisão nem cobre todos os alertas de vulnerabilidade para SHA pins.

## Fatos documentados

- GitHub identifica o SHA completo como a única referência imutável para uma action. Uma tag, inclusive uma tag semver específica, é mais conveniente, mas pode ser movida ou apagada; uma referência de branch também pode avançar. Ao escolher um SHA, verificar que pertence ao repositório da action e não a um fork. ([Secure use](https://docs.github.com/en/actions/reference/security/secure-use), [encontrar e personalizar actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/find-and-customize-actions))
- Exemplo de pin legível:

  ```yaml
  - uses: actions/checkout@<full-commit-SHA> # v6.0.2
  ```

  O comentário não altera a referência executável depois de `@` (inferência direta da sintaxe YAML); ele pode ficar incorreto se for copiado ou atualizado manualmente sem conferir o SHA. GitHub documenta que Dependabot atualiza a anotação de versão se o comentário estiver na mesma linha. ([Secure use](https://docs.github.com/en/actions/reference/security/secure-use))
- SHA pinning evita que uma mudança posterior de tag altere silenciosamente o commit selecionado, mas não atesta que o commit escolhido é seguro. GitHub recomenda revisar o código da action, especialmente como lida com conteúdo e secrets. Uma action comprometida pode ter acesso a secrets do job e ao `GITHUB_TOKEN`; reduzir esses acessos continua necessário mesmo com SHA. ([Secure use](https://docs.github.com/en/actions/reference/security/secure-use))
- Para atualizações versionadas, Dependabot precisa de `.github/dependabot.yml`, com entrada `package-ecosystem: github-actions`, `directory: /` e uma agenda. Ele abre PRs para referências de actions e reusable workflows. A documentação limita o suporte a referências no formato de repositório GitHub e diz que ações locais e referências `docker://` ficam de fora. ([Configurar version updates](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configure-version-updates), [Secure use](https://docs.github.com/en/actions/reference/security/secure-use))
- Dependabot pode atualizar refs SHA e o comentário de versão na mesma linha. Version updates buscam a versão mais recente; security updates propõem a versão mínima corrigida para vulnerabilidades reportadas. Se o commit pinado não estiver associado a uma tag, a documentação alerta que ele pode atualizar para o commit mais recente, que pode não corresponder ao release mais recente. Dependabot Alerts não gera alertas para actions pinadas por SHA; portanto, atualizações automatizadas e cobertura de alertas são capacidades distintas. ([Secure use](https://docs.github.com/en/actions/reference/security/secure-use), [atualizações de versão para Actions](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependabot-version-updates))

## Situação das versões e ferramentas em 2026-09-25

- Na data da revisão, `actions/checkout@v7.0.1` aparece como release mais recente e estável; a versão `v7` foi anunciada como generally available. `oven-sh/setup-bun@v2.2.0` é a release mais recente do setup-bun e atualiza o runtime da action para Node.js 24. Polaris ainda usa tags major `@v4` e `@v2`; na implementação do P2/P26, reavaliar suporte, changelog e SHA exato da release corrente antes de pinning. ([releases de `actions/checkout`](https://github.com/actions/checkout/releases), [anúncio GA do checkout v7](https://github.blog/changelog/2026-06-18-safer-pull_request_target-defaults-for-github-actions-checkout/), [releases de `setup-bun`](https://github.com/oven-sh/setup-bun/releases))
- A organização oficial `github` mantém `gh-actions-lock`, parte do esforço de Workflow Dependency Pinning. Ele gera/verifica um lockfile com commit verificado e pretende validar a referência executada, mas o README o declara **Technical Preview, pre-1.0**, com formato/comandos sujeitos a mudanças; a limitação atual também pula actions de caminho local. Como o Polaris adota releases estáveis, tratar essa ferramenta como alternativa futura a avaliar após estabilização, não como requisito da fundação agora. ([`github/gh-actions-lock`](https://github.com/github/gh-actions-lock))

## Riscos e limites

- **Tag móvel:** atualizações de tag podem mudar o código sem alteração no workflow. Pin por SHA reduz esse risco de substituição posterior da ref, mas a resolução ainda depende de confiar no código e no repositório selecionados.
- **SHA não é uma auditoria:** uma action maliciosa ou vulnerável no commit fixado continua sendo executada. SHA também não congela automaticamente o que a action baixa durante a execução, serviços externos, toolchains ou referências transitivas que a própria action possa usar. Inferência: o pin fixa o commit de entrada indicado por `uses`, não todos os insumos remotos que esse código possa resolver.
- **Atualizações precisam de revisão:** o SHA não avança sozinho. Dependabot facilita PRs, mas um update pode incluir mudança funcional ou maior; revisar diff, release notes, origem do SHA e checks antes de mergear.
- **Alertas têm uma lacuna para SHA:** GitHub documenta que Dependabot Alerts não alerta ações vulneráveis quando a referência é SHA. Não tratar ausência de alerta como confirmação de segurança; observar advisories e PRs de atualização separadamente.
- **Dependabot pode gerar ruído:** commits sem tag associada podem fazer as atualizações acompanharem commits mais novos em vez de releases semver. Preferir SHA de release/tag conhecida e verificar a correspondência entre comentário, tag e commit; configurar `target-branch`, agenda e limites de PR conforme o fluxo de branches do repo.
- **Políticas de Actions:** GitHub oferece regra de repositório/organização que exige SHA completo. Essa regra garante o formato imutável da referência, não a revisão do código da action nem a imutabilidade de suas dependências remotas.

## Evidência dos repositórios auditados

- **Polaris, `main` em `5f3f91a4ca47d7105a2cfc84ae63d12f3eb1912e`:** `.github/workflows/ci.yml` usa `actions/checkout@v4` e `oven-sh/setup-bun@v2` em seus dez jobs. Não há `.github/dependabot.yml` no snapshot local. Tags major facilitam receber atualizações do mantenedor, mas não fixam o commit exato; a configuração remota do Dependency Graph/Dependabot não foi consultada.
- **Hub, snapshot `origin/main` em `bea618fe759feb16fa77269340bf3c50a283e8b0`:** actions externas observadas nos workflows são pinadas a SHAs completos com comentários de versão, por exemplo `actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5.1.0` e `oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6 # v2.2.0`. `.github/dependabot.yml` configura `github-actions` semanal para `staging`. Isso ilustra o par SHA + anotação + PR de atualização; não demonstra que os PRs sejam revisados ou que a configuração remota esteja ativa.
- **Exemplo atual de projeto:** o workflow `build_and_deploy.yml` do repositório `vercel/next.js`, branch `canary`, usa SHA completo acompanhado de comentário de versão, como `actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2`; alguns jobs também usam `persist-credentials: false`. É um exemplo de adoção, não norma nem garantia de segurança. ([Workflow](https://github.com/vercel/next.js/blob/canary/.github/workflows/build_and_deploy.yml))

## Recomendação para Polaris

1. Ao atualizar o workflow, atualizar as actions externas para releases estáveis compatíveis com a decisão P2 e trocar tags flutuantes por SHAs completos do repositório oficial, conferidos contra a tag/release. Na data da análise, as versões candidatas mais recentes são `actions/checkout@v7.0.1` e `oven-sh/setup-bun@v2.2.0`; revalidar no momento de implementar. Incluir comentário `# vX.Y.Z` na mesma linha.
2. Configurar Dependabot version updates para `github-actions` com uma agenda semanal e PRs destinados a `main`, já que Polaris não adotou branch persistente `staging` em P4. A configuração mínima documentada é:

   ```yaml
   version: 2
   updates:
     - package-ecosystem: github-actions
       directory: /
       schedule:
         interval: weekly
   ```

   Manter os updates sujeitos aos checks e revisão normal; não automatizar merge apenas porque a ref é SHA. O comentário precisa nomear uma tag de release associada ao commit, para Dependabot atualizar releases versionadas em vez de seguir commits sem tag.
3. Revisar cada PR de atualização: confirmar que o SHA pertence à action upstream, comparar comentário e release/tag, ler changelog/código relevante, e investigar advisories. Dependabot Alerts não cobre SHA refs segundo a documentação atual.
4. Considerar política `require full-length commit SHA` quando o repo estiver transferido/configurado. Ela complementa o review e o controle de token/secrets; não os substitui.
5. Para jobs que não precisam de `git fetch/push` autenticado depois do checkout, considerar `persist-credentials: false`, conforme o [README de `actions/checkout`](https://github.com/actions/checkout/blob/main/README.md).
6. Acompanhar `gh-actions-lock` e reavaliar sua adoção quando deixar de ser technical preview; sua cobertura de lockfile/validação pode complementar ou substituir a manutenção manual, mas hoje muda rápido e tem limitações.

## Evidência anedótica da comunidade

Na discussão [“Configure Dependabot only to report semver releases … when using pinned hashes”](https://github.com/orgs/community/discussions/125481), uma pessoa relata PRs semanais causados por commits mecânicos no repositório da action e pergunta como limitar updates a releases tagueados. A discussão ficou sem resposta aceita e não define comportamento nem política. Serve apenas como exemplo de ruído possível quando o SHA não está associado a uma tag; a documentação atual oferece o comentário de versão na mesma linha para Dependabot acompanhar releases.

## Limites desta pesquisa

- O workflow `canary` do Next.js e os READMEs/docs com links `main` são referências mutáveis, consultadas em 2026-09-25.
- Auditoria local de arquivos não prova que Dependabot, alerts ou políticas de pinning estejam habilitados no GitHub remoto. Não executei workflows/testes, não implementei mudanças e não consultei secrets.
