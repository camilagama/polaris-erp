# Transição Do DG Imports Para SaaS Self-Serve

## Resumo

- O projeto está forte para app interno: domínio de estoque/vendas sólido, transações críticas, Zod, Drizzle, Sentry básico, CI, testes e documentação operacional.
- O bloqueio central para SaaS é estrutural: dados de domínio, cache, storage e autorização ainda são globais/single-tenant.
- V1 será SaaS self-serve público com cadastro aberto, organizações, isolamento por tenant, RBAC, onboarding e proteção contra abuso.
- Billing fica fora deste sprint. A implementação deve apenas preparar campos/status mínimos para plugar cobrança no próximo sprint, sem Stripe e sem escolher provedor.

## Mudanças Principais

- Criar tenancy como base:
  - `organizations`, `memberships`, `organization_invites` e `audit_events`.
  - Roles fixas: `owner`, `admin`, `operator`, `viewer`.
  - Sessão protegida passa a resolver `AppContext = { userId, organizationId, role }`.
- Migrar domínio para `organizationId` obrigatório:
  - Adicionar em categorias, settings, produtos, histórico de preço, entradas/baixas, vendas, itens de venda e metas.
  - Backfill dos dados atuais em uma organização inicial “DG Imports”.
  - Trocar uniques globais por compostos, como `(organizationId, category.name)`.
  - Todas as queries/actions por ID passam a filtrar por `id + organizationId`.
- Refatorar autorização:
  - `requireActionSession()` vira `requireAppContext(permission)`.
  - Actions de produto, venda, configurações e metas exigem role mínima.
  - Leitura de imagem valida sessão, tenant e posse do produto antes de servir bytes.
- Tornar cache/storage tenant-aware:
  - Cache tags viram `catalog:{organizationId}` e `analytics:{organizationId}`.
  - R2 final passa para `organizations/{organizationId}/products/{productId}/v{version}/{variant}.webp`.
  - Reconcile de imagens opera por prefixos tenant-safe.
- Adicionar self-serve sem billing:
  - Cadastro público com Google + magic link por email.
  - Onboarding cria usuário, organização, membership `owner`, settings padrão e categoria padrão.
  - Preparar `organizationStatus` simples, por exemplo `active`, para permitir bloqueios futuros de billing sem implementar cobrança agora.
- Preparar operação:
  - Rate limit em auth, presign/upload e endpoints internos.
  - Desabilitar bootstrap em produção SaaS real.
  - Audit log para login, convite, settings, produto, estoque, venda/cancelamento e imagem.
  - Runbooks de deploy/migração/rollback/incidente e rotina documentada de restore Neon/PITR.

## Fora Deste Sprint

- Billing, checkout, assinatura, planos, trial pago, portal de cobrança e webhooks de provedor.
- Escolha do provedor de pagamento.
- Quotas comerciais por plano, inadimplência e bloqueios financeiros.

## Testes E Aceitação

- Cross-tenant: usuário A não lista, abre, edita, vende, cancela, vê imagem ou métricas do tenant B.
- Integridade: venda não aceita produto/categoria de outro tenant; cancelamento restaura estoque uma única vez; locks SQL filtram `organizationId`.
- Cache: trocar de organização/login nunca reaproveita payload de catálogo, dashboard, vendas ou metas de outro tenant.
- Onboarding: novo usuário cria organização, vira `owner`, recebe settings/categoria padrão e acessa dashboard vazio.
- RBAC: matriz owner/admin/operator/viewer para configurações, estoque, vendas, metas, imagens e membros.
- Migração: backfill completo, constraints `not null`, índices compostos, contagens por tabela e rollback validado em branch staging.
- Operação: `bun run check`, `bun run test`, `bun run build`, `bun run knip`, E2E com `E2E_DATABASE_URL`, migração em staging, smoke de health/R2/login/upload/reconcile.

## Assumptions

- O primeiro SaaS será público self-serve.
- Billing será definido e implementado no próximo sprint, sem Stripe neste plano.
- Auth pública será Google + magic link, sem senha inicialmente.
- O domínio atual de estoque/venda deve ser preservado; a grande mudança é isolamento, autorização e operação SaaS ao redor dele.
