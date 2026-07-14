# Descoberta de regras de negócio

**Status:** rascunho de descoberta, **não normativo**.  
**Data:** 2026-07-14.  
**Escopo:** comportamento observado em código, schema, migrations, testes e documentação. Nenhum item marcado como decisão, lacuna, contradição ou bug provável é regra definitiva.

## Método e limites

Foi aplicado um inventário por domínio, com evidência em quatro camadas: interface/actions, serviços, banco e testes. O repositório foi examinado em três trilhas independentes: identidade/billing/admin; operação comercial; e controles transversais. A pesquisa externa em [webhooks](research-webhook-processing-2026-07-14.md) é referência técnica, não contrato dos provedores nem decisão de produto.

Não foram alterados código, banco, migrations, configurações ou documentos normativos. Não foram executadas integrações externas, migrations ou testes contra infraestrutura promovida.

## Mapa do produto confirmado

| Domínio | Evidência de implementação | Situação na descoberta |
| --- | --- | --- |
| Autenticação e onboarding | `packages/auth`, `apps/web/src/features/onboarding` | Implementado; login público via Google |
| Organização, membership e papéis | `apps/web/src/lib/app-session.ts`, `packages/db/src/schema.ts` | Implementado com política de um workspace por usuário |
| Billing e webhooks | `packages/billing`, `apps/web/src/integrations/{asaas,woovi}` | Parcial; ativação manual e reconciliação existem |
| Administração interna | `apps/admin`, `packages/platform`, `packages/platform-auth` | Implementado, separado de papéis do tenant |
| Catálogo, produto e imagens | `apps/web/src/features/{catalog,products}` | Implementado |
| Estoque | `apps/web/src/features/products/{server,stock}.ts` | Implementado como saldo agregado com entradas/baixas |
| Vendas e pagamento | `apps/web/src/features/sales` | Implementado para PIX/cartão; sem settlement/refund |
| Metas e dashboard | `apps/web/src/features/{goals,dashboard}` | Implementado; resolução é acionada por leitura |
| Eventos, jobs e auditoria | `packages/events`, `apps/web/src/integrations`, `packages/platform` | Parcial; há outbox e auditoria, com lacunas de recuperação |
| Compras, fornecedores, importações e fiscal | Não localizados como módulos operacionais | Não aplicável ao produto atual até nova evidência |

## Atores e escopos

- **Usuário não autenticado:** inicia somente Google OAuth público.
- **Membro de organização:** acesso requer sessão, membership, organização `active` e subscription `active`.
- **Operator:** altera produtos, estoque e vendas.
- **Admin:** possui as permissões de operator e altera catálogo/configurações/metas.
- **Owner:** é o maior papel do tenant, mas nenhuma ação exclusiva foi localizada.
- **Platform support/operator/owner:** papéis separados do tenant; o grant ativo define o maior nível efetivo.
- **Jobs e providers:** acessam caminhos internos especificamente autorizados; não equivalem a membros de organização.

## Regras AS-IS confirmadas

### Identidade, tenancy e billing

- Google é o único login/cadastro público; email/senha está desabilitado. `packages/auth/src/auth.ts:140`, `apps/web/src/app/api/auth/google/route.ts:93`.
- Onboarding cria organização `active`, membership `owner`, defaults de catálogo, customer e assinatura `incomplete` para um novo usuário. `apps/web/src/features/onboarding/server.ts:48`, `:125`.
- O acesso operacional requer assinatura `active`; os outros estados modelados não liberam o app. `packages/billing/src/index.ts:43`, `apps/web/src/lib/app-session.ts:195`.
- A política da aplicação bloqueia gestão de workspace, convites, membros, roles e troca de organização; o schema ainda permite mais de uma membership por usuário. `packages/auth/src/workspace-management-policy.ts:3`, `packages/db/src/schema.ts:122`.
- Administração interna exige administrador de plataforma ativo e grant não expirado/revogado. `packages/platform-auth/src/admin-guard.ts:35`.

### Catálogo, estoque, vendas e metas

- Categorias são isoladas por tenant; a categoria de sistema não é renomeável/removível e categoria em uso não é removida. `apps/web/src/features/catalog/server.ts:215`.
- Produto não tem action de exclusão; custo, preço e saldo são não negativos. Criar com saldo inicial cria entrada; mudança de preço gera histórico somente quando há mudança. `apps/web/src/features/products/server.ts:205`, `:280`; `packages/db/src/schema.ts:815`.
- Entrada e baixa usam transação e `FOR UPDATE`; a entrada recalcula custo médio e reativa produto arquivado. `apps/web/src/features/products/server.ts:347`, `:415`.
- Venda exige itens únicos, quantidade positiva e preço ainda atual; bloqueia produtos por ordem determinística, cria snapshots, reduz estoque e audita. `apps/web/src/features/sales/server.ts:199`.
- PIX usa zero parcelas; cartão usa 1–12 e o pagador da taxa. Taxa do vendedor é custo; a do cliente aumenta apenas `chargedAmount`. `apps/web/src/features/sales/calculations.ts:77`.
- Venda só transita de `completed` para `cancelled`; cancelamento recompõe estoque na mesma transação. `apps/web/src/features/sales/server.ts:420`.
- Uma meta ativa por organização é reforçada por índice parcial. Estados encontrados: `active`, `completed`, `expired`, `archived`. `packages/db/src/schema.ts:1219`, `apps/web/src/features/goals/server.ts:100`.

### Imagens, eventos e auditoria

- Imagens aceitam JPEG/PNG/WebP até 10 MiB, geram variantes WebP e vinculam staging a organização/usuário. `apps/web/src/features/products/image-schema.ts:3`, `image-storage.ts:168`.
- Webhooks deduplicam por chave e por `(provider, provider_event_id)`; outbox tem chave idempotente, lease e limite de cinco tentativas antes de `dead_letter`. `packages/db/src/schema.ts:325`, `:368`; `packages/events/src/index.ts:273`, `:364`.
- Ações críticas dos domínios de produto/venda/meta registram audit event na transação. O helper legado de auditoria é best-effort e não sustenta esse invariante. `apps/web/src/lib/audit-log.ts:26`.

## Estados preliminares

| Entidade | Transições confirmadas | Observação |
| --- | --- | --- |
| Produto | `active ↔ archived`; entrada força `archived → active` | Arquivado não é vendável |
| Venda | `completed → cancelled` | Sem edição, exclusão ou reversão da venda cancelada encontradas |
| Meta | `active → completed|expired|archived`; `archived → active` | Resolução é disparada ao ler dashboard/configurações |
| Subscription | `trialing|active|past_due|paused|canceled|incomplete` | Só `active` libera acesso |
| Webhook | `received|processed|failed` no fluxo; `processing|duplicate` são valores de schema sem transição local observada | Recuperação de falha é incompleta, ver lacunas |
| Outbox | `pending|processing|processed|observed|failed|dead_letter` | Retry administrativo observado somente para outbox |

## Contradições comprovadas

1. O documento de produto declara login por email/senha e Google, mas também declara Google como método público e o código desabilita senha. Não tratar senha como capacidade atual. `docs/product/01-regras-de-negocio.md:31`, `:219`; `packages/auth/src/auth.ts:140`.
2. O mesmo documento apresenta billing/planos/assinaturas como fora de escopo, enquanto o acesso do app depende de billing e existem pacote/schema/webhooks dedicados. `docs/product/01-regras-de-negocio.md:45`; `packages/billing/src/index.ts:43`.
3. O documento apresenta o produto como self-serve, mas a UI atual orienta ativação manual de assinatura. `docs/product/01-regras-de-negocio.md:53`; `docs/modules/subscriptions-and-billing.md:16`.

## Lacunas, riscos e bugs prováveis

| Classificação | Achado | Evidência decisiva |
| --- | --- | --- |
| Bug provável | Falha entre captura idempotente de webhook e enqueue/reconciliação pode tornar o evento irrecuperável: redelivery vira `duplicate`. | `apps/web/src/integrations/webhooks/intake.ts:50`, `apps/web/src/integrations/asaas/webhook.ts:140`, `apps/web/src/integrations/woovi/webhook.ts:168` |
| Lacuna | `active` não consulta fim de período/cancelamento agendado; acesso pode persistir até atualização externa. | `packages/billing/src/index.ts:43`, `packages/db/src/schema.ts:547` |
| Lacuna | Reconciliações de provider e mudança manual atualizam status sem versão, tempo do provider ou transições. Eventos fora de ordem podem regredir estado. | `apps/web/src/integrations/asaas/billing-reconciliation.ts:199`, `packages/platform/src/platform-billing.ts:206` |
| Bug provável | Organização suspensa pode redirecionar para onboarding e voltar para `/`, formando loop. | `apps/web/src/lib/app-session.ts:148`, `apps/web/src/features/onboarding/server.ts:61` |
| Risco de banco | Exclusão SQL privilegiada de produto pode cascatar para itens de venda e histórico, apesar de não haver exclusão operacional. | `packages/db/src/schema.ts:891`, `:1150` |
| Risco de integridade | Banco não prova equação entre totais de venda, itens, frete, desconto e snapshots. | `packages/db/src/schema.ts:1022`, `:1150` |
| Bug provável | Resolução de meta atualiza por id/tenant sem lock nem predicado `active`; pode sobrescrever archive/update concorrente. | `apps/web/src/features/goals/server.ts:100`, `:318` |
| Lacuna | Entradas/baixas de estoque não têm idempotência, embora vendas tenham. | `apps/web/src/features/products/server.ts:347`, `apps/web/src/features/sales/server.ts:374` |
| Lacuna | Não há ledger único para efeitos de venda/cancelamento no estoque; reconstrução cruza fontes distintas. | `apps/web/src/features/sales/server.ts:334`, `packages/db/src/schema.ts:942` |
| Decisão de produto | Não foram encontrados refund financeiro, recebimento, settlement, checkout, trial/grace, upgrade/downgrade ou entitlements aplicados. | `apps/web/src/features/sales/server.ts:420`, `docs/modules/subscriptions-and-billing.md:14` |
| Privacidade | Retenção, exportação, exclusão, classificação e redação de PII permanecem TO-BE documentado. | `docs/security/application-security.md:67` |

## Relação com testes

Há 154 arquivos de teste: 120 web, 8 admin e 26 pacotes. Cobrem fluxo nominal e vários invariantes de estoque/venda, idempotência de venda, RLS, leases e guards. Não cobrem de forma suficiente: falha parcial capture→outbox, redelivery após falha de reconciliação, eventos fora de ordem, reprocessamento manual de webhook, loop de tenant suspenso, expiração por período, multi-membership, retenção/PII e comportamento em providers/RLS promovidos.

## Artefatos de evidência

- [Inventário por regra](rules-inventory.md)
- [Entidades e fluxos](entities-and-flows.md)
- [Permissões](actors-and-permissions.md)
- [Invariantes](invariants.md)
- [Estados](state-machines.md)
- [Matriz regra-versus-teste](rule-test-matrix.md)
- [Dependências externas e limitação de metadados Neon](external-dependencies.md)
- [Governança proposta](governance.md)

## Debate em andamento

As decisões DEC-BR-001 a DEC-BR-037 foram debatidas e registradas como rascunhos de descoberta. O lote atual de privacidade, DEC-BR-038 a DEC-BR-042, está em [open-questions.md](open-questions.md). Nenhuma delas é documentação normativa até o encerramento de todos os debates.

Depois desse lote, ainda exigem decisão explícita: semântica de suspensão administrativa distinta de billing, idempotência de entradas/baixas de estoque, concorrência do lifecycle de metas, integridade de totais da venda e expiração temporal de acesso pago.
