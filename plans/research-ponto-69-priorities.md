---
status: accepted
research_status: dependency-priority-crosswalk-completed
decision_status: approved
reviewed_on: 2026-09-26
approved_on: 2026-09-26
---

# P69 — prioridades finais para a fundação

## Por que substituir a tabela P0/P1

A classificação original põe proteção de `main` antes do baseline e da transferência, requer uma branch `staging` que P4 adiou, e apresenta CodeQL/Dependency Review/nested AGENTS como refinamentos apesar de decisões contrárias já aprovadas. Ela mistura blockers técnicos, documentação, gates pré-go-live e otimizações medidas. O usuário aprovou ordenar por dependências e fase, não por um score isolado de impacto.

## Ordem e gates resultantes

| Faixa | Trabalho | Critério/limite |
|---|---|---|
| Blockers antes de acelerar features | Remover o hook quebrado; restaurar a baseline sem quarentena; criar `verify:quick`/`verify`; PG18 CI; stable upgrades; separar CI/operations e harden workflow | P22; P20–27; P34; P52/P54; P61/P62/P64. A proteção de `main` vem depois da transferência e dos checks verdes. |
| Governança documental da fundação | Índice/autoridade; CONTEXT; PRODUCT/DESIGN; ADRs seletivas; rastreabilidade; PR template/DoD; `docs:check` seletivo | P7–17; P35–42; P50–51; P63. Preservar árvore e conteúdo; sem mass frontmatter/moves. |
| Antes de dados reais / go-live | Staging persistente; readiness por escopo; backup+restore/RPO/RTO; migrations seguras; SHA/deployments/smokes/rollback; Admin perimeter | P4/P5; P43–49; P54; P57; P65–66. Provider gates condicionais ao lançamento; sem writes financeiros para smoke. |
| Refinamentos condicionais | E2E failure artifacts; snapshots visuais seletivos; Semgrep POC; Remote Cache; `--affected` | P55/P56/P29/P31–32/P20. Cada item tem condição de aceitação própria; não desloca blockers. |

## Rejeições e condicionais preservadas

- Não criar/proteger branch Git `staging` agora; persistent Staging é ambiente pré-go-live e a branch só será reavaliada após configuração (P4/P66).
- Não incluir CodeQL nem Dependency Review sob o entitlement atual; Semgrep fica como POC aprovado após baseline (P28/P29).
- Não remover/mover `aidd_docs`; atualizar autoridade, carregar memória seletivamente e rotular snapshots conforme P14/P50/P51/P63.
- Não criar AGENTS em Web/Admin/Events, nem labels de risco obrigatórias; apenas a exceção `packages/db/AGENTS.md` ligada ao guard P46.
- `--affected` aguarda medição e validação de base/dependentes; Remote Cache aguarda P32.

## Base da revisão

Esta prioridade sintetiza decisões aprovadas e auditorias de repositório nos pontos anteriores; consulta atual de serviços remotos não foi feita e testes não foram executados. P69 não substitui P43 ou os critérios individuais dos pontos de implementação.
