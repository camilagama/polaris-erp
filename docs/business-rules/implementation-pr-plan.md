# Plano de PRs para aderência das regras aprovadas

**Status:** plano histórico de correção. A implementação local e suas evidências atuais são registradas na [auditoria de implementação](implementation-audit.md); nenhum gate externo é considerado concluído sem evidência promovida datada.  
**Ordem:** cada PR é pequeno o bastante para revisão, mas preserva uma unidade de integridade. A liberação pública permanece bloqueada até o PR 10 e todos os gates externos concluídos.

## Checklist de status — 2026-07-15

Nenhum PR está cancelado. Pelo critério de aceite deste plano, nenhum PR pode ser marcado como concluído enquanto houver prova obrigatória externa ausente; “implementação local concluída” não equivale a certificação de release.

| PR | Status | Evidência local | Bloqueador para conclusão |
| --- | --- | --- | --- |
| PR-01 | Implementação local concluída; não certificado | código, migration e testes unitários | PostgreSQL/RLS runtime em ambiente isolado/promovido. |
| PR-02 | Implementação local concluída; não certificado | catálogo/entitlements e testes locais | migration e comportamento transacional em PostgreSQL dedicado. |
| PR-03 | Implementação local concluída; não certificado | inbox/outbox, idempotência e testes locais | comportamento PostgreSQL e recovery em ambiente isolado. |
| PR-04 | Implementação local concluída; não certificado | checkout hospedado, billing e testes locais | sandbox Asaas/Woovi/Resend e eventos reais ordenados. |
| PR-05 | Implementação local concluída; não certificado | grants, DSR, encerramento e testes locais | migration e smoke RLS com role runtime real. |
| PR-06 | Implementação local concluída; não certificado | galeria/retenção e testes locais | R2/CORS/lifecycle e política jurídica de retenção. |
| PR-07 | Implementação local concluída; não certificado | ledger/reconciliação diária somente-detecta, RLS restrita e testes locais | testes PostgreSQL e reconciliação em ambiente isolado. |
| PR-08 | Implementação local concluída; não certificado | metas/tempo e testes locais | job Inngest promovido e banco real. |
| PR-09 | Implementação local concluída; não certificado | retries, DLQ, retenção e telemetria redigida | alertas, R2/Resend/Inngest e providers promovidos. |
| PR-10 | Em certificação externa | lint, typecheck, testes, build, links e preflight E2E read-only | evidências datadas de RLS, restore, providers, alertas e E2E gravável em branch comprovadamente descartável. |

## PR 0 — Correções P0

Não há P0 confirmado no código versionado. A auditoria não executou banco/ambiente promovido; portanto não usa ausência de prova como aprovação de segurança. Qualquer vazamento cross-tenant observado no smoke real deve interromper este plano e criar um PR 0 imediato.

### `PR-01 — Identidade, sessões e tenant individual`

- **Objetivo:** tornar identidade, sessão, organização e autorização compatíveis com produto individual.
- **Prioridade:** P1.
- **Regras envolvidas:** AUTH-001, ACCOUNT-001, SESSION-001, ORG-001, ORG-002, RBAC-001.
- **Gaps corrigidos:** linking implícito, TTL/revogação, memberships/owners extras, suspensão em onboarding, papéis tenant excedentes.
- **Dependências:** inventário/migração de contas e memberships legadas.
- **Escopo:** `packages/auth/src/auth.ts`, `packages/auth/src/session.ts`, `packages/db/src/schema.ts`, novas migrations, `apps/web/src/lib/app-session.ts`, onboarding, página de suspensão, guards e testes.
- **Fora de escopo:** checkout, quotas, billing lifecycle e grants de plataforma.
- **Alterações no banco:** unique provider/sub, cardinalidade de membership/owner, lifecycle de sessão e dados de migração antes das constraints.
- **Migração necessária:** sim; deduplicar contas/memberships e recusar dados ambíguos com relatório auditável.
- **API/UI/jobs:** callback de recovery verificado; logout/revogação; tela restrita de suspensão; job/outbox de revogação quando necessário.
- **Compatibilidade/flag:** manter recovery legada atrás de suporte; não liberar mudança de linking sem migração concluída.
- **Rollout:** shadow-check de violação de cardinalidade, migrar, ativar constraints, provar dois tenants com role runtime.
- **Testes obrigatórios:** Google `sub`, colisão e concorrência; 7d/30d; logout/todas as revogações; onboarding repetido; cross-tenant read/update/delete; suspensão sem loop.
- **Observabilidade:** eventos redigidos de login/falha/linking/revogação e métrica de recovery.
- **Riscos/rollback:** risco de bloquear contas legadas; rollback desativa novo fluxo mas nunca reativa linking implícito para registros migrados.
- **Critérios de aceite:** uma pessoa/uma organização/um owner no banco; Free e suspensão recebem resultado de acesso distinto; sessões revogadas não retornam.
- **Regras concluídas após o PR:** somente as partes de identidade/organização comprovadas por testes; atualizar a matriz, não assumir billing.

### `PR-02 — Free, plano mensal e entitlements transacionais`

- **Objetivo:** criar o contrato comercial Free/pago e aplicar quotas em todos os writers.
- **Prioridade:** P1.
- **Regras envolvidas:** PLAN-001, ENTITLEMENT-001, ORG-002, SUB-001, PRODUCT-001, IMAGE-001, GOAL-001, SALE-001, STOCK-001.
- **Gaps corrigidos:** seed R$99/anual, Free bloqueado, 50/250 produtos cadastrados, 1/5 imagens, 1/3 metas e estado `free-over-quota`.
- **Dependências:** PR 01 para contexto tenant individual; decisão de migração dos planos/assinaturas atuais.
- **Escopo:** `packages/billing`, schema/migrations de plano e entitlement, guards de app, serviços de produtos/imagens/metas/vendas/estoque, UI de uso/upgrade/bloqueio.
- **Fora de escopo:** cobrança real e webhook provider; entram no PR 04.
- **Alterações no banco:** catálogo Free + `paid_monthly` R$49,90, versão/estado de entitlement, contadores ou queries bloqueadas por organização.
- **Migração necessária:** sim; mapear assinaturas existentes para paid ou Free sem ampliar acesso indevido.
- **API/UI/jobs:** resolver entitlement server-side antes de cada mutação; estado read-only para excedente Free; nenhuma UI deve ser a única barreira.
- **Compatibilidade/flag:** feature flag de entitlement novo até reconciliação do catálogo por “produtos cadastrados”, incluindo arquivados.
- **Rollout:** backfill, relatório de over-limit, habilitar leitura/remoção no Free, depois negar venda/estoque de excedentes.
- **Testes obrigatórios:** Free recém-criado, 50/51 e 250/251, archive não reduz uso, corrida de criação, 1/5 imagem, 1/3 meta, paid→Free→over-limit→paid.
- **Observabilidade:** contador/negação de quota por regra e alerta de discrepância de uso.
- **Riscos/rollback:** downgrade pode bloquear clientes acima da quota; rollback preserva estado e permite apenas restauração explícita do entitlement anterior.
- **Critérios de aceite:** nenhuma action/route/job contorna quota; Free tem acesso autorizado; preço e meios não aprovados não aparecem.
- **Regras concluídas após o PR:** PLAN-001/ENTITLEMENT-001 apenas para catálogo/guards; lifecycle temporal continua no PR 04.

### `PR-03 — Comandos idempotentes, inbox/outbox e auditoria tenant`

- **Objetivo:** tornar mutações e intake de eventos recuperáveis, transacionais e auditáveis.
- **Prioridade:** P1.
- **Regras envolvidas:** MUTATION-001, AUDIT-001, BILLING-001, EVENT-004, SALE-001, STOCK-001.
- **Gaps corrigidos:** audit fail-open, chave/result ausente, intake/outbox separado, replay sem recuperação.
- **Dependências:** PR 01; modelagem de entitlement do PR 02 pode integrar depois.
- **Escopo:** `packages/events/src`, schema/migrations de command/inbox/outbox/audit, `apps/web/src/integrations/webhooks/intake.ts`, handlers/actions de produto, estoque, imagem, meta, venda/cancelamento e UI pending.
- **Fora de escopo:** regras específicas Asaas/Woovi/e-mail e quotas, que entram nos PRs 02/04.
- **Alterações no banco:** chave única por tenant/comando, resultado persistido, inbox↔outbox atomizado, attempts/leases/next attempt e audit no mesmo commit.
- **Migração necessária:** sim; criar tabelas sem converter eventos antigos automaticamente, com reconciliador de pendências.
- **API/UI/jobs:** endpoint/ação de consulta de resultado por chave; HTTP webhook só confirma após capture; worker processa facts pendentes.
- **Compatibilidade/flag:** rotas antigas continuam temporariamente como wrappers que exigem chave; recusar retry cego de UI.
- **Rollout:** dual-write audit/outbox, monitorar divergência, ativar dispatcher e só então remover reconciliation síncrona.
- **Testes obrigatórios:** timeout pós-commit, clique repetido, chave concorrente, crash entre inbox/outbox, redelivery, lease expirado, falha de audit com rollback.
- **Observabilidade:** correlation ID/command ID, estado de inbox/outbox, dead-letter e latência de recuperação.
- **Riscos/rollback:** dual-processing pode duplicar efeito; chave única e worker feature flag permitem parar dispatcher mantendo captura durável.
- **Critérios de aceite:** cada comando crítico devolve resultado original no replay; mutação crítica não persiste sem audit; fato capturado sempre tem caminho durável de processamento.
- **Regras concluídas após o PR:** MUTATION-001 e AUDIT-001 somente após cobertura de todos os writers; BILLING-001/EVENT-004 ainda dependem de políticas dos PRs 04/09.

### `PR-04 — Billing lifecycle, checkout e e-mail`

- **Objetivo:** ligar providers ao domínio interno e cumprir lifecycle comercial/e-mail sem regressões.
- **Prioridade:** P1.
- **Regras envolvidas:** SUB-001, PAY-001, BILLING-001, EMAIL-002, EVENT-004, PLAN-001.
- **Gaps corrigidos:** checkout ausente, grace/downgrade/cancelamento, ordem provider, Woovi parcial, e-mail `sent`/sem lifecycle.
- **Dependências:** PRs 02 e 03; sandbox/contrato/elegibilidade Asaas e Woovi.
- **Escopo:** `packages/billing/src/providers/*`, billing domain/schema/migrations, reconciliadores Asaas/Woovi, webhooks, job temporal, Resend service/webhook, UI de upgrade/cancelamento/estado.
- **Fora de escopo:** refund automático e cobrança de vendas.
- **Alterações no banco:** entitlement efetivo/marcos grace, provider version/occurred-at, links de checkout, attempts; estados de e-mail `accepted/delivered/failed/bounced/suppressed`.
- **Migração necessária:** sim; converter `sent` para estado semântico, preservar eventos existentes e reconciliar subscriptions.
- **API/UI/jobs:** action autenticada de checkout idempotente; PIX capability esconde meio indisponível; cancelamento `at_period_end`; job São Paulo processa grace/downgrade.
- **Compatibilidade/flag:** manter PIX oculto até sandbox aprovada; cartão pode ser liberado separadamente apenas após provas.
- **Rollout:** sandbox, processamento assíncrono shadow, reconciliação manual, canary por provider; nenhuma autorização pública sem evidência.
- **Testes obrigatórios:** checkout duplicado/timeout, 7 dias, cancelamento e PIX revogado, eventos fora de ordem, falha de job, e-mail accepted/delivered/bounce/suppression, três retries pré-ID e zero pós-ID.
- **Observabilidade:** correlation por provider event, métricas de estado, alertas de atraso/dead-letter e avisos comerciais idempotentes.
- **Riscos/rollback:** provider pode criar cobrança antes de persistência; registrar intenção antes da chamada e reconciliar; rollback oculta método/pausa checkout sem destruir fatos.
- **Critérios de aceite:** acesso nunca depende de UI/provider isolado; fatos ordenados não regridem; Free/pago/grace são decididos pelo relógio interno idempotente.
- **Regras concluídas após o PR:** SUB-001, PAY-001, BILLING-001, EMAIL-002 condicionadas a sandbox e evidence promovida.

### `PR-05 — RLS, grants de plataforma e privacidade operacional`

- **Objetivo:** reduzir privilégio, completar políticas e criar processos mínimos de suporte/privacidade.
- **Prioridade:** P1.
- **Regras envolvidas:** RBAC-001, ADMIN-002, PRIVACY-001, AUDIT-001, ORG-002, RELEASE-001.
- **Gaps corrigidos:** tabelas sem RLS forçado, grants sem TTL, PII sem caso/audit, replay financeiro por operator, DSR/encerramento inexistentes.
- **Dependências:** PRs 01 e 03; validação jurídico-contábil para retenção final.
- **Escopo:** migrations/RLS/grants, `packages/platform*`, páginas admin de grants/casos, suporte, fechamento de organização, guards e testes de role.
- **Fora de escopo:** purge definitivo, que aguarda tabela aprovada; não implementar deleção automática.
- **Alterações no banco:** TTL/motivo obrigatório, casos de suporte/privacidade, leitura PII auditada, policy para metadados sensíveis e estados de fechamento/hold.
- **Migração necessária:** sim; expirar/revisar grants nulos, classificar acessos existentes sem apagar evidência.
- **API/UI/jobs:** owner aprova replay financeiro; support solicita/investiga; leitura PII vinculada a caso; DSR manual com protocolo.
- **Compatibilidade/flag:** acesso admin degradado a menos privilégio enquanto grants são migrados.
- **Rollout:** aplicar policies em staging sintético, smoke role real, revisão humana de grants, depois produção com monitoramento.
- **Testes obrigatórios:** role runtime sem contexto, tenant cruzado, owner/operator/support, PII sem caso, TTL, replay billing, DSR e fechamento revogando acesso.
- **Observabilidade:** audit de grant/PII/replay/DSR; alerta de policy denial e grant expirado.
- **Riscos/rollback:** policy incorreta pode bloquear operação; checklist de restore e conexão administrativa separada antes da migration.
- **Critérios de aceite:** suporte não impersona, grant permanente não existe, PII não é exibida sem motivo/audit e runtime não tem BYPASSRLS.
- **Regras concluídas após o PR:** ADMIN-002 e parte operacional de PRIVACY-001/RBAC-001; retenção/runbook dependem do PR 09/10 e gates jurídicos.

### `PR-06 — Catálogo, remoção lógica e galeria`

- **Objetivo:** substituir archive insuficiente por remoção final normativa e galeria com lifecycle seguro.
- **Prioridade:** P1.
- **Regras envolvidas:** PRODUCT-001, IMAGE-001, ENTITLEMENT-001, AUDIT-001, STOCK-001.
- **Gaps corrigidos:** soft delete final, motivo/owner/saldo zero, cascade de histórico, uma imagem, 10 MiB e purge prematuro.
- **Dependências:** PRs 02 e 03; gate jurídico de retenção para remoção física.
- **Escopo:** schema/migrations de `product_images` e estado de remoção, serviços/actions/queries de produto e imagem, R2 adapters, UI de confirmação/galeria e testes.
- **Fora de escopo:** purge final de R2/DB antes da tabela de retenção aprovada.
- **Alterações no banco:** imagens por produto/posição/versão; `soft_deleted_*`; FKs sem cascade destrutivo de histórico.
- **Migração necessária:** sim; converter imagem única, preencher estado de produto e preservar referências de venda.
- **API/UI/jobs:** owner-only remove, resposta idempotente, galeria ordenada, upload até 5 MiB e job de desvinculação/reconciliação.
- **Compatibilidade/flag:** manter leitura de metadado legado até migração verificada.
- **Rollout:** backfill de imagens, dual-read, habilitar galeria, depois bloquear caminho antigo.
- **Testes obrigatórios:** tipo/5 MiB, 1/5 imagem, CAS, CORS/prefixo, saldo zero, motivo, owner, histórico após remoção e nenhum delete cascata.
- **Observabilidade:** lifecycle por objeto/variante, órfão, quota e tentativa de remoção negada.
- **Riscos/rollback:** objetos podem ficar órfãos; reconciliador apenas marca/encaminha conforme retenção, nunca purga sem autorização.
- **Critérios de aceite:** produto removido não retorna à operação, histórico permanece e imagens obedecem quota/lifecycle.
- **Regras concluídas após o PR:** PRODUCT-001/IMAGE-001 condicionadas a R2/retenção promovidas.

### `PR-07 — Ledger de estoque, venda e reconciliação econômica`

- **Objetivo:** fazer todo saldo e cálculo de venda rastreável/reconciliável no banco.
- **Prioridade:** P1.
- **Regras envolvidas:** STOCK-001, SALE-001, SALE-002, PRODUCT-001, MUTATION-001, AUDIT-001.
- **Gaps corrigidos:** tabelas dispersas, venda/cancelamento sem movimento, ajustes sem idempotência, total sem reconciliador, cancelamento sem recuperação.
- **Dependências:** PRs 02, 03 e 06.
- **Escopo:** schema/migrations de `stock_movements`/comandos, produtos, serviços de estoque/venda/cancelamento, queries, reconciliador/job e UI de resultado.
- **Fora de escopo:** refund, contas a receber e settlement externo.
- **Alterações no banco:** ledger append-only, referências únicas de comando/venda/cancelamento, `cancelled_on` de negócio, constraints locais de valores.
- **Migração necessária:** sim; construir movimentos históricos e reconciliar antes de trocar fonte de verdade.
- **API/UI/jobs:** entrada/baixa/venda/cancelamento escrevem no mesmo commit; replay retorna resultado; job detecta diferenças e só permite repair controlado.
- **Compatibilidade/flag:** dual-write/compare com saldo existente antes de tornar ledger obrigatório.
- **Rollout:** backfill por batches, relatório de diferenças, correção manual auditada, habilitação por tenant.
- **Testes obrigatórios:** lock ordenado, saldo negativo, ajuste duplicado, cancelamento timeout, linhas únicas, equação total/fee/frete/desconto, corrupção persistida e reconciliação.
- **Observabilidade:** diferença de saldo/financeiro, comando duplicado, tempo de lock e repair auditado.
- **Riscos/rollback:** dual-write pode divergir; manter projection antiga somente para leitura durante validação.
- **Critérios de aceite:** `sum(delta)=saldo`, cancelamento é única transição, venda preserva snapshot e nenhuma mutação crítica duplica saldo.
- **Regras concluídas após o PR:** STOCK-001, SALE-001 e SALE-002 após reconciliação e testes Postgres reais.

### `PR-08 — Metas, relatório e tempo de negócio`

- **Objetivo:** corrigir máquina de metas e tornar relatório/job determinístico em São Paulo.
- **Prioridade:** P1.
- **Regras envolvidas:** GOAL-001, TIME-001, REPORT-002, ENTITLEMENT-001, AUDIT-001.
- **Gaps corrigidos:** uma meta para todos os planos, transições inválidas, resolução por leitura, ausência de job/audit, timezone implícito e joins históricos frágeis.
- **Dependências:** PRs 02 e 03.
- **Escopo:** schema/migrations de metas/índices, `features/goals`, dashboard/date utilities, SQL de relatório, Inngest cron e testes.
- **Fora de escopo:** novas métricas/relatórios comerciais.
- **Alterações no banco:** índice parcial paid por organização/métrica, guardas de estado, datas de negócio explícitas.
- **Migração necessária:** sim; classificar metas ativas legadas e corrigir índices após decidir conflitos por métrica.
- **API/UI/jobs:** job São Paulo resolve somente `active`; UI mostra capacidade por plano e conflito recuperável; histórico é explicitamente rotulado.
- **Compatibilidade/flag:** executar resolução em modo dry-run antes de gravar estados.
- **Rollout:** emitir relatório de transições previstas, aprovar, ativar job, medir conflitos e retirar paths de resolução em page load.
- **Testes obrigatórios:** Free/pago, três metas/uma métrica, `active→terminal`, archive/unarchive válidos, resolver×archive/update, virada de mês/ano/São Paulo e intervalo dashboard.
- **Observabilidade:** transição por job, conflito CAS, métrica de metas atrasadas e cache invalidado.
- **Riscos/rollback:** job mal configurado pode resolver meta cedo; dry-run e predicado de estado tornam rollback possível.
- **Critérios de aceite:** nenhuma transição terminal reabre, concorrência não sobrescreve e dashboards reproduzem data/intervalo.
- **Regras concluídas após o PR:** GOAL-001/TIME-001/REPORT-002 após testes temporais e job promovido.

### `PR-09 — Confiabilidade de integrações, retenção e observabilidade`

- **Objetivo:** operacionalizar políticas de jobs/imagem e telemetria sem registrar conteúdo sensível.
- **Prioridade:** P1.
- **Regras envolvidas:** EVENT-004, IMAGE-001, OBS-001, PRIVACY-001, RELEASE-001.
- **Gaps corrigidos:** retry sem jitter/limite, concorrência ausente, DLQ sem alerta, purge incompatível, logs crus e sem correlação.
- **Dependências:** PRs 03, 04, 05 e 06; tabela de retenção jurídica para qualquer purge.
- **Escopo:** Inngest functions, outbox, image reconcile, logging/Sentry, métricas/alertas, documentação de runbook e configuração de R2/Resend.
- **Fora de escopo:** alterar dados de produção ou habilitar purge automático sem autorização jurídica.
- **Alterações no banco:** attempts/next run/manual review/diagnóstico redigido/correlation ID quando não criados no PR 03.
- **Migração necessária:** possivelmente; depende da fundação criada no PR 03.
- **API/UI/jobs:** billing serializado por organização; imagem até duas; replay segue fluxo PR 05; status de revisão é visível a plataforma autorizada.
- **Compatibilidade/flag:** alertas e jobs novos em observe-only antes de autorizar efeito.
- **Rollout:** staging sintético, fault injection, validação de R2 lifecycle/CORS e Sentry/alertas, depois canary.
- **Testes obrigatórios:** backoff/jitter/24h, três/cinco tentativas, concorrência por org, DLQ, alerta, redaction token/PII, correlação webhook→job, R2 staging 24h.
- **Observabilidade:** painel de eventos redigidos, SLO de backlog, alertas de billing/RLS/storage/e-mail.
- **Riscos/rollback:** alertas ruidosos e job duplicado; flags por tópico e idempotência do PR 03.
- **Critérios de aceite:** nenhum payload/token é logado, terminal vai revisão/alerta, e objetos finais obedecem retenção aprovada.
- **Regras concluídas após o PR:** EVENT-004/OBS-001 e partes de IMAGE/PRIVACY apenas com prova de provider.

### `PR-10 — Certificação de release e teste de regressão`

- **Objetivo:** provar os gates de lançamento e corrigir a suíte de teste que hoje falha.
- **Prioridade:** P1 para release, P2 para asserts de acessibilidade.
- **Regras envolvidas:** RELEASE-001, SCOPE-001 e todas as regras dependentes de ambiente.
- **Gaps corrigidos:** evidência promovida inexistente; testes admin obsoletos; cobertura provider/RLS/restore/E2E insuficiente.
- **Dependências:** PRs 01–09 e todos os gates externos.
- **Escopo:** CI/checklists, scripts de smoke, fixtures sintéticas, E2E, testes Postgres, atualização de `apps/admin/src/app/admin-accessibility.test.ts`, documentação de evidência.
- **Fora de escopo:** funcionalidades fora do lançamento individual; não criar colaboração, compras, fiscal, refund de venda ou integrações novas.
- **Alterações no banco:** nenhuma estrutural prevista; executar restore drill apenas em ambiente autorizado.
- **Migração necessária:** não para código; cada migration anterior precisa de plano/restore validado.
- **API/UI/jobs:** validar fluxos reais de OAuth, R2, Resend, Inngest, Asaas/Woovi e telas de suporte/suspensão/entitlement.
- **Compatibilidade/flag:** release flag permanece desligada até certificação completa.
- **Rollout:** preview isolado/dados sintéticos → staging promovido → smoke two-tenant/RLS → sandbox providers → restore drill → aprovação de release.
- **Testes obrigatórios:** `check:all`, `typecheck:all`, `test:all`, Postgres real, E2E web/admin, RLS runtime, restore, jobs/DLQ, OAuth, R2 CORS/lifecycle, Resend e ambos providers.
- **Observabilidade:** anexar IDs, datas, ambiente, responsável e resultado de cada prova; alertas devem disparar em teste controlado.
- **Riscos/rollback:** release sem evidência; rollback é manter flag desligada e restaurar somente com drill validado.
- **Critérios de aceite:** todas as provas datadas passam, nenhum gate é “assumido”, suíte total verde e escopo de lançamento é o aprovado.
- **Regras concluídas após o PR:** RELEASE-001/SCOPE-001 e gates condicionais das demais, mediante evidência promovida.

## Dependências críticas

`PR 01 → PR 02 → PR 04 → PR 10` define o caminho comercial.  
`PR 03 → PR 04/05/07/09 → PR 10` define integridade e operação.  
`PR 02 + PR 03 → PR 06/07/08 → PR 10` define domínio operacional.  
Nenhuma migração destrutiva avança sem backup/restore validado; nenhum provider é habilitado sem sandbox/contrato; nenhum purge é automatizado sem tabela de retenção aprovada.
