# Relatório de auditoria da documentação

**Status:** auditoria documental concluída para o commit `886eda01ef126139ddce62545971e48f7d3d15f3` (`main`).

**Data da revisão:** 2026-07-14.

**Escopo:** arquivos documentais criados ou atualizados pelas Tarefas 1–4 e seus apontadores no código, schema, migrations, testes e configurações versionadas. Não houve acesso a ambiente externo, dados de clientes, segredos, deploys nem execução de migrations.

## Método e fontes

A classificação abaixo evita tratar configuração ou teste local como prova de produção.

| Ordem | Fonte consultada | Uso na auditoria |
| --- | --- | --- |
| 1 | Commit `886eda01ef126139ddce62545971e48f7d3d15f3` e árvore versionada | Referência temporal e inventário do produto. |
| 2 | `apps/{web,admin}/src`, `packages/{auth,billing,db,events,platform,platform-auth}/src` | Entry points, guards, fluxos e efeitos implementados. |
| 3 | `packages/db/src/schema.ts`, migrations e testes PostgreSQL | Modelo de dados, constraints, RLS e comportamento isolado. |
| 4 | Testes Vitest/Playwright, `.github/workflows/ci.yml`, `package.json`, `turbo.json` e configurações de deploy | Cobertura automatizada e operação versionada. |
| 5 | Documentação existente em `docs/` e runbooks | Contexto e procedimentos, sempre subordinados às fontes acima. |

O plano menciona metadados Neon read-only no branch `dev`; eles não foram reconsultados nesta auditoria e não são evidência de produção.

## Documentos cobertos

Criados ou consolidados neste ciclo:

- Navegação e arquitetura: `README.md`, `docs/README.md`, `docs/glossary.md` e `docs/architecture/{overview,repository-structure,request-lifecycle,authorization-model,external-integrations,rls-tenant-isolation}.md`.
- Banco e módulos: `docs/database/{schema-reference,relationships-and-constraints,rls-and-tenant-context,migrations}.md` e `docs/modules/{authentication,organizations-and-tenancy,platform-admin,catalog-products-inventory,sales,goals,subscriptions-and-billing,uploads-and-images}.md`.
- Interfaces e operação: `docs/api/{route-handlers,server-actions,webhooks}.md`, `docs/operations/{jobs-and-workflows,observability,environments-and-deployment}.md`, `docs/security/application-security.md` e `docs/testing/{strategy,end-to-end}.md`.
- Rastreabilidade: este relatório, [matriz de cobertura](documentation-coverage.md), [manutenção](maintenance.md) e [plano](documentation-plan.md).

## Comportamento confirmado no código versionado

- O web exige contexto de aplicação no servidor para actions e handlers protegidos; o admin exige grant de plataforma para suas actions. As regras estão em [autorização](architecture/authorization-model.md) e [server actions](api/server-actions.md).
- Há RLS e `FORCE ROW LEVEL SECURITY` versionados para as tabelas listadas em [RLS e contexto tenant](database/rls-and-tenant-context.md). O comportamento é exercitado em PostgreSQL descartável, não no ambiente promovido.
- Asaas materializa `billing_invoices` durante sua reconciliação; Woovi associa links e cria payment attempts para invoice existente. `PIX_AUTOMATIC_COBR_TRY_REJECTED` registra attempt com falha sem transição de assinatura nesse mapeamento. Ver [billing](modules/subscriptions-and-billing.md).
- O intake de webhooks registra evidência antes da reconciliação; `observed` não é equivalente a retry pendente. Ver [webhooks](api/webhooks.md) e [jobs](operations/jobs-and-workflows.md).
- Imagens de produto usam objetos privados R2, presign, versionamento e reconciliação. Presign, troca, remoção e leitura possuem audit events encontrados; a reconciliação não grava audit event nesse código. Ver [uploads e imagens](modules/uploads-and-images.md).
- O CI versionado executa checks estáticos, testes, E2E, comportamento PostgreSQL, documentação e ambiente. Ver [estratégia de testes](testing/strategy.md) e [ambientes e deploy](operations/environments-and-deployment.md).

## Inferências delimitadas

- Os fluxos descritos combinam chamadas entre handlers, actions e pacotes, portanto representam o comportamento esperado do repositório, não uma confirmação de execução em Vercel, Inngest, R2, Neon ou provedores de cobrança/e-mail.
- A existência de preflight, smoke e runbooks indica intenção operacional. Não demonstra que backup, restore, alertas, rotação de segredos ou certificação de sandbox tenham sido executados.
- As políticas RLS e testes reduzem risco de acesso cross-tenant quando migrations e contexto estão ativos. Não demonstram que o runtime promovido não tenha `BYPASSRLS`, nem ausência de drift.

## Não encontrado nas fontes revisadas

- Checkout self-service, grace period de billing e prova de certificação de sandbox/produção dos provedores.
- Revogação global de sessão, recuperação de senha, verificação de e-mail e fluxo usuário de reativação após suspensão.
- Contrato OpenAPI versionado para handlers.
- Backup/restore automatizado ou evidência versionada de restore bem-sucedido em produção.
- Dashboards, alertas, retenção de logs ou política comprovada de redaction de PII.
- Teste fim a fim de múltiplas memberships/troca de organização e testes remotos reais de Asaas, Woovi, Resend, Inngest e R2.

## Contradições e consistência documental

| Severidade | Evidência | Impacto e encaminhamento |
| --- | --- | --- |
| Baixa | Alguns documentos usam o hash abreviado `886eda0` e o plano usa o hash completo. | Não há divergência de commit, mas a forma de referência deve ser padronizada no próximo ciclo. |

## Riscos e lacunas prioritárias

1. Produção não verificada: migrations aplicadas, role sem `BYPASSRLS`, ambiente ativo, provedores e cron permanecem fora da evidência local.
2. Observabilidade pode expor dados em logs de erro: o código não demonstra redaction/allowlist para metadados de request.
3. Billing depende de reconciliação e estados remotos sem teste de sandbox; um contrato alterado pelo provedor pode gerar divergência operacional.
4. A escolha de membership e a suspensão de organização têm limites conhecidos sem cobertura E2E completa.

## Perguntas em aberto

- Qual ambiente/projeto promovido atende `web` e `admin`, e qual banco/role cada runtime usa?
- As migrations de RLS e grants foram aplicadas e verificadas no ambiente promovido?
- Quais webhooks, crons, alertas, backups e restores foram testados contra ambientes externos controlados?
- Existe política aprovada de redaction, retenção e acesso a logs/Sentry?
- Qual comportamento de negócio é esperado para usuário com várias memberships ou organização suspensa?

## Resultado da auditoria

O conteúdo descreve com boa confiança o código versionado no commit analisado. A documentação não deve ser usada como prova de configuração externa ou de operação em produção até que as perguntas acima sejam respondidas com evidência do ambiente alvo.
