# Pesquisa Q2 — Dependabot, `target-branch` e auto-merge

**Revisado em:** 2026-09-25  
**Pergunta:** o que muda ao direcionar Dependabot para `staging`, quais credenciais um workflow de PR Dependabot pode usar, e quando auto-merge fica realmente protegido por checks?

## Síntese

`target-branch: staging` direciona **version update PRs** para uma branch persistente chamada `staging` e faz o Dependabot ler manifests daquela branch. **Security update PRs continuam mirando a branch padrão**, normalmente `main`; ao definir `target-branch`, as opções daquela entrada de Dependabot passam a valer apenas para version updates.

Workflows disparados pelo actor `dependabot[bot]` recebem `GITHUB_TOKEN` somente leitura por padrão e só recebem secrets cadastrados como Dependabot secrets. O workflow pode elevar permissões explicitamente, mas isso deve ficar restrito a automações pequenas e guardadas por `github.actor`; não torna secrets normais disponíveis.

Auto-merge só espera checks/aprovações que sejam requisitos efetivos da branch de destino. Exigir CI em `staging` não protege `main`, e o inverso também não. Para o Polaris, que ainda não tem branch Git persistente `staging`, manter `target-branch` ausente para version updates e deixar os PRs apontarem para `main`. A branch não é necessária para criar previews por PR quando o provedor for conectado.

## Fatos documentados

### `target-branch`: atualizações de versão e de segurança seguem destinos diferentes

- Sem `target-branch`, Dependabot verifica manifests da branch padrão e cria PRs contra ela.
- Com `target-branch`, ele verifica os manifests dessa branch e abre **version update PRs** para ela.
- Security update PRs vão sempre para a branch padrão. Quando há `target-branch`, as demais opções da entrada daquele package ecosystem se aplicam apenas a version updates, não a security updates. ([GitHub: customizar PRs do Dependabot](https://docs.github.com/en/code-security/tutorials/secure-your-dependencies/customizing-dependabot-prs))

Portanto, uma entrada `github-actions` com `target-branch: staging` não transforma security updates em PRs para staging. Ela também não cria uma branch, uma Vercel Preview ou um Environment: é uma regra para a branch-fonte dos manifests e o destino de PRs de **version updates**.

### Workflows acionados pelo Dependabot

- Para eventos `pull_request`, `push`, `create`, deployment e eventos relacionados iniciados por `dependabot[bot]`, o token fica read-only por padrão; os secrets disponíveis são os **Dependabot secrets**, não os secrets normais de GitHub Actions. As mesmas restrições continuam em uma reexecução manual por outro ator.
- É possível aumentar os scopes do token com `permissions:` no workflow. Para secrets necessários a esses runs, guardar valores próprios como Dependabot secrets. Não mapear credenciais de produção no CI de atualizações; se uma registry privada exigir auth, usar uma credencial de leitura dedicada.
- Para `pull_request_target` de PR criado pelo Dependabot, o token também é read-only e secrets não estão disponíveis. A documentação descreve esse evento como uma alternativa de workflow de duas etapas, mas ele executa no contexto privilegiado do repositório-base; não fazer checkout/executar código do PR nesse job. ([Dependabot no GitHub Actions](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-on-actions), [troubleshooting](https://docs.github.com/en/code-security/reference/supply-chain-security/troubleshoot-dependabot/dependabot-on-actions))

### Auto-merge, checks e proteção de branch

- Auto-merge precisa estar habilitado nas Settings do repositório e em cada PR precisa ser solicitado por alguém com write. O GitHub só conclui o merge depois dos requisitos configurados para aquele PR passarem. ([Auto-merge](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/automatically-merging-a-pull-request), [configurar auto-merge](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-auto-merge-for-pull-requests-in-your-repository))
- Para Dependabot, o próprio GitHub recomenda exigir os status checks na branch de destino; sem branch rule que exija checks, um run verde não é necessariamente um requisito de merge. Aprovações também só entram no gate se forem exigidas pela regra da branch. ([Automatizar Dependabot com Actions](https://docs.github.com/en/code-security/tutorials/secure-your-dependencies/automate-dependabot-with-actions), [branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches))
- O exemplo oficial de automação filtra PRs do Dependabot, consulta metadata e usa `gh pr merge --auto`; define `contents: write` e `pull-requests: write`. Isso solicita auto-merge, não aprova PRs nem dispensa checks. Com merge queue, o `GITHUB_TOKEN` integrado não consegue enfileirar o PR; a documentação exige um PAT ou GitHub App token com permissão de merge. ([Automatizar Dependabot com Actions](https://docs.github.com/en/code-security/tutorials/secure-your-dependencies/automate-dependabot-with-actions))

## Aplicação aos repositórios

### Polaris

- O plano P4 mantém `main` como tronco, PRs curtos e sem branch Git persistente `staging` por enquanto; Preview por PR e homologação persistente são decisões distintas. A Vercel ainda não está conectada. Ver [pesquisa P4](research-ponto-04-staging.md).
- No snapshot local `main` (`5f3f91a4ca47d7105a2cfc84ae63d12f3eb1912e`), não há `.github/dependabot.yml`. A CI está em `.github/workflows/ci.yml` e mira `main`; settings remotas de Dependabot/branches não foram consultadas.
- Se a configuração de atualização for adicionada agora, omitir `target-branch`: version updates vão para `main`, executam a CI do PR e podem ganhar preview individual quando houver uma integração de deploy. Hoje não há preview operacional a validar.
- O baseline P3 proposto para o repo privado é PR obrigatório + checks CI obrigatórios, sem approval de outra pessoa. Isso ainda requer configuração remota; enquanto proteção e checks requeridos não estiverem configurados, não recomendar auto-merge. Depois, considerar auto-merge apenas para classes de update deliberadamente aceitas, mantendo os checks obrigatórios e revisão de alterações de Actions.

### Hub

- No snapshot Hub `origin/main` em `bea618fe759feb16fa77269340bf3c50a283e8b0`, `.github/dependabot.yml` agenda semanal `github-actions` e Bun com `target-branch: staging`. A configuração equivalente estava igual em `origin/staging` (`432011868541c77f765e6fae619ccbd9fe2d815e`). O workflow `deploy-staging.yml` também tem trigger `push` para `staging`.
- Esse é um modelo válido quando staging existe como branch persistente e recebe testes/deploys de integração: version updates chegam a staging antes de main. Pela regra oficial, security updates do Hub ainda são direcionados a `main`, e os settings de staging não controlam esses PRs.
- Não encontrei automação `gh pr merge --auto` nos workflows nem opção de auto-merge em `dependabot.yml`. A consulta read-only à API do GitHub em 2026-09-25 retornou `allow_auto_merge: false`; os rulesets ativos exigem `CI` para `main` e `staging`, e PR para `staging` com zero aprovações, mas não exigem PR para `main`. Portanto, o Hub usa merge explícito de Dependabot e promove o SHA homologado com workflow; o runbook não comprova merge automático nem a regra externa garante sozinha “somente pelo workflow” em `main`.

## Recomendação para Q2

1. **Polaris agora:** manter o modelo P4, sem `target-branch: staging`. Direcionar Dependabot para `main`; tratar cada PR como mudança normal, usando CI requerida quando P3 for configurado. Não habilitar auto-merge antes de confirmar remotamente que `main` exige os checks de CI esperados.
2. Usar CI de Dependabot sem secrets de produção. Se no futuro algum job precisar escrever para GitHub, elevar somente os scopes necessários no job/workflow de automação de PR e filtrar o actor do evento. Se houver credenciais para registry, criar Dependabot secret de leitura dedicado; não copiar secrets de deploy.
3. **Polaris após eventual staging persistente:** adicionar `target-branch: staging` apenas se o fluxo de produto decidir que version updates devem ser testadas nessa linha antes de main. Proteger e exigir os checks/deploys corretos em staging e em main separadamente. Continuar planejando security updates para main, pois Dependabot não os direciona para staging por meio desse parâmetro.
4. Tratar PR Preview como verificação isolada por PR quando a integração estiver configurada; `staging` é uma linha de código duradoura e não um Preview nem sinônimo de ambiente. O padrão Hub é uma escolha operacional para um branch persistente, não uma exigência a copiar para Polaris.
5. Se auto-merge for habilitado depois: ligar o recurso nas Settings; garantir rules em cada branch-alvo que exijam checks CI; solicitar auto-merge somente depois dos checks rodarem; preservar o gate para updates de Actions. Não configurar auto-approve como atalho para o auto-merge.

## Limites

- No Polaris, esta pesquisa não acessou Settings do GitHub: não confirma proteção, status checks requeridos, `Allow auto-merge`, Dependabot secrets nem actor policies. No Hub, o snapshot de rulesets e `allow_auto_merge` veio de uma consulta read-only à API em 2026-09-25; os valores/escopos de Dependabot secrets não foram lidos. Os snapshots locais de branches/workflows estão identificados acima.
- `target-branch` escolhe destino de **version update PRs**; não cria preview, ambiente, release ou promoção e não muda o destino documentado para security update PRs.
- Não li valores de secrets, não implementei configuração e não executei workflows ou testes. Docs do GitHub consultadas em 2026-09-25; a disponibilidade e o comportamento do produto podem mudar.
