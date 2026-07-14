# Matriz de regras versus testes

**Status:** rascunho de descoberta, **não normativo**. A coluna “camada” não prova produção; especialmente testes PostgreSQL opt-in e testes de provider não substituem sandbox/ambiente promovido.

| Domínio/regra | Aplicação | Banco | Testes encontrados | Lacuna de prova |
| --- | --- | --- | --- | --- |
| Auth Google-only e workspace bloqueado | Better Auth factory/policy | auth tables | `packages/auth/src/*test.ts` | Google/OAuth real e recuperação operacional |
| Contexto tenant/billing | `requireAppContext` | RLS | actions tests; `tenant-context.test.ts` | role runtime promovida e org suspensa |
| Produto/estoque | services com lock | checks/FKs/RLS | `features/products/*test.ts` | retry/deduplicação de movimentos e RLS promovida |
| Venda/cancelamento | calculations + transação | checks, índices, FK, idempotency key | `features/sales/*test.ts`, DB sales tests | equação financeira sob escrita privilegiada |
| Metas | services/validação | one-active partial index | `features/goals/*test.ts`, `goals-active-unique.test.ts` | corrida de resolução contra archive/update |
| Billing | adapters/reconcilers | subscription/invoice/attempt/link constraints | `packages/billing/*test.ts`, Asaas/Woovi reconciliation tests | período, entitlements, evento fora de ordem, provider real |
| Webhook/outbox | intake + handlers | intake/outbox uniqueness, lease | intake/handler tests, lease postgres test | falha capture→enqueue, redelivery após erro, retry de webhook |
| Imagens | presign/workflow | produto metadata/RLS | image unit + E2E local | R2 real, CORS/lifecycle, conteúdo malicioso |
| Admin/audit | guards, rate limit, platform services | platform policies parciais | platform/platform-auth tests | grants cross-origin, RLS de tabelas platform, retenção/PII |

## Cobertura que precisa existir antes de chamar regras de “protegidas”

1. Cenários negativos, concorrentes e idempotentes para cada transição crítica.
2. Teste de banco para invariantes que dependem do banco, usando role runtime sem bypass em ambiente equivalente ao promovido.
3. Sandbox/contrato do provider para webhooks, inclusive duplicidade, fora de ordem, assinatura e timeout.
4. E2E de tenant suspenso, onboarding, billing-required e todos os papéis visíveis.
