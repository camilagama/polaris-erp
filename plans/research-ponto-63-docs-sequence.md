---
status: accepted
research_status: repository-and-decision-crosswalk-completed
decision_status: approved
reviewed_on: 2026-09-26
approved_on: 2026-09-26
---

# P63 — crosswalk da sequência documental

P63 contém uma agenda válida de consolidação, mas suas etapas de movimento de AIDD, novas pastas e carregamento amplo no `AGENTS.md` conflitam com decisões P7/P14/P17/P50/P51. A sequência aprovada é incremental e preserva autoridade e caminhos já aceitos.

## Estado do checkout

- `docs/README.md`, `README.md`, `PRODUCT.md`, `DESIGN.md`, o `AGENTS.md` raiz e `docs/operations/production-readiness.md` (P43) existem; `CONTEXT.md` e `docs/adr/` ainda não.
- A taxonomia de `docs/` já cobre API, arquitetura, regras, banco, módulos, produto, relatórios, runbooks, operações, segurança, testes e planos/specs Superpowers. Não há justificativa documentada para substituí-la por `domain/integrations/reviews/archive`.
- O inventário encontrou 111 arquivos Markdown sob `docs/` sem frontmatter YAML inicial. Isso não justifica metadados em massa; P12/P13/P51 já definem as classes específicas.
- `aidd_docs/` contém memória e snapshots. `aidd_docs/production-closed-test.md` deve permanecer no lugar atual (P50); movê-lo quebraria ao menos uma referência relativa. `AGENTS.md` também referencia memória nessa árvore.
- O Hub tem outro mapa e uma estrutura monolítica; aproveitamos o conceito de índice/autoridade, não os diretórios.

## Decisões que controlam cada etapa

1. **Mapa:** atualizar `docs/README.md` e simplificar o README raiz para apontar ao mapa (P7/P14/P51). Categorias: contratos canônicos, evidência operacional P43, decisões/ADRs e histórico/planos.
2. **Vocabulário:** criar `CONTEXT.md` raiz com termos validados, sem misturar regras, schema, código ou diretrizes de agentes (P8). Reconciliar glossário de negócio com a autoridade aprovada; manter glossários técnicos onde estão.
3. **Brief e design:** manter `PRODUCT.md` conciso e não duplicar regras (P9); completar `DESIGN.md` com o contrato existente e aprovado de UI, acessibilidade e dados temporais (P35/P36/P58/P59).
4. **ADRs:** usar `docs/adr/` para decisões técnicas significativas e criar somente os três backfills P11 com rationale verificável. DEC-BR continua separada.
5. **Instruções:** atualizar `AGENTS.md` com links e leituras condicionais para o mapa e `docs/maintenance.md`; não auto-carregar todos os docs. Manter root-only por P17, exceto o arquivo de `packages/db` autorizado por P46.
6. **Metadados/lifecycle:** aplicar frontmatter apenas aos tipos de fonte canônica definidos por P12/P13. Fazer inventário histórico por risco: snapshots perigosos recebem `status: historical`; planos substituídos recebem `execution_status: superseded`, `superseded_by` e “Não executar”. Preservar local, data/SHA disponíveis e avisos suficientes.
7. **Validação:** ampliar `docs:check` após o mapa e lifecycle estabilizarem; validar links/anchors, classes selecionadas e referências/IDs adotados. Não exigir freshness universal de históricos e planos.
8. **Exceção de subtree:** criar `packages/db/AGENTS.md` somente junto à guarda executável de `db:push` aprovada por P46; não inferir subtrees de AGENTS da árvore esquemática P60.

## Limites

Na revisão original, este arquivo foi um crosswalk de caminhos e decisões já aceitas; não alterou conteúdos, não moveu arquivos, não criou diretórios vazios e não executou testes. A atualização de implementação abaixo registra trabalho posterior.

## Atualização após a etapa 1

Em 2026-09-29, `docs/README.md` e o ponteiro no README raiz foram reconciliados conforme a etapa 1 e aprovados pelo usuário. `docs:check`, Ultracite e `verify:quick` passaram antes dos pushes (`251b39d`, `fa4b321`). Na etapa 2, `CONTEXT.md` e a reconciliação dos glossários foram implementados e aprovados pelo usuário (`96f4293`); `docs/adr/` segue ausente. As etapas restantes mantêm a ordem aprovada acima.
