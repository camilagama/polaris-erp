# Registro de execução dos subagentes

**Status:** descoberta, **não normativo**.  
**Objetivo:** conservar o escopo, a evidência e os limites de cada auditoria independente exigida na solicitação inicial. Todos os trabalhos foram read-only.

| Nº | Domínio | Estado | Produto da auditoria |
| --- | --- | --- | --- |
| 1 | Inventário de domínio e arquitetura | Concluído | [Inventário de arquitetura](architecture-inventory-2026-07-14.md): 637 arquivos rastreados, 461 fontes e 158 testes; camadas, integrações e domínios inexistentes. |
| 2 | Identidade e autenticação | Concluído | Google-only, linking implícito AS-IS, contexto de sessão, origens, auditoria, onboarding, admin cross-origin e lacunas; consolidado em `rules-inventory.md`, `completeness-audit-2026-07-14.md` e DEC-BR-059. |
| 3 | Organizações e multi-tenancy | Concluído | Onboarding serializado, policy Better Auth, RLS versionado, multi-membership/owner sem constraint, suspensão e cascades; consolidado em `rules-inventory.md`, `invariants.md` e DEC-BR-002, 030, 039, 043, 052 e 053. |
| 4 | Planos, billing e entitlements | Concluído | seed R$99/incomplete, guards `active`-only, adapters desplugados, reconciliação e entitlements; contradições e gates consolidados em `rules-inventory.md`, `adherence.md` e plano. |
| 5 | Admin interno | Concluído | console, guards/RLS, ações, PII, notas, billing, eventos e segregação; consolidação em `actors-and-permissions.md`, `completeness-audit-2026-07-14.md` e DEC-BR-060. |
| 6 | Catálogo, produtos e imagens | Concluído | modelo simples sem SKU/variações, archive, uma imagem/10 MiB AS-IS, R2 e cascades; contradições com quotas/galeria/soft delete registradas. |
| 7 | Fornecedores, compras e importações | Concluído — N/A | Não há schema, rota, job ou integração de procurement/importação; entrada manual de estoque não é compra. Sem regra fiscal inventada. |
| 8 | Estoque | Concluído | saldo/locks/custo médio/venda/cancelamento, ausência de ledger e idempotência manual, cascades e reconciliação; regra TO-BE já aprovada em DEC-BR-033 e 045. |
| 9 | Vendas, taxas, cancelamentos e estornos | Concluído | venda concluída, snapshots, fórmula, cancelamento/estoque, idempotência opcional e ausência de ciclo de pagamento/refund; escopo atual e regras TO-BE registrados. |
| 10 | Metas, métricas e relatórios | Concluído | métricas, lifecycle lazy, uma ativa AS-IS, timezone runtime, histórico e concorrência; DEC-BR-061 e regras de meta registram o alvo. |
| 11 | APIs, jobs, eventos e integrações | Concluído | APIs/webhooks/outbox/Inngest/R2, captura não atômica, tópicos capture-only, retry/DLQ e observabilidade; DEC-BR-062 é alvo, não aderência atual. |
| 12 | Segurança, privacidade e auditoria | Concluído | RLS, RBAC, PII, upload, webhooks, auditoria, LGPD e gates promovidos; nenhuma regra legal/fiscal foi inventada. |
| 13 | UX e fluxos do usuário | Concluído | [Auditoria de UX](ux-flow-audit-2026-07-14.md): visitante, onboarding, acesso, suspensão, billing, erros, repetição, conexão instável, mobile e admin. |
| 14 | Testes e cobertura | Concluído | [Cobertura por regra](rule-test-coverage-audit-2026-07-14.md): unit, integração/Postgres, E2E, concorrência, idempotência e provider por regra. |
| 15 | Governança | Concluído | estrutura, IDs, aderência, gates e plano existem; autoridade 001–058 vs 059–063, aderência individual e integração condicionada com `AGENTS.md` exigem consolidação. |

## Limite operacional

O ambiente permite um worker adicional reutilizável, não quinze agentes simultâneos. Os domínios são executados sequencialmente, preservando o isolamento de escopo exigido e sem concluir que a limitação de paralelismo reduz a cobertura requerida.
