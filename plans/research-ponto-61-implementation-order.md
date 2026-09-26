---
status: accepted
research_status: repository-and-decision-crosswalk-completed
decision_status: approved
reviewed_on: 2026-09-26
approved_on: 2026-09-26
---

# P61 — crosswalk da ordem de implementação

## Conclusão

A intenção de priorizar riscos e não executar todas as mudanças em paralelo está correta, mas a sequência literal de P61 não serve ao Polaris. A etapa “criar e proteger staging” contradiz a decisão P4. A proteção de `main` depende da transferência já aprovada em P3 e de CI verde, e não deve antecedê-las. A ordem aprovada pelo usuário está registrada em `plans/fundacao-polaris-erp.md`.

## Evidência e dependências

- `.github/workflows/ci.yml` roda `bun run audit:baseline` antes de outros checks de `verify`.
- `docs/security/dependency-advisory-baseline.json` tem `reviewBy: 2026-08-14`; `scripts/check-bun-audit-baseline.ts` encerra com erro por expiração antes de chamar `bun audit`. Isso prova uma condição local versionada que impedirá CI após a data, não o resultado de um run remoto atual. P22 manda corrigir o baseline, sem quarentena.
- `.codex/hooks.json` chama um script em `.agents/skills/impeccable/scripts/`, mas `.agents/` é ignorado e não versionado. O hook atual não é portátil; P34 aprovou removê-lo até uma instalação de Impeccable de projeto/clone seguro ser validada. O hook de design é assistivo, não gate de CI.
- O job de comportamento PostgreSQL usa `postgres:16`, enquanto P54 já aprovou PostgreSQL 18 para CI/E2E/Staging/Production. Esse desalinhamento deve ser tratado na fundação.
- P3: transferência para o proprietário GitHub Pro do irmão antes da configuração remota de branch protection; após baseline verde, selecionar/exigir contextos estáveis e verificar com PR.
- P4: não criar branch Git `staging` como requisito inicial; decidir a estratégia após Vercel/Neon, callbacks e E2E não produtivo serem escolhidos/configurados. Homologação persistente é obrigatória antes do go-live.
- P5: quatro ambientes canônicos já decididos (Local, CI, Staging, Production); Preview é modo de deployment, não quinto ambiente. Esse contrato não prova provisioning.
- P20/P21: criar perfis de verificação em todo o workspace, sem `--affected`; `pre-push` depende da existência/instalação e duração medida do perfil rápido.
- P23/P24/P25/P27: separar `ci.yml` de um workflow manual `operations.yml` com uma operação por dispatch; produção usa ref/Environment/secrets escopados, não secrets na CI comum.
- P2/P52: upgrades para versões estáveis, inclusive majors, em batches revisados durante a fundação; freeze só ao entrar o SHA exato na homologação final.

## Sequência aprovada

1. Remover o hook Codex quebrado até a integração Impeccable ser distribuível em clone limpo.
2. Corrigir a causa da baseline expirada/vermelha, sem adiar advisories em quarentena; criar `verify:quick` e `verify` segundo P20. Atualizações estáveis podem integrar batches pequenos se forem necessárias para corrigir a causa.
3. Alinhar PostgreSQL CI a 18 e continuar upgrades aprovados em batches verificados.
4. Separar CI e operações via `operations.yml`; manter wiring de Production e secrets condicionado a configuração segura e alvos definidos.
5. Transferir o repositório; o owner então protege `main` com contextos já verdes, sem aprovação humana, e confirma o bloqueio em PR.
6. Após confirmar instalação Lefthook e medir a duração, ativar o perfil rápido no pre-push.
7. Provisionar Staging persistente após decisões/configuração P4/P5 e antes do go-live; decidir nessa etapa se uma branch Git persistente ajuda.

## Escopo da pesquisa

P61 é uma síntese das decisões P3/P4/P5/P20–24/P34/P52/P54/P60. Foram conferidos arquivos versionados e evidências locais, sem executar testes, scripts, workflow, comandos remotos, transferência, branch protection ou provisionamento de provider. A análise não afirma o status atual de GitHub Actions, secrets, Vercel, Neon ou branches remotas.
