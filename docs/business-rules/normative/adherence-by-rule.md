# Aderência individual por regra

**Versão:** 1.1.0. **Status:** relatório normativo; a coluna não transforma TO-BE em implementação.

| Regra | App | Banco | Teste | Gate/risco | Estado |
| --- | --- | --- | --- | --- | --- |
| AUTH-001 | Google-only | auth tables | unit | Google promovido | parcial |
| ACCOUNT-001 | linking contradiz | associação existe | ausente | recuperação | contradita |
| SESSION-001 | sessão básica | sessão básica | parcial | TTL/revogação/admin origin | parcial |
| ORG-001/002 | policy parcial | multi-member permitido | parcial | migração/RLS | contradita |
| RBAC-001 | parcial | RLS coarse | parcial | soft delete/support | parcial |
| TIME-001/REPORT-002 | runtime TZ/métricas mistas | n/a | parcial | São Paulo/snapshots | contradita |
| PLAN-001/ENTITLEMENT-001 | active-only | seed R$99 | ausente | Free/quota | contradita |
| SUB-001/PAY-001/BILLING-001 | reconciler parcial | estado sem ordem | parcial | provider/sandbox/recovery | contradita |
| EVENT-004 | cron/outbox parcial | attempts/DLQ | parcial | retry/alerta/serialização | parcial |
| EMAIL-002 | grava eventos | lifecycle incompleto | parcial | ordenação/retry | contradita |
| PRODUCT-001/IMAGE-001 | archive/uma imagem | cascade/10 MiB | parcial | gallery/retention/R2 | contradita |
| STOCK-001 | locks sem ledger | saldo/checks | parcial | ledger/retry | contradita |
| SALE-001/002 | snapshot/cancelamento | constraints parciais | parcial | ledger/equação | parcial |
| GOAL-001 | uma meta/lazy | índice uma ativa | parcial | quota/CAS/job | contradita |
| AUDIT-001 | parcial | audit tables | parcial | best-effort/read audit | parcial |
| ADMIN-002 | support amplo | RLS sem role fino | parcial | grants/PII | contradita |
| PRIVACY-001 | suporte parcial | dados persistidos | parcial | jurídico/retenção | não implementada |

## Critério de promoção

Uma regra só passa a `implementada` com links de PR/migration, fluxo principal e negado, concorrência/idempotência aplicável, auditoria e gate externo concluído. Até lá, este catálogo é a referência para a diferença entre norma e AS-IS.
