# P10 — Identificadores estáveis para regras de domínio

**Pesquisado em:** 2026-09-24  
**Pergunta:** O Polaris deve atribuir IDs estáveis às regras de domínio, referenciá-los em documentação/código/testes e automatizar a validação do catálogo?

## Conclusão

**A recomendação procede, com limites.** Um catálogo canônico de regras com identificadores únicos ajuda a encontrar, discutir e rastrear uma regra ao longo de sua implementação. As fontes sustentam identidade explícita, linguagem declarativa, granularidade atômica e ligações para evidências. Elas **não** prescrevem um prefixo universal como `REG-`, nem exigem que cada arquivo de código repita o ID.

Em um projeto que ainda não tenha catálogo, usar `REG-<DOMÍNIO>-NNN` pode ser uma convenção inicial razoável, desde que os códigos de domínio sejam definidos e tratados como parte imutável do identificador. Não renumerar nem reutilizar IDs. Manter o mesmo ID quando apenas a redação ou implementação muda sem mudar o significado; criar um novo ID e marcar o anterior como substituído quando a obrigação ou seu escopo mudar materialmente. O ID identifica a regra, enquanto o status e as referências de supersession registram seu ciclo de vida. **Essa recomendação genérica não se aplica literalmente ao Polaris**, que já tem IDs próprios em uso.

O relatório sugere que o mesmo ID possa aparecer em documentação, código e testes. A direção de rastreabilidade é boa, mas a exigência deve ser **ligações verificáveis, não repetição obrigatória**: o catálogo aponta para os símbolos implementadores e para os testes que demonstram o comportamento. Comentários em produção com IDs são opcionais quando não tornam a relação mais clara. Um identificador ou tag em um teste ajuda a localizá-lo, mas não prova que o teste cobre a regra.

## O que as fontes sustentam

### Regras como conhecimento de negócio

O [Business Rules Manifesto](https://www.businessrulesgroup.org/brmanifesto/BRManifesto.pdf), do Business Rules Group, trata regras como parte explícita dos requisitos e do modelo de negócio. Recomenda expressá-las declarativamente, validáveis por pessoas do negócio, distinguindo a regra de seu mecanismo de aplicação. O manifesto também trata exceções como regras relacionadas. É orientação de um grupo profissional, não norma obrigatória.

O documento do mesmo grupo [Defining Business Rules](https://www.businessrulesgroup.org/first_paper/BRG-whatisBR_3ed.pdf) descreve decompor afirmações compostas em regras atômicas: uma afirmação específica de termo, fato, derivação ou restrição que não deve ser dividida a ponto de perder informação relevante. Também recomenda considerar a estabilidade da regra. Isso apoia granularidade intencional; não significa transformar cada condição técnica ou frase em um item separado.

A norma [OMG SBVR 1.5](https://www.omg.org/spec/SBVR/1.5) formaliza vocabulários e regras de negócio e disponibiliza modelos legíveis por máquina. Ela apoia vocabulário explícito e regras analisáveis, mas não exige IDs textuais do tipo `REG-DOMÍNIO-001`, um catálogo em Markdown ou uma integração direta entre cada regra e um comentário de código. Adotar o formalismo completo SBVR seria uma decisão de custo e necessidade, não pré-requisito para um catálogo pequeno.

### Identidade, rastreabilidade e mudança

A [NASA Requirements Verification Matrix](https://www.nasa.gov/reference/appendix-d-requirements-verification-matrix/) recomenda que requisitos verificáveis tenham identificadores únicos e fonte identificada na matriz. O [processo NASA de gerenciamento de requisitos](https://www.nasa.gov/reference/6-2-requirements-management/) trata mudanças ao longo do ciclo de vida e rastreabilidade bidirecional entre origem, requisitos derivados, design e planos de verificação. A [orientação de rastreabilidade de software da NASA](https://swehb.nasa.gov/pages/viewpage.action?pageId=16456171) também distingue e identifica requisitos, elementos de design/código e casos de teste.

Essas fontes são de engenharia de sistemas/requisitos, não uma prescrição específica para regras de negócio ou para um monorepo pequeno. A aplicação útil é manter a ligação da origem da regra até a implementação e sua evidência de verificação, incluindo o caminho inverso para encontrar comportamentos sem regra de origem. Polaris não precisa adotar a estrutura de comitês, matrizes extensas ou ferramentas de gestão espacial da NASA.

O padrão [ISO/IEC/IEEE 29148:2018](https://www.iso.org/standard/72089.html) define processos de engenharia de requisitos e traceability entre necessidades, requisitos e implementação. É outra analogia de requisitos formais; não define namespace ou ciclo de vida para o catálogo interno de regras do Polaris.

### Práticas de projetos e formatos de decisão

O [OWASP ASVS 5.0](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x03-What-is-the-ASVS.md) mostra uma consequência prática de IDs baseados em posição: os números podem mudar quando o padrão é reorganizado. Para citações fora da versão corrente, o projeto recomenda incluir a versão no identificador e fornece mapeamentos entre versões. Isso não significa que o Polaris deva versionar o ID interno a cada release; significa que referência externa dependente de uma edição deve fixar essa edição e que reorganizar um catálogo não deve renumerar referências históricas silenciosamente.

No repositório first-party [Microsoft HVE Core](https://github.com/microsoft/hve-core/blob/main/.github/skills/project-planning/requirements-author/references/_shared/id-schema.md), famílias como regra (`BR`) e decisão de design (`DD`) têm papéis e prefixos distintos. O esquema documenta unicidade, sequência numérica e a regra de não renumerar após exclusão ou reordenação. A [convenção de rastreabilidade do projeto](https://github.com/microsoft/hve-core/blob/main/.github/skills/project-planning/requirements-author/references/_shared/traceability-naming.md) registra relações por ID, separa famílias semânticas e permite definir se uma relação é obrigatória, alvo de cobertura ou apenas informativa. É uma prática concreta de um projeto público, não uma política normativa aplicável a todos os produtos.

O [MADR](https://adr.github.io/madr/) define ADR como registro de uma decisão arquitetural justificada, com seu racional, e oferece status como proposta, aceita, rejeitada, depreciada ou substituída por outra ADR. Sua convenção de numeração é uma prática para **decisões**, não para regras. Isso apoia manter namespaces separados: `REG-*` para obrigações/invariantes de domínio, `DEC-*` para decisões de produto e `ADR-*` para escolhas arquiteturais. Uma regra pode apontar para a decisão/ADR que explica sua origem; os artefatos não devem compartilhar o mesmo ID.

Um exemplo de catalogação executável é o projeto [FDAI](https://github.com/dotnetpower/fdai/blob/main/rule-catalog/RULE_AUTHORING_GUIDE.md): cada regra de política tem ID único, metadados, origem e referências para lógica executável e remediação; testes verificam que o ID e o arquivo correspondem e o loader rejeita referências ausentes. O projeto também separa regra atômica de controle mais amplo, que pode exigir várias evidências. É um caso específico de políticas de infraestrutura, útil para demonstrar o que um catálogo automatizado consegue validar, não um modelo a copiar integralmente para regras de ERP.

## Avaliação das propostas do relatório

| Tema | Avaliação | Aplicação recomendada ao Polaris |
|---|---|---|
| ID explícito e único | **Manter.** NASA e exemplos first-party usam IDs para busca e referência; nenhuma fonte exige `REG-`. | Adotar um namespace próprio. `REG-<DOMÍNIO>-NNN` é legível e suficiente para começar. Validar unicidade no catálogo inteiro. |
| Estabilidade | **Manter, definindo o que permanece estável.** A estabilidade deve estar ligada à identidade semântica, não ao título, arquivo, linha, sequência visual ou implementação atual. | Nunca renumerar ou reciclar IDs. Mover arquivos, ajustar nomes e trocar implementação não muda o ID se a regra continuar a mesma. Definir códigos de domínio duráveis; prefixo antigo pode permanecer em um ID legado. |
| Granularidade | **Aprofundar.** “Uma regra por ID” precisa significar uma obrigação coerente e validável, sem empacotar várias políticas independentes. | Uma regra deve expressar uma restrição, permissão, obrigação ou derivação. Separar exceções independentes. Não fragmentar partes que só têm sentido como uma única condição/resultado. |
| Ciclo de vida | **Adicionar.** Um ID estável sem estado explícito pode parecer vigente depois de a regra mudar. Padrões de ADR demonstram estados e relações de supersession; requisitos formais mostram a necessidade de gerir alterações. | Estado mínimo: `proposed`, `active`, `superseded` ou `withdrawn`. Regra `superseded` aponta para sua sucessora; regra `withdrawn` registra motivo. Não incorporar status ou versão mutável ao ID. |
| Mudança semântica | **Distinguir de edição.** Projetos de catálogo podem optar por manter o mesmo ID e aumentar versão; referências a padrões externos podem depender de versão. Não há regra universal. | Correção editorial ou mudança na implementação mantendo significado: conservar o ID. Mudança material de significado/escopo: emitir novo ID e marcar o antigo `superseded_by`. Guardar histórico no Git. Só introduzir versões paralelas da mesma regra se houver necessidade de aplicabilidade temporal/por organização. |
| Regra, decisão e ADR | **Separar.** Cada família responde pergunta diferente: “qual comportamento de negócio vale?”, “qual decisão de produto foi tomada?”, “qual escolha técnica foi justificada?”. | Usar prefixos/números independentes (`REG`, `DEC`, `ADR`) e referências cruzadas, sem duplicar a definição. O prefixo `REG-` é convenção interna, não padrão externo. |
| Regra → código → teste | **Manter como rastreabilidade, flexibilizar a forma.** NASA sustenta os vínculos; HVE demonstra que relações podem ser obrigatórias ou informativas conforme o tipo. | No catálogo canônico, registrar origem/decisão relacionada, áreas ou símbolos de implementação e testes que cobrem a regra. Exigir teste automatizado para regra executável de risco relevante; se não for automatizável, registrar como será verificada. Permitir muitos-para-muitos. Evitar obrigar cada linha de código a repetir o ID. |
| Automação | **Adicionar validações estruturais pequenas.** Exemplos de catálogo como FDAI mostram IDs, arquivos e referências verificáveis. | Um checker pode validar formato/prefixos permitidos, definição única, status válido, destino de supersession existente e acíclico, referências internas e presença de método de verificação nas regras ativas. CI pode falhar para erros estruturais. Não alegar que isso prova a correção do negócio, a atomicidade semântica ou que um teste realmente prova a regra. |
| Exemplo `REG-STOCK-004` do relatório | **Revisar a classificação antes de adotá-lo.** “Na mesma transação” descreve um mecanismo técnico de atomicidade. O princípio de negócio pode ser a consistência entre venda confirmada e baixa de estoque; a transação de banco é uma forma de implementá-lo. | Se houver aprovação do comportamento, formular a regra em termos do estado de negócio e deixar “mesma transação” em arquitetura/implementação ou critério técnico. O relatório sozinho não valida essa regra como requisito aprovado do Polaris. |

## Modelo mínimo sugerido

Uma entrada em Markdown pode começar com poucos campos, sem novo DSL, banco de requisitos ou engine:

```text
REG-<DOMAIN>-001 — <título curto>
Status: proposed | active | superseded | withdrawn
Rule: <uma obrigação/condição explícita usando o vocabulário do domínio>
Source/rationale: <origem, decisão aprovada ou justificativa>
Implemented by: <caminhos e símbolos pertinentes>
Verified by: <caminho e nome/tag do teste, ou método manual justificado>
Related: <DEC-… / ADR-… / REG-… quando aplicável>
Superseded by: <REG-… apenas quando substituída>
```

O campo `Implemented by` não precisa enumerar cada arquivo chamado indiretamente; deve apontar para a fronteira mais durável e útil à revisão. `Verified by` deve levar a um teste cujo comportamento seja compreensível e assertivo, não apenas conter a string do ID. O checker deve detectar links quebrados, mas uma pessoa ainda precisa validar que a regra reflete o produto e que a evidência a cobre.

## Recomendação para P10

**Aprovar um catálogo canônico e IDs estáveis, mas não transformar cada ID numa nova camada de burocracia.** Começar com IDs alfanuméricos legíveis, um registro único por regra, status e sucessão explícitos, referências à implementação/testes e um verificador estrutural leve. Não criar identificador para toda nota de produto, detalhe técnico ou critério temporário de feature. Critérios de aceite ficam na spec; decisões em `DEC`; arquitetura em `ADR`.

### Limites das evidências

- OMG SBVR e o Business Rules Manifesto dão base conceitual e de formulação, mas não definem uma sintaxe universal para IDs de regra.
- NASA e ISO 29148 fornecem práticas robustas de requisitos/traceability; a adaptação ao catálogo do Polaris é analógica e deve ser proporcional ao risco e ao tamanho da equipe.
- OWASP ASVS trata um padrão versionado cujos números mudam entre edições; HVE Core e FDAI demonstram convenções específicas de repositório. Nenhuma dessas fontes transforma `REG-<DOMÍNIO>-NNN`, `superseded_by` ou uma ferramenta específica em regra geral do setor.
- Uma checagem sintática não detecta regras de negócio duplicadas ou contraditórias com a confiabilidade de uma validação por quem conhece o domínio. SBVR admite modelagem formal e ferramentas de consistência, mas seu custo não se justifica automaticamente para a fundação do Polaris.

## Fontes

- [OMG — SBVR 1.5](https://www.omg.org/spec/SBVR/1.5/) — padrão formal sobre vocabulário e regras de negócio.
- [Business Rules Group — Business Rules Manifesto](https://www.businessrulesgroup.org/brmanifesto/BRManifesto.pdf) — independência entre regra, processo e enforcement; validação por pessoas de negócio.
- [Business Rules Group — Defining Business Rules](https://www.businessrulesgroup.org/first_paper/BRG-whatisBR_3ed.pdf) — formulação atômica de regras e avaliação de estabilidade.
- [NASA — Requirements Verification Matrix](https://www.nasa.gov/reference/appendix-d-requirements-verification-matrix/) e [Requirements Management](https://www.nasa.gov/reference/6-2-requirements-management/) — identificação, origem, gestão de mudança e verificação.
- [NASA Software Engineering Handbook — SWE-047 Traceability Data](https://swehb.nasa.gov/pages/viewpage.action?pageId=16456171) — entidades de requisitos/design/código/testes e rastreabilidade.
- [ISO/IEC/IEEE 29148:2018](https://www.iso.org/standard/72089.html) — processos de engenharia de requisitos e traceability.
- [OWASP ASVS 5.0 — What is the ASVS?](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x03-What-is-the-ASVS.md) — IDs e referências qualificadas por versão quando a numeração pode mudar.
- [Microsoft HVE Core — ID schema](https://github.com/microsoft/hve-core/blob/main/.github/skills/project-planning/requirements-author/references/_shared/id-schema.md) e [traceability naming](https://github.com/microsoft/hve-core/blob/main/.github/skills/project-planning/requirements-author/references/_shared/traceability-naming.md) — famílias separadas, prefixos configuráveis, IDs únicos/não renumerados e relações configuráveis.
- [MADR — Architecture Decision Records](https://adr.github.io/madr/) — decisões como registros separados com status e lifecycle próprios.
- [FDAI — Rule Authoring Guide](https://github.com/dotnetpower/fdai/blob/main/rule-catalog/RULE_AUTHORING_GUIDE.md) — exemplo de validação automatizada de IDs e referências em um catálogo executável de políticas.

## Auditoria local aplicada ao Polaris e Hub

### Polaris

- A fonte vigente já tem **28 IDs de regras normativas**, como `AUTH-001`, `ORG-001`, `STOCK-001`, `SALE-001`, `RELEASE-001` e `SCOPE-001`, em [`approved-rules.md`](../docs/business-rules/normative/approved-rules.md). As decisões de origem têm a família separada `DEC-BR-001` a `DEC-BR-085` no [`decision-register.md`](../docs/business-rules/decision-register.md). Portanto, criar `REG-*` agora formaria uma segunda nomenclatura canônica.
- [`individual-rule-profiles.md`](../docs/business-rules/normative/individual-rule-profiles.md) e [`adherence-by-rule.md`](../docs/business-rules/normative/adherence-by-rule.md) já conectam regras aprovadas a evidência por camada e testes. A cobertura existe, mas os campos de teste/evidência frequentemente não apontam a caminhos e nomes concretos que permitam localizar a prova rapidamente.
- [`rules-inventory.md`](../docs/business-rules/rules-inventory.md) chama seus IDs de provisórios e não normativos, mas reutiliza IDs da norma para registros AS-IS diferentes. Exemplos: `ORG-001` descreve suspensão administrativa no inventário e membership/owner na norma; `ORG-002` é um bug provável de redirecionamento no inventário e autorização/suspensão na norma; `RBAC-001` registra roles legadas no inventário e separação owner/suporte na norma; `STOCK-001` descreve entradas/baixas AS-IS no inventário e o ledger normativo completo na regra aprovada. O rótulo “provisório” não torna esses IDs globalmente inequívocos.
- A busca em `apps/` e `packages/` não encontrou IDs de regras ou decisões nos fontes/testes. Isso não impede usar a matriz como mapa entre regra, símbolos e casos de teste; também não justifica espalhar comentários de ID por implementação.
- [`governance.md`](../docs/business-rules/governance.md) é explicitamente uma proposta e o cabeçalho do `decision-register.md` ainda o chama de rascunho não normativo, enquanto a norma diz que as decisões fundamentam seu contrato. A regra de precedência normativa está mais clara que o status do processo de governança e do registro histórico.
- `bun run docs:check` chama apenas o verificador de links Markdown locais de `README.md` e `docs/`; não verifica IDs duplicados, referências a decisões inexistentes, mapeamento de teste ou estado de supersession.

### Hub

- O checkout local auditado usa `REG-<DOMÍNIO>-NNN` em guias de regras e separa IDs de decisão `DEC-DISC-NNN` e ADRs `ADR-NNNN`. As regras ligam contrato a código/testes por referências no próprio documento. Um teste verifica a presença de um ID de decisão, mas não há exigência de colocar IDs de regra em toda suíte.
- O Hub demonstra uma família possível, não uma justificativa para mudar o Polaris. A auditoria local identificou sufixos de regra sem convenção documentada e limitações no checker para referências de regra/ADR e frescor do índice. Os documentos estavam verificados em um SHA anterior ao `HEAD` local (`bea618f` versus `b9cc1bd`, 36 commits de diferença); portanto, é um snapshot de comparação.

## Recomendação específica para o P10 do Polaris

1. **Reutilizar o que já é canônico.** Manter os IDs atuais de regras por domínio e `DEC-BR-NNN` para decisões; não introduzir uma família paralela `REG-*`. Separar decisões (`DEC-*`), regras vigentes (`AUTH-*`, `ORG-*`, etc.), ADRs (`ADR-*`) e achados de descoberta por significado e autoridade, não apenas por prefixo visual.
2. **Resolver os IDs ambíguos da descoberta.** Antes de referenciar `rules-inventory.md` como autoridade ou carregá-lo como mapa de regras para agentes, mudar os IDs locais de observação para uma família claramente AS-IS (por exemplo, `OBS-*`) e mapear cada item para regra normativa apenas quando representar o mesmo contrato. Alternativa mais leve se o inventário virar histórico: retirar os IDs provisórios do caminho ativo e manter o arquivo explicitamente como snapshot.
3. **Melhorar a rastreabilidade no documento.** Completar a matriz/profile com caminho do símbolo implementador e nome/caminho de casos de teste pertinentes. Usar muitos-para-muitos; uma regra pode exigir vários testes e um teste pode provar mais de uma regra. Teste obrigatório para regra de alto risco; exceção precisa explicar a forma de verificação.
4. **Não exigir comentário em cada função ou teste.** IDs podem aparecer em PRs, planos e referências pontuais quando ajudam a revisão. O catálogo/matriz deve permitir seguir a relação à evidência sem transformar o código em espelho da documentação.
5. **Validar estrutura de forma leve depois de resolver as fontes.** Verificar unicidade dos IDs normativos, existência de IDs citados, referências de supersession válidas e presença de ligação para evidência quando exigida. O checker confirma estrutura, não valida se a regra está correta ou se um teste realmente cobre seu significado.
6. **Corrigir o processo/histórico à parte.** Esclarecer que `approved-rules.md` contém o texto comportamental vigente; `decision-register.md` preserva origem/histórico das decisões; `governance.md` permanece proposta até ratificação. Remover próximos passos obsoletos sem apagar a trilha.

### Conversa de praticantes

Uma discussão em `r/systems_engineering` compara IDs sequenciais com IDs hierárquicos e registra a preocupação de que reorganizar documentos torne referências frágeis. É um relato informal de um domínio de engenharia mais regulado; serve para expor o trade-off de estabilidade versus simplicidade, não como regra a importar para o Polaris. [Discussion: Requirements Numbering and Hierarchy](https://www.reddit.com/r/systems_engineering/comments/1djoblp)

**Limite importante:** o exemplo `REG-STOCK-004` do relatório diz “na mesma transação”, que especifica um mecanismo de implementação. Se o produto aprovar o comportamento subjacente, a regra de negócio deve expressar o resultado/invariante; atomicidade transacional fica em critério técnico ou documento de arquitetura. `SCOPE-001` e `STOCK-001` existentes também devem prevalecer sobre uma formulação criada apenas pelo relatório.

## Decisão após alinhamento

Em 2026-09-24, o usuário aprovou manter os IDs de regra já existentes no Polaris e `DEC-BR-NNN` para decisões, sem criar `REG-*`. Aprovou também preservar estabilidade/ciclo de vida dos IDs e melhorar a matriz de rastreabilidade para código e testes, sem exigir comentários com IDs em cada fonte/teste.

O usuário permitiu arquivar o inventário de descoberta em vez de criar `OBS-*`. A auditoria encontrou links do inventário em relatórios e registros de execução históricos; `approved-rules.md`, perfis normativos e matriz de aderência são as fontes adequadas para regra e conformidade vigentes. Assim, `rules-inventory.md` será mantido como snapshot histórico, retirado da navegação de regras ativas; referências históricas continuarão identificadas como snapshot, e seus IDs provisórios não serão promovidos nem renomeados para IDs normativos.

O plano também registra a revisão dos status/autoridade de `decision-register.md` e do documento de governança que hoje está marcado como proposta. O checker estrutural de IDs fica como melhoria a avaliar na execução consolidada, não como sistema paralelo de regras.
