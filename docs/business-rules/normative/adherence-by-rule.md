# Aderência individual por regra

**Versão:** 1.2.0. **Base:** auditoria estática de 2026-07-14. Uma célula não prova ambiente promovido; gates continuam abertos até evidência datada.

| Regra | Aprovada | Código | Banco | Teste | UI | API | Job | Gate | Lacuna principal | Prioridade |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AUTH-001 | sim | parcial | parcial | parcial | parcial | parcial | n/a | OAuth promovido | configuração e callback real | alta |
| ACCOUNT-001 | sim | contradita | parcial | ausente | ausente | parcial | n/a | OAuth/Better Auth | linking implícito por e-mail | crítica |
| SESSION-001 | sim | parcial | parcial | parcial | ausente | parcial | ausente | OAuth promovido | TTL absoluto/revogação | alta |
| ORG-001 | sim | contradita | contradita | parcial | parcial | parcial | n/a | dados legados | memberships/papéis permissivos | crítica |
| ORG-002 | sim | contradita | parcial | parcial | ausente | parcial | parcial | RLS promovido | suspensão faz loop para onboarding | crítica |
| RBAC-001 | sim | parcial | parcial | parcial | parcial | parcial | parcial | PII/grants | capacidades legadas e grants | alta |
| TIME-001 | sim | parcial | n/a | parcial | parcial | parcial | parcial | n/a | timezone não centralizado | média |
| REPORT-002 | sim | contradita | n/a | parcial | contradita | parcial | n/a | dados promovidos | métricas misturam escopos | alta |
| PLAN-001 | sim | contradita | contradita | ausente | ausente | ausente | n/a | providers | seed/preço/onboarding sem Free ativo | crítica |
| ENTITLEMENT-001 | sim | ausente | ausente | ausente | ausente | ausente | ausente | n/a | quotas não aplicadas | crítica |
| SUB-001 | sim | contradita | parcial | parcial | ausente | parcial | ausente | providers | relógio de grace/downgrade ausente | crítica |
| PAY-001 | sim | parcial | parcial | parcial | ausente | parcial | ausente | Asaas/Woovi | checkout/adaptadores e sandbox | crítica |
| BILLING-001 | sim | contradita | parcial | parcial | parcial | parcial | parcial | providers | recuperação pós-captura e ordem | crítica |
| EVENT-004 | sim | parcial | parcial | parcial | ausente | parcial | parcial | alerta promovido | política retry/review incompleta | alta |
| EMAIL-002 | sim | contradita | parcial | parcial | ausente | parcial | parcial | Resend | lifecycle não atualiza mensagens | alta |
| PRODUCT-001 | sim | contradita | contradita | parcial | parcial | parcial | n/a | retenção | remoção lógica e cascades | alta |
| IMAGE-001 | sim | contradita | parcial | parcial | parcial | parcial | parcial | R2/retenção | galeria, 5 MiB e lifecycle | alta |
| STOCK-001 | sim | contradita | contradita | parcial | parcial | parcial | ausente | n/a | vendas não entram em ledger único | crítica |
| SALE-001 | sim | parcial | parcial | parcial | parcial | parcial | n/a | n/a | ledger/retry de mutação | alta |
| SALE-002 | sim | parcial | parcial | parcial | parcial | parcial | parcial | n/a | privilégio e reconciliação | alta |
| GOAL-001 | sim | contradita | contradita | parcial | parcial | parcial | ausente | timezone | múltiplas metas e CAS ausentes | alta |
| AUDIT-001 | sim | parcial | parcial | parcial | parcial | parcial | n/a | n/a | caminhos best-effort | alta |
| ADMIN-002 | sim | contradita | parcial | parcial | contradita | parcial | parcial | PII/grants | leitura PII e grants temporários | alta |
| PRIVACY-001 | sim | parcial | parcial | ausente | ausente | ausente | ausente | jurídico/contábil | DSR, retenção e incidente | crítica |
| MUTATION-001 | sim | ausente | ausente | ausente | ausente | ausente | n/a | n/a | protocolo de comando/recovery | alta |
| OBS-001 | sim | parcial | ausente | ausente | ausente | parcial | parcial | operação promovida | redaction, métricas e alertas | alta |
| RELEASE-001 | sim | ausente | ausente | ausente | n/a | n/a | parcial | todos promovidos | checklist e provas de release | crítica |
| SCOPE-001 | sim | documentado | n/a | revisão | n/a | n/a | n/a | nova descoberta | impedir expansão não decidida | média |

## Critério de promoção

Uma regra só passa a implementada após evidência de código, banco, testes de fluxo permitido e negado, concorrência/idempotência quando aplicável, auditoria e gate externo concluído. As fichas de comportamento estão em [individual-rule-profiles.md](individual-rule-profiles.md).
