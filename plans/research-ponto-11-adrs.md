# Pesquisa — ADRs para decisões arquiteturais

**Ponto avaliado:** o relatório recomenda introduzir ADRs no Polaris e lista oito decisões candidatas. Esta nota compara convenções e exemplos primários; não fixa uma quantidade de ADRs para Polaris ou Hub.

## Síntese

**A recomendação de iniciar uma prática de ADRs procede; “imediatamente” deve significar adotar a convenção e registrar decisões arquiteturais relevantes, não reconstruir automaticamente toda a história.** As fontes convergem em registrar escolhas significativas com contexto e consequências, preservar decisões aceitas e deixar claro quando forem substituídas. Variam no grau de detalhe, nos estados e em como tratar decisões antigas ainda não implementadas. Não há uma norma universal que imponha o template MADR, uma lista única de estados ou um volume esperado.

As oito entradas do relatório — monorepo web/admin, PostgreSQL RLS, admin de plataforma separado, outbox, Neon, adapters de billing, R2 e lógica temporal — são **candidatas para validação**, não ADRs automaticamente corretas. Cada entrada precisa representar uma escolha real e relevante; “o sistema usa X” descreve estado atual, mas não revela necessariamente quem decidiu, quais alternativas existiam ou por quê.

## Quando abrir uma ADR

- Martin Fowler descreve ADR como registro curto de uma decisão única que afeta o produto ou ecossistema. A orientação é incluir contexto, decisão, rationale, alternativas relevantes e consequências; manter o texto breve e linkar material de apoio. Ele recomenda arquivo por decisão no repositório do código quando a decisão é local a esse repositório. [Fowler: Architecture Decision Record](https://martinfowler.com/bliki/ArchitectureDecisionRecord.html)
- AWS Prescriptive Guidance recomenda ADRs para decisões arquiteturais significativas: estrutura, atributos de qualidade, dependências, interfaces e técnicas/ferramentas de construção. O mínimo indicado é contexto, decisão e consequências. É guia AWS, não norma universal. [AWS: ADR process](https://docs.aws.amazon.com/prescriptive-guidance/latest/architectural-decision-records/adr-process.html)
- Microsoft Azure Well-Architected limita o escopo a escolhas que afetam a estrutura, atributos de qualidade importantes ou que sejam difíceis de reverter. Também recomenda não transformar a ADR em guia de implementação; ela deve deixar clara a escolha e apontar para documentos de suporte. [Microsoft: Maintain an ADR](https://learn.microsoft.com/en-us/azure/well-architected/architect-role/architecture-decision-record)

**Regra útil para o Polaris:** abrir uma ADR quando houver alternativas plausíveis e a escolha tiver consequência arquitetural duradoura, custo significativo de reversão, efeito entre módulos ou impacto importante em segurança, confiabilidade, dados, operação ou contratos. Rotina, correção localizada e detalhe de implementação que já segue uma decisão não exigem uma nova ADR. Essa fronteira é convenção de trabalho, não uma classificação definida por norma.

## Formatos comparados

- **Nygard/Fowler:** forma enxuta centrada em `Context`, `Decision` e `Consequences`, com estado. A simplicidade ajuda a manter a escrita e leitura rápidas. Fowler recomenda também registrar rationale e alternativas sérias quando elas ajudam a entender as forças da decisão. [Fowler](https://martinfowler.com/bliki/ArchitectureDecisionRecord.html)
- **MADR:** oferece tanto template completo quanto mínimo. O completo acrescenta data, envolvidos, drivers, opções, justificativa do resultado, consequências, confirmação, pros/cons e links; o mínimo mantém contexto, opções, resultado e consequências. Arquivos numerados `nnnn-title.md` são a convenção sugerida pelo projeto, não requisito do conceito ADR. [MADR: templates](https://github.com/adr/madr/tree/develop/template), [MADR: repositório e convenções](https://github.com/adr/madr)
- **AWS:** enfatiza lifecycle e ownership: proposta, revisão, aceite/rejeição e supersessão. Pede contexto, decisão e consequências como mínimo, e sugere consultar ADRs em revisão de mudanças. A indicação AWS de aprovação por pares pertence ao processo descrito pela AWS; não implica que Polaris, com um único revisor, precise inventar aprovação humana independente. [AWS: ADR process](https://docs.aws.amazon.com/prescriptive-guidance/latest/architectural-decision-records/adr-process.html)
- **Microsoft Azure:** recomenda começar no início do workload, manter o log durante sua vida e incluir alternativas, trade-offs, estado e confiança quando útil. É explícito sobre registros pithy, sem ocultar consequências, e admite documentação retroativa de decisões passadas quando há dados disponíveis. [Microsoft: Maintain an ADR](https://learn.microsoft.com/en-us/azure/well-architected/architect-role/architecture-decision-record)
- **GitHub:** não foi encontrada uma regra de produto ou padrão corporativo do GitHub que imponha ADRs a todos os projetos. Há, porém, uma prática de repositório da organização `github`: o workflow do `gh-aw` inclui um gate de decisões de design para certos PRs de implementação, procurando ADR ligado ao PR ou no branch e tratando falta de contexto como bloqueio. É exemplo local de automação e governança, não política universal do GitHub nem recomendação para bloquear todos os PRs do Polaris. [GitHub `gh-aw`: design-decision gate](https://github.com/github/gh-aw/blob/main/.github/workflows/design-decision-gate.md)
- **Projetos OSS atuais:** o [Oasis Core ADR repo](https://github.com/oasisprotocol/adrs) descreve revisão e discussão por PR, aceite/rejeição segundo a governança do projeto e implementação após a ADR ser incorporada. O [Microsoft Agent Governance Toolkit](https://github.com/microsoft/agent-governance-toolkit/blob/main/docs/adr/index.md) usa Context/Decision/Consequences e um índice com estados `proposed`, `accepted`, `deprecated` e `superseded`. São políticas desses projetos, não taxonomia obrigatória.
- **Nuance de lifecycle em governo digital:** o GDS Way aceita atualizar a ADR se uma decisão aceita ainda não foi implementada e os revisores concordarem; se já houve implementação, orienta criar outra ADR e marcar a anterior como superseded. Isso contrasta com a regra append-only mais estrita de Fowler/AWS e mostra que o tratamento antes da implementação é uma convenção que o projeto precisa definir. [GDS Way: documenting architecture decisions](https://gds-way.digital.cabinet-office.gov.uk/standards/architecture-decisions.html)

## Conteúdo mínimo e lifecycle sugeridos

Um registro útil deveria responder, em linguagem direta:

1. **Qual problema/forças motivaram a decisão?** Escopo, requisitos, restrições e evidência disponíveis naquele momento.
2. **O que foi decidido?** Uma escolha clara, não apenas o tema.
3. **Quais alternativas realistas foram consideradas e por que foram descartadas?** Só as que de fato entraram na análise.
4. **Quais consequências e trade-offs ficam aceitos?** Inclua aspectos negativos, riscos e condições que poderiam justificar reavaliação.
5. **Como encontrar a origem e verificar a implementação?** Links para issue/PR, código relevante e, quando houver, teste ou fitness function que confirme uma regra arquitetural.

Metadados práticos: ID monotônico e título descritivo, estado, data de decisão/registro e links. MADR também oferece campos para decision-makers, consulted e informed; mantê-los opcionais evita preencher burocracia sem necessidade.

Uma lifecycle simples e suficiente pode usar `Proposed`, `Accepted`, `Rejected` e `Superseded`. Definir o significado localmente: por exemplo, `Accepted` significa que a decisão está em vigor; se for importante distinguir decisão aceita de implementação completa, registrar implementação separadamente. Quando uma decisão em vigor mudar, criar a sucessora e, após aceitá-la, marcar a anterior `Superseded by ADR-NNN`, com links entre ambas. Não apagar a história. `Deprecated` pode ser útil quando uma decisão deixa de ser recomendada sem substituição direta, mas não é obrigatório.

## Backfill das decisões já existentes

Microsoft Azure recomenda ADR retroativa quando há dados disponíveis; isso não autoriza inventar deliberação. A ferramenta independente [`gwleclerc/adr`](https://github.com/gwleclerc/adr) oferece o estado `observed` para descrever uma decisão pré-existente reconstruída, distinguindo-a de uma nova decisão aceita. Esse estado é específico da ferramenta, não parte de um padrão ADR.

Para o Polaris, ao documentar uma escolha antiga:

- datar quando o registro foi escrito e indicar que é retrospectivo; deixar a data original como desconhecida quando não houver fonte;
- ligar commits, PRs, documentação, código ou discussão que sustentem o que é possível afirmar;
- não inventar alternativas, trade-offs, consenso ou a motivação original. Se o motivo não puder ser verificado, declarar isso;
- separar “o sistema hoje faz X” de “decidimos continuar com X”. Se o proprietário decidir agora manter a arquitetura atual, pode registrar uma decisão presente, mas não atribuir retroativamente essa escolha ao início do projeto;
- não tentar reconstituir tudo: usar o limiar de relevância acima e priorizar escolhas que um futuro desenvolvedor poderia desfazer sem entender o custo.

Assim, a recomendação do relatório de “começar pelo que já existe” é boa **como inventário e backfill seletivo**, não como reconstrução exaustiva de justificativas não preservadas.

## Vínculo com código e manutenção

Fowler recomenda guardar ADRs com o código local ao qual se aplicam; AWS recomenda consultar os registros em revisões quando relevante; MADR inclui seção `Confirmation` para descrever revisão, teste ou outra forma de verificar alinhamento. O gate do `github/gh-aw` demonstra que um projeto pode automatizar ADRs para caminhos/mudanças considerados significativos. As fontes não requerem comentário de ADR em cada arquivo nem check obrigatório em cada PR.

Para Polaris, começar com Markdown no repositório, uma por decisão, índice/link navegável e inclusão no PR que introduz a decisão. Referenciar ADR em módulos ou PRs onde a motivação não seja óbvia. Considerar uma checagem automatizada depois que existirem convenções e padrões estáveis, focada em referências/status ou em áreas específicas; um gate amplo pode bloquear mudanças banais e criar preenchimento mecânico. ADR é o registro do porquê, não substitui arquitetura atual, runbook, especificação funcional ou teste.

## Evidência de adoção e relatos de praticantes

- Um estudo de mineração de repositórios analisou 921 projetos públicos com ADRs e observou que mais da metade tinha apenas 1–5 registros; Nygard era o template mais comum. Os autores levantam a hipótese de tentativa sem adoção contínua, mas também dizem que são necessários estudos qualitativos para explicar por que projetos param. A amostra é de repositórios públicos e os dados observados vão até 2020; ela não mede o resultado de ADRs no Polaris nem determina quantidade adequada para um projeto. [Buchgeher et al., IEEE Access 2023](https://ieeexplore.ieee.org/abstract/document/10155430/), [PDF acessível](https://phaidra.ustp.at/api/object/o%3A5493/download)
- Em discussões de praticantes no Reddit, aparecem falhas como ADR virar documentação “write-only”, ninguém revisar, implementação divergir e templates parecerem overhead; há respostas que valorizam escrever para esclarecer o próprio raciocínio. São experiências individuais, não medição de frequência. Elas reforçam associar cada ADR a uma mudança real e torná-la consultável no fluxo de código. [r/softwarearchitecture: por que equipes param de escrever ADRs](https://www.reddit.com/r/softwarearchitecture/comments/1vehoxh/if_you_stopped_writing_adrs_what_actually_made/)

## Conclusão para o ponto 11

Adotar ADRs é adequado para preservar o “porquê” das decisões arquiteturais do Polaris. Use uma convenção leve, registre decisões relevantes no momento em que forem feitas e faça backfill seletivo, identificando o que é reconstruído e qual evidência existe. O formato e o volume são decisões do projeto; os modelos citados ilustram alternativas, sem estabelecer padrão formal universal.

As oito propostas do relatório devem ser revisadas uma a uma quanto a: existência de uma escolha real, relevância arquitetural, evidência do contexto e necessidade de registro. Nenhuma fonte justifica transformar cada aspecto técnico em ADR ou reproduzir automaticamente o volume do Hub.

## Limites formais e práticos

- ADR/MADR, Fowler, AWS, Microsoft, GDS e os repositórios públicos citados são convenções, guias ou exemplos; nenhum deles constitui norma técnica universal de conformidade para ADRs.
- As fontes variam sobre mutabilidade antes da implementação, status disponíveis, necessidade de aprovação e nível de detalhe. Polaris deve definir a regra local sem sugerir que uma escolha de template é imposta pelo padrão.
- A pesquisa não afirma que ADRs, sozinhos, mantenham o código alinhado. A manutenção depende de autoria no fluxo de mudança, referências úteis, revisão e eventualmente verificações específicas.

## Decisão após a primeira rodada

Em 2026-09-24, o usuário aprovou adotar `docs/adr/` para decisões técnicas significativas. O registro será conciso, com contexto, decisão, alternativas reais, consequências, estado/data e links de evidência; decisões substituídas apontarão para a sucessora. O processo não exige ADR para cada mudança nem aprovação de um comitê. A quantidade e os candidatos para backfill retroativo continuam pendentes.

## Auditoria local do Polaris e comparação com Hub

### Polaris

- Não há diretório nem arquivo ADR no checkout. `docs/business-rules/decision-register.md` registra regras/decisões de produto; `docs/business-rules/normative/` contém o comportamento aprovado. Isso não é redundância a eliminar: ADRs devem ficar no eixo de decisões técnicas e linkar essas autoridades, sem reescrever decisões de domínio.
- `docs/architecture/overview.md`, `rls-tenant-isolation.md`, `external-integrations.md` e `database-environments.md` documentam arquitetura e limites do sistema, mas foram verificados contra SHA `886eda0` em 2026-07-14 e, em geral, descrevem o estado atual sem registrar alternativas/rationale. São fontes para uma ADR somente onde sustentem contexto ou decisão.
- **Candidatos fortes:**
  - Fronteira de autorização/RLS entre organização tenant e plataforma. Normas DEC-BR-076/077, os três contextos de banco e migrations/testes demonstram consequência de segurança. Uma ADR pode registrar a escolha técnica e apontar para as regras de negócio, sem duplicá-las.
  - Outbox transacional e captura/recuperação durável de eventos. O código, `docs/architecture/request-lifecycle.md`, regras de billing/eventos e decisões DEC-BR-034/062 dão evidência de trade-off de confiabilidade e alcance entre módulos.
  - Adaptadores de billing com estado interno normalizado. `packages/billing`, documentação de integrações e DEC-BR-064 registram a separação; uma ADR pode explicar a fronteira técnica e referenciar as decisões de preço/provedor.
- **Condicionais ou para depois:** monorepo web/admin é fato confirmado, mas não há racional recuperado de monorepo versus múltiplos repositórios; aplicação e deploy separados podem ser escolhas distintas. Neon é fornecedor já usado, porém a razão de seleção não foi encontrada e P2 prevê revisar a stack. R2 tem operação privada/documentada, mas não rationale verificável para escolher o fornecedor, também sujeito a P2. `@polaris/date` tem racional técnico em plano e regra temporal normativa DEC-BR-049/TIME-001; o plano está defasado e a separação em package é reversível, então não justifica ADR automática.
- Um ADR retroativo só pode registrar como histórico o que documentos, código, discussão preservada ou o usuário confirmarem. Se não há evidência de alternativas/rationale, registrar uma decisão presente com data atual ou apenas descrever o estado arquitetural; não atribuir racional ao passado.

### Hub

- O checkout local contém `docs/adr/0001...0017`, com exemplos de Contexto, Decisão, Alternativas, Consequências e evidências. As decisões de produto ficam em `docs/decisions.md`; ADRs técnicas têm namespace separado.
- O snapshot não é template a copiar integralmente: formato varia entre registros, todos parecem aceitos, há ADR-0017 duplicado no índice, vários `last_verified_commit` são antigos e o checker não verifica toda a cadeia de ADRs/supersession. Os documentos locais foram verificados em `b9cc1bd`, 36 commits antes do HEAD local `bea618f`.

## Decisão após alinhamento

Em 2026-09-24, o usuário aprovou `docs/adr/` para ADRs técnicas significativas, curtas e distintas das decisões de negócio `DEC-BR`. Cada registro terá contexto, decisão, alternativas reais, consequências, estado/data e links de evidência; decisões substituídas apontam para a sucessora. Não haverá ADR para cada detalhe ou exigência de comitê.

O usuário aprovou backfill seletivo destes três temas: fronteira RLS/autorização tenant-plataforma; outbox transacional; adaptadores de billing com estado normalizado. O rationale será limitado ao que documentos/código sustentarem ou o usuário confirmar; lacunas históricas serão explícitas, sem reconstruir justificativas por inferência. Neon e fornecedor R2 ficam para depois da análise de stack do P2; monorepo e `@polaris/date` não receberão ADR sem evidência adicional de trade-off relevante.

Essa decisão encerra a revisão do ponto 11. As ADRs serão redigidas na execução consolidada do plano, depois dos 70 pontos.
