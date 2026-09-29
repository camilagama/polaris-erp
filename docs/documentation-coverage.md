# Cobertura da documentação

**Base:** commit `886eda01ef126139ddce62545971e48f7d3d15f3` (`main`), revisado em 2026-07-14.

**Adendo de 2026-09-29:** `runbooks/backup-and-recovery.md` documenta a estratégia aprovada em P44 e os critérios do restore drill. É procedimento-alvo; não altera a evidência-base nem comprova automação ou restore real. O estado operacional atual está no registro P43.

**Leitura da confiança:** alta = código, schema/migration e/ou teste local apontados; média = código e configuração versionada, com dependência externa; baixa = procedimento ou estado que requer confirmação fora do repositório. Nenhum nível confirma produção.

| Área | Código/configuração apontados | Banco e testes apontados | Documento | Confiança | Lacuna principal |
| --- | --- | --- | --- | --- | --- |
| Visão e estrutura | Apps, packages, `turbo.json`, `package.json` | N/A | [Visão](architecture/overview.md), [estrutura](architecture/repository-structure.md) | Alta | Deploy e ambiente ativo não verificados. |
| Request e integrações | `proxy`, layouts, handlers, integrações web | Testes locais correspondentes | [Ciclo de request](architecture/request-lifecycle.md), [integrações](architecture/external-integrations.md) | Média | Proxies, DNS e serviços externos não comprovados. |
| Autenticação e organizações | Better Auth, `app-session`, actions de onboarding | Schema auth/tenant e testes de guard | [Autenticação](modules/authentication.md), [organizações](modules/organizations-and-tenancy.md) | Média | Sessão cross-origin, múltiplas memberships e reativação não confirmadas. |
| Autorização e admin | `requireAppContext`, `requirePlatformAdmin`, actions admin | Policies/admin guard e testes PostgreSQL | [Autorização](architecture/authorization-model.md), [admin](modules/platform-admin.md) | Alta | Efetivação de RLS/grants no ambiente promovido. |
| Schema e migrations | Drizzle e journal de migrations | Schema, constraints e testes PostgreSQL | [Schema](database/schema-reference.md), [relações](database/relationships-and-constraints.md), [migrations](database/migrations.md) | Alta | Metadados do banco promovido e drift não verificados. |
| RLS e tenancy | Helpers de contexto e migrations RLS | `postgres-behavior.test.ts` e testes de policy | [RLS](database/rls-and-tenant-context.md), [isolamento](architecture/rls-tenant-isolation.md) | Alta | Role de produção, `BYPASSRLS` e coverage de todas as queries. |
| Catálogo, produtos e imagens | Actions, handlers de presign/leitura e R2 | Tabelas de produto/imagem e E2E da API | [Catálogo](modules/catalog-products-inventory.md), [uploads](modules/uploads-and-images.md) | Média | Persistência R2 e reconciliação em ambiente remoto. |
| Vendas e metas | Actions e módulos de domínio | Tabelas, transações e testes locais apontados | [Vendas](modules/sales.md), [metas](modules/goals.md) | Alta | Cobertura E2E específica de regras de borda. |
| Billing e webhooks | Adaptadores Asaas/Woovi, handlers e outbox | Tabelas billing/eventos e testes com doubles | [Billing](modules/subscriptions-and-billing.md), [webhooks](api/webhooks.md) | Média | Assinaturas, payloads e reconciliação reais de sandbox/produção. |
| Jobs e observabilidade | Inngest, healthchecks, Sentry e rate limit | Eventos/outbox e testes locais apontados | [Jobs](operations/jobs-and-workflows.md), [observabilidade](operations/observability.md) | Média | Cron/retry remoto, alertas, retenção e redaction de PII. |
| Ambientes e operação | CI, preflight, smokes, runbooks | Job PostgreSQL e E2E buildado | [Ambientes](operations/environments-and-deployment.md), [backup e recuperação](runbooks/backup-and-recovery.md), [testes](testing/strategy.md), [E2E](testing/end-to-end.md) | Média | Projetos promovidos, automação de backup, restore real e smokes externos. |
| Segurança | Guards, rate limit, instrumentação e preflight | Baseline e suites locais indicadas | [Segurança](security/application-security.md) | Média | Configuração real de WAF, secrets, Sentry e controles de plataforma. |

## Interpretação

A matriz mede rastreabilidade para fontes versionadas, não qualidade absoluta nem cobertura de produção. Para os riscos transversais, consulte o [relatório de auditoria](documentation-audit-report.md). A manutenção por mudança está em [maintenance.md](maintenance.md).
