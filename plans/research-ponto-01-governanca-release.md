# Pesquisa do ponto 1: governança Git e fluxo de release

**Consultada em:** 2026-09-24  
**Escopo:** avaliar a afirmação do relatório de que Polaris tem boa base técnica, mas deixa a `main` sem proteção e o release pouco formalizado. A conclusão sobre configurações reais depende da auditoria local e do GitHub; esta nota pesquisa o critério de engenharia e as opções para uma pessoa mantenedora.

## Conclusão

Se a `main` realmente não tem proteção nem checks obrigatórios, a lacuna descrita no relatório é real: CI existente que pode ser ignorada por push direto não é uma barreira de integração. A correção proporcional é **exigir PR e os checks estáveis de CI antes de atualizar `main`**, sem obrigar uma aprovação humana de outra pessoa quando não há outro revisor disponível.

O relatório não deve transformar o fluxo do Hub — especialmente uma branch duradoura `staging` — em padrão universal. A prática atual favorece feedback automatizado cedo, mudanças pequenas, processo repetível e aprovações proporcionais ao risco. Para uma mantenedora solo, PR + checks exigidos oferece trilha e bloqueio automatizado; não oferece revisão independente. Se a separação de funções for requisito de negócio, legal ou de segurança, será necessário um segundo revisor humano.

**Redação revisada sugerida para o ponto:** “Proteger `main` contra push direto/force push e exigir PR com os checks de CI relevantes. Tratar revisão humana independente, bypass e homologação conforme o número de mantenedores, risco da mudança e requisitos operacionais; usar staging como ambiente de implantação quando ele validar algo que CI/preview não valida.”

## Evidências atuais

### 1. Checks no workflow só são uma barreira se a branch protegida os exigir

GitHub permite exigir que mudanças cheguem por PR e que checks identificados tenham sucesso antes do merge. A exigência de PR pode existir sem aprovação obrigatória; checks exigidos bloqueiam merge até o status ficar `successful`, `skipped` ou `neutral` ([regras disponíveis para rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets); [branches protegidas](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)). Portanto, “workflow de CI existe” e “CI é enforcement da `main`” são estados distintos.

O fluxo leve do GitHub é branch curta → PR → checks/feedback → merge. A documentação destaca que PRs mantêm histórico e que checks configurados no PR ajudam a encontrar erros antes do merge ([GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow)). O próprio repositório público `github/docs` tem um ruleset ativo para `main` com PR obrigatório, checks requeridos, bloqueio de force push e merge queue ([ruleset visível do `github/docs`](https://github.com/github/docs/rules/19633356)). É um exemplo de produção, não prova de que todas as suas regras sejam necessárias em um repo solo.

DORA, cuja pesquisa continua como base do modelo Core, define entrega contínua como um processo de baixo risco e confiável, e recomenda automação e feedback rápido. A prática atual de mudança em lotes pequenos reduz o tempo até o feedback e é apontada como contrapeso importante aos riscos de mudanças geradas mais rapidamente com IA ([DORA: small batches](https://dora.dev/capabilities/working-in-small-batches/); [DORA 2025](https://dora.dev/research/2025/dora-report/)). Isso sustenta exigir checks úteis e manter PRs pequenos; não sustenta adicionar cerimônia sem redução demonstrável de risco.

### 2. Aprovação humana é um controle diferente de PR + CI

O autor de um PR não pode aprová-lo. Uma regra de “1 aprovação” bloqueia o fluxo normal se há apenas uma pessoa com permissão para revisar; dar bypass ao autor pode desbloquear o merge, mas deixa de ser uma aprovação independente ([GitHub: revisar mudanças propostas](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/reviewing-proposed-changes-in-a-pull-request); [requisitos de reviews](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)).

DORA recomenda que controles de mudança rotineiros sejam atendidos por revisão por pares durante o desenvolvimento, apoiada por CI, testes e monitoramento. Sua pesquisa não encontrou evidência de que um processo formal externo de aprovação reduza a taxa de falha; processos pesados podem aumentar espera e tamanho dos lotes ([Streamlining change approval, revisto em 2025](https://dora.dev/capabilities/streamlining-change-approval/)). A pesquisa é principalmente sobre organizações/equipes, não prova experimental sobre uma mantenedora solo; a aplicação aqui é uma inferência proporcional: não há valor em configurar um “segundo aprovador” fictício ou obrigatório para tarefas rotineiras se não existe outro revisor.

Mesmo sem aprovação bloqueante, a pessoa autora pode revisar o próprio diff, descrição, checks e riscos antes de fazer merge. Isso é uma revisão pessoal útil, mas deve ser chamada de **self-review**, nunca contada como aprovação independente. Há relatos comunitários de uso de PR solo justamente para ler o diff e rodar testes/formatadores antes de atualizar `main`; esses relatos são informais e não substituem as regras do GitHub ([discussão no r/github, 2025](https://www.reddit.com/r/github/comments/1iofvpb/git_flow_on_my_own_project_is_funny/)).

### 3. Bypass precisa ser uma política visível

Há uma diferença relevante entre os dois mecanismos do GitHub:

- Nas regras clássicas de branch, restrições **não se aplicam por padrão** a administradores e papéis com permissão de bypass. É possível incluir esses papéis com “Do not allow bypassing the above settings” ([GitHub: branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)).
- Rulesets permitem indicar atores com bypass. A opção **For pull requests only** preserva a exigência de abrir PR e gera trilha, mas o ator escolhido ainda pode ignorar regras da branch ao fazer merge desse PR. Actions de bypass podem ser inspecionadas nos insights do ruleset ([criação de rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository); [visão de rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)).

**Recomendação:** não dar bypass rotineiro para “consertar” checks quebrados. Decidir se o controle deve também valer para a conta administradora; se houver bypass de emergência, mantê-lo restrito ao PR e registrar motivo/seguimento. Para uma única mantenedora, um bypass pode ser necessário para recuperação operacional, mas enfraquece a garantia de CI quando usado. Um check que bloqueia merge precisa ter um caminho de correção, não só uma exceção silenciosa.

### 4. Staging pode ser um ambiente, sem virar necessariamente uma branch permanente

GitHub Actions trata `staging` como ambiente de implantação. Ambientes podem limitar branches autorizadas, separar secrets, exigir condições antes do job e guardar histórico de deploys. O ruleset também pode exigir deploy bem-sucedido em um ambiente antes do merge, por exemplo, homologação antes da `main` ([GitHub: ambientes](https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments); [regras disponíveis](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)). Isso não exige criar uma branch `staging` de longa duração.

DORA recomenda implantar o mesmo pacote e usar o mesmo procedimento para os ambientes, para que aquilo que foi validado seja o que chegará a produção ([DORA: deployment automation](https://dora.dev/capabilities/deployment-automation/)). A documentação do Google Cloud distingue testes funcionais de staging: staging deve testar o procedimento de deploy e ser suficientemente próximo da produção ([padrão de ambientes](https://docs.cloud.google.com/architecture/hybrid-multicloud-patterns-and-practices/environment-hybrid-pattern)).

**Inferência para Polaris:** com uma mantenedora e já existindo preflight/smokes segundo o relatório, o ponto de partida mais simples é CI obrigatório no PR + um self-review/checklist curto + preflight/smoke do release. Adotar staging como ambiente se ele verificar integração real, configuração, migration/deploy ou comportamento não coberto pelos checks; adicionar required deployment antes de merge quando isso for importante para o risco. Uma branch `staging` separada só se justifica se houver um ciclo de homologação/promoção que realmente precise de uma linha de integração própria. A branch permanente acrescenta merges, possível divergência e regra adicional a manter.

**Caveat de plano:** em repositórios públicos, ambientes estão disponíveis nos planos atuais; em repositórios privados, o acesso a ambientes depende do plano, e required reviewers/wait timers em GitHub Free/Pro/Team são limitados a repositórios públicos. Confirmar o plano e a visibilidade antes de fazer uma aprovação manual de ambiente parte do fluxo ([GitHub: deployment protection rules](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)).

## Baseline proporcional para um repositório solo

1. **`main`:** exigir PR, checks de CI estáveis e relevantes, bloquear force push e deleção. Selecionar nomes de checks que sempre são publicados por PR; não marcar jobs condicionais que possam nunca rodar. Avaliar regras clássicas vs ruleset sem migrar apenas por preferência: uma regra simples basta; rulesets ganham em visibilidade, camadas e bypass explícito.
2. **Aprovações:** deixar sem mínimo obrigatório enquanto existe só uma pessoa revisora. Manter self-review documentado. Pedir segunda pessoa para mudanças de risco alto ou quando o negócio/contrato/regulação exigir segregação de funções.
3. **Bypass:** explicitar em configurações/docs se administradores podem ignorar as regras. Se houver exceção de emergência, usar PR e deixar o motivo registrado; restaurar imediatamente o check ou a proteção contornada.
4. **Release:** manter um procedimento repetível com build/artefato, migrations relevantes, preflight e smoke. Se usar mais de um ambiente, promover o mesmo artefato com configuração específica por ambiente. Uma aprovação manual só agrega quando a pessoa que aprova tem informação ou autoridade que o automatismo não tem.
5. **Staging:** tratar primeiro como alvo de deploy. Exigir sucesso de staging antes do merge apenas se esse deploy cobre um risco real e não gera fila de aprovação sem revisor. Não copiar automaticamente do Hub uma branch `staging`.
6. **Checks e política:** manter branch protections consistentes com o CI já existente; uma política fácil de manter é melhor que uma lista de gates que vive falhando ou sendo burlada. DORA recomenda revisão/automação na linha de desenvolvimento e monitoramento, não um processo formal externo para toda mudança.

## Veredito preliminar

**Diagnóstico:** procede caso o estado de `main` reportado seja confirmado. A lacuna principal não é “falta de muitas aprovações”; é permitir que uma mudança chegue ao branch de produção sem o caminho de PR e sem os checks que o repositório já executa.

**Recomendação:** proteger `main` com PR + CI obrigatório, escolhendo explicitamente a política de bypass. Não impor aprovação de outra pessoa na fase solo. Projetar homologação como ambiente de deploy quando trouxer validação concreta; não exigir branch `staging` por imitação. O fluxo deve ser repetível e curto, com evidência de CI/preflight/smoke e recuperação possível.

## Decisões em aberto para a conversa de alinhamento

- Polaris terá uma pessoa mantenedora por quanto tempo? Existe alguém disponível para revisar mudanças de alto risco?
- O objetivo da proteção é evitar push acidental, obter trilha/auditabilidade, garantir qualidade automatizada, ou cumprir separação de funções? Cada objetivo pede controle diferente.
- A branch `main` corresponde a deploy de produção, ou o processo atual promove releases manualmente?
- O repo GitHub é público ou privado e qual plano habilita os environments necessários?
- Quais nomes exatos de checks no workflow devem bloquear merge? Esses jobs rodam em todos os PRs?
- Há validação relevante que só um staging persistente executa? Ou PR previews + preflight/smoke cobrem o caso?
- O bypass deve ser impossível no caminho normal, ou permitido apenas dentro de PR para recuperação emergencial? Quem registra e revisa a exceção?

**Limitação:** DORA publica evidência agregada principalmente sobre equipes e organizações; a adequação de revisão externa e gates ao Polaris depende de seu nível de risco, colaboradores, configuração GitHub e deploy real. O relatório de fundação e a inspeção local continuam sendo a fonte para confirmar os fatos específicos do Polaris/Hub.
