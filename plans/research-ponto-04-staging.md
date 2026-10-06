# Pesquisa — ponto 4: branch `staging` ou ambientes de preview

**Data:** 24/09/2026  
**Escopo:** avaliar a recomendação do relatório de manter uma branch Git `staging`, distinguindo-a de um ambiente persistente de homologação e de previews isolados por PR. Esta nota não altera código, CI, deploys ou serviços externos.

## Conclusão

O relatório identifica uma necessidade plausível: Polaris precisa conseguir validar fluxos integrados envolvendo `web`, `admin`, banco/migrations e integrações externas antes de disponibilizar mudanças. Mas a justificativa prova a necessidade potencial de uma **superfície persistente de homologação**, não que ela precise ser alimentada por uma branch Git `staging` permanente agora.

**Recomendação provisória:** começar com `main` protegida e branches curtas de tarefa que entram por PR; usar CI e, quando Vercel/Neon forem configurados, Preview por PR com banco isolado. Adiar a branch `staging` até definirmos o plano da Vercel e o modelo de release. Se testes futuros exigirem URLs estáveis para integração entre `web` e `admin`, OAuth, webhooks ou homologação manual, criar um ambiente e banco persistentes. O ambiente pode ser ligado a uma branch duradoura por simplicidade ou receber deploys de uma branch/commit de release; são decisões relacionadas, mas não equivalentes.

## O que o relatório acerta e o que precisa separar

O Polaris tem 42 arquivos SQL de migration em `packages/db/src/migrations/`, dois apps separados (`apps/web` e `apps/admin`) e lógica explícita de PostgreSQL/RLS validada no CI. Esses componentes tornam valioso testar migrations e fluxos combinados. Porém, o workflow atual já executa testes de migration/RLS em PostgreSQL 16 e possui E2E separados para os dois apps. A CI está configurada para `main` em `push` e `pull_request`; não existe ainda uma convenção de branch `staging` no workflow versionado (`.github/workflows/ci.yml`).

O usuário informou que Polaris ainda não está conectado à Vercel e que a configuração pode ser feita depois da fundação. Portanto, não há deploy ou domínio atual a preservar, e não há evidência de que a Vercel esteja impondo hoje a estratégia de branch. Um arquivo `vercel.json` local em `apps/admin` não prova que haja um projeto Vercel conectado.

O relatório lista migrations, multi-tenancy, RLS, webhooks, cobrança, OAuth e vários provedores para defender homologação persistente. Isso é uma boa hipótese de requisito de validação integrada. A conclusão precisa ser condicional: integrações que exigem callback/webhook estável podem tornar um endereço fixo de staging útil; se cada fluxo puder ser testado em previews, CI ou sandboxes, o endereço permanente pode não justificar a manutenção extra. Essa aplicação ao Polaris é uma inferência baseada no tipo de integração descrito no relatório, não um fato demonstrado pelo repositório.

## O que as plataformas oferecem hoje

### GitHub: fluxo de branches não exige `staging`

O guia oficial de GitHub Flow descreve branches curtas por mudança, PR para a branch principal e remoção da branch de tarefa depois do merge. Ele não prescreve uma branch de ambiente. A documentação de proteção permite exigir checks e, quando configurado, um deployment bem-sucedido em um ambiente antes do merge. Portanto, o gate pode ser expresso pelo pipeline/ambiente sem transformar cada ambiente em uma linha Git de longa duração. Essa separação é compatível com a intenção já aprovada de PR e CI obrigatórios em `main`, sem aprovação humana obrigatória.

Fontes: [GitHub Flow](https://docs.github.com/en/enterprise-cloud@latest/get-started/using-github/github-flow), [proteção de branches e requisito de deployment](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

### Vercel: três caminhos diferentes

1. **Preview normal por PR/branch:** a integração Git cria uma URL de preview para branches que não são a branch de produção. Variáveis podem valer para todos os previews ou ser específicas de uma branch.
2. **Preview de uma branch `staging` duradoura:** a documentação da Vercel descreve manter uma branch chamada `staging`, associar a ela um domínio estável e variáveis de Preview específicas da branch. Essa é uma forma de ter uma URL persistente sem um Custom Environment.
3. **Custom Environment `staging`:** Vercel Pro/Enterprise permite criar um ambiente de pré-produção, escolher Branch Tracking (inclusive uma branch como `main`), atribuir domínio e variáveis próprios. A documentação atual lista 1 Custom Environment por projeto no Pro. O Pro custa US$ 20/mês como preço-base documentado; não foi tomada decisão sobre plano da Vercel.

Assim, Preview por PR e homologação persistente podem coexistir. Se Polaris escolher Vercel Hobby, branch `staging` com configuração de Preview por branch é o caminho de produto documentado para um domínio/ambiente estável; se escolher Pro, Custom Environment é outra opção e reduz a necessidade de modelar ambiente como branch. As regras exatas de deploy e promoção para produção precisam ser definidas na configuração futura, antes de conectar o repositório: o padrão Git da Vercel trata push/merge na Production Branch como produção.

Fontes: [Git deployments, Preview branches e Custom Environments](https://vercel.com/docs/git), [ambientes e Custom Environments](https://vercel.com/docs/deployments/environments), [plano Pro](https://vercel.com/docs/plans/pro-plan), [preços](https://vercel.com/pricing).

### Neon: branch de banco é independente da branch Git

Neon recomenda dois padrões possíveis: banco por PR para testar código/migrations isoladamente e um branch de banco de staging relativamente duradouro. Os branches de banco são isolados e podem partir da branch padrão ou de uma base dedicada. Uma branch de banco `staging` não obriga a existir uma branch Git `staging`; da mesma forma, branch Git `staging` não garante que o banco esteja fresco ou isolado corretamente.

Um branch de banco duradouro preserva seu próprio histórico e dados de teste; não acompanha automaticamente o estado mais recente do pai. Neon recomenda resetá-lo periodicamente para permanecer atualizado. Branches filhos de uma branch de produção protegida recebem credenciais próprias, separando acesso da produção. Se a produção futura tiver dados pessoais, copiar seus dados para homologação exige uma política de mascaramento; o recurso de branch anonimizado da Neon continua marcado como beta. Para a fase atual, dados sintéticos/seeds são a alternativa mais simples.

Neon e Vercel oferecem integração que cria uma branch de banco isolada para cada **deployment Preview**. Para testar migration, ainda é necessário executar a migration nessa branch antes de exercitar o app; a integração que cria o banco, por si só, não substitui a validação da migration. A documentação também permite criar explicitamente uma branch por PR/teste via GitHub Actions, executar migration e excluir o banco de preview ao fechar o PR.

**Ressalva multi-app:** como `web` e `admin` são apps separados, uma integração Neon instalada separadamente em dois projetos Vercel pode criar uma branch de banco por deployment/projeto. É uma inferência a partir do escopo documentado por projeto/deployment, não uma confirmação do setup futuro do Polaris. Se um fluxo de homologação exigir que os dois apps vejam os mesmos dados no mesmo instante, a implementação deve compartilhar uma branch Neon por PR ou por staging entre ambos; validar isso em um ensaio de configuração.

Fontes: [workflow de branching da Neon](https://neon.com/docs/get-started-with-neon/workflow-primer), [guia prático de branches, staging e reset](https://neon.com/blog/practical-guide-to-database-branching), [Neon para Vercel Previews](https://neon.com/blog/auth-that-just-works-in-vercel-previews), [migrations e previews](https://neon.com/blog/branching-with-preview-environments), [caso de integração Vercel/Neon](https://neon.com/blog/neon-vercel-integration).

## Trade-offs para o Polaris

| Opção | Vantagens | Custos/limites | Adequação agora |
| --- | --- | --- | --- |
| PRs curtos para `main` + CI + preview efêmero por PR | Menos branch permanente; cada mudança é isolada; testa build, E2E, RLS/migration e UI antes do merge; reduz drift entre linhas de código. | Preview pode não reproduzir callback/webhook com URL variável; precisa coordenar os previews dos dois apps e a branch Neon compartilhada se forem testados como um conjunto. | **Melhor padrão inicial.** O CI já tem checks Postgres/RLS e E2E separados; Vercel não está conectada. |
| `staging` Git permanente + banco/environment persistentes | URL previsível para web e admin; ajuda callbacks, demos, teste integrado manual e liberação em lotes; fluxo semelhante ao usado no Hub. | Toda mudança passa por uma segunda linha; PRs feature→staging e staging→main, hotfixes e back-sync precisam de regra clara; staging pode divergir de main/produção; exige seeds/reset e dono operacional. | Justificável quando houver necessidade observada de homologação integrada persistente ou baixa frequência de releases com validação manual. Não é necessidade demonstrada para iniciar. |
| PRs curtos + Custom Environment persistente da Vercel + staging DB | Separa ambiente de homologação da branch de integração; pode manter URL/vars próprios enquanto `main` recebe PRs curtos. | Custom Environment requer Vercel Pro/Enterprise; ainda é necessário desenhar como uma versão aprovada chega a produção e garantir que ambos apps usem o mesmo banco persistente. | Boa opção futura se o custo/planos da Vercel forem aceitos e o teste integrado justificar estágio permanente. |

## Julgamento da recomendação original

**Parcialmente correta.** A arquitetura de banco e integrações sustenta um estágio de validação integrado quando começar a certificação de produção. O salto de “tem migrations/RLS/webhooks/OAuth e dois apps” para “crie agora uma branch Git `staging` permanente” não é necessário. A complexidade adicional é mais defensável quando houver um requisito concreto: domínio fixo para provedores, compartilhamento de uma mesma base entre os apps, homologação manual de release ou teste com operadores/usuários antes de produção.

Durante a fase atual, a recomendação é manter um único tronco `main` protegido e branches de tarefa curtas. A atualização proposta para o CI deverá garantir que PRs para `main` executem os checks relevantes. Quando a hospedagem for escolhida, decidir então entre (a) branch persistente de staging usando Preview por branch, (b) Custom Environment na Vercel Pro, ou (c) apenas PR previews até surgir requisito para uma homologação persistente. Não configurar produção automática em `main` se a intenção for testar a versão em staging antes de liberá-la; esse release gate deve ser parte do desenho futuro.

## Experiências de praticantes — anedóticas

- Em uma discussão da comunidade GitHub sobre Dev/Staging/Production, participantes descrevem PR previews, deploy de staging após merge e produção por tag/release como fluxo viável sem branch por ambiente. Isso ilustra uma opção, não prova que seja a melhor para Polaris. [GitHub Community, maio de 2026](https://github.com/orgs/community/discussions/196024).
- Em discussão de praticantes de equipes experientes, opiniões se dividem: algumas pessoas preferem GitHub Flow para manter integração frequente e citam conflitos/back-merges como custo de branches duradouras; outras usam branches de release/staging para um período de estabilização planejado. Relatos dependem de frequência de release, equipe e qualidade de automação. [r/ExperiencedDevs](https://www.reddit.com/r/ExperiencedDevs/comments/11m1pc4/).
- Um tópico de Vercel documenta atrito de um usuário que precisava de ciclos de deploy distintos para `main` e `staging`, com promoção de deployment não correspondendo ao fluxo de release esperado. É apenas experiência individual, mas reforça que os fluxos de promoção devem ser prototipados antes de fixar branches/ambientes. [r/vercel](https://www.reddit.com/r/vercel/comments/1ovmplf/).

## Perguntas para fechar o ponto

1. Antes da produção, você precisa de uma URL de homologação que permaneça estável para conectar OAuth/webhooks e testar `web` + `admin` integrados, ou os previews por PR bastam durante a fundação?
2. Se um estágio persistente for necessário, prefere aceitar uma branch Git `staging` como implementação simples no plano Hobby, ou considerar o custo de Vercel Pro para Custom Environment separado?
3. Quer que cada merge em `main` seja testável em staging antes de qualquer deploy de produção, ou o PR Preview + CI deve ser o gate normal e produção só entra quando a integração externa for certificada?

## Fontes técnicas complementares

- DORA recomenda pequenas mudanças em branches curtas que se integram frequentemente ao trunk/main; isto pesa contra manter uma segunda branch de integração por hábito. A recomendação é sobre integração de código e não descarta um branch de release/ambiente quando há uma necessidade operacional explícita. [Continuous Integration](https://dora.dev/capabilities/continuous-integration/), [working in small batches](https://dora.dev/capabilities/working-in-small-batches/).
- Neon descreve padrões de branch por PR e staging persistente como alternativas/combinações possíveis, incluindo a manutenção necessária para staging. [Practical Guide to Database Branching](https://neon.com/blog/practical-guide-to-database-branching).

## Revalidação de Vercel Hobby e acesso ao Preview — 2026-10-01

### Fatos confirmados em fontes Vercel

- Para um repositório pessoal privado no GitHub, o Owner precisa importar/conectar
  o projeto; um Collaborator não consegue criar ou conectar o projeto Vercel.
  Isso sustenta `camilagama` como importer/owner do projeto.
- A página atual de Git, atualizada em 2026-09-18, diz que o filtro de acesso do
  commit author se aplica a repositórios de organização/workspace e **não** a
  colaboradores de contas Git pessoais. A documentação de troubleshooting,
  atualizada em 2026-01-07, ainda afirma genericamente que commits de Hobby
  devem ser autoria do owner da conta Vercel. As páginas oficiais divergem em
  escopo/recência; para este repositório pessoal, a página Git mais recente e
  específica indica que `juniordinim` poderá gerar Preview como colaborador do
  repo, mas isso deve ser comprovado no primeiro PR protegido antes de tornar
  Preview um gate.
- Hobby admite apenas um usuário externo por vez para acesso concedido a
  deployments. Esse grant permite visualizar o deployment autorizado, mas não
  torna o usuário membro do time/projeto nem lhe dá controle de configuração.
  Usar `juniordinim` como o único viewer externo atende o operador atual; novos
  usuários exigem rever o limite/acesso. Não usar Shareable Links, pois eles
  ignoram Vercel Authentication.
- Vercel Authentication com Standard Protection está disponível no Hobby.
  Desde o anúncio de 2026-09-09 e a documentação atualizada em 2026-09-15,
  All Deployments (incluindo domínio Production) também não exige add-on/plano
  pago. A identidade precisa ter acesso à deployment; não basta ter login
  Vercel.
- Vercel documenta `vercel pull`, `vercel build` e `vercel deploy --prebuilt`
  em GitHub Actions para workflows próprios. A documentação consultada não
  afirma que essa via contorna as regras de autoria do Git integration; não a
  tratar como workaround garantido sem prova.

### Decisão de acesso resultante da autorização do usuário

Manter a conta Vercel `camilagama` como owner/importer e conceder a
`juniordinim` somente visualização individual dos deployments protegidos
necessários. Habilitar Vercel Authentication; não criar Shareable Links. A
configuração remota, o caminho do primeiro Preview e o Staging persistente
continuam pendentes de provisionamento. Antes de apoiar gates de release em
Preview, testar uma PR de `juniordinim` em repositório pessoal privado e
confirmar: deploy criado, URL protegida e acesso permitido somente à conta
convidada. No Admin Production, provar também o acesso do operador autorizado
e a negação a usuários sem grant/role; `All Deployments` protege o perímetro,
mas não substitui a autorização `platform_admin`.

### Fontes atuais

- [Vercel — Git e deployments de repositórios privados](https://vercel.com/docs/git): página atualizada em 2026-09-18; contém a exceção para colaboradores de contas Git pessoais e os caminhos de Hobby/Pro.
- [Vercel — GitHub projects](https://vercel.com/docs/git/vercel-for-github): import/connect exige o owner do repositório pessoal.
- [Vercel — troubleshooting de colaboração](https://vercel.com/docs/deployments/troubleshoot-project-collaboration): orientação genérica anterior sobre autoria Hobby; manter registrada a divergência com a página Git mais recente.
- [Vercel — compartilhar Preview deployments](https://vercel.com/docs/deployments/sharing-deployments): convite externo, escopo de visualização e limite Hobby.
- [Vercel — Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication): grants de acesso e limite Hobby de usuário externo.
- [Vercel — Deployment Protection](https://vercel.com/docs/deployment-protection): atualização de 2026-09-15 confirma Standard e All Deployments disponíveis em todos os planos com Vercel Authentication.
- [Vercel Changelog — All Deployments free on every plan](https://vercel.com/changelog/protect-production-deployments-for-free-on-every-plan): anunciado em 2026-09-09.

