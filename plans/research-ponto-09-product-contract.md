# P9 — Escopo de `PRODUCT.md` como contrato de produto

**Pesquisado em:** 2026-09-24  
**Pergunta:** O `PRODUCT.md` atual precisa crescer? Que conteúdo pertence a um brief de produto, e o que deve ficar no README, em regras normativas ou em especificações de funcionalidades?

## Conclusão

Ampliar o `PRODUCT.md` de forma **moderada e orientada a decisões**. O arquivo atual já registra propósito, usuários, posicionamento e princípios, mas ainda não explica com nitidez o problema que os usuários tentam resolver, os resultados esperados, os limites do produto nem como reconhecer valor entregue. Isso justifica um brief melhor; não justifica transformar o arquivo em especificação completa do ERP.

Usar `PRODUCT.md` como contexto durável para decisões de produto: **quem é atendido, qual problema o produto resolve, que resultado promete, quais jornadas importam, quais limites orientam o escopo e que sinais indicariam sucesso**. Manter regras de negócio testáveis em documentos normativos próprios, requisitos detalhados em specs por funcionalidade, arquitetura em documentos técnicos/ADRs e orientação para executar/contribuir no `README.md`. Essa separação é uma recomendação derivada das fontes abaixo; não existe um formato universal obrigatório para um arquivo chamado `PRODUCT.md`.

O conteúdo proposto no relatório para público, problema, jornadas, não objetivos e critérios/sinais de sucesso tem fundamento. **Objetos centrais, invariantes específicos e regras de billing precisam ser triados**, pois vários exemplos do relatório são vocabulário, regra normativa ou comportamento verificável, não direção de produto.

## Distinção entre documentos

| Artefato | Pergunta que responde | Conteúdo recomendado | Deixar fora |
|---|---|---|---|
| `PRODUCT.md` | Para quem o Polaris existe, qual problema prioriza e que resultado busca? | Propósito e problema; usuários primários/secundários; proposta de valor; resultados/jornadas principais; limites e não objetivos de produto; poucos sinais de sucesso; hipóteses e lacunas ainda não validadas; links para documentos de autoridade. | Regras detalhadas; critérios de aceite por feature; schema; arquitetura; setup local; backlog e roadmap detalhado. |
| `README.md` | O que é este repositório e como começar a usá-lo ou contribuir? | Resumo curto do projeto/repositório, pré-requisitos e primeiros comandos, links de suporte/contribuição e índice documental. | Brief extenso, catálogo de regras, decisões arquiteturais detalhadas e instruções de uso completas. |
| Catálogo de regras de negócio | Que comportamento é obrigatório, permitido ou proibido no domínio? | Regras explícitas, linguagem validável por quem conhece o negócio, exceções e identificadores quando úteis; referências para código/testes que as implementam. | Posicionamento, narrativa de produto, procedimento técnico de implementação. |
| Spec de funcionalidade/RFC | O que uma mudança concreta precisa fazer e como saber que ficou pronta? | Contexto e problema local, casos de uso/jornadas, comportamento, critérios de aceite, limites da mudança, alternativas/questões quando pertinentes; links para regras existentes. | Visão estável de todo o produto ou duplicação integral do catálogo de regras. |
| Arquitetura/ADR | Como o sistema implementa algo e por que uma decisão técnica foi tomada? | Componentes, interfaces, fluxos, restrições técnicas, alternativas e rationale de decisões significativas. | Definição de necessidades do usuário ou políticas de negócio. |

GitHub descreve README como página de entrada que comunica o que o projeto faz, por que é útil e como começar; também diz que deve conter apenas o necessário para desenvolvedores começarem a usar/contribuir e recomenda deixar documentação mais longa em outro lugar. Isso favorece um README curto que encaminha para `PRODUCT.md` e o índice, em vez de fundir os dois. ([GitHub Docs: About READMEs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes))

Para regras, o [Business Rules Manifesto](https://www.businessrulesgroup.org/brmanifesto.htm), produzido pelo Business Rules Group, trata regras como parte explícita e distinta de requisitos; diz que expressam restrições sobre comportamento, são separáveis de processos e de sua forma de aplicação, e devem ser formuladas para validação por pessoas do negócio. A especificação formal [OMG SBVR 1.5](https://www.omg.org/spec/SBVR/1.5/) é uma norma para vocabulário e regras de negócio. Essas fontes apoiam dar às regras uma localização própria e autoridade explícita, sem obrigar Polaris a adotar SBVR ou seu formalismo.

## Avaliação dos conteúdos propostos no relatório

| Proposta do relatório | Decisão de escopo | Justificativa |
|---|---|---|
| Público (revendedores, operadores, administradores, platform admins) | **Sim, com hierarquia.** Distinguir comprador/usuário principal, demais papéis na operação do cliente e operador interno do SaaS. | As fontes de pesquisa de usuários recomendam identificar quem usa o serviço, seus objetivos e necessidades, incluindo quem presta suporte; não basta listar cargos sem dizer qual público o produto prioriza. ([GOV.UK: Learning about users and their needs](https://www.gov.uk/service-manual/user-research/start-by-learning-user-needs)) |
| Problema e solução atual | **Sim.** Explicar tarefas/dificuldades e alternativas atuais, como planilhas, quando confirmadas. | O padrão de serviço GOV.UK orienta começar pelo problema do usuário e testar as premissas cedo; opiniões não baseadas em usuários devem permanecer identificadas como hipóteses, não como fatos. ([GOV.UK: Understand user needs](https://www.gov.uk/service-manual/service-standard/point-1-understand-user-needs), [Learning about user needs](https://www.gov.uk/service-manual/user-research/start-by-learning-user-needs)) |
| Jornadas principais | **Sim, em nível de resultado.** Registrar poucos fluxos de ponta a ponta por objetivo, sem todos os ramos ou passos de UI. | Uma jornada ajuda a dizer que problema se resolve no produto; tarefas, critérios de conclusão e exceções pertencem à spec. O Service Manual mede jornadas com tarefas de usuários, taxa de conclusão e tempo, em vez de tratar telas isoladas como resultado. ([GOV.UK: Measuring the success of your service](https://www.gov.uk/service-manual/measuring-success/measuring-the-success-of-your-service)) |
| Objetos centrais | **Só uma orientação curta ou link.** Definições de termos e relações pertencem ao glossário de domínio/contexto (P8); estrutura persistida pertence ao schema. | DDD associa o vocabulário a um modelo de domínio compartilhado, mas a descrição concisa do produto não precisa duplicar um dicionário ou modelo de dados. ([Microsoft Learn: Domain analysis](https://learn.microsoft.com/en-us/azure/architecture/microservices/model/domain-analysis)) |
| Invariantes, como tenant isolation, atomicidade de estoque/venda, idempotência e role RLS | **Não como lista de regras no brief.** Colocar invariantes de negócio no catálogo de regras; isolamento e role em segurança/arquitetura; critérios observáveis na spec e testes. `PRODUCT.md` pode resumir um princípio de produto de alto nível e apontar para a autoridade. | O relatório mistura política de negócio com desenho técnico. O Business Rules Manifesto distingue regra de negócio de implementação e aplicação; documentos de design de Gerrit separam casos de uso/aceite de possíveis soluções e detalhes de implementação. ([Business Rules Manifesto](https://www.businessrulesgroup.org/brmanifesto.htm), [Gerrit: Design Docs](https://gerrit-review.googlesource.com/Documentation/dev-design-docs.html)) |
| Não objetivos | **Sim, em nível durável de produto.** Declarar fronteiras que evitam interpretações erradas; reavaliar se estratégia mudar. | A orientação da Atlassian para PRDs sugere explicitar o que não está sendo feito para limitar dispersão. Não objetivos de uma feature específica devem ficar na spec daquela feature, não virar lista global. ([Atlassian: PRD](https://www.atlassian.com/agile/product-management/requirements)) |
| Billing | **Só a natureza do modelo**, se for importante para entender o produto (por exemplo, SaaS pago); estados de plano, elegibilidade, cobrança e exceções vão para regras/specs de billing. | Isso mantém a direção do produto sem tornar seu brief a fonte de verdade para comportamento de cobrança, que precisa ser preciso e testável. Regra e mecanismo de aplicação são conceitos separados no manifesto de regras. ([Business Rules Manifesto](https://www.businessrulesgroup.org/brmanifesto.htm)) |
| Critérios/sinais de sucesso | **Sim, poucos e ligados a resultados de usuário/negócio.** Para fase inicial, declarar o que seria evidência de sucesso e, se ainda não medido, marcar hipótese ou baseline pendente; não inventar metas numéricas. | GOV.UK orienta derivar benefícios de necessidades reais, estabelecer baseline, definir poucas métricas capazes de responder se o serviço está funcionando, combinar dados quantitativos com pesquisa e rever medidas ao longo da evolução. ([Set performance metrics](https://www.gov.uk/service-manual/measuring-success/how-to-set-performance-metrics-for-your-service), [Measuring the benefits](https://www.gov.uk/service-manual/measuring-success/measuring-service-benefits)) |

## Sinais de sucesso: produto versus operação

`PRODUCT.md` deve nomear **resultados do usuário e do negócio**, não substituir um plano de analytics nem prometer números ainda sem dados. Para Polaris, candidatos a investigar em discovery podem incluir concluir uma rotina de cadastro/estoque/venda sem recorrer a planilhas, tempo ou erros em tarefas representativas e retenção/uso recorrente por organizações. São exemplos de perguntas de pesquisa, **não métricas aprovadas nem fatos do produto**. GOV.UK recomenda primeiro explicitar propósito/necessidades, estabelecer baseline e então escolher poucas medidas úteis; para jornadas, usa conclusão de tarefas e tempo, combinados com pesquisa de usabilidade. ([GOV.UK: Set metrics](https://www.gov.uk/service-manual/measuring-success/how-to-set-performance-metrics-for-your-service), [Measuring success](https://www.gov.uk/service-manual/measuring-success/measuring-the-success-of-your-service))

Uptime, latência, taxa de erros, restauração e segurança continuam importantes, mas são objetivos operacionais/qualidade do serviço. Evitar tratá-los como prova suficiente de que o produto resolveu o problema do usuário; mantê-los nos docs de operação/observabilidade e requisitos não funcionais apropriados. Esta distinção é uma recomendação de organização derivada da separação que as fontes fazem entre benefícios do serviço e métricas para avaliar a jornada. ([GOV.UK: Measuring the success](https://www.gov.uk/service-manual/measuring-success/measuring-the-success-of-your-service))

## Conciso ou enciclopédico

**Manter o brief conciso, não minimalista.** A medida é se o texto reduz decisões baseadas em suposições sem duplicar outras autoridades. Uma página curta pode conter problema, público, valor, limites e sinais de sucesso; detalhes crescem por links para research, regras, especificações e arquitetura. A Atlassian relata usar “contexto suficiente” em PRDs, incluir objetivos, pressupostos e não objetivos, e ligar recursos aprofundados em vez de reproduzir seu conteúdo. ([Atlassian: PRD](https://www.atlassian.com/agile/product-management/requirements))

Google SRE recomenda uma proposta curta que explica problema e por que vale resolvê-lo, e adverte que ela não é um design doc em miniatura. Como é orientação de iniciação de projeto, não um template obrigatório de brief de produto, a aplicação aqui é por analogia: `PRODUCT.md` estabelece direção; especificações detalham mudanças concretas. ([Google SRE: A guide to engineering project initiation](https://sre.google/resources/practices-and-processes/what-why-how/))

Não existe, nas fontes consultadas, um formato obrigatório chamado `PRODUCT.md`. Os formatos diferem porque servem a propósitos distintos; a recomendação de usar campos enxutos é uma síntese, não uma norma. O handbook da Sourcegraph diz que mantém template RFC padrão mínimo e formatos complementares por objetivo, usados da concepção à medição de sucesso. É relato da própria prática de uma empresa de software, não regra universal. ([Sourcegraph Handbook: RFC formats](https://github.com/sourcegraph/handbook/blob/main/content/company-info-and-process/communication/rfcs/index.md))

## Exemplos públicos e práticas de equipes

- **GitHub** define a função pública de README como orientação inicial e contribuição, e fornece links relativos para aprofundamento; é a fonte primária para o papel do README no próprio GitHub. ([GitHub Docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes))
- **Linear** mantém o README de seu repositório público focado em identificar que é o monorepo do SDK, descrever estrutura e dar comandos de instalação/build/test; encaminha quem busca a documentação do SDK/API para outro lugar. Exemplo first-party de README de monorepo, não um modelo de brief de produto. ([Linear API README](https://github.com/linear/linear/blob/master/README.md))
- **Supabase** separa guias em prosa com passos de documentos de referência produzidos a partir de specs e código-fonte; também orienta reutilizar snippets em vez de copiar o mesmo conteúdo. Exemplo first-party moderno de estrutura documental e fonte de verdade técnica. ([Supabase docs contributing guide](https://github.com/supabase/supabase/blob/master/apps/docs/CONTRIBUTING.md))
- **React** usa RFC separado para mudanças substanciais. Seu processo documenta motivação, feedback e estado; um RFC aceito não significa implementação imediata nem prioridade, e o arquivo deve acompanhar mudanças em relação ao design final. Isso evidencia a diferença entre direção do produto e especificação/versionamento de uma capacidade. ([React RFC process](https://github.com/reactjs/rfcs))
- **Go** começa com proposta/discussão e solicita design doc somente para propostas que precisem de mais análise. O processo separa avaliação do problema da elaboração técnica. ([Go proposal process](https://go.googlesource.com/proposal/))
- **Gerrit** documenta que design docs cobrem casos de uso, critérios de aceite, contexto e soluções possíveis com prós/contras; espera acordo sobre casos de uso antes de discutir soluções e atualização do documento ao implementar. É um exemplo first-party de spec técnica mais detalhada. ([Gerrit design docs](https://gerrit-review.googlesource.com/Documentation/dev-design-docs.html))
- **Atlassian** recomenda para seu PRD objetivos, contexto, hipóteses, histórias, perguntas e não escopo, mas alerta contra especificar todo o projeto de antemão e manter requisitos congelados. É orientação de uma empresa de software que desenvolve ferramentas de produto, não padrão independente. ([Atlassian PRD](https://www.atlassian.com/agile/product-management/requirements))
- **Sourcegraph** relata que diferentes objetivos funcionam melhor com formatos RFC diferentes e mantém modelos especializados fora do template mínimo. É experiência publicada no handbook da própria empresa; útil como relato de praticantes, sem pressupor que Polaris deve copiar seu fluxo ou stack. ([Sourcegraph RFC handbook](https://github.com/sourcegraph/handbook/blob/main/content/company-info-and-process/communication/rfcs/index.md))

## Aplicação ao estado atual de Polaris

O [`PRODUCT.md`](../PRODUCT.md) já registra plataforma, perfis de usuário, propósito, posicionamento, personalidade, anti-referências visuais, princípios de design e acessibilidade. Portanto, “está pequeno demais” não é verificável pelo número de linhas: a lacuna é que o documento não explica o problema atual em linguagem do usuário, diferencia públicos prioritários, descreve resultados/jornadas de alto nível, explicita limites de produto ou aponta sinais de sucesso.

O texto afirma que Polaris substitui planilhas e atende pequenos vendedores/revendedores locais. Sem pesquisa de usuário registrada aqui, essas afirmações devem ser tratadas como **posicionamento/hipóteses a validar**, não como evidência comprovada de demanda. A orientação GOV.UK recomenda basear necessidades em pesquisa, declarar premissas e revisá-las conforme novos dados apareçam. ([GOV.UK: Learning about user needs](https://www.gov.uk/service-manual/user-research/start-by-learning-user-needs), [Atlassian: PRD assumptions](https://www.atlassian.com/agile/product-management/requirements))

Não usar P9 como autorização para inserir no `PRODUCT.md` cada regra já implementada ou sugerida no relatório. As linhas de estoque, tenant, idempotência, RLS e billing exigem validação da autoridade de produto e classificação em regras de domínio, segurança/arquitetura ou especificação funcional. O texto do relatório é material de análise, não fonte automática de verdade.

## Estrutura enxuta recomendada para o brief

1. **Propósito e resultado prometido** — em linguagem de usuário.
2. **Público prioritário** — quem usa, para que tarefa; separar público externo de operação interna do SaaS.
3. **Problema e alternativa atual** — evidência disponível, hipótese e lacunas explicitamente rotuladas.
4. **Posicionamento e valor** — manter a orientação existente, eliminando repetições.
5. **Jornadas-chave** — poucos fluxos em termos de objetivo/resultado, com links para specs e regras.
6. **Limites e não objetivos** — fronteiras estáveis do produto, não a lista de tudo que está fora da próxima feature.
7. **Sinais de sucesso** — poucos resultados; informar se são hipótese, baseline ou medição atual e apontar a fonte.
8. **Links de autoridade** — glossário/contexto, regras, specs, design, arquitetura e índice documental.

Manter personalidade e princípios visuais detalhados no `DESIGN.md` ou na documentação de design já existente; `PRODUCT.md` pode resumir a promessa de experiência e apontar para esse documento. Evita duplicar um contrato visual no brief de produto.

## Limites e riscos da recomendação

- “Contrato de produto” significa referência canônica revisável para direção e limites; não significa especificação jurídica, promessa comercial irrevogável ou autorização para afirmar dados de mercado não pesquisados.
- Jornada resumida sem validação pode cristalizar o fluxo imaginado pelo desenvolvedor em vez do trabalho real do revendedor. Manter hipótese visível e validar com usuários antes de convertê-la em requisito.
- “Não objetivo” pode ficar obsoleto; cada limite deve ter escopo claro (produto inteiro versus versão/feature) e ser revisto quando estratégia mudar.
- Métrica sem fonte, baseline, segmento e janela temporal pode parecer objetiva e induzir decisão errada. Começar com sinal/hipótese, depois estabelecer baseline e acompanhar.
- Repetir a mesma regra em `PRODUCT.md`, `CONTEXT.md`, catálogo, spec e código cria conflito de autoridade. Preferir resumo + link para a fonte canônica.
- Fontes governamentais e processos de grandes organizações oferecem bons princípios, mas não provam que o Polaris deva adotar sua estrutura inteira. A recomendação acima reduz as práticas ao tamanho atual do projeto.

## Fontes e peso usado

- **Documentação de plataforma/projeto first-party:** GitHub Docs; documentação de contribuição do Supabase; README público do Linear; processo de RFC do React; processo oficial de propostas do Go; documentação de design do Gerrit. Cada fonte é usada para descrever a prática declarada pelo próprio projeto, não para alegar consenso do setor.
- **Orientação institucional:** GOV.UK Service Manual para necessidades e métricas de serviço; Google SRE para propostas de iniciação curtas. São referências de processo com contexto próprio, usadas por princípio.
- **Padrão e grupo de prática:** OMG SBVR 1.5 é especificação formal; Business Rules Group Manifesto é documento de um grupo profissional, não legislação nem exigência de Polaris.
- **Relatos de praticantes/fornecedores:** Atlassian e Sourcegraph documentam sua própria experiência. Suas recomendações informam trade-offs, mas não substituem validação local nem constituem padrão universal.

## Decisão após alinhamento

Em 2026-09-24, o usuário aprovou o resultado prioritário nesta ordem: confiabilidade de estoque/vendas como requisito básico, rapidez como principal benefício, análises como resultado posterior. O usuário confirma que público e problema já foram validados; a evidência dessa validação não foi localizada no repositório durante esta revisão.

Os exemplos de não objetivos ficam limitados ao lançamento atual; não são proibições permanentes. O usuário aprovou `PRODUCT.md` como brief conciso, com links para regras, glossário, specs e design, sem duplicar invariantes, billing, fluxos detalhados ou arquitetura. Metas numéricas dependem de medida apropriada e baseline.

Essas decisões encerram a revisão do ponto 9. A reconciliação de `docs/product/01-regras-de-negocio.md` e `docs/product/roadmap.md` continua como trabalho documental correlato no plano de implementação consolidado.
