# Pesquisa do ponto 28 — Dependency Review em PRs

**Revisado em:** 2026-09-25  
**Pergunta:** o que Dependency Review cobre para vulnerabilidades/licenças e os lockfiles Bun do Polaris, como vira gate de merge e quais planos privados permitem usar a feature?

## Síntese

GitHub Dependency Review compara o grafo de dependências entre a base e o head de um PR. Ele destaca dependências adicionadas, removidas ou atualizadas, incluindo transitivas de lockfiles suportados, com advisories/severidade e dados de licença quando disponíveis. A Action devolve um check; ela só bloqueia merge se a regra da branch tornar esse check obrigatório.

O Polaris é privado e a rota aprovada em P3 é uma conta pessoal GitHub Pro. A documentação atual exige GitHub Code Security/Advanced Security para Dependency Review em repositório privado; GitHub Pro pessoal, sem esse produto, não basta. Além disso, o Dependency Graph lista npm com `package-lock.json`/`package.json`, mas não lista Bun nem `bun.lock`. Não é seguro tratar a Action como cobertura completa do lockfile Bun sem entitlement e validação específica.

O CI do Polaris já tem um baseline de advisories via Bun, mas a revisão desse baseline venceu em 2026-08-14. A proposta deve preservar/revisar esse controle; Dependency Review seria complementar, não substituto.

## Fatos documentados

### Cobertura e limites

- A Action usa o Dependency Review REST API para comparar base e head do PR. A revisão exibe mudanças diretas/transitivas representadas em manifests e lockfiles reconhecidos, com vulnerabilidades conhecidas; ela se destina a impedir que novas ou atualizadas dependências vulneráveis entrem pelo PR, não a substituir alerts para vulnerabilidades antigas em dependências que não mudaram. ([Dependency review](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review))
- O endpoint REST compara duas revisões, normalmente `{base}...{head}`, e pode retornar versão, license, pacote e dados de vulnerabilidade/severidade. Exige `contents: read` para token de escopo fino; retorna `403` em repositório privado sem GitHub Advanced Security ou quando usado contra um fork. A API não contorna a elegibilidade de plano da Action. ([REST API de Dependency Review](https://docs.github.com/en/rest/dependency-graph/dependency-review))
- Dependency Review suporta os mesmos ecossistemas do Dependency Graph. A tabela atual lista npm com `package-lock.json` como arquivo recomendado e `package.json` como arquivo adicional; **não lista Bun nem `bun.lock`**. Inferência: GitHub pode reconhecer dependências declaradas em `package.json` como npm, mas a documentação não garante que entenda o grafo resolvido/transitivo de `bun.lock`. Não afirmar cobertura completa de Bun sem validação específica. ([Ecossistemas do Dependency Graph](https://docs.github.com/en/code-security/reference/supply-chain-security/dependency-graph-supported-package-ecosystems))
- **Dependabot version updates é distinto:** a lista oficial de ecosystems do Dependabot suporta `package-ecosystem: bun` e o lockfile texto `bun.lock` desde Bun 1.1.39, mas isso não prova que Dependency Review/Dependency Graph cubra esse mesmo arquivo. ([Dependabot supported ecosystems](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories))
- Se a análise precisar de uma árvore gerada durante o build, a API também recebe snapshots pela Dependency Submission API. GitHub recomenda que a submissão e a revisão rodem em ordem no mesmo workflow; execuções paralelas podem produzir snapshots ausentes. ([Dependency review e dependency submission](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review))

### Severidade, escopo e licenças

- No README atual da Action v5, `fail-on-severity` tem `low` como default; a Action falha para vulnerabilidades no nível configurado ou superior. `fail-on-scopes` tem `runtime` como default; para fazer advisories de dev dependencies bloquearem, incluir `development` e, se desejado, `unknown`. `warn-only: true` transforma avisos em check bem-sucedido e substitui o gate. ([README oficial da Action](https://github.com/actions/dependency-review-action/blob/main/README.md))
- A Action oferece `allow-licenses` e `deny-licenses` com IDs SPDX. No README da v5, `deny-licenses` está marcado como deprecated para remoção em uma próxima major; os dois modos são mutuamente exclusivos. Se o GitHub não detectar uma licença, a Action informa o fato, mas **não falha**. Dados ausentes não significam aprovação legal. ([README oficial da Action](https://github.com/actions/dependency-review-action/blob/main/README.md))
- A API/Action é diff de dependências por PR. Para dependências sem mudança, use também a auditoria corrente do projeto e/ou Dependabot Alerts; a documentação distingue esses usos. Uma regra de licença configurada pode bloquear apenas as dependências reconhecidas e alteradas no diff.

### Como vira um bloqueio real

- A Action pode terminar com falha, por exemplo ao detectar uma vulnerabilidade acima do limiar ou uma licença fora da política configurada. Isso aparece como check do workflow. A falha só impede merge se o proprietário exigir aquele check via branch protection/ruleset. ([Dependency review](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review), [branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches))
- O exemplo oficial dispara a Action em `pull_request` e usa `contents: read`; para publicar comentário-resumo, a Action precisa também de `pull-requests: write`. O comentário é apresentação do resultado, não condição de merge. ([README oficial da Action](https://github.com/actions/dependency-review-action/blob/main/README.md))

### Requisitos de plano para repositórios privados

- Em GitHub.com, Dependency Review está disponível em todos os repositórios públicos e em repositórios privados com GitHub Code Security/Advanced Security. As páginas atuais indicam GitHub Team ou Enterprise para adquirir GitHub Code Security; repositório privado pessoal no GitHub Pro, sem licença de Code Security, não é elegível. ([Dependency review](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review), [GitHub Advanced Security](https://docs.github.com/en/get-started/learning-about-github/about-github-advanced-security))
- Para a API de repositório privado sem Advanced Security, a resposta documentada é `403`. Habilitar o Dependency Graph sozinho não substitui a licença necessária para Dependency Review privada.

## Evidência local

### Polaris

- Snapshot local em `main`, `5f3f91a4ca47d7105a2cfc84ae63d12f3eb1912e`. `.github/workflows/ci.yml` chama `bun run audit:baseline` (linha 24); não encontrei `.github/dependabot.yml`, `dependency-review-action`, chamada da API Dependency Review ou `package-lock.json` na raiz. O lockfile versionado encontrado na raiz é `bun.lock`.
- `audit:baseline` chama `bun scripts/check-bun-audit-baseline.ts`. O script executa `bun audit --json`, compara os advisories atuais aos URLs aprovados e falha quando encontra advisory novo ou quando `reviewBy` expirou. A comparação identifica exceções pela URL do advisory; uma alteração de severidade com a mesma URL não é classificada como advisory novo, daí a importância da data de revisão. ([Script](../scripts/check-bun-audit-baseline.ts), [baseline](../docs/security/dependency-advisory-baseline.json))
- O baseline registra três advisories aceitos e `reviewBy: 2026-08-14`. Na data desta pesquisa, o prazo expirou; o script rejeitaria o baseline numa próxima CI até que seja revisto. Não executei a CI. O comando não especifica `--production`, ao contrário do Hub, e a implementação compara a lista retornada pelo Bun ao baseline completo.

### Hub

- Snapshot auditado em `origin/main`, commit `bea618fe759feb16fa77269340bf3c50a283e8b0`. A CI contém `bun audit --production` (`.github/workflows/ci.yml`, linha 79). O repositório tem `bun.lock`, não `package-lock.json` na raiz; o `.github/dependabot.yml` agenda atualizações `package-ecosystem: bun` semanais para `staging`. Dependabot aceita esse ecosystem, mas isso não significa suporte idêntico da Dependency Review.
- Não encontrei `dependency-review-action` nem uso da Dependency Review API nos workflows auditados. A configuração Dependabot prova atualização automatizada, não execução de Dependency Review, cobertura do lockfile Bun ou licença de GitHub Code Security. O entitlement remoto não foi consultado.

## Trade-offs para o Polaris

- **Baseline Bun atual:** cobre o conjunto de advisories que o comando Bun retorna e bloqueia advisories fora da lista aceita; pode identificar um advisory novo em dependência existente sem mudança no PR. Não faz policy de licenças e depende da revisão periódica da exceção. O baseline atual expirou, então precisa de revisão própria.
- **Dependency Review:** mostra diffs de dependências do PR, lockfile/transitivas quando suportados, advisories e opções de licença. Não substitui a auditoria do conjunto atual, Dependabot Alerts, nem cobre com garantia o grafo de `bun.lock` segundo a tabela oficial atual. Em privado no GitHub Pro pessoal planejado, não é utilizável sem mudar plano/owner e habilitar GitHub Code Security.
- **Hub:** o fluxo atual é Bun audit com escopo de produção e Dependabot para abrir updates em `staging`; não é um exemplo de Dependency Review ativo. Só copiar esse modelo não habilita o gate nem resolve a cobertura do lockfile.

## Recomendação para Polaris

1. Restaurar o gate existente conforme a decisão P22: corrigir os três advisories temporariamente aceitos, remover suas exceções quando resolvidos e manter `reviewBy` válido. Não estender a data nem manter vulnerabilidades conhecidas como baseline para adiantar a fundação. Só considerar o check saudável depois que `bun audit:baseline` executar a auditoria e passar.
2. Não adicionar Dependency Review como check obrigatório agora: o repo é privado no plano pessoal Pro previsto e não tem `package-lock.json`; sem GitHub Code Security a API/Action privada não é elegível, e `bun.lock` não consta na lista documentada de lockfiles suportados.
3. Se a propriedade/plano do repo mudar ou o Dependency Graph passar a documentar Bun, reavaliar a Action com um PR de prova, mantendo o audit Bun. Confirmar cobertura direta e transitiva de `bun.lock` antes de tratá-la como gate; considerar Dependency Submission API se for necessário enviar snapshots gerados no build.
4. Se a Action tornar-se viável, decidir limiar e escopo: `fail-on-severity` default é `low`, e `fail-on-scopes` default é `runtime`; incluir `development` se ferramentas de build/teste também devem bloquear. Não adicionar exceção de advisory sem rationale e aprovação explícita.
5. Só tornar o check required depois de validar cobertura/plano, configurar branch protection/ruleset em `main` e corrigir o baseline expirado. Sem required check, uma falha aparece no PR, mas não bloqueia merge.
6. Não impor allow/deny list de licenças sem política de licenças validada pelo projeto; a Action tem opções SPDX, mas licenças ausentes nos metadados não equivalem a aprovação.

## Experiência anedótica da comunidade

Em uma discussão recente da GitHub Community sobre revisar a segurança de um repositório antes de adotá-lo, participantes recomendam combinar atualização de dependências, `audit` no CI e code scanning, sem tratar uma ferramenta como avaliação completa. É conselho de praticantes, não documentação de cobertura para Bun nem requisito para Polaris; aqui o ponto decisivo é que o projeto já tem um gate `bun audit` direcionado ao seu lockfile. ([GitHub Community #204302](https://github.com/orgs/community/discussions/204302))

## Limites

- A configuração de GitHub Code Security, Dependency Graph, rulesets e branch protection não foi consultada remotamente. A conclusão de plano parte do cenário registrado em P3: repo privado e owner pessoal GitHub Pro; revalidar se a titularidade/plano mudar.
- Não confirmei se o Dependency Graph consegue inferir parte das dependências de `package.json` apesar da ausência de suporte documentado para `bun.lock`; a nota registra a cobertura documentada e recomenda não pressupor cobertura transitiva.
- Nenhum workflow/teste foi executado, nenhuma licença foi alterada e nenhum secret foi lido. Não incluí caso de comunidade: a documentação oficial atual e os arquivos locais foram suficientes para a decisão.

## Recomendação curta para o cenário P3

No repositório privado em conta pessoal GitHub Pro previsto por P3, não exigir Dependency Review: a Action/API privada requer GitHub Code Security, disponível para compra em Team/Enterprise, e a cobertura documentada não inclui `bun.lock`. Manter e revisar o baseline Bun; reavaliar a Action se o repo se tornar público ou passar para uma organização/plano elegível, validando a cobertura Bun antes de torná-la required.
