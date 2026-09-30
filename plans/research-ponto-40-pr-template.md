# Pesquisa do ponto 40 — template de Pull Request

**Data da revisão:** 2026-09-25  
**Estado:** aceito em 2026-09-25. O ponto 40 foi aprovado; campo de risco usa os níveis definidos em P41.  
**Ponto do relatório:** criar um template curto para registrar objetivo, mudanças, risco, banco, provedores, documentação, validação e homologação.

## Resumo

O Polaris ainda não tem template de PR. Recomendo criar um único template Markdown em `.github/pull_request_template.md`, com três prompts centrais: problema/resultado esperado, solução e verificação relevante. Impactos de banco, integrações, configuração, rollout e rollback entram em um bloco condicional curto, preenchido somente quando a mudança os afetar.

O risco reduzido pelo template é a falta de contexto para revisão humana ou assistida por IA: por que a mudança existe, o que muda no comportamento e como verificar o caso relevante. Ele não deve repetir gates que aparecem nos checks da CI nem tentar substituir a classificação e as verificações por nível que serão decididas no P41. Se P41 aprovar níveis de risco, o template pode pedir uma classificação compacta com a mesma terminologia, sem copiar critérios ou uma lista de validações para dentro dele.

Homologação persistente não está configurada no Polaris; sua definição foi adiada até a escolha/configuração de hospedagem, callbacks e bancos não produtivos. Portanto, não deve ser campo obrigatório em todo PR. Pode ser mencionada condicionalmente em mudanças que exijam validação em preview/staging quando esse ambiente estiver configurado.

## Evidência no Polaris

- `.github/` existe, mas contém o workflow de CI e configuração do hook Ultracite; não há arquivo de template de PR. O `ci.yml` roda verificações de lint/format, typecheck, testes unitários e builds; há jobs E2E e PostgreSQL separados após `verify`, além de operações manuais em `workflow_dispatch`.
- A decisão de P20 prevê `verify:quick` como verificação local e P21 prevê seu uso no `pre-push`; os checks de PR/CI permanecem a autoridade de integração. Um template não deve pedir ao autor que marque novamente cada lint, typecheck, teste e build que os checks já mostram no PR.
- Polaris é um ERP com banco e integrações externas; mudanças de schema/dados, regras de permissão/RLS, comportamento de provedores e configuração podem exigir contexto de compatibilidade ou operação que o diff e os checks automáticos não deixam necessariamente claros. A pergunta deve ser condicional e descrever impacto, plano/compatibilidade e reversão quando aplicável; nunca pedir valores de secrets, tokens ou dados de clientes no texto do PR.
- P36 aprovou verificações Axe nas jornadas E2E representativas e revisão manual direcionada para interações. Para mudanças de UI, uma captura/descrição visual pode ajudar a revisão, mas não deve ser exigida em PRs sem alteração visual nem duplicar a validação de acessibilidade aprovada.
- P4 mantém o fluxo atual enquanto Vercel, banco e E2E não produtivos são configurados, e homologação persistente antes de produção fica para decisão posterior. Um campo “Homologação” sempre presente agora tenderia a ficar vazio ou receber `N/A` em todos os PRs.
- P3 não exige aprovação humana obrigatória; P30 mantém revisões de IA como apoio opcional. O template deve descrever a mudança para quem revisa, sem exigir @mention, aprovação humana, CodeRabbit ou Copilot.

## Comparação com o Hub

O template atual do Hub, em `C:\Users\Junior\Documents\0 - Dev\hub\.github\pull_request_template.md`, pede base `staging` para PRs normais e `main` para hotfix, atualização de documentação operacional em certos tipos de mudança, compatibilidade de migrations, testes/rollback e CodeRabbit.

Esses prompts são úteis onde o Hub tem staging persistente, release/hotfix e runbooks mais estabelecidos. Não transferir para Polaris agora a escolha fixa `staging`/`main`, a regra de hotfix, a política forward-only de migrations ou a chamada obrigatória ao CodeRabbit. O Polaris ainda está definindo sua linha de release; os detalhes operacionais devem seguir as decisões P4 e P41, e CodeRabbit não é gate.

## O que dizem as fontes

### GitHub

O GitHub injeta o conteúdo do template no corpo do PR quando o arquivo está no branch padrão. `.github/pull_request_template.md` é um dos locais suportados. A documentação recomenda prompts como referência a issue relacionada, descrição da mudança e menção a responsáveis pela revisão. Templates são conteúdo Markdown para orientar a descrição; checks de CI e rulesets são mecanismos separados para impor condições de merge. [Criar um template de PR](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository), [padronizar PRs e aplicar políticas](https://docs.github.com/en/pull-requests/reference/managing-and-standardizing-pull-requests).

É possível manter templates múltiplos dentro de `PULL_REQUEST_TEMPLATE/`; o template específico é solicitado pela query `template` na URL de criação do PR. Assim, o caminho suportado existe, mas não é necessário criar várias variantes enquanto não houver classes de PR com contextos materialmente distintos. [Localização de múltiplos templates](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository), [query parameters de criação de PR](https://docs.github.com/en/pull-requests/reference/using-query-parameters-to-create-a-pull-request).

### Projetos maduros

- O template atual de `vercel/next.js` organiza instruções específicas para documentação, correções e features, pede issue/testes/docs quando aplicável e deixa `What?`, `Why?` e `How?` para PRs de maintainers. Ele demonstra prompts dependentes do tipo da contribuição; também contém exigências específicas do projeto, como RFC, telemetry e commit assinado, que não devem ser copiadas. [Next.js — PR template em `canary`](https://github.com/vercel/next.js/blob/canary/.github/pull_request_template.md).
- O template do `hashicorp/design-system` pede resumo, descrição, screenshots, links, checagem de regressão visual e changelog; coloca itens PCI específicos em um bloco expansível e condicional. O padrão transferível é deixar evidência visual quando a UI muda e separar controle operacional especializado; Percy, Changesets e PCI são específicos do produto/equipe. [HashiCorp Design System — PR template](https://github.com/hashicorp/design-system/blob/main/.github/pull_request_template.md).

Os exemplos mostram estruturas viáveis, não uma norma única. O Polaris tem um autor principal, uso intensivo de agentes e um conjunto de checks próprios; precisa de menos campos permanentes que projetos com contribuições externas, múltiplas equipes e obrigações específicas.

### Fórum — evidência anedótica

Em um tópico recente de `r/ExperiencedDevs`, há opiniões conflitantes: uma pessoa relata que checklists com itens irrelevantes viraram ruído e passaram a ser ignorados; outras preferem que PRs incluam problema/solução/testes ou rollout quando necessários. São relatos individuais, sem valor de padrão normativo, mas apoiam a escolha de prompts condicionais e enxutos em vez de dezenas de caixas universais. [Discussão sobre templates em equipes](https://www.reddit.com/r/ExperiencedDevs/comments/1p1zxs6/do_you_actually_enforce_pr_templates_in_your_teams/).

## Recomendação para Polaris

Manter um template padrão em `.github/pull_request_template.md` com o conteúdo conceitual abaixo, em português e conciso:

1. **Problema e resultado esperado:** qual necessidade ou comportamento este PR endereça; link de tarefa/issue/decisão quando existir, sem tornar ID obrigatório se o fluxo não o fornecer.
2. **Solução e escopo:** resumo das mudanças e do efeito observável que não esteja claro só pelo título/diff; em PR de UI, incluir captura ou indicar o fluxo visual alterado.
3. **Verificação:** cenários manuais ou configuração especial necessários para revisar; CI exibe os resultados automatizados, então não reproduzir checklist de lint/typecheck/unit/E2E/build no corpo. Para alterações visuais/interativas, descrever a revisão relevante conforme P35/P36.
4. **Impacto operacional (somente se aplicável):** banco/migration, permissão/RLS, integração/provedor, variável de ambiente ou execução manual; declarar compatibilidade e plano de rollout/reversão quando isso não for óbvio. Referenciar runbook ou documento alterado. Nunca incluir secrets ou dados reais.
5. **Risco:** se P41 aprovar níveis explícitos, registrar apenas o nível conforme o vocabulário final de P41; não incluir no template sua matriz inteira nem repetir os comandos/DoD daquele ponto.

Seções 1–3 devem funcionar para um PR comum e curto. O bloco operacional pode ser colapsável/condicional ou ter uma instrução explícita para removê-lo quando irrelevante, em vez de forçar “sem banco”, “sem provedor” e “sem homologação” a cada mudança. Um campo de homologação fica fora do template inicial; reavaliar quando o ambiente persistente existir e PRs realmente precisarem registrar a evidência.

Não criar templates separados para feature/bugfix/docs nem exigir checagem de CodeRabbit/Copilot agora. Reavaliar múltiplos arquivos se surgir uma rota operacional ou classe de contribuição com requisitos diferentes; a seleção então deve usar as URLs com `template` documentadas pelo GitHub.

## Limites desta pesquisa

O template não bloqueia PR incompleto por si só, não prova que migrations/providers são seguros e não substitui CI, proteção de branches, runbooks ou a classificação de risco de P41. Nenhum código/configuração foi alterado e nenhum teste foi executado.
