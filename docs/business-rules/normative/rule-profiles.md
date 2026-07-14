# Perfis normativos das regras

**Versão:** 1.1.0. **Responsável/approver:** produto, por decisões DEC-BR-001..063; DEC-BR-059..063 foram aprovadas por delegação explícita em 2026-07-14. **Origem:** decisão, código, schema, testes e pesquisa citados no inventário. **Confiança:** alta para decisão, variável para AS-IS, nunca prova ambiente promovido.

## Campos comuns obrigatórios

Cada regra abaixo usa: ator autorizado; escopo tenant/plataforma; gatilho e pré-condições; fluxo/alternativas e negação; estados/transições; invariantes/validações; efeitos de banco e externos; transação/idempotência/concorrência; auditoria/logs/métricas; mensagem/erro; segurança/privacidade; plano/feature flag; testes; referências; migração; limitação/gate e histórico. Onde um campo não se aplica, está explicitamente como `n/a`; detalhes AS-IS e referências estão em `../rules-inventory.md`, `../invariants.md`, `../state-machines.md`, `../rule-test-coverage-audit-2026-07-14.md` e `adherence-by-rule.md`.

| Regra | Ator/gatilho/pré-condição | Fluxo, transição e negação | Banco, efeitos, concorrência e idempotência | Auditoria, erro, segurança, teste e gate |
| --- | --- | --- | --- | --- |
| AUTH-001 | visitante inicia login Google | aceita somente Google; nega senha/outro IdP | cria identidade/sessão; callback seguro | audita sucesso/falha; teste de rota; gate Google |
| ACCOUNT-001 | usuário Google validado | `(google,sub)` único; nega merge por e-mail; alternativa é recuperação | account único; transação de linking; idempotente por sub | audita conflito/recuperação; sem token; teste de colisão |
| SESSION-001 | sessão válida e renovação | 7d idle/30d absoluto; logout/revogação encerram; nega operação revogada | sessão e motivo de revogação; atomicidade por sessão | audita login/falha/logout/revogação; testes TTL/negação |
| ORG-001/002 | onboarding e plataforma | uma org/owner; active↔suspended, active→closed; nega cross-tenant/onboarding em suspensão | constraints/migração/RLS; jobs allowlisted; concorrência onboarding | audit transacional; página dedicada; testes RLS/E2E |
| RBAC-001 | owner/plataforma | owner só soft delete; suporte sem impersonation | permissões e grants; nega herança tenant | audit ação/leitura sensível; matriz negativa |
| TIME-001/REPORT-002 | consulta de métrica | São Paulo; painel respeita filtro; histórico separado | cache-key/range/snapshot; serialização n/a | rótulo de escopo; testes de borda TZ/snapshot |
| PLAN-001/ENTITLEMENT-001 | onboarding/billing | Free ativo; quotas 50/250, 1/5 imagem, 1/3 meta; nega excesso | plano/entitlement transacional; contador cadastrado | audit mudança; mensagem quota; testes corrida |
| SUB-001/PAY-001/BILLING-001 | provider/relógio/owner | grace→Free; pagamento→paid; cancelamento fim período; nega regressão | versões/datas provider e outbox; idempotente | audit/aviso; sandbox Asaas/Woovi obrigatório |
| EVENT-004 | worker/webhook/imagem | 5 tentativas billing, 3 imagem; terminal→review | outbox atômico, lock por org, backoff/jitter | alerta obrigatório, diagnóstico redigido, testes crash/replay |
| EMAIL-002 | send/provider event | pending→accepted→delivered ou terminal; nega regressão/retry após aceitação | mensagem/evento por provider id; retry 3/24h antes de id | audit reenvio manual; testes bounce/suppression |
| PRODUCT-001/IMAGE-001 | operator/owner | archive reversível; soft delete final com saldo 0; quotas por plano | registros imagem/ledger; CAS; purge só retenção | audit motivo/confirmação; 5MiB; R2 gate/testes |
| STOCK-001 | comando estoque/venda/cancelamento | saldo nunca negativo; todo efeito gera ledger; replay devolve original | lock+ledger+projection em transação; chave tenant | audit/correlação; testes retry/reconciliação |
| SALE-001/002 | operator cria/cancela | completed→cancelled único; sem refund/AR; valores decimais | snapshots e ledger atômicos; key de venda | audit/erro de saldo; testes cálculo/concorrência |
| GOAL-001 | admin/job | active→completed/expired/archived; archived→active; nega reabrir terminal | CAS/índice por métrica/plano; job idempotente | audit/before-after; testes corrida/período |
| AUDIT-001 | mutação crítica | nega mutação se audit falhar | mesma transação; append-only lógico | logs sem segredo; teste rollback |
| ADMIN-002 | platform owner/support | owner gere grants TTL; reveal PII exige motivo; nega impersonation | grants role-aware; expiração/revogação | audit grant/leitura; testes PII/RBAC |
| PRIVACY-001 | titular/incidente/encerramento | suporte verificado; sem purge antes de tabela; incidente segue runbook | retenção/purge controlado; n/a sem gate | audit pedido; LGPD/jurídico obrigatório |

**Histórico:** v1.0.0 cobria DEC-BR-001..058; v1.1.0 incorpora DEC-BR-059..063 e perfis de campos. Regras substituídas permanecem no registro de decisões; nenhuma é renumerada.
