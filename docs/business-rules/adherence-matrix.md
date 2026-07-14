# Matriz consolidada de aderência

| Regra | Aprovada | Código | Banco | Teste | UI | API | Gap | Prioridade |
| --- | ---: | --- | --- | --- | --- | --- | --- | --- |
| AUTH-001/ACCOUNT-001/SESSION-001 | sim | parcial/contraditório | parcial | parcial | parcial | parcial | linking, revogação, TTL | alta |
| ORG-001/ORG-002/RBAC-001 | sim | parcial | contraditório | parcial | contraditório | n/a | one-owner, suspensão | crítica |
| PLAN-001/ENTITLEMENT-001/SUB-001 | sim | contraditório | contraditório | ausente | contraditório | parcial | Free, quota, lifecycle | crítica |
| PAY-001/BILLING-001/EVENT-004/EMAIL-002 | sim | parcial | parcial | parcial | ausente | parcial | recovery, provider, retry | crítica |
| PRODUCT-001/IMAGE-001/STOCK-001 | sim | parcial | contraditório | parcial | parcial | parcial | gallery, ledger, soft delete | alta |
| SALE-001/SALE-002/GOAL-001/REPORT-002 | sim | parcial | parcial | parcial | parcial | n/a | reconciliação, CAS, timezone | alta |
| AUDIT-001/ADMIN-002/PRIVACY-001 | sim | parcial | parcial | parcial | parcial | parcial | PII, grants, retenção | crítica |

Detalhe por regra: [normative/adherence-by-rule.md](normative/adherence-by-rule.md).
