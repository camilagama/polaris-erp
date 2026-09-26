# Pesquisa do ponto 38 — limites de packages de domínio

**Data da revisão:** 2026-09-25  
**Estado:** aceito em 2026-09-25: sem package genérico agora; extração futura por fronteira/benefício concreto, sem requisito rígido de dois consumidores.  
**Ponto do relatório:** não criar `packages/domain` por estética; extrair lógica quando houver uma fronteira conceitual estável e compartilhamento real.

## Resumo

A cautela do relatório é correta, mas sua regra de entrada é rígida demais: compartilhar comportamento entre duas aplicações é um sinal forte de que uma extração pode valer a pena, não um requisito. Uma biblioteca de domínio pode justificar-se com um consumidor quando dá forma executável a uma fronteira estável, mantém dependências sob controle, isola lógica central de infraestrutura ou UI, ou permite teste e evolução claros. Inversamente, duas aplicações importarem funções parecidas não torna automaticamente o código um único domínio.

Para Polaris, **não recomendo criar um `@polaris/domain` genérico agora**. O workspace já tem packages com propósitos identificáveis — como `@polaris/billing`, `@polaris/events`, `@polaris/platform`, `@polaris/date` e `@polaris/db` — e mantém as áreas de produto em `apps/web/src/features` e `apps/admin/src/features`. Preserve essa estrutura. Extraia futuramente um package nomeado para uma capacidade/contexto específico apenas quando sua fronteira, contrato e benefício estiverem evidenciados. Não use `domain` como recipiente de entidades, schemas, serviços, adapters e regras de todas as áreas.

## Evidência no Polaris

- O workspace raiz declara `apps/*` e `packages/*`. Atualmente existem packages `auth`, `billing`, `config`, `date`, `db`, `e2e-support`, `emails`, `events`, `platform`, `platform-auth` e `ui`; não há diretório ou manifesto `packages/domain`.
- A aplicação web organiza áreas de produto como `catalog`, `goals`, `products`, `sales`, `account` e `operations` dentro de `apps/web/src/features`. O admin possui sua própria pasta `features`.
- `@polaris/billing` concentra conceitos e regras identificáveis, como status de cobrança, direitos/limites de planos e transições do ciclo de vida; também expõe adapters Asaas e Woovi. A web o declara como dependência, e `@polaris/platform` também depende dele. Isso é compartilhamento concreto entre contextos de aplicação sem um agregado genérico `domain`.
- `@polaris/platform` reúne consultas, mutações, eventos e suporte da administração da plataforma, com dependências explícitas de `db`, `events`, `billing` e `date`. Hoje é usado pela aplicação admin, não pela web. É uma evidência local de que **um só consumidor direto não invalida** um package: a fronteira de capacidades administrativas e seu contrato podem justificar o isolamento. Isso não prova, por si só, que qualquer código de uma feature deva virar package.
- `aidd_docs/memory/project-state.md` (revisto em 2026-07-13) diz que `@polaris/domain` não foi extraído. A listagem atual confirma que ainda não existe; a memória não esclarece uma regra universal que obrigue ou proíba extração futura.
- O código já tem fronteiras verificadas dentro do web: `feature-boundary.test.ts` mantém features longe de rotas/UI e do acesso direto ao DB, e `lib-boundary.test.ts` mantém `lib` fora de rotas/features. Cálculos de vendas e estoque ficam junto das respectivas áreas. A ausência de `packages/domain` não significa ausência de módulos ou de limites de domínio.
- A memória de julho também omite packages que existem hoje (`@polaris/date`, `@polaris/e2e-support` e `@polaris/ui`) e afirma incorretamente que UI não foi extraída. A afirmação sobre a ausência de `@polaris/domain` continua correta; a lista de arquitetura precisa ser reconciliada conforme o trabalho documental já aprovado.

## Comparação com Hub

O Hub é um aplicativo Next.js único, sem workspace `apps/*`/`packages/*`; organiza capacidades em `src/features` e mantém composição no mesmo app. Seu `CONTEXT.md` fixa vocabulário e aponta as regras e implementações canônicas. Isso é uma referência para manter capacidades coesas e linguagem consistente, mas não prova que Polaris precisa de um package compartilhado nem determina a topologia de seu monorepo multi-app.

## O que dizem as fontes primárias

### Turborepo: propósito por package, sem regra mecânica

A documentação recomenda que cada package tenha um propósito claro e coeso. Ela chama isso de boa prática, não de regra universal, e observa que escala, estrutura e necessidades do repositório influenciam a decisão. Propósitos separados podem reduzir dependências por package e facilitar encontrar responsabilidades; a documentação alerta contra megaprojetos genéricos como `shared` com componentes, utilitários, hooks, tipos e API misturados. Também trata `package.json`, `exports` e dependências workspace como fronteiras reais do grafo, com tarefas e configuração próprias. Isso dá suporte a evitar `@polaris/domain` genérico, mas não impõe um número mínimo de consumidores. [Turborepo — Creating an Internal Package](https://turborepo.dev/docs/crafting-your-repository/creating-an-internal-package), [Turborepo — best practices for internal packages](https://github.com/vercel/turborepo/blob/main/skills/turborepo/references/best-practices/packages.md).

### DDD: coesão e linguagem do domínio definem limites

Microsoft Learn explica que o objetivo de decompor um modelo não é alcançar a separação mais granular possível; a separação mais significativa deve vir do conhecimento do domínio, das capacidades de negócio e da coesão. Um bounded context delimita onde um modelo específico e sua linguagem se aplicam, e define contratos de integração com outros contextos. A mesma entidade conceitual pode ter modelos distintos em contextos diferentes; forçar um vocabulário ou modelo universal pode aumentar a ambiguidade. Essas fontes falam sobretudo de serviços e modelos de domínio, **não prescrevem tamanho de package JavaScript**. A recomendação para Polaris é uma inferência: os mesmos sinais de coesão, linguagem e contrato ajudam a avaliar se código merece um limite de package no monorepo, mas um package interno não deve ser confundido com um microserviço ou bounded context operacional. [Microsoft Learn — Identify domain-model boundaries](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/architect-microservice-container-applications/identify-microservice-domain-model-boundaries), [Microsoft Azure Architecture Center — Use domain analysis to model microservices](https://learn.microsoft.com/en-us/azure/architecture/microservices/model/domain-analysis).

### Exemplo de produto maduro: Medusa

A documentação atual do Medusa descreve um módulo como um package reutilizável ligado a um único domínio ou integração. Cita o módulo de carrinho, que concentra modelos de dados e lógica de operações de carrinho, e explica que módulos personalizados podem ser reutilizados em projetos Medusa diferentes. É um exemplo de plataforma de comércio que extrai capacidades nomeadas, não um package genérico para todo o domínio do produto. A arquitetura do Medusa é específica ao seu framework; serve como exemplo de forma, não como estrutura a copiar para Polaris. [Medusa — Modules](https://docs.medusajs.com/learn/fundamentals/modules).

### Fronteira precisa ser verificável

Nx recomenda representar relações permitidas entre projetos com tags e regras de dependência; seu exemplo permite que `client` e `admin` usem uma biblioteca compartilhada, enquanto proíbe a biblioteca de depender das aplicações. Nx é uma opção de ferramenta, não recomendação de adoção para Polaris neste ponto. A evidência útil é que adicionar packages sem definir quem pode importar de quem não garante modularidade: APIs e direção de dependência precisam ser explícitas e passíveis de verificação. [Nx — Enforce Module Boundaries](https://nx.dev/docs/features/enforce-module-boundaries).

## Relatos de comunidade (evidência anedótica)

- Em uma discussão no Reddit sobre modernizar um projeto PHP, o autor relata que duas aplicações começaram a compartilhar objetos de domínio como `Account` e `AuthToken`, o que motivou organizar o compartilhamento em um monorepo. É um exemplo plausível de dois consumidores revelando valor, não uma regra de arquitetura nem evidência de que dois sejam o mínimo. [r/PHP — A PHP monorepo of apps and packages](https://www.reddit.com/r/PHP/comments/1rklz3b/a_php_monorepo_of_apps_and_packages/).
- Em outra discussão, sobre organizar código por domínio em Go, aparecem preocupações com quantidade de packages/arquivos e opiniões diferentes sobre separar por domínio ou por subresponsabilidade. A stack e o contexto diferem; o relato apenas ilustra o custo de fragmentar sem um benefício claro. [r/golang — Should I organize my codebase by domain?](https://www.reddit.com/r/golang/comments/1mxzms8).

Esses relatos não são consenso nem autoridade. As decisões acima se apoiam principalmente na documentação oficial e na estrutura observada no Polaris.

## Trade-offs

### Criar um package específico para uma capacidade coesa

- Torna importações e dependências explícitas; dá uma API pública pequena e revisável.
- Permite testar a regra de negócio no limite que a contém e validar consumidores sem copiar a implementação.
- Pode isolar código de domínio de UI, rotas ou uma aplicação, inclusive quando só um app o consome no início.
- Acrescenta custos: manifesto, exports, configuração/tarefas, direção de dependências e manutenção de uma fronteira pública. Se a lógica for pequena ou mudar junto com uma feature, o ganho pode não pagar o custo.

### Manter um `packages/domain` genérico

- Pode parecer um único ponto canônico para “tudo de negócio”, mas mistura capacidades com linguagens, ciclos de mudança e dependências diferentes.
- Convida a criar imports cruzados entre catálogo, vendas, metas, cobrança e administração, e a compartilhar entidades/tipos que talvez não tenham o mesmo significado em todos os contextos.
- Tende a acumular condições por feature e dependências de banco, framework ou integrações; o pacote passa a ser uma camada de acoplamento comum em vez de um limite coeso.
- Um package chamado `domain` não é automaticamente ruim: poderia representar um núcleo pequeno e deliberado. O problema é usar o nome como justificativa para agrupar domínios distintos sem contrato nem dono claro.

## Critério recomendado para Polaris

Promover código para `packages/<capacidade>` somente quando **todos** estes sinais forem verdadeiros:

1. **Nome e linguagem:** há uma capacidade/contexto de negócio reconhecível no vocabulário validado do produto, e não apenas um tema técnico como `shared`, `common` ou `domain`.
2. **Coesão:** as regras mudam juntas, têm invariantes próprias e formam uma API que pode ser explicada sem conhecer várias features não relacionadas.
3. **Fronteira real:** há ao menos uma razão concreta para o package existir: consumidores atuais com o mesmo contrato; isolamento explícito entre aplicação e núcleo de domínio; dependência/runtime que deve ser contido; teste independente; ou proteção contra importações indevidas. Expectativa vaga de reutilização futura não basta.
4. **Dependências com direção:** o package declara dependências necessárias, não importa de `apps/*`, não cria ciclo e não agrega adapters/rotas/UI de vários contextos.
5. **Benefício líquido:** a clareza, contenção ou capacidade de evolução obtida compensa exports, tarefas, testes e manutenção adicionais.

**Dois apps consumidores:** tratar como evidência forte, não condição necessária. O compartilhamento deve ser semântico, além de físico: o comportamento e o contrato precisam ter o mesmo significado nos dois consumidores. Um consumidor também pode justificar package quando a fronteira de capacidade/runtime é deliberada e útil; `@polaris/platform` é o exemplo atual. Já duas telas usando a mesma função por conveniência não justificam um package de domínio se pertencerem a conceitos diferentes.

## Recomendação específica

- **Não criar agora `@polaris/domain` nem packages vazios para catálogo, vendas, produtos ou metas.**
- Manter as composições atuais perto de `apps/web/src/features/*` e da área correspondente no admin. Reutilização futura deve ser promovida para um package com nome de capacidade específico, como `@polaris/catalog` ou `@polaris/sales`, apenas depois de existir regra compartilhada clara entre web/admin (ou outra fronteira concreta que justifique o isolamento).
- Seguir usando os packages atuais com propósito explícito; não mover lógica só para aumentar a contagem de consumers. Antes de extrair, identificar o modelo/termos, invariantes, API pública, consumidores, dependências e a regra de importação permitida.
- Tratar o ponto 39 (contrato de fronteiras) separadamente: P38 define o motivo para criar um package; a validação automática de dependências pode ser decidida no ponto 39, sem adotar Nx por consequência.

Esta nota registra pesquisa e evidência para decisão. Não altera o plano principal, o código ou a estrutura do monorepo. Nenhum teste foi executado.
