# Pesquisa do ponto 8: `CONTEXT.md` como glossário do domínio

**Consultada em:** 2026-09-24  
**Escopo:** avaliar a proposta de manter vocabulário de domínio e decidir se `CONTEXT.md` é o artefato adequado. Inclui auditoria do checkout Polaris, comparação com o snapshot local do Hub e pesquisa documental/práticas públicas. Os resultados sobre os repositórios são limitados aos checkouts inspecionados, não às configurações remotas.

## Conclusão

O objetivo do ponto 8 é válido: manter vocabulário de domínio aprovado ajuda a evitar que termos ambíguos sejam interpretados de formas incompatíveis. A auditoria, porém, encontrou dois glossários no Polaris e uma hierarquia contraditória; criar um terceiro sem resolver isso aumentaria o risco de divergência. O relatório acerta na necessidade, mas não prova que apenas criar um `CONTEXT.md` melhore a qualidade das respostas de IA nem que esse nome seja obrigatório.

Não há um padrão universal segundo o qual `CONTEXT.md` sempre significa glossário. O nome aparece em práticas recentes de domain modeling, mas também em propostas de contexto operacional para agentes. A convenção da skill de Matt Pocock usa `CONTEXT.md` somente para termos, recomenda definições curtas e alerta contra transformá-lo em especificação; é uma prática de desenvolvedor, não um padrão de DDD. DDD sustenta linguagem compartilhada por contexto, não um nome ou caminho de arquivo. Em qualquer opção, o índice e as instruções da ferramenta precisam apontar explicitamente para a fonte.

**Redação revisada sugerida para o ponto 8:** “Manter um glossário enxuto da linguagem do domínio, com termos e significados validados e escopo indicado; usar um glossário por contexto somente quando diferenças reais de significado justificarem a divisão. Não duplicar produto, arquitetura, regras detalhadas ou decisões.”

## Auditoria local

### Polaris

- `docs/glossary.md` declara cobrir termos de arquitetura e afirma que auth, billing, banco e tenancy serão definidos em documentos especializados. A definição de `organization` a chama de “Workspace”; `tenant` aparece como escopo técnico. O mesmo glossário declara `owner/admin/operator`, mas `apps/web/src/lib/app-context.ts` hoje define somente `owner`. O arquivo é técnico/observacional e contém ao menos uma divergência que precisa ser corrigida fora do P8 ou durante a limpeza documental.
- `docs/business-rules/glossary.md` já contém vocabulário de negócio, mas seu título diz “Glossário normativo” enquanto `docs/business-rules/README.md` classifica a área de descoberta inteira como não normativa. O arquivo não aparece em `docs/business-rules/normative/README.md`, que declara as fontes de regras aprovadas. Isso deixa sua autoridade ambígua mesmo quando várias entradas coincidem com regras aprovadas.
- As regras aprovadas já distinguem Organização, usuário, membership/owner, plano, assinatura, provider, produto cadastrado, estoque/ledger e venda; implementação ainda é parcial. O schema e o código mostram `users`, `organization`, `member`, `platform_admins`, `products`, `stock_movements` e `sales` como conceitos/tabelas distintos. Evidência de código confirma implementação, não decide sozinha o significado de negócio.
- `Seller` é uma persona do público em `PRODUCT.md` e também aparece como quem pode pagar a taxa de cartão na venda; não há entidade `seller` no schema. O usuário do Polaris, o owner da organização e o “seller” que paga uma taxa não devem ser fundidos sem validação.
- A venda do lançamento é um registro operacional concluído/cancelado, com baixa ou reposição de estoque. As regras aprovadas excluem refund, estorno financeiro, contas a receber e settlement. `sale` não deve ser definido como pagamento financeiro liquidado.
- `Webhook event` e `outbox` já estão no glossário técnico com sentidos diferentes; não devem ser duplicados no vocabulário de negócio, salvo se uma distinção de produto exigir isso.
- `docs/README.md` já indexa `docs/glossary.md`; o índice de negócio também aponta ao glossário de descoberta, mas não estabelece a autoridade deste. O `AGENTS.md` raiz não manda consultar nenhum glossário de domínio.

### Hub

- No checkout local auditado, `CONTEXT.md` é a fonte canônica de linguagem de produto, com `status: canonical` e `owner: product`; separa vocabulário de regras, implementação e decisões. `docs/README.md` o indexa e `AGENTS.md` instrui agentes a consultá-lo e atualizá-lo quando o domínio muda.
- O arquivo tem cerca de cinquenta termos por áreas. Exemplos de distinções úteis: Aluno/Compradora/Conta; Pedido/Concessão/Matrícula; Curso/Publicação; Progresso/acesso. Isso demonstra o formato aplicado, não prova que o Polaris deva copiar o tamanho ou os termos do Hub.
- Algumas entradas do Hub já são explicações semânticas longas com invariantes; para Polaris, copiar essa extensão poderia criar uma especificação paralela. O arquivo também tinha SHA de verificação anterior ao HEAD local. O exemplo ensina autoridade e ligação a instruções, mas ainda exige manutenção e revisão de frescor.
- O Polaris tem produto e domínio diferentes; usar Hub apenas como comparação organizacional, nunca como autoridade semântica do Polaris.

## Pesquisa externa atualizada

Microsoft Learn descreve a linguagem ubíqua como vocabulário compartilhado por especialistas de domínio e desenvolvedores dentro de cada bounded context, usado coerentemente em conversa, documentação e código. Também alerta que o mesmo termo pode significar coisas distintas em contextos diferentes. Fowler explica por que perseguir um único modelo para um domínio grande pode ser inviável e por que fronteiras devem explicitar diferenças reais. Isso favorece começar com poucos termos validados, sem declarar agora que cada pacote do Polaris é um bounded context ([Microsoft Learn: domain analysis](https://learn.microsoft.com/en-us/azure/architecture/microservices/model/domain-analysis); [Martin Fowler: bounded context](https://martinfowler.com/bliki/BoundedContext.html); [DDD Reference, Eric Evans](https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf)).

Diátaxis descreve referência como factual, concisa e autoritativa; instruções e explicações devem ser separadas e ligadas. Também recomenda mudanças documentais incrementais, sem impor uma reorganização top-down ou criar estrutura vazia ([Reference](https://diataxis.fr/reference/); [Diátaxis as a guide to work](https://diataxis.fr/how-to-use-diataxis/)).

A documentação atual do GitHub Copilot CLI reconhece arquivos específicos, incluindo `AGENTS.md`, e permite referências explícitas a outros arquivos; instruções múltiplas podem se combinar sem uma precedência geral. Isso mostra por que o nome `CONTEXT.md`, sozinho, não garante que qualquer ferramenta o carregue. A regra do Polaris deve dizer quando consultar a fonte canônica, e o índice deve ligá-la ([GitHub Copilot CLI: custom instructions](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions)).

A skill pública de Matt Pocock adota `CONTEXT.md` como glossário puro, sugere acrescentar termos quando a linguagem é resolvida e admite que o nome não tem consenso. Há ainda a proposta GitHub Repository Context Layer, que usa `context.md` para intenção, restrições e aprendizados operacionais de agentes; é uma proposta, não um padrão formal, e reforça a ambiguidade do nome ([skill de domain modeling](https://github.com/mattpocock/skills/blob/main/docs/engineering/domain-modeling.md); [Repository Context Layer](https://github.com/getmetatron/context-md)).

Discussões de profissionais em fóruns mostram desacordo sobre o quanto de DDD formal vale a pena; o ponto recorrente mais útil para este caso é construir a linguagem em conjunto e adaptá-la ao domínio, não preencher artefatos por cerimônia. Esses relatos são anedóticos e não substituem evidência de projeto ou fonte técnica ([discussão no r/DomainDrivenDesign](https://www.reddit.com/r/DomainDrivenDesign/comments/1sw2oby/ddd_workflow/); [discussão no r/ExperiencedDevs](https://www.reddit.com/r/ExperiencedDevs/comments/17yc67q/when_domain-driven-development_gets_in_the_way_of/)).

## Evidências

### 1. A prática de linguagem compartilhada é útil; a lista precisa nascer do domínio

Eric Evans define a linguagem ubíqua como parte do modelo de domínio. A referência de DDD lista linguagem ubíqua, contexto delimitado e mapa de contexto como conceitos relacionados, mas distintos ([DDD Reference, Eric Evans](https://www.domainlanguage.com/ddd/reference/); [glossário da DDD Community](https://www.dddcommunity.org/resources/ddd_terms/)). Martin Fowler, ao resumir o conceito, destaca que desenvolvedores e especialistas de domínio a constroem juntos, usam-na em conversas e a revisam à medida que entendem melhor o domínio ([Ubiquitous Language, 2006](https://martinfowler.com/bliki/UbiquitousLanguage.html)).

O Azure Architecture Center explicita que o vocabulário deve ser consistente entre conversa, documentação e código e que uma palavra pode ter significados diferentes em contextos diferentes ([Use Domain Analysis to Model Microservices](https://learn.microsoft.com/en-us/azure/architecture/microservices/model/domain-analysis)). Isso sustenta documentar ambiguidades, mas não sustenta impor uma definição global a cada palavra.

**Inferência para Polaris:** um ERP tende a reunir áreas com processos e vocabulários distintos. Termos como “conta”, “pedido”, “saldo”, “produto” ou “cancelamento” podem precisar de uma área de aplicação para não se tornarem falsamente universais. Esses exemplos são hipóteses para a revisão do repositório e conversa com especialistas, não definições já confirmadas do Polaris.

### 2. Glossário, modelo, decisões e instruções têm responsabilidades diferentes

- **Glossário:** responde “o que este termo significa aqui?” e registra termos preferidos, sinônimos que confundem e diferenças de escopo.
- **Modelo de domínio ou mapa de contexto:** representa relações, regras, processos e fronteiras entre modelos. O DDD Reference distingue o contexto delimitado do mapa que mostra contextos e relações ([Eric Evans](https://www.domainlanguage.com/ddd/reference/)). Não é necessário adotar formalmente todos os artefatos de DDD para manter um vocabulário útil.
- **ADR:** registra uma decisão significativa, suas alternativas, razão e consequências; não é o lugar de redefinir continuamente palavras do negócio. Essa separação coincide com a orientação de Martin Fowler para ADRs ([Architecture Decision Record, 2026-03-24](https://martinfowler.com/bliki/ArchitectureDecisionRecord.html)).
- **Índice documental:** aponta para a fonte de cada assunto; deve navegar, não copiar o conteúdo. A documentação Sphinx oferece tanto uma árvore de navegação quanto termos de glossário referenciáveis por links, um exemplo técnico de como centralizar definições e reutilizá-las sem reescrevê-las ([Sphinx: diretivas e glossário](https://www.sphinx-doc.org/en/master/usage/restructuredtext/directives.html)).
- **Instruções de agentes:** explicam como trabalhar e quais fontes ler. Não se deve supor que qualquer agente carregará automaticamente um `CONTEXT.md`: a documentação do GitHub Copilot especifica os nomes e caminhos de arquivos de instrução que ele descobre e permite referenciar outro arquivo a partir de `AGENTS.md` ([GitHub Copilot CLI: custom instructions](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions)).

### 3. `CONTEXT.md` é uma convenção possível, não um padrão consolidado

Matt Pocock mantém uma prática pública de modelagem de domínio em que `CONTEXT.md` guarda exclusivamente termos curtos, com sinônimos evitados; decisões qualificadas ficam em ADRs. A prática sugere criar arquivos sob demanda e apontar para vários contextos com um `CONTEXT-MAP.md` quando um glossário enxuto cobre domínios realmente diferentes ([guia de domain modeling](https://github.com/mattpocock/skills/blob/main/docs/engineering/domain-modeling.md); [formato de `CONTEXT.md`](https://github.com/mattpocock/skills/blob/main/skills/engineering/domain-modeling/CONTEXT-FORMAT.md)). É uma proposta de praticante útil, não uma norma de mercado.

O próprio guia relata riscos e limites: o arquivo pode crescer com detalhes de implementação, ficar desatualizado e transformar vocabulário não validado em “verdade”; a discussão sobre chamá-lo `CONTEXT.md` ou `GLOSSARY.md` não tem consenso. Ele recomenda não manter o glossário em projetos de duração muito curta e ressalta que um documento escrito por agente sem revisão pode piorar a situação ([mesmo guia](https://github.com/mattpocock/skills/blob/main/docs/engineering/domain-modeling.md)).

Também há uma proposta de 2026 chamada Repository Context Layer, que usa `context.md` para intenção, restrições e aprendizados evolutivos de agentes, não apenas glossário. O repositório se apresenta explicitamente como uma especificação proposta, portanto serve como evidência de que o nome é ambíguo, não de um padrão estabelecido ([proposta `context.md`](https://github.com/kerbelp/context-md)). A documentação oficial de ferramentas de agentes, por sua vez, usa formatos próprios, como `AGENTS.md`, `.github/copilot-instructions.md` e `.cursor/rules`; para descoberta automática, a integração deve ser explícita e específica à ferramenta ([GitHub Copilot](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions); [Cursor Rules](https://docs.cursor.com/context/rules)).

### 4. Exemplos públicos e relatos de praticantes favorecem começar leve

Há repositórios públicos que usam `CONTEXT.md` como glossário e separam arquitetura/ADRs — por exemplo, [Helix](https://github.com/TimHoogervorst/Helix/blob/master/CONTEXT.md) e [Ordewell](https://github.com/ordewell/ordewell/blob/main/CONTEXT.md). São exemplos do padrão em uso, não uma amostra que demonstre adoção geral ou adequação automática ao Polaris. A documentação do Read the Docs também mantém um glossário com termos que têm significado específico no próprio produto, em vez de tentar definir todos os termos técnicos possíveis ([guia de estilo](https://docs.readthedocs.com/dev/latest/style-guide.html)).

Em uma discussão de profissionais no r/ExperiencedDevs, um comentário recomenda começar com um glossário versionado no repositório e permitir que usuários de negócio contribuam; outros comentários defendem usar partes úteis de DDD sem adotar sua cerimônia completa ([discussão “Is DDD really relevant?”, 2025](https://www.reddit.com/r/ExperiencedDevs/comments/1jb1f1b/is_ddd_really_relevant/)). É relato informal, não evidência normativa. Em uma discussão recente sobre ferramentas de modelagem com agentes, participantes relatam que o fluxo ajuda, mas divergem sobre quais partes do processo são essenciais ([r/LLM, 2026](https://www.reddit.com/r/LLM/comments/1uqltx0/is_anyone_using_domain_modellingards/)). Isso reforça testar o menor processo que resolve uma ambiguidade concreta, sem reproduzir automaticamente uma metodologia inteira.

## Riscos e controles

1. **Duplicação e divergência:** repetir regras de negócio em glossário, visão de produto e especificações cria fontes concorrentes. Definições ficam no glossário; detalhes de comportamento ficam na especificação correspondente; o mapa/index apenas aponta para cada fonte.
2. **Vocabulário global falso:** se uma palavra muda de sentido por área, uma única definição esconde a diferença. Começar com uma coluna/indicação de área; separar arquivos apenas quando os significados e modelos realmente divergirem.
3. **Glossário obsoleto ou inventado:** termos devem ser curtos e revisados por alguém que conhece o negócio. Registrar só conceitos que afetam conversa, comportamento, nomes ou decisões; não copiar automaticamente nomes de tabelas/código para “confirmar” o significado.
4. **Confusão com instruções de agente:** nomear o arquivo `CONTEXT.md` não garante que a ferramenta o leia. Se for contexto obrigatório para tarefas de domínio, referenciá-lo em `AGENTS.md` e no índice documental, sem duplicar seu conteúdo.
5. **Formalização prematura:** a necessidade de preservar diferenças de linguagem não obriga a declarar módulos como bounded contexts nem a redesenhar arquitetura. O mapa de contextos pode esperar evidência de divergências reais.

Esses controles derivam da evolução contínua da linguagem com especialistas ([Fowler](https://martinfowler.com/bliki/UbiquitousLanguage.html)), da possibilidade de termos significarem coisas diferentes em contextos distintos ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/architecture/microservices/model/domain-analysis)) e dos problemas de crescimento/obsolescência reconhecidos pela própria prática `CONTEXT.md` ([Matt Pocock](https://github.com/mattpocock/skills/blob/main/docs/engineering/domain-modeling.md)).

## Decisão após alinhamento

Em 2026-09-24, o usuário aprovou `CONTEXT.md` na raiz como fonte canônica de vocabulário de produto/domínio, sem definições duplicadas. `docs/business-rules/glossary.md` será convertido em ponte para essa fonte, e `docs/glossary.md` continuará restrito a termos técnicos/arquiteturais. A fonte canônica será indexada em `docs/README.md` e referenciada em `AGENTS.md` para tarefas de domínio; regras normativas continuam autoridade para comportamento.

Os termos canônicos serão redigidos em português; identificadores de código em inglês poderão aparecer como referência. “Organização” é o termo interno aprovado; `tenant` descreve apenas o mecanismo técnico de isolamento; `workspace` deixa de ser sinônimo de Organização. O usuário validará linguagem do produto; termos legais, fiscais, contábeis ou regulatórios permanecem pendentes até validação apropriada.

Entradas sobrepostas com regras não serão copiadas mecanicamente: devem ser curtas, sem detalhe de implementação e incluídas só depois de validar o significado. “Vendedor” e sua relação com owner, usuário e pagador de taxa de cartão seguem pendentes para a etapa de redação/validação do glossário.

**Limitação:** a auditoria cobre os arquivos e o HEAD local verificados nesta revisão. Não define termos ainda não aprovados nem estabelece formalmente bounded contexts do Polaris. `CONTEXT.md` ainda não foi criado; sua redação integra a execução futura do plano consolidado dos 70 pontos.
