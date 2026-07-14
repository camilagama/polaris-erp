# Aderência e gates

**Versão:** 1.0.0  
**Status:** relatório normativo de aderência; não confundir regra aprovada com implementação existente.

| Domínio | Regra aprovada | Estado atual conhecido | Prova necessária antes de declarar implementado |
| --- | --- | --- | --- |
| Tenancy | organização única, owner único, suspensão explícita | schema e app ainda divergem em memberships; suspensão atual tem risco de loop | migration, RLS/runtime e E2E |
| Billing | Free/pago, quotas, grace, downgrade temporal | guard atual usa subscription `active`, sem entitlements aplicados | modelo de entitlement, job temporal e E2E |
| Providers | Asaas cartão e Woovi PIX recorrente | Woovi recorrente self-service não confirmado | docs, contrato, sandbox e testes de webhook |
| Catálogo/imagens | quotas, galeria, soft delete final e 5 MiB | imagem atual é uma versão; validação AS-IS é 10 MiB | schema, storage lifecycle e testes |
| Estoque | ledger único e idempotência manual | venda/cancelamento alteram saldo fora do ledger unificado | migration, reconciliação e testes de retry |
| Venda | snapshot imutável e reconciliação | cálculo existe; banco não prova equação relacional | guarda de escrita e reconciliação |
| Metas | até 3 no pago, transição concorrente segura | índice atual permite apenas uma; update não condiciona status | migration e testes concorrentes |
| Privacidade | suporte manual, retenção, incidentes e mapa de papéis | não há tabela de retenção nem mapa validado | validação jurídica/contábil e runbook |
| Auditoria | mutação crítica falha sem audit | alguns caminhos legados são best-effort | inventário de mutações e testes transacionais |

## Gates externos obrigatórios

| Gate | Regra relacionada | Dono de validação | Condição de saída |
| --- | --- | --- | --- |
| Retenção | PRIVACY-001, IMAGE-001 | jurídico/contábil | tabela aprovada por categoria, fundamento, prazo e destino |
| Papéis de tratamento | PRIVACY-001 | jurídico/privacidade | mapa, aviso e contrato validados |
| Checkout recorrente | PAY-001, BILLING-001 | provider/engenharia | sandbox, contrato, assinatura, retries, duplicidade e suporte comprovados |

## Critério de implementação de uma regra

Uma regra só recebe status `implementada` quando houver: mudança de app/banco apropriada, validação de erro/negação, auditoria, teste de fluxo principal, teste negativo, teste de concorrência/idempotência quando aplicável e prova de provider ou gate externo quando aplicável.
