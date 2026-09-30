# Pesquisa do ponto 30 — CodeRabbit assistivo

**Data da revisão:** 2026-09-25  
**Estado:** decisão aprovada em 2026-09-25.  
**Ponto do relatório:** manter CodeRabbit como reviewer assistivo e CI como autoridade; não tornar a disponibilidade de um agente externo requisito absoluto.

## Resultado

A recomendação continua adequada ao Polaris, com escopo mais preciso: os checks de CI escolhidos explicitamente continuam sendo a autoridade automatizada de merge. Um ou mais reviewers de IA podem fornecer opiniões auxiliares, mas indisponibilidade, check, findings ou execução não devem bloquear desenvolvimento, CI, merge ou release. Findings precisam ser verificados contra o código e as regras do produto.

## Estado observado nos projetos

### Polaris

- A busca no repositório não encontrou arquivo `.coderabbit.yaml`/`.coderabbit.yml` ou referência versionada ao CodeRabbit.
- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) executa verificação, testes, builds e operações manuais. O job `verify` cobre auditorias, lint/format, tipos, testes, higiene de dependências, links de documentação, contrato de ambiente e builds. Os jobs E2E e de comportamento PostgreSQL dependem dele.
- A árvore local não comprova se o GitHub App está instalado nem se a CI ou CodeRabbit são checks obrigatórios nas regras remotas de `main`. A configuração remota não foi consultada.

### Hub

- `C:\Users\Junior\Documents\0 - Dev\hub\docs\operations\code-review-with-coderabbit.md` define a revisão como opcional; manda registrar skip e continuar se CLI, autenticação ou serviço não estiver disponível; diz que resultado limpo não autoriza merge; e recomenda não tornar a integração GitHub um check obrigatório.
- `docs/operations/release-flow.md` e `docs/operations/testing-and-ci.md` mantêm CI e critérios de release como autoridade.
- A cópia útil para Polaris é a separação de responsabilidades. A branch persistente `staging`, comandos de CLI, cadência e detalhes operacionais do Hub não se aplicam automaticamente ao fluxo atual do Polaris (P4 mantém PRs curtos para `main` até Vercel, banco e E2E não produtivos estarem configurados).

## Documentação atual e trade-offs

- O CodeRabbit publica integração de GitHub Checks, que lê resultados de checks/Actions e acrescenta sugestões à revisão. A integração é habilitada por padrão na configuração do serviço, portanto uma futura instalação precisaria conferir a configuração remota e o arquivo versionado, em vez de presumir que “assistivo” já está garantido. [CodeRabbit — GitHub Checks](https://docs.coderabbit.ai/tools/github-checks)
- Os pre-merge checks do CodeRabbit podem operar em `warning` (padrão) ou `error`; no modo `error`, combinados ao Request Changes workflow, podem bloquear merge. Manter CodeRabbit assistivo exige não ativar esse bloqueio e não tornar seu status check obrigatório na proteção de `main`. [CodeRabbit — Pre-Merge Checks](https://docs.coderabbit.ai/pr-reviews/pre-merge-checks), [CodeRabbit — Request Changes workflow](https://docs.coderabbit.ai/pr-reviews/request-changes-workflow)
- O GitHub só trata um status check como gate se ele for explicitamente exigido nas regras de proteção da branch. Isso é separado da existência do check e de aprovações de revisão. [GitHub — protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches), [GitHub — status checks](https://docs.github.com/en/pull-requests/reference/status-checks)
- A documentação de planos, consultada em 2026-09-25, diz que o plano Free permite repositórios públicos e privados, oferece resumo de PR e revisão por IDE/CLI; revisão automática de PR pelo app está no Essentials, anunciado por US$ 24 por desenvolvedor/mês no anual ou US$ 30 mensal. Limites e preços podem mudar; devem ser reconfirmados se a adoção for considerada depois. [CodeRabbit — planos e limites](https://docs.coderabbit.ai/management/plans)
- Revisão hospedada envolve enviar o diff/código para processamento externo. O runbook do Hub proíbe enviar segredos e recomenda manter tokens, senhas e URLs de banco fora da revisão. Caso a ferramenta venha a ser usada no Polaris, devem ser conferidos os termos e controles de dados vigentes e mantidos segredos fora do material enviado.

## Reanálise: GitHub Copilot code review

- **GitHub Pro e GitHub Copilot Pro são produtos/assinaturas diferentes.** A assinatura GitHub Pro do irmão, que viabiliza a hospedagem privada escolhida no P3, não inclui por si só Copilot code review. Hoje o plano individual Copilot Pro é anunciado por US$ 10/mês e inclui code review e uma cota de GitHub AI Credits. [Copilot plans](https://github.com/features/copilot/plans), [GitHub Copilot plans](https://docs.github.com/en/copilot/get-started/plans)
- Para uma conta pessoal, code review está nos planos pagos Copilot. Um titular licenciado pode pedir revisão de um PR; quando outra pessoa solicita manualmente a revisão, o uso é atribuído a quem pediu. A configuração individual de auto-review cobre os próprios PRs do titular. Revisão automática do repositório é documentada para PRs de autores com acesso/licença Copilot. Logo, se Junior não tiver Copilot code review, a assinatura pessoal do irmão não documenta uma automação que rode automaticamente nos PRs de Junior; o caminho disponível é o irmão pedir a revisão no PR. [GitHub — About Copilot code review](https://docs.github.com/en/copilot/concepts/agents/code-review), [configurar Copilot code review](https://docs.github.com/en/copilot/how-tos/copilot-on-github/set-up-copilot/configure-code-review)
- A opção para pessoas sem licença é específica de organizações em Copilot Business/Enterprise; exige políticas habilitadas e AI Credits de pagamento. Não é um atalho para a conta pessoal com GitHub Pro. [GitHub — Copilot review sem licença](https://docs.github.com/en/copilot/concepts/agents/code-review#copilot-code-review-without-a-copilot-license)
- GitHub Copilot code review consome AI Credits e, desde 2026-06-01, minutos de GitHub Actions para recursos agentic. A documentação estima US$ 0,05–1 por revisão Lite e US$ 0,25–5 Balanced, sem incluir os minutos Actions; os valores variam com o tamanho do PR e podem mudar. O uso manual é atribuído ao solicitante. [GitHub — consumo e billing](https://docs.github.com/en/copilot/concepts/agents/code-review#code-review-usage)
- Copilot Pro/Free/Pro+/Max interações podem ser usadas para treinar e melhorar modelos por padrão desde 2026-04-24, com opção de opt-out nas configurações pessoais; os termos de Business/Enterprise diferem. Antes de habilitar Copilot pessoal para este repositório privado, o titular deve revisar essa opção. [GitHub — políticas individuais e treinamento](https://docs.github.com/en/copilot/how-tos/manage-your-account/manage-policies)
- O padrão de Copilot code review é comentário. Aprovações Copilot capazes de satisfazer requisito de aprovação estão em public preview e precisam ser habilitadas em configurações separadas. Para P30, não habilitar aprovação do Copilot nem contá-la como merge requirement. [GitHub — Copilot approvals](https://docs.github.com/en/copilot/concepts/agents/code-review#copilot-approvals)

## Decisão aprovada em 2026-09-25

1. CI e critérios de release aprovados continuam sendo a autoridade automatizada; nenhum reviewer de IA se torna required check, gate, aprovação suficiente ou substituto de validação.
2. **Follow-up do usuário:** o irmão tem GitHub Copilot Student. As páginas atuais classificam Student como plano gratuito separado, com allowance de AI Credits, e descrevem code review geral para planos pagos; porém a página de acesso educacional diz que estudantes verificados recebem recursos Copilot, e uma discussão recente da comunidade GitHub registra uso de Copilot automatic PR reviewer por uma conta Student. A documentação pública não deixa a cobertura de Student para PR review suficientemente explícita; logo, não afirmar como garantido apenas pelo nome do plano. Confirmar no account UI do irmão que Copilot aparece no seletor de reviewers e que o recurso está habilitado. O anúncio de junho listou 200 AI Credits incluídos por mês para Student; confirmar a cota atual antes de estimar volume. [Plans](https://docs.github.com/en/copilot/get-started/plans), [Student access](https://docs.github.com/en/copilot/how-tos/copilot-on-github/set-up-copilot/enable-copilot/enable-copilot-students), [GitHub Community report](https://github.com/orgs/community/discussions/196455), [Student plan announcement](https://github.com/orgs/community/discussions/189268)
3. Se o recurso estiver disponível para a conta Student, o irmão pode solicitar manualmente Copilot code review em PRs de Junior; uso de solicitação manual é atribuído ao solicitante. Isso adiciona um passo operacional por PR. A automação do repositório é documentada para PRs de autores com acesso ao Copilot, então não presumir que a assinatura individual do irmão revise automaticamente PRs de Junior.
4. CodeRabbit Free continua disponível para revisão sob demanda por CLI/IDE; a documentação atual lista 3 reviews/h no CLI Free. Um agente pode chamá-lo quando a CLI estiver instalada e autenticada. O plano Free não oferece review automático de PR privado pelo app GitHub.
5. Evitar duas revisões em todos os PRs no início. Sugestão condicional: usar Copilot manualmente no PR quando estiver disponível na conta Student; chamar CodeRabbit CLI como segunda opinião em mudanças de risco (auth, multi-tenancy/RLS, billing, webhooks, migrations e workflows), em findings incertos, quando Copilot faltar, ou quando solicitado.
6. Revisão do Copilot consome AI Credits e minutos de GitHub Actions; não pressupor que Student seja ilimitado ou que revisão seja sem custo para o repo. Iniciar com chamada manual, monitorar cotas/billing e não habilitar overage sem um limite deliberado.
7. Registrar que reviews são sugestões não confiáveis, não executar correções sem verificar, e nunca incluir secrets/tokens/URLs confidenciais nos dados enviados. Em Copilot pessoal, revisar as opções de tratamento de dados da conta; em CodeRabbit, conferir configurações de armazenamento de review e termos atuais.

**Q1 aprovada:** Copilot Student do irmão pode ser solicitado manualmente como revisão opcional no PR, se o reviewer estiver habilitado; CodeRabbit Free CLI fica disponível para segunda opinião sob demanda do agente, especialmente em mudanças de maior risco, findings incertos ou quando Copilot faltar. CI e critérios de release permanecem como autoridade; nenhum reviewer de IA bloqueia merge ou aprova por si só; custos/cotas devem ser monitorados e overage requer limite deliberado.

Fontes adicionais: [CodeRabbit planos e limites](https://docs.coderabbit.ai/management/plans), [CodeRabbit privacy policy](https://www.coderabbit.ai/privacy-policy), [CodeRabbit CLI](https://docs.coderabbit.ai/cli), [GitHub Copilot code review](https://docs.github.com/en/copilot/concepts/agents/code-review), [GitHub Copilot pricing](https://github.com/features/copilot/plans).

## Experiência externa e limitações

- Um estudo empírico de CodeRabbit em 10.191 PRs de 239 repositórios encontrou 36,4% dos comentários aceitos, 7,3% que iniciaram discussão e 56,3% rejeitados; rejeições eram frequentemente ligadas a falsos positivos, redundância, escopo ou desalinhamento com a intenção do projeto. Isso sustenta triagem humana/técnica e não tratar o bot como juiz. É observacional e não mede diretamente a qualidade do CodeRabbit no Polaris. [Lin et al., 2026 — Is Agentic Code Review Helpful?](https://arxiv.org/abs/2607.03316)
- Um issue de mantenedor de projeto aberto relata avisos repetitivos de cobertura de docstrings em callbacks de testes e limitações para filtrar apenas aquele check. É um exemplo de ruído de configuração, não uma medida geral de qualidade. [gsd-build/get-shit-done issue #2932](https://github.com/gsd-build/get-shit-done/issues/2932)

## Limites

- O usuário informou que o irmão possui **Copilot Student**. Não confirmei no GitHub se o recurso Copilot code review aparece para essa conta, nem se há rate limits, orçamento ou opções de cobrança ativos.
- Não foi consultado o estado remoto do GitHub: instalação Copilot/CodeRabbit, branch rulesets, required checks, billing e Actions minutes permanecem desconhecidos.
- O comportamento de CLI, preços, limites, estimativas e políticas acima foi verificado em documentação oficial em 2026-09-25 e pode mudar.

## Fontes oficiais consultadas

- [CodeRabbit GitHub Checks](https://docs.coderabbit.ai/tools/github-checks)
- [CodeRabbit Pre-Merge Checks](https://docs.coderabbit.ai/pr-reviews/pre-merge-checks)
- [CodeRabbit planos e limites](https://docs.coderabbit.ai/management/plans)
- [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub status checks](https://docs.github.com/en/pull-requests/reference/status-checks)

## Revalidação em 2026-09-27

Fontes oficiais consultadas novamente em 2026-09-27. Esta revisão corrige a interpretação anterior sobre Copilot Student e atualiza os limites atuais do CodeRabbit Free.

### CodeRabbit Free: CLI/IDE e GitHub App

- O plano Free aceita repositórios privados e públicos, inclui resumos de PR e oferece revisão por CLI/IDE; a revisão automática de PR pelo GitHub App requer plano pago Essentials ou superior. A página atual informa três revisões CLI por desenvolvedor por hora, até 150 arquivos por revisão; o preço de Essentials é US$ 24/desenvolvedor/mês no anual ou US$ 30 mensal. Não habilitar overage: a configuração de uso por créditos é separada e depende de plano elegível e consentimento. [CodeRabbit — planos e limites](https://docs.coderabbit.ai/management/plans), [CodeRabbit — CLI](https://docs.coderabbit.ai/cli)
- A revisão CLI é iniciada no checkout local, mas envia o diff/contexto ao serviço e não é uma execução offline. A política de privacidade declara que o código de revisão não é usado para treinar modelos; também descreve armazenamento de dados derivados, como embeddings para melhoria de revisões, com opção de opt-out. Manter secrets, credenciais, dados pessoais e URLs reais fora do conteúdo enviado e confirmar a preferência de armazenamento antes de uso recorrente. [CodeRabbit — Privacy Policy](https://www.coderabbit.ai/privacy-policy), [CodeRabbit — Terms of Service](https://www.coderabbit.ai/legal/terms-of-service)
- Sem integração CodeRabbit acessível para o repo, o CLI pode usar a modalidade Free limitada; revisão remota sem checkout depende da instalação do repo na organização ativa. Free não habilita review automático do PR privado pelo App. Portanto, não instalar o GitHub App nem adicionar `.coderabbit.yaml` para automatizar PRs nesta decisão. [CodeRabbit — planos](https://docs.coderabbit.ai/management/plans), [CodeRabbit — CLI](https://docs.coderabbit.ai/cli)

### Correção: Copilot Student não inclui Copilot code review

- A documentação vigente classifica Copilot Student como plano gratuito. A página de elegibilidade diz que Copilot code review está disponível nos planos pagos; Student não aparece como elegível na matriz de planos. Logo, Student por si só não permite ao irmão solicitar Copilot como reviewer de PRs de Junior. Reconsiderar apenas se houver uma licença paga ou entitlement organizacional separado, confirmado antes de usar. [GitHub — planos Copilot](https://docs.github.com/en/copilot/get-started/plans), [GitHub — elegibilidade de code review](https://docs.github.com/en/copilot/concepts/agents/code-review)
- A via sem licença é organizacional: requer plano Copilot Business/Enterprise e políticas explícitas para permitir revisão e cobrança de AI Credits. Não se aplica à conta pessoal GitHub Pro/Copilot Student descrita no plano. Uso manual é atribuído ao solicitante quando ele tem acesso ao recurso. [GitHub — code review e uso](https://docs.github.com/en/copilot/concepts/agents/code-review)
- A página de políticas pessoais consultada enumera Free, Pro, Pro+ e Max quanto a uso de interações para treinamento; Student não aparece. Não extrapolar essa página para Student: conferir os termos e controles mostrados à conta, caso esse caminho volte a ser avaliado. [GitHub — políticas individuais do Copilot](https://docs.github.com/en/copilot/how-tos/manage-your-account/manage-policies)

### Evidência operacional no Polaris

- Neste ambiente, `coderabbit --version` retornou `0.7.6`; `coderabbit doctor` passou 9/9 verificações e reportou autenticação ativa. A revisão do commit P29, escopada a `.github/workflows/semgrep-poc.yml`, informou que o repo não está conectado a uma organização CodeRabbit acessível e usou a franquia Free.
- `coderabbit review --committed --base-commit 019c3b4 --dir .github/workflows --agent` terminou com `review_completed`, zero findings e um arquivo revisado. Não foi passado `--use-credits`; o resultado confirma que o fluxo local pode ser chamado neste ambiente, mas uma revisão sem apontamentos não prova ausência de defeitos nem disponibilidade em outros hosts.
- Não há `.coderabbit.yaml`/`.coderabbit.yml` no Polaris. Não consultei as regras remotas do GitHub, as preferências de retenção CodeRabbit, eventual licença adicional do titular Student ou a disponibilidade de Copilot na interface do PR.

### Recomendação revalidada

Manter CI e critérios de release como autoridade. Usar CodeRabbit Free CLI como segunda opinião sob demanda para mudanças de risco, findings incertos ou pedido explícito; limitar cada revisão ao diff relevante, nunca usar `--use-credits` sem autorização expressa e verificar cada finding. Não contar com Copilot Student como reviewer e não instalar CodeRabbit GitHub App, automatizar revisões de PR ou criar gate. A orientação persistente de invocação pode ficar em `AGENTS.md`, sem duplicar configurações de App; preservar a decisão já aprovada de não exigir aprovação humana nem reviewer de IA.
