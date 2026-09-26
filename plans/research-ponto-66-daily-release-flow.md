---
status: accepted
research_status: repository-and-decision-crosswalk-completed
decision_status: approved
reviewed_on: 2026-09-26
approved_on: 2026-09-26
---

# P66 — crosswalk do fluxo diário e de release

## Decisão

Separar o ciclo diário de código do fluxo de release. O ciclo atual aprovado é branch curta por mudança → verificação focal → `verify:quick` full workspace quando P20 estiver implementado → PR para `main` protegida → CI → revisão do autor → merge. Worktree só é padrão para código independente escrito em paralelo. Não há aprovação humana obrigatória.

`Staging` é um dos quatro ambientes canônicos e deve estar persistente antes do go-live, mas não equivale a uma branch Git. Vercel, database, callbacks e bancos E2E ainda não estão configurados; a decisão de usar branch `staging` fica condicional a P4/P5.

## Evidência no checkout

- `.github/workflows/ci.yml` dispara push e PR para `main`; não há trigger/configuração de `staging` nem deploy automatizado.
- O checkout contém somente a branch local `main`; nenhuma consulta remota foi feita nesta auditoria.
- `verify:quick` e o fluxo de pre-push ainda dependem da implementação P20/P21 e dos pré-requisitos P61/P62.
- A configuração Vercel versionada contém build settings, não prova projeto/deploy ativo. Runbooks descrevem procedimentos, não provisioning ou smoke executado.
- P3/P4/P47/P48 já aprovam PRs para `main`, Staging persistente antes de Production, release por SHA e deploys Web/Admin separados/sequenciais.

## Fluxo futuro se uma branch `staging` for escolhida

A escolha só ocorre quando a necessidade de callbacks/integrated acceptance e o setup Vercel/Neon/E2E forem avaliados. Se houver `staging` persistente, ela pode ser uma etapa de integração/homologação, mas o SHA resultante ao entrar em `main` pode ser novo. A identidade de release continua o SHA completo de `main`: homologar novamente esse SHA, preparar deployment(s) Production do mesmo SHA, validá-los e promover os IDs exatos sem rebuild quando possível. Não contornar proteção de `main` com push direto para preservar o SHA.

## Sequência de release relacionada

1. SHA selecionado em `main`, CI e gates P43 aplicáveis aprovados.
2. Migrations versionadas replayadas em CI e Staging; Production migration é operação separada, valida target e recovery readiness (P45/P46).
3. Homologação em Staging e preparação/validação dos candidatos Web/Admin de Production a partir do SHA aprovado (P47/P48).
4. Promoções Web/Admin sequenciais, sem rebuild quando promovendo deployment ID existente; todos os candidatos afetados ficam prontos antes da primeira promoção.
5. Smoke por app e atualização do registro P43. Se a segunda promoção ou smoke falhar, parar e registrar estado parcial; não presumir atomicidade nem que rollback de aplicação desfaz migration.

No fluxo diário, o autor revisa o próprio diff/evidências; AI review é opcional, e o requisito de aprovação humana segue desabilitado. O Hub é referência do modelo staging por SHA, mas não altera as decisões Polaris.
