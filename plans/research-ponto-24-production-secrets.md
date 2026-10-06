# Pesquisa do ponto 24 — segredos de produção fora da CI comum

**Data:** 2026-09-25  
**Pergunta:** como separar credenciais de produção dos jobs de PR/push e restringir seu uso aos fluxos operacionais?

## Síntese

A regra proposta pelo relatório é correta: os jobs automáticos de CI não precisam de credenciais de produção. P23 aprovou mover operações para `operations.yml`; P24 detalha o escopo de credenciais. Workflow separado melhora os gatilhos e a legibilidade, mas não protege secrets sozinho. O controle deve combinar job específico, Environment configurado no GitHub, ref/branch permitida e `GITHUB_TOKEN` de menor privilégio.

## Evidência no Polaris

- O job automático `verify` usa valores placeholder para builds e não referencia `${{ secrets.* }}` de produção. O PostgreSQL comportamental usa um serviço efêmero; E2E web/admin recebem URLs dedicadas `E2E_DATABASE_URL` e `ADMIN_E2E_DATABASE_URL`.
- Secrets de operações aparecem apenas nos jobs de `workflow_dispatch` em `ci.yml`: `PRODUCTION_DATABASE_URL`, credenciais OAuth, R2, Upstash e Sentry no preflight; URL/segredo de smoke e `RLS_DATABASE_URL` em jobs próprios. A existência dos nomes no YAML não confirma se há valores configurados remotamente nem qual é o destino de URLs sem nome explícito de ambiente.
- `E2E_DATABASE_URL` também é fornecida ao `production-preflight`, que compara o URL E2E com o banco principal/RLS e valida que é não-prod separado. Preservar essa finalidade de validação, mas manter o target E2E dedicado e não produtivo conforme P5.
- O workflow não declara `permissions:` nem `environment:`. As permissões padrão do token, secrets remotos, Environments e regras de branches não podem ser deduzidos apenas do YAML.

## O que a documentação atual do GitHub define

- `workflow_dispatch` requer write access e permite escolher branch/tag. A ref selecionada determina o contexto do run e o `actions/checkout` padrão busca a ref/SHA do evento. Assim, jobs de produção precisam rejeitar refs não aprovadas e usar uma política de branch do Environment; só mover o YAML para outro arquivo não basta. ([Execução manual](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow), [evento `workflow_dispatch`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows), [`actions/checkout`](https://github.com/actions/checkout/blob/main/README.md))
- Repository secrets podem ser acessíveis a qualquer usuário com write; GitHub recomenda tokens de menor privilégio e acesso a secrets apenas pelo trabalho que os necessita. Secrets de Environment ficam disponíveis somente a jobs que referenciam esse Environment depois que as regras configuradas passam. ([Secure use](https://docs.github.com/en/actions/reference/security/secure-use), [Environments](https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments))
- Em repositório privado, GitHub Pro permite criar Environments, guardar secrets e restringir branches/tags. Required reviewers e wait timers em Environments não estão disponíveis no Pro para repositórios privados; o plano do Polaris dispensa aprovação humana, então o design deve usar branch/ref allowlist e scoping de secrets. O owner precisa configurar o Environment antes de o YAML citá-lo, pois um Environment implícito não tem proteções/secrets automaticamente. ([Gerenciar Environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments))

## Perspectiva de operadores

Uma discussão da comunidade do GitHub recomenda separar credenciais por Environment (staging/production) e evitar repository secrets amplas; é uma troca entre operadores, não regra normativa, e deve ser lida junto à disponibilidade real do plano privado do Polaris. ([GitHub Community — armazenar secrets](https://github.com/orgs/community/discussions/187776))

P23 constatou que o Hub também separa CI e operações. A auditoria específica de secrets confirmou que a CI do Hub usa placeholders e bancos descartáveis, mas alguns fluxos operacionais deixam credenciais fora de Environments ou sem branch policy (`production-backup`, `NEON_API_KEY`, `VERCEL_TOKEN`) e há uma divergência entre a branch permitida no Environment staging e o trigger do deploy. Seu desenho Vercel/Neon é um exemplo de maturidade de fluxo, não uma configuração perfeita a copiar literalmente.

## Recomendação para Polaris

1. **CI de PR/push:** não mapear secrets de produção. Manter somente placeholders, Postgres efêmero e URLs/credenciais de E2E comprovadamente não produtivas.
2. **Operações:** mapear cada secret apenas no job operacional que realmente o consome. Production preflight e futuros deploy/smokes usam secrets do Environment `production`; smoke/staging usa outro Environment/escopo quando P4/P5 definirem o alvo.
3. **Ref e proteção:** restringir execução de production jobs a `main` protegida ou SHA de release e também configurar a allowlist do Environment. O input do dispatch é seleção de operação; não substitui a política de ref.
4. **Permissões:** default mínimo para `GITHUB_TOKEN` e elevar apenas no job que demonstrar necessidade. Não usar permissão de escrita no workflow inteiro por conveniência.
5. **Plano:** criar e configurar o Environment em Settings após a transferência para a conta Pro, antes de cadastrar credentials ou referenciá-lo no YAML. Não inventar reviewer approval obrigatório; a política Pro privada e a decisão P3 são sem aprovação humana.

**Limites do levantamento inicial:** nenhum valor de secret foi lido. À época, a configuração remota de Environments não tinha sido consultada; essa lacuna foi preenchida na revalidação read-only datada abaixo. Vercel ainda não está conectada conforme o usuário. Nenhum workflow operacional foi executado.

## Revalidação documental e estado remoto — 2026-09-27

P23 foi implementado desde a auditoria original: `ci.yml` agora cobre push/PR; `operations.yml` tem uma escolha única de operação, guardas de `main`, nenhum `secrets.*` nem `environment:` e strings vazias para os campos de conexão/URL. O job `production-preflight` mantém os nomes do contrato para `env:check`, mas todos os campos que poderiam conectar a Production/E2E/RLS ou invocar integrações estão vazios. RLS e os dois smoke jobs também recebem URLs vazias. Os scripts foram executados com esses campos ausentes e falharam em suas validações de configuração antes de conectar ou fazer requisições. Os checklists continuam usando `vars` e não fazem operações em serviços.

Consultas remotas read-only via GitHub CLI retornaram:

- Repository: `juniordinizm/polaris-erp`, privado, `viewerPermission: ADMIN`; o owner atual ainda não é a conta do irmão.
- Branch `main`: `protected: false`.
- Environment `Production`: existe, mas `protection_rules: []` e `deployment_branch_policy: null`.
- Environment secrets e variables: `total_count: 0` para ambos. Foram consultados apenas metadados/contagens; nenhum valor de secret foi acessado.

A documentação oficial confirma que ambientes, secrets e branch deployment rules de repositórios privados exigem GitHub Pro/Team/Enterprise; em um repositório pessoal, apenas o owner pode configurar o Environment. Os secrets só ficam disponíveis a jobs que referenciam o Environment depois que as regras aplicáveis passam. [Managing environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments), [Deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments), [Secrets reference](https://docs.github.com/en/actions/reference/security/secrets).

Também confirmamos um risco de ordem: se um workflow referenciar um Environment ausente, o GitHub pode criá-lo sem regras ou secrets. O Environment `Production` existe, mas seu estado remoto atual não tem proteção ou secrets; referenciá-lo agora não fornece o isolamento aprovado. [Managing environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).

**Conclusão para execução:** manter P23 como fail-closed e não introduzir `environment: production` nem mapear credenciais ainda. P24 fica condicionado à transferência já aprovada para a conta Pro, à proteção de `main` segundo P3 e à configuração/validação owner-side da allowlist de branch/tag no Environment `Production`. Depois, mapear cada credential apenas ao job que a consome e revalidar alvos de banco, smoke, E2E e integrações segundo P4/P5/P43. Required reviewers não entram: há um único revisor e a política do plano privado não os disponibiliza.

## Revalidação do bypass e decisão do owner — 2026-10-01

Consultas read-only atuais ao GitHub retornaram para o Environment `Production`: `deployment_branch_policy` com a única branch `main`, `can_admins_bypass: true`, zero secrets e zero variables. `operations.yml` já está integrado à `main`; seus cinco jobs de Production exigem `github.ref == 'refs/heads/main'` e a operação correspondente. `production-migration` referencia o nome de secret `DATABASE_URL_DIRECT`, ainda sem valor provisionado. O fluxo comum de CI não referencia secrets de Production, e nenhum job operacional foi executado contra serviços reais.

As páginas oficiais atuais dizem que administradores podem, por padrão, forçar deployments além das regras de proteção de um Environment e descrevem uma opção para impedir isso. A mesma documentação limita essa configuração de bypass em planos Free/Pro/Team a repositórios públicos; o repo Polaris é privado no Pro e a interface observada não expôs o controle. A documentação REST lista regras e branch policy, mas não esclarece o campo `can_admins_bypass` retornado pela API. Assim, o fato que podemos afirmar é que a API reporta `true`; não afirmamos que houve bypass nem que a proteção está bloqueada. Fontes: [Deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments), [Manage environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments), [Review deployments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/review-deployments), [REST API environments](https://docs.github.com/en/rest/deployments/environments).

O usuário aceitou em 2026-10-01 o owner `camilagama` como possível ator de bypass residual. P24 mantém secrets de Production ausentes até P4/P5 definirem os destinos. Antes de provisionar credenciais: reconsultar se a opção de desativação está disponível; se não estiver, manter o risco documentado, validar rejeição de ref não permitida sem secrets reais e escopar cada credencial somente ao job operacional necessário. Não alterar a configuração via API sem suporte documentado.
