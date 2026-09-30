---
status: accepted
research_status: repository-and-decision-crosswalk-completed
decision_status: approved
reviewed_on: 2026-09-26
approved_on: 2026-09-26
---

# P60 — crosswalk da árvore-alvo

P60 foi tratado como diagrama conceitual, não como lista literal de arquivos ou comandos. A própria proposta diz que não precisa chegar ao estado-alvo em um único commit. As decisões aprovadas nos pontos anteriores prevalecem sobre qualquer entrada ilustrativa.

## O que a árvore representa

| Estado | Elementos | Orientação |
|---|---|---|
| Já existe | `AGENTS.md`, `README.md`, `PRODUCT.md`, `DESIGN.md`, `docs/README.md`, `apps/web`, `apps/admin`, principais pacotes | Existência não significa que a configuração ou o conteúdo já cumpram todas as decisões. |
| Aprovado, ainda a implementar | `CONTEXT.md` (P8), `docs/adr/` (P11), `operations.yml` separado de `ci.yml` (P23), `pull_request_template.md` (P40), registro de prontidão P43 | Criar conforme o ponto original, usando nomes e escopos já aprovados. |
| Condicional | `packages/db/AGENTS.md` (P46); deploy/homologação, promoção, backup e restore | Aplicar quando os gates técnicos e recursos de P4/P5/P23/P43–48 forem configurados. O alvo inicial de operações é o workflow único `operations.yml`, não arquivos separados por operação. |
| Não aprovado ou rejeitado para esta fase | AGENTS em Web/Admin/Events; `docs/domain`, `docs/integrations`, `docs/reviews`, `docs/archive`; workflows Dependency Review/CodeQL; nomes fixos `verify.ts`/`check-docs.ts` | Não criar por simetria ou apenas para corresponder ao desenho. |

## Evidência local e preservação

O checkout atual contém uma taxonomia documental maior que a mostrada: `docs/api`, `docs/business-rules`, `docs/database`, `docs/modules`, `docs/product`, `docs/reports`, `docs/runbooks`, `docs/superpowers`, `docs/architecture`, `docs/operations`, `docs/security` e `docs/testing`. Também mantém `aidd_docs/`, incluindo o snapshot histórico P50, e `plans/`. Esses diretórios continuam preservados; sua ausência do esquema não significa exclusão.

`docs/reviews/`, `docs/domain/`, `docs/integrations/`, `docs/archive/`, `docs/adr/`, `.github/workflows/operations.yml` e `.github/pull_request_template.md` ainda não existem no checkout analisado. Entre esses caminhos, apenas os itens marcados aprovados acima estão no plano de implementação; não foram criados neste ponto.

Polaris tem atualmente `apps/web`, `apps/admin` e mais pacotes ativos que os desenhados, incluindo `config`, `e2e-support` e `emails`. A árvore não pretende ser exaustiva. O Hub é um monólito e serve de referência de documentação e operação, não como estrutura de pastas para copiar.

## Reconciliação com decisões existentes

- P7 preserva as categorias documentais atuais e move algo somente com evidência de dificuldade de navegação.
- P14/P50 mantêm `aidd_docs/production-closed-test.md` no lugar atual; P51 permite rotulagem dirigida por risco sem nova pasta de arquivo.
- P15–17 mantêm apenas o `AGENTS.md` raiz nesta fase. P46 aprovou uma exceção específica para `packages/db/AGENTS.md`; isso não reabre os AGENTS de Web/Admin/Events.
- P23 aprovou separar CI de um `operations.yml` manual, com uma operação escolhida por dispatch. P4/P5 e P43–48 condicionam ambiente, hosting e operações reais.
- P28/P29 não aprovam Dependency Review nem CodeQL na configuração atual. P13/P20 aprovam comportamentos de validação/execução, não nomes de script ilustrativos.
- P43 acrescenta `docs/operations/production-readiness.md`, que deveria aparecer na árvore revisada.

## Limites

Crosswalk read-only do relatório, checkout e plano aprovado. A análise se baseia em pesquisas já concluídas nos pontos citados; P60 não adiciona escolha de tecnologia. Não foram alterados arquivos de aplicação, executados testes, acessadas contas/providers ou criados os caminhos futuros.
