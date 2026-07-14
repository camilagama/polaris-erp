# Regras de negócio: área de descoberta

**Estado da área:** os documentos de descoberta permanecem rascunhos não normativos. O conjunto aprovado e autoritativo está em [normative/](normative/README.md); sua implementação ainda é parcial.

## Navegação

- [Descoberta](discovery-report.md): evidências, módulos, contradições, lacunas e riscos.
- [Inventário de regras](rules-inventory.md): IDs provisórios e classificação AS-IS/TO-BE por unidade observada.
- [Entidades e fluxos](entities-and-flows.md): mapa de dados e trajetos ponta a ponta.
- [Atores e permissões](actors-and-permissions.md): matriz atual de acesso.
- [Invariantes](invariants.md): invariantes confirmados, parciais e ausentes.
- [Máquinas de estado](state-machines.md): estados e transições observados.
- [Matriz regra versus teste](rule-test-matrix.md): cobertura e ausências de prova.
- [Cobertura de decisões](decision-coverage.md): ligação entre achados materiais, decisões, gates e pendências posteriores.
- [Dependências externas](external-dependencies.md): provedores, jurisdição e pendências.
- [Questões abertas](open-questions.md) e [registro de decisões](decision-register.md): debate humano obrigatório.
- [Regras normativas aprovadas](normative/README.md): contrato autoritativo, estados, permissões, aderência e gates.
- [Plano de implementação](implementation-plan.md): PRs, dependências e critérios de aceite sem mudança de código nesta fase.

## Critério de promoção futura

Uma regra só pode virar normativa após decisão explícita, ID estável, origem/evidência, responsáveis, comportamento negado, transações, idempotência, concorrência, auditoria e teste de aderência definidos. Regras legais, fiscais, contábeis, de retenção e contratuais exigem a jurisdição ou contrato aplicável.
