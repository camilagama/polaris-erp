# Regras de negócio: área de descoberta

**Estado da área:** os documentos de descoberta permanecem rascunhos não normativos. O conjunto aprovado e autoritativo está em [normative/](normative/README.md); sua implementação ainda é parcial.

## Navegação

- [Descoberta](discovery-report.md): evidências, módulos, contradições, lacunas e riscos.
- [Inventário de arquitetura](architecture-inventory-2026-07-14.md): arquivos, camadas, módulos e áreas inexistentes.
- [Execução dos subagentes](subagent-execution-log.md): escopo, evidência e andamento das 15 auditorias obrigatórias.
- [Inventário de regras](rules-inventory.md): IDs provisórios e classificação AS-IS/TO-BE por unidade observada.
- [Entidades e fluxos](entities-and-flows.md): mapa de dados e trajetos ponta a ponta.
- [Glossário](glossary.md), [atores](actors.md), [capacidades](capabilities-matrix.md) e [política de erros](error-policy.md): vocabulário e contratos transversais.
- [Atores e permissões](actors-and-permissions.md): matriz atual de acesso.
- [Invariantes](invariants.md): invariantes confirmados, parciais e ausentes.
- [Máquinas de estado](state-machines.md): estados e transições observados.
- [Matriz regra versus teste](rule-test-matrix.md): cobertura e ausências de prova.
- [Matriz consolidada de aderência](adherence-matrix.md): código, banco, teste, UI, API e prioridade.
- [Auditoria de cobertura por regra](rule-test-coverage-audit-2026-07-14.md): tipos de teste e lacunas de cada contrato normativo.
- [Cobertura de decisões](decision-coverage.md): ligação entre achados materiais, decisões, gates e pendências posteriores.
- [Dependências externas](external-dependencies.md): provedores, jurisdição e pendências.
- [Pesquisa de provedores operacionais](research-operational-platforms-2026-07-14.md): identidade, e-mail, jobs, storage e banco.
- [Pesquisa Google OAuth](research-google-oauth-2026-07-14.md): validação de token, identidade, linking e sessão local.
- [Auditoria de completude pós-decisões](completeness-audit-2026-07-14.md): módulos complementares, provas indisponíveis e decisões pendentes.
- [Auditoria de UX](ux-flow-audit-2026-07-14.md): percursos, regras visíveis e lacunas de interação.
- [Auditoria de aderência à solicitação inicial](initial-request-compliance-audit-2026-07-14.md): requisitos originais confrontados com prova atual e lacunas remanescentes.
- [Auditoria final de conclusão](final-completion-audit-2026-07-14.md): prova de fechamento da fase de análise, distinta dos gates de implementação.
- [Questões abertas](open-questions.md) e [registro de decisões](decision-register.md): debate humano obrigatório.
- [Decisões pós-auditoria](post-audit-decisions-2026-07-14.md): delegações de identidade, plataforma, dashboard, jobs e e-mail.
- [Regras normativas aprovadas](normative/README.md): contrato autoritativo, estados, permissões, aderência e gates.
- Domínios normativos: [identidade/tenancy](normative/domains/identity-and-tenancy.md), [billing/eventos](normative/domains/billing-and-events.md), [catálogo/estoque/vendas](normative/domains/catalog-inventory-sales.md) e [metas/plataforma/privacidade](normative/domains/goals-reporting-platform.md).
- [Plano de implementação](implementation-plan.md): PRs, dependências e critérios de aceite sem mudança de código nesta fase.

## Critério de promoção futura

Uma regra só pode virar normativa após decisão explícita, ID estável, origem/evidência, responsáveis, comportamento negado, transações, idempotência, concorrência, auditoria e teste de aderência definidos. Regras legais, fiscais, contábeis, de retenção e contratuais exigem a jurisdição ou contrato aplicável.
