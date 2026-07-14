# Entidades e fluxos observados

**Status:** rascunho de descoberta, **não normativo**.

## Mapa de entidades

| Área | Entidades confirmadas | Responsabilidade observada |
| --- | --- | --- |
| Identidade | `users`, `sessions`, `accounts`, `verifications` | Identidade Better Auth, sessão e OAuth |
| Tenancy | `organization`, `member`, `invitation` | Organização e vínculo de usuário; convite não tem fluxo operacional confirmado |
| Plataforma | `platform_admins`, `platform_admin_grants`, `platform_audit_events`, `platform_support_notes` | Administração separada, grants e suporte |
| Eventos | `webhook_events`, `event_outbox` | Intake deduplicado e entrega/processamento interno |
| Email | `email_messages`, `email_events` | Registro de mensagens e eventos de entrega |
| Billing | `billing_plans`, `billing_customers`, `billing_subscriptions`, `billing_invoices`, `billing_payment_attempts`, `billing_provider_links` | Catálogo, vínculo externo e reconciliação parcial |
| Catálogo | `categories`, `system_settings`, `products`, `product_price_changes` | Produto e parâmetros comerciais por organização |
| Estoque | `product_stock_entries`, `product_stock_write_offs` | Entradas e baixas não comerciais; vendas dependem de `sales` |
| Vendas | `sales`, `sale_items` | Venda, snapshots de produto/custo/preço e cancelamento |
| Metas | `goals` | Meta única ativa por organização e histórico de resolução |
| Auditoria tenant | `audit_events` | Ações de domínio por organização |

`suppliers`, `purchases`, `imports`, `landed cost`, `refunds` e `feature flags` não foram confirmados como entidades operacionais no schema atual. `packages/db/src/schema.ts:38`–`:1219`.

## Fluxos ponta a ponta

### 1. Primeiro acesso e ativação

1. Visitante inicia Google OAuth.
2. Usuário autenticado sem membership chega ao onboarding.
3. Onboarding serializado cria organização, membership owner, defaults de catálogo, customer e subscription `incomplete`.
4. App exige organization `active` e subscription `active`; caso contrário, direciona a billing-required.
5. A ativação atual depende de fluxo manual/provider, não de checkout self-service encontrado.

Evidência: `apps/web/src/app/api/auth/google/route.ts:93`, `apps/web/src/features/onboarding/server.ts:48`, `apps/web/src/lib/app-session.ts:126`.

### 2. Criar produto com estoque inicial

1. Membro com `products:write` envia action validada.
2. Serviço confere categoria da mesma organização.
3. Persiste produto; se estoque inicial for positivo, persiste uma entrada equivalente.
4. Persiste audit event na mesma transação.
5. Imagem staged, quando existe, é processada antes de persistir metadados.

Evidência: `apps/web/src/features/products/actions.ts`, `apps/web/src/features/products/server.ts:205`.

### 3. Alterar estoque

1. Membro autorizado envia entrada ou baixa.
2. Serviço bloqueia o produto por `FOR UPDATE` no contexto tenant.
3. Entrada cria movimento, recalcula custo médio e pode desarquivar; baixa rejeita saldo insuficiente, cria write-off e não recalcula custo.
4. Serviço atualiza saldo e grava auditoria na mesma transação.

Evidência: `apps/web/src/features/products/server.ts:347`, `:415`.

### 4. Criar e cancelar venda

1. Membro com `sales:write` envia itens, pagamento e chave idempotente opcional.
2. Serviço encontra venda anterior pela chave ou bloqueia produtos em ordem estável.
3. Rejeita produto inexistente/arquivado, estoque insuficiente, preço exibido obsoleto, pagamento inválido ou parcelamento não configurado.
4. Calcula total/fee, persiste sale e sale items com snapshots, reduz estoque e audita em uma transação.
5. Cancelamento bloqueia a sale e produtos, restaura estoque, muda status e audita em uma transação.

Evidência: `apps/web/src/features/sales/server.ts:199`, `:374`, `:420`; `apps/web/src/features/sales/calculations.ts:54`.

### 5. Webhook de billing

1. Handler verifica assinatura/formato e extrai identidade do evento.
2. Intake registra `webhook_event` deduplicado e cria/observa outbox.
3. Handler reconcilia estado local do provider e tenta disparar processamento.
4. Falha após captura pode deixar evento sem reprocessamento automático; retry do provider é deduplicado.
5. Console interno consegue reabrir outbox falho, não webhook falho.

Evidência: `apps/web/src/integrations/webhooks/intake.ts:50`, `apps/web/src/integrations/asaas/webhook.ts:140`, `packages/platform/src/platform-events.ts:67`.

## Fluxos sem semântica suficiente para documentar

- Cancelamento/refund financeiro após venda.
- Cobrança, recebimento e settlement de uma venda comercial.
- Checkout, trial, grace, upgrade, downgrade e cancelamento de assinatura pelo cliente.
- Gestão de membros, convites e multi-workspace.
- Retenção, exportação e eliminação de dados pessoais.

## Ciclos de vida detalhados ainda relevantes

| Entidade | Estados/ações observados | Lacuna ou condição relevante |
| --- | --- | --- |
| Session | Criada/encerrada pelo Better Auth; app apenas pode fixar `activeOrganizationId` válido. | Sem comando local de revogação. |
| Invitation | Tabela com `pending`. | Convites são bloqueados; ciclo aceite/expiração é schema-only. |
| Billing plan | `active|archived`; onboarding escolhe apenas active. | Mudança de plano não foi localizada. |
| Billing customer | Criado uma vez por organização. | Sem lifecycle de produto localizado. |
| Subscription | `incomplete|trialing|active|past_due|paused|canceled`. | `trialing`/`paused` são schema-only; não há guard de transição/ordem. |
| Invoice | `draft|open|paid|void|uncollectible`. | Asaas cria/reutiliza parte dos estados; Woovi não cria invoice; vários estados são schema-only. |
| Payment attempt | `pending|processing|succeeded|failed`, provider `woovi|asaas|manual`. | `processing` e `manual` não têm fluxo produtor confirmado. |
| Provider link | Sem estado; vínculo externo único por provider/tipo/ID. | Idempotência depende da identidade do provider. |
| Category | Criar, atualizar, excluir. | Categoria de sistema e categoria em uso são protegidas. |
| Product image | Sem imagem ou versão atual positiva. | Objetos e metadados não são atômicos; reconciliador remove órfãos. |
| Email message | `pending|sent|failed` no fluxo local; schema aceita outros estados. | Eventos de provider são registrados sem atualizar a mensagem. |
| Platform admin/grant | Admin `active|disabled`; grant `support|operator|owner`, expirável/revogável. | Bootstrap cria; alterar/desabilitar/revogar não tem comando local localizado. |
| Support note/audit events | Append-only no código. | Sem lifecycle de edição/exclusão confirmado. |

Detalhes e referências: `packages/db/src/schema.ts:38`–`:1219`; `apps/web/src/features/onboarding/server.ts:46`; `apps/web/src/integrations/{asaas,woovi}/billing-reconciliation.ts`; `packages/platform-auth/src/admin-guard.ts:76`.
