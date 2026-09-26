# Pesquisa do ponto 53 — cadência de dependências

**Data:** 2026-09-25  
**Estado:** decisão aceita em 2026-09-26. Dependabot semanal para Bun e GitHub Actions, patches/minors agrupados, majors separados; segurança fora do schedule e merge manual após CI.  
**Pergunta:** equilibrar correções de segurança, atualizações rotineiras e upgrades planejados sem acumular uma faxina anual.

## Evidência no Polaris

- Não há `.github/dependabot.yml` versionado no checkout; `package.json` usa Bun 1.3.11, workspaces e um `bun.lock` raiz.
- P26 é a decisão de autoridade para Dependabot: PRs para `main`, CI e merge manual; sem automerge antes de Vercel, Neon e E2E não produtivos estarem configurados. Não mudar esse target/fluxo em P53.
- P2/P52 já autorizam upgrades estáveis, inclusive majors, durante a fundação; P52 define o freeze só quando um SHA entra na homologação final.
- O inventário Polaris/Hub é um snapshot: Polaris está à frente em alguns pins e atrás em outros. A lista do Hub não é registry nem versão latest.

## Documentação atual do GitHub

- Dependabot oferece `package-ecosystem: bun` (Bun `>=1.1.39`); o Bun 1.3.11 e `bun.lock` do Polaris atendem ao limite documentado. Usar o manifesto/lockfile raiz para o workspace, após confirmar o suporte no setup real. [Opções do Dependabot](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference).
- Version updates usam agenda por update block/ecossistema: daily, weekly, monthly (a referência atual também documenta intervalos adicionais/cron em determinados serviços GitHub). Não há um rótulo simples `biweekly`; customizar cron só se a cadência semanal/mensal não servir. O schedule controla quando Dependabot verifica/cria version PRs.
- Security updates são disparadas por advisories, não pela agenda de version updates; o cooldown de version updates não as atrasa. `target-branch` direciona version updates; security PRs seguem a branch padrão em cenários relevantes. Portanto, security precisa permanecer fora de qualquer janela mensal/quarentena. [Version updates](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependabot-version-updates), [security updates e pull requests](https://docs.github.com/en/enterprise-cloud@latest/code-security/concepts/supply-chain-security/dependabot-pull-requests).
- Dependabot groups podem separar PRs patch/minor e manter majors individuais, por ecossistema; grupos não definem schedules diferentes. Um único weekly schedule é mais simples que tentar patch weekly + minor monthly dentro do mesmo Bun workspace. [Agrupamento de updates](https://docs.github.com/en/code-security/tutorials/secure-your-dependencies/optimizing-pr-creation-version-updates).

## Comparação com Hub

O Hub usa updates semanais para Bun e GitHub Actions em `staging`, com limite de PRs e groups minor/patch; o snapshot auditado não mostra auto-merge. O Polaris ainda não tem staging persistente e P26 mantém PRs para `main` sem auto-merge, então copiar o target do Hub não é compatível. O Hub apoia a cadência semanal e os groups, não seus branches/valores remotos.

## Recomendação

1. **Security:** tratar PR de segurança fora do schedule, avaliar escopo/exploitabilidade e corrigir imediatamente quando aplicável; não depender de grupo/cooldown/merge automático. Uma mitigação temporária deve ter responsável, evidência e expiração; a política P22 proíbe quarentena sem correção.
2. **Version updates pós-fundação:** um schedule semanal para Bun e GitHub Actions, em PRs separados por ecossistema; agrupar patches/minors compatíveis em groups distintos e manter majors em PRs individuais. O queue limit pode reduzir ruído. PRs seguem P26: target/merge manual e checks completos; não configurar staging/automerge neste ponto.
3. **Majors:** durante a fundação, manter P2/P52 (majors estáveis autorizadas, em batches pequenos e verificados). Depois de Production, fazer upgrades majors como trabalho planejado com changelog/migration guide, evidência de compatibilidade e recovery. Criar ADR quando a decisão muda arquitetura, fornecedor ou contrato; não exigir ADR para cada bump sem alteração de decisão.
4. **Cadência:** weekly é um ponto inicial verificável que reduz drift e evita uma grande faxina anual. Medir volume/tempo de triagem; se gerar ruído, ajustar para monthly ou um cooldown por semver, sem atrasar security updates. P53 não altera o freeze P52 durante homologação final.

## Fontes oficiais

- GitHub, [Dependabot version updates](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependabot-version-updates).
- GitHub, [Dependabot options reference](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference).
- GitHub, [security updates](https://docs.github.com/en/enterprise-cloud@latest/code-security/concepts/supply-chain-security/dependabot-pull-requests).
- GitHub, [grouping and cooldown](https://docs.github.com/en/code-security/tutorials/secure-your-dependencies/optimizing-pr-creation-version-updates).

## Limitações

Não foi consultada a configuração remota do GitHub nem confirmado se Dependabot está habilitado para este repositório. Não foi criado `dependabot.yml`, aberto PR, instalado dependência ou executado teste.
