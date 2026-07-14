# Cobertura de testes por regra normativa

**Status:** descoberta de aderência, **não normativa**.  
**Escopo:** Subagent 14 da solicitação inicial. “Encontrado” significa teste versionado/local; não significa prova de provider ou ambiente promovido.

| Regra | Prova existente | Cobertura faltante antes de `implementada` |
| --- | --- | --- |
| AUTH-001 | unit da rota Google, URL/env e formulário | OAuth Google real, callback autorizado em produção, erro de provider |
| ACCOUNT-001 | nenhum para colisão/linking explícito | `sub` como identidade, colisão de e-mail, recuperação auditada, negação de merge implícito |
| SESSION-001 | unit de sessão/contexto e logout básico | idle/absoluta, rolling, logout, todas as revogações, auditoria sem segredo, admin-origin |
| ORG-001 | onboarding lock e criação; policy workspace | constraints de uma org/owner, concorrência com legado, migração |
| ORG-002 | app context para org inativa | suspensão E2E sem loop, closed, revogação e allowlist de job |
| RBAC-001 | matriz de app context e platform guard | soft delete exclusivo, ausência de impersonation, bypass em API/DB |
| TIME-001 | date range/dashboard unit parcial | borda São Paulo, virada mês/ano, job temporal e cache-key |
| REPORT-002 | métricas/dashboard/date-range unit | escopo consistente por card, snapshot após soft delete, escala/cache |
| PLAN-001 | onboarding/billing unit AS-IS | criação Free ativa, plano mensal, UI de estado |
| ENTITLEMENT-001 | nenhum de quota Free/pago TO-BE | 50/250 cadastrados, archive, galeria, imagens 5 MiB, meta e over-quota |
| SUB-001 | reconciliadores e billing unit AS-IS | grace de 7 dias, downgrade/reativação temporal, fechamento/cancelamento provider |
| PAY-001 | webhooks/reconciliation unit parcial | checkout sandbox Asaas/Woovi, assinatura, duplicidade, ordem e suporte |
| BILLING-001 | intake/outbox lease e handlers | falha pós-captura, recovery independente, evento fora de ordem, aviso idempotente |
| EVENT-004 | outbox máximo cinco falhas | política Inngest, jitter, concorrência por org, alerta e manual review |
| EMAIL-002 | serviço Resend/webhook unit | ordenação por provider, delivered/bounce/suppression, três retries, não regressão |
| PRODUCT-001 | produto/archive/stock unit e DB parcial | soft delete final, estoque zero, motivo, cascades e retenção |
| IMAGE-001 | storage/process/access unit e E2E local | galeria, 5 MiB, R2 CORS/lifecycle e purge verificável |
| STOCK-001 | stock lock e sales idempotency | ledger unificado, comando manual idempotente, retry/reconciliação |
| SALE-001 | venda/cancelamento/concorrência e DB parcial | ledger de venda/cancelamento, snapshot contra delete, reconciliação |
| SALE-002 | calculations e invariantes DB parcial | equação contra escrita privilegiada e todos os arredondamentos |
| GOAL-001 | schema, server e índice uma ativa | três metas pago, uma por métrica, corrida de lifecycle |
| AUDIT-001 | guards/audit de domínios e platform unit | inventário total de mutações, falha transacional, leitura PII |
| ADMIN-002 | guard, diretório, notas e mutations | grant lifecycle/TTL, PII com motivo, auditoria de leitura e DB RBAC fino |
| PRIVACY-001 | testes de projeção/redação parcial | retenção, pedidos, incidentes, mapa de tratamento e validação jurídica |

## Classificação por tipo

- **Unit:** ampla para cálculos, schemas, guards e componentes isolados.
- **Integração/Postgres:** presente para alguns locks, FKs, idempotência de venda, RLS versionado e outbox lease; depende de harness opt-in.
- **E2E:** local e pontual para onboarding, imagens e alguns fluxos; não cobre os novos contratos TO-BE.
- **Provider/sandbox:** inexistente para decisões de billing, R2, Resend, Inngest e OAuth de produção.

## Regra de promoção

Uma linha só pode sair de “parcial” quando houver teste do fluxo principal, negação, erro/retry, concorrência/idempotência quando aplicáveis e prova externa quando o contrato depender de provider.
