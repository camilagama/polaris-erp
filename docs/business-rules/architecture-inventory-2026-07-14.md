# Inventário de domínio e arquitetura

**Status:** descoberta, **não normativo**.  
**Escopo:** Subagent 1 da solicitação inicial, concluído em 2026-07-14 por leitura read-only.

## Evidência de cobertura

- `git ls-files` encontrou 637 arquivos rastreados, 461 fontes TS/TSX/SQL e 158 arquivos de teste.
- `apps/web` concentra 170 fontes; `apps/admin`, 28; `packages`, 86. O restante é configuração, documentação, scripts e metadados.
- O repositório é monorepo Bun/Turborepo com Next 16 em `apps/web` e `apps/admin`; os packages são `auth`, `db`, `billing`, `events`, `platform`, `platform-auth`, `emails`, `ui`, `e2e-support` e configuração.

## Mapa de execução

| Camada | Módulos e responsabilidade |
| --- | --- |
| Web tenant | login, onboarding, billing-required, dashboard, estoque, produtos, vendas e configurações; actions de auth, onboarding, catálogo, metas, produtos, imagens, estoque e vendas |
| Admin interno | diretório, billing, auditoria, retry de outbox e notas de suporte; guard separado com `support`, `operator` e `owner` |
| APIs | Better Auth, Google, health, Inngest, R2 presign/leitura/reconcile/health, webhooks Asaas/Woovi/Resend e bootstrap de desenvolvimento/E2E |
| Eventos/jobs | intake de webhook, outbox idempotente com lease/dead-letter, dispatch Inngest e reconcile diário de imagens |
| Dados | 29 tabelas de auth, tenancy, plataforma, eventos, e-mail, billing, catálogo, estoque, vendas e metas; 21 migrations versionadas |
| Integrações | Google/Better Auth, Postgres/Neon, Asaas, Woovi, Resend, Cloudflare R2, Inngest, Upstash e Sentry |

## Áreas inexistentes ou somente schema/documento

- Não há módulo operacional de feature flags, fornecedores, pedidos/recebimento, compras, importação, landed cost fiscal, refunds financeiros, chargebacks, contas a receber, settlement, push/SMS, banimento de conta, gestão de dispositivos, revogação explícita de sessão ou billing self-service.
- `purchasedOn` do produto não constitui módulo de compra.
- Tabelas de convite, alguns estados de billing e grants existem sem fluxo operacional completo; não devem ser promovidos a capacidade de produto por mera presença no schema.

## Limites da prova

O inventário demonstra a estrutura versionada. Não prova comportamento de Google, Asaas, Woovi, R2, Inngest, Resend, Sentry ou Neon promovidos. RLS, grants e migrations foram lidos em fonte, não no banco vivo.
