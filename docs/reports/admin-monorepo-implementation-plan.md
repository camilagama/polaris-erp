# Plano de Implementacao - Monorepo e Admin Interno

## 1. Objetivo

Converter o Polaris de um app Next.js unico para uma arquitetura que possa suportar duas superficies sem misturar responsabilidades:

- app externo dos clientes, usado por organizacoes/tenants;
- admin interno da plataforma SaaS, usado pelo fundador/time operacional.

O plano recomenda uma migracao incremental, mas com uma premissa ja decidida: o projeto deve virar monorepo e o segundo app (`apps/admin`) deve entrar cedo. A cautela passa a ser sobre a ordem dos PRs, nao sobre adiar a decisao. O app atual continua funcionando durante a migracao, enquanto a estrutura de workspace, packages compartilhados, guards de plataforma e o skeleton do admin sao introduzidos em cortes pequenos.

## 2. Contexto do Produto

O produto atual e um SaaS ERP para pequenos importadores e vendedores autonomos. A superficie atual cobre cadastro/login Google, onboarding de organizacao, dashboard operacional, produtos/catalogo, imagens via Cloudflare R2, estoque, vendas, cancelamentos/estornos, metas e configuracoes.

O admin interno desejado nao e "admin da organizacao cliente". Ele deve operar a plataforma: clientes, organizacoes, usuarios, suporte, auditoria, saude operacional, jobs, integracoes, emails transacionais futuros via Resend, billing futuro com Woovi para Pix recorrente e Asaas para cartao de credito, incidentes e configuracoes internas. Isso exige modelo proprio de autorizacao, auditoria obrigatoria e separacao clara de permissoes.

## 3. Estado Atual

Stack confirmada no codigo apos a execucao dos PRs:

- Next.js `16.2.1` com App Router e React `19.2.4`.
- Bun workspaces com `bun.lock`, `turbo.json`, `apps/` e `packages/`.
- Better Auth `1.6.23` com Google OAuth, organization plugin, Better Auth Infra Dashboard/Sentinel e `nextCookies`.
- PostgreSQL/Neon via Drizzle ORM e `pg.Pool`.
- Tailwind CSS 4, shadcn/ui estilo `radix-mira`, Hugeicons.
- Upstash Redis para rate limit distribuido, com fallback local em dev/test.
- Cloudflare R2 via AWS SDK para staging e variantes finais de imagens.
- Vitest nos workspaces e Playwright para `apps/web/tests/e2e` e `apps/admin/tests/e2e`.
- Sentry baseline em `@sentry/nextjs`.

Estrutura atual:

```text
apps/
  web/              # app externo dos clientes e testes principais
  admin/            # admin interno protegido, dashboard, auditoria, billing, eventos e E2E
packages/
  config/           # config compartilhada inicial
  emails/           # templates/adapter Resend e contratos de email
  billing/          # dominio canonico e adapters Woovi/Asaas
scripts/            # smoke, preflight, analise de planos, E2E DB schema
docs/               # runbooks, roadmap, RLS, deploy, R2, planos
```

Pontos fortes:

- Boundaries locais ja sao testados no app web e os scripts root delegam para workspaces.
- RLS foi implementado com `set_config(..., true)`, `FORCE ROW LEVEL SECURITY` e role runtime sem `BYPASSRLS`.
- Ambiente de banco documentado com `DATABASE_URL`, `DATABASE_URL_DIRECT`, `E2E_DATABASE_URL` e `RLS_DATABASE_URL`.
- Rotas internas sensiveis usam bearer secret, segredos separados e rate limit quando aplicavel; mutacoes admin existentes tambem usam rate limit dedicado.
- Produto preserva vertical slices em `apps/web/src/features`.
- CI cobre check, admin check, typecheck web/admin, unit, knip, build web/admin, E2E web/admin e jobs manuais de RLS/deploy/preflight.
- Admin interno existe em `apps/admin`, protegido por session/platform guard e Cloudflare Access quando configurado.
- Platform admin/audit/support notes, outbox/webhook idempotente, rota Inngest inicial, email foundation e billing foundation foram implementados de forma aditiva.
- O acoplamento temporario `apps/admin -> apps/web/src` foi removido. DB, auth/session/env de auth, eventos, plataforma operacional, Cloudflare Access e rate limit admin ja foram movidos para packages, e o source test agora exige allowlist vazia para imports temporarios do web.

Pontos frageis:

- Deploy real de admin ainda depende de Vercel linkado/autenticado, `ADMIN_APP_URL`, Cloudflare Access e protection de preview.
- `apps/admin` nao depende mais de alias temporario para `apps/web/src`; o risco restante e migrar testes de package para seus donos, sem reabrir imports cross-app.
- Envs reais de producao ainda faltam para `prod:preflight` e `deploy:smoke`; o preflight agora tambem exige credenciais Inngest.
- URLs Postgres locais usam `sslmode=require`; o preflight de producao exige `sslmode=verify-full`.
- Branch Neon `production` nao esta protegida e o projeto `free_v3` tem `history_retention_seconds=21600`.
- Migrations foram aplicadas no branch E2E; a aplicacao em producao ainda nao foi validada com `DATABASE_URL_DIRECT`.
- Resend/Woovi/Asaas ainda precisam de validacao sandbox/producao com credenciais reais e dominios verificados.
- `AGENTS.md` agora tem `aidd_docs/memory/project-state.md`, mas a memoria precisa ser mantida junto das mudancas de arquitetura.
- Runbooks de cleanup destrutivo foram restaurados em `docs/production-database-cleanup.md` e `docs/production-database-cleanup.sql`; o SQL permanece com `rollback` por padrao.

Riscos para admin interno:

- Reusar `member.role = admin` como superadmin causaria privilege escalation conceitual.
- Usar `app.internal_job` para consultas admin globais quebraria a intencao limitada do contexto de reconcile.
- Expor admin no mesmo app/dominio sem Cloudflare Access e sem guard server-side facilitaria acesso acidental.
- Usar `DATABASE_URL_DIRECT` ou role owner no runtime admin anularia RLS.

O que ja ajuda a futura separacao:

- Codigo de dominio esta em `src/features`.
- Auth/session estao centralizados em `src/lib/auth.ts`, `src/lib/session.ts`, `src/lib/app-session.ts`.
- DB schema/config/migrations estao em `packages/db`; `apps/web/src/db/*` mantem wrappers curtos de compatibilidade.
- Configs e scripts estao bem mapeados.
- RLS ja torna isolamento de tenant uma propriedade do banco, nao so do app.

## 4. Decisoes Tecnicas

| Decisao | Opcao escolhida | Alternativas avaliadas | Justificativa | Risco | Quando reavaliar |
| --- | --- | --- | --- | --- | --- |
| Monorepo agora | Sim, decidido; iniciar por workspace/Turborepo e mover o app atual para `apps/web` antes do skeleton admin | Manter single app, rota `/admin`, adiar workspace | A decisao de produto ja e ter duas superficies. O risco agora e controlar a migracao, nao evitar monorepo | Quebra de aliases, scripts, CI, Vercel root e Drizzle config | Reavaliar apenas a granularidade dos packages, nao a decisao de monorepo |
| Turborepo | Adotar cedo com Bun workspaces | Nx, Bun workspaces sem turbo, pnpm workspace | Docs oficiais indicam valor em pipelines/cache para monorepos; com `apps/web` + `apps/admin`, Turbo passa a ter consumidor real | Config/caching prematuro se os scripts nao forem mantidos simples | Apos `apps/web` buildar no novo root e antes de extrair packages demais |
| Package manager | Manter Bun | pnpm, npm, yarn | `bun.lock`, scripts e CI usam Bun; mudar gerenciador junto da arquitetura aumenta blast radius | Bun workspace/Turbo pode exigir ajustes finos | Se ferramenta escolhida exigir pnpm ou Bun virar gargalo |
| Admin interno | App separado em `apps/admin` cedo, protegido e inicialmente sem acoes perigosas | Rota `/admin` no app atual, app unico com route group, ferramenta externa no-code | App separado facilita deploy/env/protecao/observabilidade e evita misturar UX/permissoes | Mais config de deploy/env e necessidade de guards corretos desde o dia 1 | Escopo do MVP admin, nao existencia do app |
| Protecao admin | Cloudflare Access + guard server-side + Better Auth session/platform admin | Apenas Better Auth, apenas Cloudflare Access, apenas Vercel Auth | Access tem free tier para ate 50 usuarios em Cloudflare One e protege subdominio interno; app ainda precisa validar token/session para evitar bypass | Origin bypass se nao validar Access ou bloquear origem direta | Antes do primeiro deploy admin |
| Platform admins | Tabelas/guards proprios (`platform_admins`, `platform_audit_events`) | Reusar `member.role`, Better Auth Admin Plugin direto, env allowlist apenas | Separa plataforma de tenant e permite auditoria, expiração, justificativa | Schema novo sensivel | Antes de qualquer acao cross-tenant |
| Better Auth Admin Plugin | Nao no MVP; avaliar para user/session admin depois do modelo platform admin | Adotar agora, nunca adotar | Plugin e util para user management app-level, ban, impersonation, roles; hoje pode confundir org admin com platform admin | Confusao de roles e acoes perigosas | Quando Usuarios do admin precisarem ban/revogar sessoes/impersonation |
| Better Auth Organization Plugin | Manter para orgs cliente; bloquear/ auditar endpoints nao usados | Remover plugin, reimplementar orgs | Ja modela org/member/invitation; user management esta desabilitado | Endpoint `organization/update` pode bypassar UI/audit se nao bloqueado | PR de hardening antes do admin |
| API layer | Manter Server Actions + Route Handlers | Hono, Elysia, Express, tRPC, oRPC, OpenAPI completo | Superficie HTTP atual e pequena; Zod + Server Actions + Route Handlers ja dao type safety suficiente | Futuro mobile/integracoes podem pedir contratos HTTP | Quando houver API publica, mobile app, parceiros ou webhooks complexos |
| Inngest/jobs duraveis | Adotar fundacao Inngest minima para processar outbox, mantendo DB outbox como fonte de idempotencia/auditoria | QStash, queues, cron custom, apenas DB polling | Emails e billing webhooks exigem retries e observabilidade; Inngest encaixa no App Router via `/api/inngest` sem remover o outbox DB | Dispatchers reais ainda precisam ser registrados antes de side effects de email/billing | Antes de acionar envios/cobrancas reais por outbox |
| Feature flags | Interno/DB tipado para org beta/entitlements; env para kill switch raro | Vercel Flags, LaunchDarkly, Statsig, GrowthBook | Produto server-heavy e audit-sensitive; provedor externo adiciona consistencia/privacidade antes de necessidade | Flags genericas virarem bypass de permissoes | Quando nao-devs precisarem rollout gradual/experimentos |
| Email transacional | Resend no futuro; preparar `packages/emails`, logs e outbox antes de envio real | Email ad hoc em actions, SMTP generico, provedor diferente | Resend docs usam SDK/API key via env, dominios verificados em producao e retorno `{ data, error }`; isso combina melhor com adapter central e templates versionados | Enviar email direto dentro de Server Actions pode duplicar/enviesar falhas | Quando onboarding, billing ou suporte exigirem emails reais |
| Billing | Planejar fundacao cedo; integrar Woovi Pix recorrente e Asaas cartao depois do admin MVP basico | Stripe, billing manual, planos hardcoded | A escolha dos provedores ja foi definida. Woovi Pix Automatico usa assinatura/correlationID; Asaas tem assinaturas/cartao e docs de idempotencia de webhooks | Sem billing foundation, cada provedor vira modelo paralelo | Antes de venda paga/self-serve e antes de expor status financeiro no admin |
| Auditoria admin | Obrigatoria, sincrona para acoes sensiveis | Reusar `audit_events`, best-effort atual | Eventos internos precisam existir mesmo sem tenant e nao podem falhar aberto em acoes sensiveis | Latencia e rollback em mutacoes admin | PR de platform schema |
| RLS admin | Nao bypassar por padrao; criar funcoes/queries explicitas para leituras globais | Usar role owner, usar `app.internal_job`, desligar RLS | RLS protege tenants; admin deve ter caminhos auditados e minimizados | Consultas globais podem vazar dados se mal desenhadas | Ao definir queries de org/user detail |
| Cloudflare R2 | Manter atual; usar lifecycle no staging; jobs simples | Workers/Queues agora, CDN publica direta | Rota autenticada evita vazamento cross-tenant; R2 free tier inclui storage/op suficientes para MVP | Latencia de bytes via app | Quando volume de imagens exigir CDN privado/assinaturas |
| Upstash | Manter para rate limit serverless | Redis proprio, Map local, Vercel KV | Lib atual e docs oficiais indicam fit para serverless HTTP; prod falha fechado sem Upstash | Custo/limite se trafego crescer | Ao criar limites por plano/admin |
| Codex/agents | Manter `AGENTS.md`, corrigir memoria/docs e usar subagents para auditorias grandes | Sem governanca agentica | Codex manual recomenda contexto, AGENTS.md, testes e subagents para tarefas amplas | Docs drift | PR 0 de governanca |

## 5. Arquitetura Alvo

Arquitetura recomendada: monorepo incremental com o app atual preservado primeiro, depois `apps/admin` protegido e sem mutacoes perigosas ate os guards/auditoria estarem prontos.

```text
apps/
  web/                  # app externo dos clientes
  admin/                # admin interno da plataforma
packages/
  db/                   # Drizzle schema, migrations, tenant/admin DB helpers
  auth/                 # Better Auth config compartilhada, guards, sessao, platform auth
  ui/                   # apenas componentes genericos sem server actions de dominio
  config/               # tsconfig, ultracite/biome, env helpers compartilhados
  domain/               # tipos/calculos puros realmente consumidos por web e admin
  platform/             # platform admin queries/audit/flags, se crescer
  emails/               # futuro Resend: templates, adapter, logs, contratos de envio
  billing/              # futuro Woovi/Asaas: planos, assinaturas, provider adapters
  events/               # outbox/idempotencia quando emails e billing entrarem
scripts/
docs/
```

Responsabilidades:

- `apps/web`: fluxos de cliente, tenant app, Server Actions de produtos/vendas/metas/configuracoes, R2 upload/serve.
- `apps/admin`: dashboard interno, orgs/users/suporte/auditoria/ops; sem UI operacional de cliente.
- `packages/db`: schema, migrations, tipos, tenant context, platform context, queries primitivas compartilhadas.
- `packages/auth`: Better Auth, helpers de session, `requireAppContext`, `requirePlatformAdmin`, validacao Cloudflare Access.
- `packages/ui`: shadcn primitives e componentes genericos. Nao deve importar `features`, `db`, `auth` ou server actions de produto.
- `packages/domain`: currency/date/calculos puros, contratos de leitura, sem DB.
- `packages/config`: configs compartilhadas e validacao de env por app.
- `packages/emails`: templates transacionais, adapter Resend, contratos de eventos e logs de envio. Nao deve enviar email sem idempotencia/observabilidade quando acionado por billing.
- `packages/billing`: modelo canonico de plano/assinatura/fatura, adapters Woovi/Asaas e normalizacao de status. Nao deve vazar detalhes de provider para UI.
- `packages/events`: outbox, idempotencia e processamento assincromo quando houver emails/billing webhooks. Status atual: extraido como `@polaris/events`, com DB outbox e Inngest inicial compartilhados; dispatchers reais de email/billing ainda precisam ser estabilizados.

O que nao compartilhar:

- Server Actions do app cliente.
- Componentes de produtos/vendas/configuracoes que importam actions.
- Queries cross-tenant do admin.
- Segredos/envs especificos de cada app.
- Regras de permissionamento tenant e plataforma como um unico enum.
- Payload bruto de webhook sem validacao, redacao e idempotencia.

## 6. Apps

### App externo dos clientes

Nome decidido no monorepo: `apps/web`.

Responsabilidades:

- login Google e onboarding;
- organizacao ativa e membership;
- dashboard tenant-scoped;
- produtos, estoque, vendas, metas e configuracoes;
- upload/processamento/entrega autenticada de imagens;
- auditoria tenant;
- rate limit de endpoints sensiveis.

Protecao:

- Better Auth;
- `requireAppContext(permission)`;
- RLS com `app.organization_id`;
- role runtime sem `BYPASSRLS`;
- rotas internas protegidas por segredo especifico.

### Admin interno da plataforma

Nome decidido no monorepo: `apps/admin`.

Responsabilidades:

- dashboard operacional da plataforma;
- busca/listagem/detalhe de organizacoes;
- busca/listagem/detalhe de usuarios;
- suporte read-only com notas internas;
- auditoria plataforma;
- status/suspensao/reativacao de organizacao com motivo;
- health, smokes, jobs e configuracoes internas;
- flags/entitlements internos simples quando aprovados.
- visao futura de emails transacionais: ultimos envios, falhas, bounces/complaints e reenvios controlados.
- visao futura de billing: status de assinaturas, invoices, webhooks Woovi/Asaas, tentativas e reconciliacao.

Protecao:

- subdominio `admin.*`;
- Cloudflare Access/Zero Trust com IdP/MFA/allowlist;
- validacao server-side do token Access ou bloqueio robusto de bypass de origin;
- Better Auth session;
- `requirePlatformAdmin()`;
- platform audit obrigatoria;
- sem uso de `member.role` para permissao plataforma.

## 7. Packages

Pacotes foram mantidos conservadores. O monorepo existe, e os contratos com segundo consumidor claro ja foram extraidos. Packages criados ate agora: `@polaris/config`, `@polaris/db`, `@polaris/auth`, `@polaris/events`, `@polaris/platform`, `@polaris/platform-auth`, `@polaris/emails` e `@polaris/billing`. `ui` e `domain` continuam app-local enquanto nao houver contrato estavel suficiente.

- `@polaris/db`
  - Contem schema Drizzle, migrations, tipos DB, `withTenantContext`, futuros platform DB helpers.
  - Nao contem componentes, rotas ou server actions.
  - Status: extraido; schema/client/tenant-context, migrations e Drizzle config estao em `packages/db`. `apps/web/src/db/*` mantem wrappers de compatibilidade.

- `@polaris/auth`
  - Contem Better Auth config, client/server helpers, session, app context, platform admin guard.
  - Nao contem UI, nem queries de dominio operacional.
  - Status: extraido como factory compartilhada; `apps/web` injeta audit de login tenant e `apps/admin` usa wrappers locais sem importar `apps/web`.

- `@polaris/platform`
  - Contem queries/mutacoes/admin audit/support/dashboard compartilhadas e consumidas por `apps/admin`.
  - Nao contem Better Auth, Cloudflare Access, rate limit ou env validation.
  - Status: extraido; arquivos app-local equivalentes foram removidos de `apps/web/src/lib`.

- `@polaris/platform-auth`
  - Contem Cloudflare Access, guard de platform admin baseado em grant DB e rate limit admin dedicado.
  - Nao contem Better Auth completo; isso pertence a `@polaris/auth`.
  - Status: extraido; `apps/admin/src/lib/platform-admin-auth.ts` injeta a sessao local criada a partir de `@polaris/auth/session`.

- `@polaris/ui`
  - Contem `src/components/ui`, tema, hooks genericos e primitives.
  - Nao contem `products-panel`, `sales-panel`, dialogs que chamam server actions ou UI especifica do tenant app.
  - Status: ainda nao extraido; evitar package generico antes de necessidade real.

- `@polaris/domain`
  - Contem calculos puros, formatters, currency/date e contratos compartilhados.
  - Nao contem Drizzle, env, R2, Redis ou Better Auth.
  - Status: ainda nao extraido; dominio operacional segue em `apps/web`.

- `@polaris/config`
  - Contem tsconfig base, conventions de env, Ultracite/Biome compartilhado se necessario.
  - Status: extraido.

- `@polaris/emails`
  - Contem templates/contratos de email transacional e adapter Resend.
  - Status: extraido junto do PR 14, com envio best-effort e logs internos.

- `@polaris/billing`
  - Contem dominio canonico de billing e adapters Woovi/Asaas.
  - Status: extraido junto dos PRs 15-17.

Pacotes evitados no inicio:

- `packages/api`: sem API publica suficiente.
- `packages/events`: extraido como `@polaris/events`; dispatchers reais ainda sao o risco operacional restante.
- `packages/feature-flags`: so depois de flags reais.
- `packages/logger`: so se observabilidade crescer alem de Sentry/console estruturado.

## 8. Seguranca e Permissoes

Perfis:

- `platform_admin`: usuario interno da plataforma. Pode operar clientes e configuracoes internas conforme grants. Nao e membro invisivel das organizacoes.
- `organization owner`: dono do tenant cliente. Administra sua organizacao dentro do app externo.
- `organization admin`: tenant admin. Pode configuracoes tenant-scoped.
- `operator`: usuario comum do tenant. Opera produtos/estoque/vendas.

Regras:

- Platform admin nunca deriva de `member.role`.
- Organization admin nunca ganha acesso a `apps/admin`.
- Toda acao admin cross-tenant exige `requirePlatformAdmin()`.
- Toda acao admin sensivel exige motivo, rate limit, confirmacao UI e audit sincrona.
- Impersonation fica fora do MVP, ou entra apenas com justificativa, expiracao curta, banner visivel, audit obrigatoria e bloqueio de acoes destrutivas.
- Dados sensiveis nao exibidos: session token, access token, refresh token, id token, secrets, full connection strings, object keys R2 completas quando desnecessarias.
- PII/LGPD: admin deve mostrar o minimo necessario, registrar acesso a dados de cliente e preparar export/exclusao em specs separadas.

Cloudflare Access:

- Usar em `admin.*` e `staging.*`, nao no app publico de clientes.
- Free tier Cloudflare One cobre muitos recursos ate 50 usuarios, adequado para time pequeno.
- Validar `Cf-Access-Jwt-Assertion` no origin/admin ou garantir bloqueio de bypass por deployment/origin.
- Previews devem usar Vercel Deployment Protection/Vercel Authentication.

Headers:

- Manter HSTS/nosniff/frame/referrer/permissions policy.
- Adicionar CSP primeiro em report-only, testando Next/Sentry/OAuth.
- Cuidar com HSTS `includeSubDomains; preload` antes de `admin.*`/`staging.*`.

Webhooks futuros:

- Resend: validar raw body com `svix-id`, `svix-timestamp`, `svix-signature` e `RESEND_WEBHOOK_SECRET`; usar `svix-id` como chave de idempotencia.
- Woovi: validar raw body com `x-webhook-signature` e material de assinatura configurado para a conta; usar `correlationID` e IDs externos para reconciliacao, nao como unica prova de autenticidade.
- Asaas: validar `asaas-access-token` configurado no webhook; nunca reutilizar a API key como token de webhook; usar `event.id` para idempotencia.
- Todos: inserir evento duravel antes de processar side effects, responder `2xx` rapidamente para eventos validos/duplicados, processar transicoes async/outbox, redigir payload e headers sensiveis.
- Segredos separados: `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `WOOVI_API_KEY` ou app id, `WOOVI_WEBHOOK_SECRET` ou material equivalente, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, base URLs sandbox/producao por provider.

## 9. Banco de Dados

Estado atual:

- Auth base: `users`, `sessions`, `accounts`, `verifications`.
- Tenant/org: `organization`, `member`, `invitation`, `audit_events`.
- Dominio tenant: `categories`, `system_settings`, `products`, `product_price_changes`, `product_stock_entries`, `product_stock_write_offs`, `sales`, `sale_items`, `goals`.
- RLS em 13 tabelas tenant-scoped, com `FORCE`.
- `audit_events` exige `organization_id`, entao nao serve para plataforma.

Mudancas propostas:

- `platform_admins`
  - `user_id`, `role`, `status`, `created_at`, `created_by_user_id`, `disabled_at`.
  - Sem FK para `member`.

- `platform_admin_grants`
  - Grants temporarios/opcionais para acoes sensiveis, com `expires_at`, `reason`, `approved_by_user_id`.

- `platform_audit_events`
  - `id`, `actor_user_id`, `action`, `target_type`, `target_id`, `organization_id` opcional, `metadata` redigida, `reason`, `ip`, `user_agent`, `created_at`.
  - Escrita obrigatoria para mutacoes sensiveis.

- `platform_support_notes`
  - Notas internas por organizacao/usuario, sem aparecer no app do cliente.

- `organization_flags` ou `organization_entitlements`
  - Apenas se flags/planos entrarem no MVP do admin. Tipadas, auditadas e server-evaluated.

- `outbox_events`
  - `id`, `type`, `aggregate_type`, `aggregate_id`, `organization_id` opcional, `payload` redigido, `status`, `attempt_count`, `next_attempt_at`, `last_error`, `created_at`, `processed_at`.
  - Base para email, billing, retries e replay manual sem acoplar side effects a Server Actions.

- `webhook_events`
  - `provider`, `event_id`, `event_type`, `correlation_id`, `payload_hash`, payload redigido, `status`, `received_at`, `processed_at`, `last_error`.
  - Chave unica por `(provider, event_id)`; quando o provider nao trouxer ID estavel, usar hash/correlation strategy documentada.

- `billing_customers`, `plans`, `subscriptions`, `subscription_provider_links`
  - Modelo canonico do Polaris para cliente/plano/assinatura, com vinculos externos para Woovi e Asaas.
  - Guardar IDs externos, status normalizado, metodo preferido, datas de ciclo e snapshots auditaveis. Nao guardar numero completo de cartao.
  - Indices unicos por provider/external customer, provider/external subscription e provider/correlation ID quando aplicavel.

- `payment_provider_events`, se separado de `webhook_events`
  - Webhooks brutos/redigidos de Woovi/Asaas com `provider`, `event_id`, `correlation_id`, hash do payload, status de processamento, erro e timestamps.
  - Chave unica por provider/evento para idempotencia.

- `invoices` e `payment_attempts`
  - Estado canonico de cobrancas, tentativas, reconciliacao e falhas, independente do formato de cada provedor.

- `email_messages` e `email_events`
  - Log de solicitacao/envio/entrega/falha de emails transacionais via Resend, com template, destinatario redigido, provider id e correlacao com eventos de dominio.
  - Incluir chave de idempotencia local, versao de template, recipient hash/redacao e provider message/event id.

Migrations:

- Continuar usando Drizzle Kit.
- Usar `DATABASE_URL_DIRECT` para migrations.
- Validar em branch Neon isolada.
- Runtime sempre com role sem `BYPASSRLS`.
- Rodar `db:smoke:rls` e futuro `db:smoke:tenant-cross`.

## 10. Jobs/Eventos

Decisao atual: usar Inngest como processador/orquestrador duravel do outbox, mantendo o DB outbox como fonte local de idempotencia, auditabilidade e suporte operacional.

Estado atual:

- Vercel Cron diario para reconcile de imagens.
- R2 staging/final e processamento com `sharp` no request path.
- Auditoria tenant sincrona/best-effort.
- Webhooks Resend/Woovi/Asaas persistem eventos em `event_outbox` e acionam Inngest em best-effort.
- Rota `/api/inngest` e funcao `process-outbox-event` criadas para claim/finalizacao duravel do outbox.
- Dispatchers reais de email/billing ainda nao foram registrados; eventos sem dispatcher ficam `failed` para revisao manual, sem fingir sucesso.
- Woovi/Asaas ainda mantem reconciliacao sincrona no webhook para preservar comportamento atual ate os dispatchers serem validados.

Manter agora:

- Vercel Cron para reconcile.
- R2 lifecycle no bucket staging.
- Eventos transacionais existentes como audit events.

Fundacao obrigatoria antes das integracoes:

- Outbox Postgres para eventos que precisam durabilidade.
- Tabela de idempotencia para webhooks e tarefas repetiveis.
- Correlation IDs end-to-end: request, webhook, evento, email, invoice/subscription.
- Retentativas explicitas, status de processamento e dead-letter/manual review no admin.
- Assinatura/validacao de origem de webhooks conforme docs de cada provedor antes de processar payload.

Eventos uteis:

- Existentes/atuais: `auth.login`, `organization.created`, `product.created`, `product.updated`, `product.archived`, `stock.added`, `stock.written_off`, `sale.created`, `sale.cancelled`, `settings.updated`, `goal.created`, `goal.updated`, `product_image.presign_created`, `product_image.replaced`, `product_image.removed`.
- Admin/ops: `platform_admin.created`, `platform_admin.disabled`, `organization.suspended`, `organization.reactivated`, `support_note.created`, `platform_audit.failed`.
- Email/Resend: `email.delivery_requested`, `email.sent`, `email.delivered`, `email.bounced`, `email.complained`.
- Billing/Woovi/Asaas: `billing.webhook_received`, `billing.webhook_processed`, `subscription.created`, `subscription.updated`, `subscription.cancelled`, `invoice.created`, `invoice.paid`, `invoice.overdue`, `payment.failed`.
- Imagens futuras: `product_image.processing_requested`, `product_image.processed`, `product_image.processing_failed`, `product_image.reconcile_completed`.

## 11. API Layer

Decisao: manter Server Actions + Route Handlers.

Motivos:

- Leitura interna pode continuar em Server Components.
- Mutacoes de UI ja usam Server Actions com Zod e permissions.
- Route Handlers cobrem Better Auth, OAuth, health, R2, cron, presign e futuros webhooks Resend/Woovi/Asaas.
- Nao ha API publica, mobile app ou cliente externo exigindo contrato HTTP gerado.

Tecnologias avaliadas:

- Hono: bom para Web Standards, RPC client e OpenAPI via zod-openapi; adiar.
- Elysia: bom para Bun e type-safe APIs; desalinhado com deploy Next/Vercel atual e seria prematuro.
- Express: maduro, mas duplicaria roteamento em Next moderno.
- tRPC: excelente para TypeScript-to-TypeScript API, mas Server Actions ja resolvem UI interna.
- oRPC: promissor para RPC + OpenAPI + Next server functions; reavaliar se APIs publicas/geradas virarem requisito.
- OpenAPI: util quando houver parceiros/mobile/public REST.

Proximo passo para webhooks/email/billing:

- Criar helper local para route handlers: auth/signature, raw body quando o provedor exigir, parse JSON, Zod, erro normalizado, idempotencia e audit.
- Manter handlers por provider (`/api/webhooks/resend`, `/api/webhooks/woovi`, `/api/webhooks/asaas`) com normalizacao para eventos canonicos internos.
- Reavaliar OpenAPI/oRPC se houver consumo externo.

## 12. Feature Flags

Decisao: nao adicionar provedor externo agora.

Modelo recomendado:

- `organization.status` continua sendo kill access por tenant.
- Env vars para kill switch global raro e operacional.
- DB interno tipado para org beta features/entitlements quando necessario.
- Flags server-evaluated, nunca client-only para permissoes.
- Auditoria em toda alteracao.

Nao fazer agora:

- Vercel Flags/LaunchDarkly/Statsig/GrowthBook para MVP.
- Flag generica em JSON que controla billing, seguranca e permissoes ao mesmo tempo.
- Flags que bypassam RLS/guards.

Reavaliar quando:

- Nao-devs precisarem rollout gradual.
- Houver experimentos A/B.
- Planos/billing exigirem entitlements dinamicos.
- Houver muitos toggles por organizacao.

## 13. Estrategia de Migracao

Principios:

- Preservar app atual funcionando.
- Uma mudanca estrutural por PR.
- Primeiro workspace monorepo, depois mover `apps/web`, extrair packages minimos, fazer hardening/schema/guards e criar `apps/admin` protegido.
- Admin cedo, mas inicialmente sem mutacoes destrutivas e sem billing/email reais.
- Nunca usar role owner como runtime.
- Nunca criar acoes admin sem audit.
- Nunca integrar Resend/Woovi/Asaas sem idempotencia, audit e plano de rollback.

Sequencia:

1. PR 0: documentar decisoes e corrigir gaps de governanca.
2. PR 1: criar Bun workspaces + Turborepo sem mudanca funcional.
3. PR 2: mover app atual para `apps/web` preservando build/test/deploy.
4. PR 3: extrair packages minimos (`db`, `auth`, `ui`, `domain`, `config`) apenas onde houver consumo real.
5. PR 4: hardening pre-admin, secrets separados e smokes cross-tenant.
6. PR 5: schema platform admin/audit/support notes.
7. PR 6: guards `requirePlatformAdmin()` e Cloudflare Access validation.
8. PR 7: skeleton `apps/admin` protegido, sem acoes perigosas.
9. PR 8-12: funcionalidades MVP admin read-only, mutacoes auditadas e auditoria.
10. PR 13: fundacao de eventos/outbox/webhook idempotente.
11. PR 14-17: Resend, billing foundation, Woovi Pix recorrente e Asaas cartao quando o produto exigir billing/email reais.
12. PR 18: E2E/admin e hardening final.

Rollback:

- Docs: revert simples.
- Hardening auth: feature branch + testes; reverter hooks se bloquearem fluxo legitimo.
- Schema aditivo: migrations reversiveis quando possivel; sem drops.
- Admin app: deploy separado; pode desligar subdominio/Access sem afetar app cliente.
- Flags/jobs: manter opt-in e fallback off.

## 14. Plano de PRs

### PR 0 - Auditoria e preparacao

* [x] Objetivo: registrar arquitetura atual, novas decisoes tecnicas e plano de execucao.
* [x] Escopo: atualizar este documento para monorepo decidido, `apps/admin` cedo, Resend futuro, Woovi Pix recorrente e Asaas cartao.
* [x] Arquivos esperados: `docs/admin-monorepo-implementation-plan.md`.
* [x] Criterio de aceite: plano revisado sem contradicoes. Concluido retrospectivamente: o plano foi mantido atualizado durante a execucao e os itens pendentes de ambiente real seguem desmarcados.
* [x] Testes: revisao documental e `bun run check`.
* [x] Riscos: documento ficar generico ou desatualizado. Mitigado por checklist granular e bloqueios finais explicitos.
* [x] Rollback: remover/ajustar documento.

### PR 1 - Monorepo baseline

* [x] Objetivo: criar o baseline de monorepo sem mudar comportamento.
* [x] Escopo: Bun workspaces, `turbo.json`, scripts root delegando para apps/packages; CI mantido porque os comandos root preservaram os mesmos nomes.
* [x] Arquivos alterados: `package.json`, `bun.lock`, `turbo.json`, `apps/web/package.json`, `knip.config.ts`.
* [x] Criterio de aceite: o app atual ainda roda/builda/testa no root sem mudanca funcional.
* [x] Testes: `bun run check`, `bun run test`, `bun run knip`, `bun run build`.
* [x] Riscos: `apps/web` e um workspace proxy ate o PR 2; cache de output do build fica desabilitado no Turbo ate o app ser movido fisicamente para `apps/web`.
* [x] Rollback: reverter workspace/Turbo antes de mover arquivos.

### PR 2 - Mover app atual para `apps/web`

* [x] Objetivo: separar fisicamente o app cliente como primeira superficie do monorepo.
* [x] Escopo: mover `src`, configs Next/Tailwind/PostCSS/shadcn, assets e testes relacionados para `apps/web`; ajustar scripts root e Vercel root.
* [x] Arquivos esperados: `apps/web/*`, `package.json`, `tsconfig.json`, `next.config.ts` movido/ajustado, `components.json`, `vitest.config.ts`, `playwright.config.ts`, `knip.config.ts`, `drizzle.config.ts`, `vercel.json`, CI.
* [x] Criterio de aceite: comportamento preservado; aliases `@/*`, Drizzle schema/migrations, Playwright e shadcn apontam para o novo root correto.
* [x] Testes: `bun run check`, `bun run test`, `bun run knip`, `bun run build`, `bun run test:e2e`.
* [x] Riscos: quebrar `@/*`, import de `@/lib/security-headers` no Next config, Drizzle `./src/db`, Vitest `src/**/*.test.ts`, Playwright root e cron em `vercel.json`.
* [x] Rollback: reverter move antes de extracoes.

Nota posterior de organizacao: `apps/admin` foi criado como workspace Next minimo e bloqueado, sem painel funcional nem acoes internas. O skeleton autenticado e navegavel continua no PR 7.

### PR 3 - Extrair packages minimos

* [x] Objetivo: compartilhar apenas o que `apps/web` e `apps/admin` realmente consomem.
* [x] Escopo: extrair `@polaris/config` primeiro; extrair `@polaris/db`, `@polaris/events`, `@polaris/platform`, `@polaris/platform-auth`, `@polaris/auth`, `@polaris/ui` e `@polaris/domain` somente quando houver segundo consumidor claro. Concluido: `@polaris/config`, fundacao `@polaris/db`, `@polaris/events`, `@polaris/platform`, `@polaris/platform-auth` e `@polaris/auth`; `apps/admin` nao importa mais `@/db`, `@/lib/event-foundation`, helpers platform operacionais, Cloudflare Access, rate limit admin, auth/env ou session do web; `apps/web` declara `@polaris/db` como dependencia direta porque seus wrappers/testes importam o pacote.
* [x] Arquivos esperados: `packages/config`, possivelmente `packages/db`, `packages/auth`, `packages/ui`, `packages/domain`. Concluido: `packages/config`, `packages/db`, `packages/auth`, `packages/events`, `packages/platform` e `packages/platform-auth`.
* [x] Criterio de aceite: sem package `utils` generico; packages nao importam features do app cliente; boundaries testadas. Concluido para DB/eventos/platform/auth: packages nao importam `apps/web`, migrations/Drizzle config rodam em `@polaris/db`, o boundary test removeu os imports admin para DB/event-foundation/platform/auth, `knip` agora cobre `apps/admin` e os packages extraidos para detectar dependencias diretas ausentes, `turbo.json` inclui `knip.config.ts` como dependencia global para evitar cache verde com configuracao antiga, packages extraidos tem `tsconfig.json`/`typecheck` proprio encadeado por Turbo, e `ci-workflow.test.ts` protege esse wiring.
* [x] Testes: typecheck/build/test, boundary tests, `bun run knip`.
* [x] Riscos: extrair features demais e criar dependencias circulares.
* [x] Rollback: manter codigo app-local ate segundo consumidor existir. Status atual: web ainda mantem compatibilidade app-local para reduzir blast radius; teste de sync impede divergencia de schema ate migracao completa.

### PR 4 - Hardening pre-admin e smokes cross-tenant

* [x] Objetivo: fechar bypasses pequenos antes de expor a superficie interna.
* [x] Escopo: bloquear/auditar Better Auth `organization/update`; separar secrets de health/reconcile; adicionar `db:smoke:tenant-cross` ou ampliar `db:smoke:rls`; testes de activeOrganizationId spoof e matriz role/action. Concluido: `organization/update` bloqueado ate existir audit platform; smoke RLS ampliado com cross-tenant.
* [x] Arquivos esperados: `apps/web/src/lib/auth.ts` ou package auth, env helpers, rotas internas, `scripts/smoke-tenant-cross.*`, testes de session/roles.
* [x] Criterio de aceite: org update nao bypassa UI/audit; health e reconcile nao compartilham segredo; tenant A nao le/escreve B.
* [x] Testes: `bun run test`, `bun run db:smoke:rls`, novo smoke em banco isolado, `bun run check`.
* [x] Riscos: bloquear fluxo legitimo do organization plugin; smokes exigirem secrets indisponiveis.
* [x] Rollback: restaurar hooks/secrets antigos temporariamente e manter smoke manual.

### PR 5 - Schema platform admin e auditoria interna

* [x] Objetivo: criar base de dados para admin interno sem misturar com tenant roles.
* [x] Escopo: tabelas `platform_admins`, `platform_admin_grants`, `platform_audit_events`, `platform_support_notes`; bootstrap auditavel de primeiros admins; helpers de escrita obrigatoria.
* [x] Arquivos esperados: schema app-local, nova migration, testes schema/audit. Status atual: schema/client/tenant-context, migrations e Drizzle config foram movidos para `@polaris/db`; o web mantem wrappers de compatibilidade.
* [x] Criterio de aceite: platform admins independem de `member`; audit platform nao exige `organization_id`; bootstrap nao cria backdoor permanente.
* [x] Testes: `bun run db:generate`, testes focados, `bun run test`, `bun run check`, `bun run knip`, `bun run build`, `bun run build:admin`. Migration gerada, ainda nao aplicada em branch Neon.
* [x] Riscos: schema sensivel mal modelado. Risco restante: migration precisa ser aplicada primeiro em branch Neon isolada.
* [x] Rollback: migration aditiva reversivel; sem dados criticos ainda.

### PR 6 - Guards de plataforma e Cloudflare Access

* [x] Objetivo: implementar autorizacao interna em camadas antes do admin UI.
* [x] Escopo: `requirePlatformAdmin()`, validacao Cloudflare Access para admin, envs opcionais do Access. Rate limit admin e redacao detalhada de metadata ficam para as primeiras rotas/mutacoes reais.
* [x] Arquivos esperados: helper app-local de platform guard, `cloudflare-access` helper, testes de guards. Package/auth continua adiado ate `apps/admin` consumir de fato.
* [x] Criterio de aceite: org admin nao passa como platform admin; Access/session/DB grant precisam concordar quando Access esta configurado/enforced.
* [x] Testes: testes focados de token ausente/config ausente/sucesso mockado; `bun run test`, `bun run check`, `bun run knip`, `bun run build`, `bun run build:admin`.
* [x] Riscos: validar Access de forma incompleta e permitir bypass de origin. Risco restante: PR7 precisa conectar o guard ao `apps/admin` e configurar Access real no deploy.
* [x] Rollback: manter admin app inacessivel ate corrigir.

### PR 7 - Skeleton do admin interno

* [x] Objetivo: criar `apps/admin` real e protegido, sem acoes perigosas.
* [x] Escopo: app Next separado, layout operacional, session/Access/DB grant gate, dashboard vazio/health basico, forbidden. Deploy/admin env real ainda depende da configuracao do projeto Vercel.
* [x] Arquivos esperados: `apps/admin`, config Next, env admin, scripts e tests. Concluido com alias local-only; auth/session/env de auth foram movidos para `@polaris/auth`.
* [x] Criterio de aceite: somente platform admin acessa; cliente comum recebe 403/redirect; previews protegidos quando Cloudflare Access/Vercel protection forem configurados.
* [x] Testes: unit guards, teste de regressao do admin app protegido, `bun run test`, `bun run check`, `bun run check:admin`, `bun run knip`, `bun run build`, `bun run build:admin`.
* [x] Riscos: expor admin em preview sem protection. Risco restante: configurar Access real no deploy e manter proibicao de imports cross-app. Guardrail atual: source test exige zero imports temporarios de `apps/web/src` pelo admin.
* [x] Rollback: desligar deploy/subdominio admin sem afetar `apps/web`.

### PR 8 - Admin: dashboard operacional read-only

* [x] Objetivo: dar visao interna sem expor dados sensiveis.
* [x] Escopo: contagem de orgs/users/members, status de health, ultimos eventos platform/tenant agregados, R2/reconcile status.
* [x] Arquivos esperados: admin page, platform query read-only, tests.
* [x] Criterio de aceite: dados agregados, sem tokens/secrets, todas queries server-side.
* [x] Testes: unit query redaction, admin page protection/render source, build admin.
* [x] Riscos: dashboard virar copia do dashboard financeiro tenant. Mitigado: apenas cards agregados, health booleano e eventos redigidos.
* [x] Rollback: ocultar cards sensiveis.

### PR 9 - Admin: organizacoes e usuarios read-only

* [x] Objetivo: permitir suporte global a organizacoes/usuarios sem mutacoes destrutivas.
* [x] Escopo: listagem, busca, detalhe, membros, sessoes redigidas, provider presence e resumo operacional minimo.
* [x] Arquivos esperados: admin org/user pages, platform queries, redaction tests.
* [x] Criterio de aceite: nunca exibir `sessions.token`, access/refresh/id tokens ou secrets; consultas globais sao explicitamente protegidas por `requirePlatformAdmin()`.
* [x] Testes: redaction tests, permission/source tests, RLS/cross-tenant smoke.
* [x] Riscos: LGPD/PII excessiva e vazamento cross-tenant. Mitigado por email redigido, sessoes resumidas e nenhuma exibicao de tokens/secrets.
* [x] Rollback: reduzir campos visiveis ou ocultar paginas.

### PR 10 - Admin: mutacoes auditadas de organizacao

* [x] Objetivo: operar status de organizacao com controle e rastreabilidade.
* [x] Escopo: suspender/reativar com motivo, confirmacao UI, rate limit admin dedicado e audit sincrona.
* [x] Arquivos esperados: admin org actions, platform audit tests.
* [x] Criterio de aceite: status mutation exige platform admin operator, motivo, rate limit e audit obrigatoria; falha de audit impede mutacao.
* [x] Testes: guards/source tests, action protection tests, audit transaction tests e source test cobrindo `assertAdminRateLimit`.
* [x] Riscos: mutacao indevida de status. Mitigado por role minima `operator`, motivo, confirmacao UI, rate limit por ator/acao/alvo/IP e transacao com audit obrigatoria.
* [x] Rollback: desabilitar mutacoes e manter read-only.

### PR 11 - Admin: suporte e notas internas

* [x] Objetivo: registrar contexto de suporte auditavel.
* [x] Escopo: notas internas por org/usuario, links seguros para diagnostico, sem impersonation.
* [x] Arquivos esperados: support notes pages/actions/schema tests.
* [x] Criterio de aceite: toda nota tem actor, timestamp e target; cliente nao ve notas.
* [x] Testes: DB/action tests, source tests de protecao admin.
* [x] Riscos: notas com PII sensivel sem politica. Mitigado parcialmente por escopo interno/admin-only; politica de retencao/LGPD ainda precisa de decisao futura.
* [x] Rollback: read-only ou apagar feature em admin.

### PR 12 - Auditoria e logs administrativos

* [x] Objetivo: tornar acoes internas rastreaveis.
* [x] Escopo: view de `platform_audit_events`, filtros e redacao. Correlation IDs dedicados ficam para a fundacao de eventos/outbox do PR 13.
* [x] Arquivos esperados: audit pages/queries/tests.
* [x] Criterio de aceite: mutacoes admin aparecem na auditoria e falham se audit obrigatoria falhar.
* [x] Testes: action + audit transaction tests, redaction tests, protection/source tests.
* [x] Riscos: logs grandes ou metadata sensivel. Mitigado por limite de listagem e omissao de metadata na UI.
* [x] Rollback: manter tabela e esconder UI.

### PR 13 - Fundacao de eventos, outbox e idempotencia

* [x] Objetivo: preparar a base duravel para Resend, Woovi e Asaas.
* [x] Escopo: outbox Postgres, `webhook_events`, status de processamento, correlation IDs, retry manual/observabilidade no admin, helpers de raw body/hash/header redaction/token-safe capture, claim/finalizacao de outbox, rota Inngest inicial e produtores reais via webhooks Resend/Woovi/Asaas.
* [x] Arquivos esperados: modulo compartilhado `@polaris/events`, schema/migration, route handler helpers, Inngest App Router route, fixtures/tests.
* [x] Criterio de aceite: evento duplicado nao reprocessa; falha fica rastreavel; handlers conseguem capturar evento duravel e responder rapido; processamento pesado fica async/outbox/Inngest.
* [x] Testes: unit/integration de retries, idempotencia, dead-letter/manual review, claim/finalizacao do outbox e source test da rota Inngest.
* [x] Riscos: criar fila caseira complexa demais. Mitigado com base minima: `@polaris/events`, tabelas aditivas, captura idempotente, observabilidade read-only, retry manual restrito e Inngest para processamento duravel. Migration gerada, ainda nao aplicada. Risco restante: dispatchers reais de email/billing ainda precisam ser registrados; por enquanto webhooks Resend/Woovi/Asaas continuam preservando os efeitos sincronamente tambem.
* [x] Rollback: manter eventos sincronizados ate haver caso real.

### PR 14 - Emails transacionais com Resend

* [x] Objetivo: implementar o primeiro fluxo real de email transacional via Resend.
* [x] Escopo: `packages/emails`, adapter Resend, templates versionados, env `RESEND_API_KEY`, dominio verificado em producao, logs `email_messages`/`email_events`, webhook Resend se necessario. Concluido com welcome email best-effort no onboarding, logs internos e webhook Resend.
* [x] Arquivos esperados: `packages/emails`, route handler `/api/webhooks/resend` se aplicavel, schema/migration, tests.
* [x] Criterio de aceite: envio trata `{ data, error }`, nao hardcodeia chave, usa dominio verificado fora de teste, valida webhooks com raw body + `svix-*` e e idempotente por `svix-id`/chave local.
* [x] Testes: adapter mocked, template render, idempotencia, build web/admin.
* [x] Riscos: duplicar envio em retries ou vazar PII em logs. Mitigado por idempotency key local/Resend, webhook idempotente por `svix-id`, payload de webhook redigido e envio best-effort. Risco restante: migrations ainda precisam ser aplicadas e producao precisa de `RESEND_API_KEY`, `RESEND_FROM_EMAIL` com dominio verificado e `RESEND_WEBHOOK_SECRET`.
* [x] Rollback: flag/env para desabilitar envio real e manter log interno. Concluido: sem env Resend o envio e ignorado; webhook responde indisponivel se segredo/API key ausentes.

### PR 15 - Billing foundation

* [x] Objetivo: criar modelo canonico antes dos adapters Woovi/Asaas.
* [x] Escopo: planos, assinaturas, customers, invoices, payment attempts, provider links, entitlements derivados de assinatura. Concluido como base canonica sem adapters: planos, customers, subscriptions, invoices, attempts e entitlements no plano.
* [x] Arquivos esperados: `packages/billing`, schema/migrations, admin read-only billing pages.
* [x] Criterio de aceite: UI e dominio usam status canonico, nao campos especificos de provedor; nenhuma permissao depende de payload bruto externo.
* [x] Testes: dominio billing, migrations, entitlement evaluation.
* [x] Riscos: modelar demais antes de aprender com provider real. Mitigado por tabelas aditivas, status canonico pequeno e UI read-only. Risco restante: migrations ainda precisam ser aplicadas e os adapters Woovi/Asaas podem exigir ajustes no PR16/PR17.
* [x] Rollback: esconder UI billing e manter tabelas aditivas sem uso.

### PR 16 - Woovi Pix recorrente

* [x] Objetivo: integrar Pix recorrente com Woovi quando billing real entrar.
* [x] Escopo: adapter Woovi, criacao de Pix Automatico/assinatura, `correlationID`, webhook, idempotencia, reconciliacao e status canonico.
* [x] Arquivos esperados: `packages/billing/providers/woovi`, route handler `/api/webhooks/woovi`, tests.
* [x] Criterio de aceite: webhook valida raw body + `x-webhook-signature`; webhooks duplicados nao duplicam invoice/payment; eventos desconhecidos ficam em review; segredos ficam isolados por app/env.
* [x] Testes: contract tests com fixtures, idempotencia, erro/retry, admin billing read-only.
* [x] Riscos: divergencia entre status Woovi e estado canonico. Mitigado por status canonico pequeno, provider links, `provider_event_id` unico em tentativas e eventos desconhecidos marcados para revisao. Risco restante: validar assinatura HMAC contra sandbox/SDK oficial da Woovi antes de producao, pois docs publicas confirmam raw body + `x-webhook-signature`, mas nao detalham algoritmo Node.
* [x] Rollback: desabilitar adapter Woovi e manter assinaturas existentes em modo manual. Concluido: envs Woovi sao opcionais; sem segredo o webhook falha fechado.

### PR 17 - Asaas cartao de credito recorrente

* [x] Objetivo: integrar assinaturas de cartao de credito com Asaas.
* [x] Escopo: adapter Asaas, subscription com cartao tokenizado, webhook payments/subscriptions, idempotencia por event id. Customer create e atualizacao de cartao ficam fora ate decidir o fluxo Asaas real de tokenizacao/checkout.
* [x] Arquivos esperados: `packages/billing/providers/asaas`, route handler `/api/webhooks/asaas`, tests.
* [x] Criterio de aceite: validar `asaas-access-token`; nao armazenar numero completo de cartao/CCV; apenas IDs externos, brand/last4 quando retornados; webhooks idempotentes por `event.id`.
* [x] Testes: adapter mocked, idempotencia/reconciliacao, erro/retry, redaction tests, `bun run check`, `bun run check:admin`, `bun run knip`, `bun run test`, `bun run build`, `bun run build:admin`.
* [x] Riscos: escopo PCI mitigado por aceitar apenas token de cartao, nunca numero completo/CVV. Risco restante: validar em sandbox Asaas o contrato exato de tokenizacao/customer/update-card antes de producao; migrations ainda precisam ser aplicadas.
* [x] Rollback: desabilitar adapter Asaas e manter cobranca manual. Concluido: envs Asaas sao opcionais; sem token de webhook o endpoint falha fechado.

### PR 18 - Testes E2E/admin e hardening final

* [x] Objetivo: provar fluxos criticos antes de release amplo.
* [ ] Escopo: Playwright admin negativo/positivo, cross-tenant smoke, CI release gates, docs de deploy admin, smokes provider em sandbox quando billing/email existirem. Concluido parcialmente: Playwright web/admin, CI gates incluindo typecheck web/admin, preflight admin, docs de deploy admin e precheck de schema E2E; sandbox provider real segue pendente de ambiente.
* [x] Arquivos esperados: `tests/e2e/admin*.e2e.ts`, workflows, docs.
* [ ] Criterio de aceite: app cliente e admin passam build/test; release exige preflight/smokes. Concluido parcialmente: `check`, `check:admin`, `test`, `knip`, `build`, `build:admin`, `test:e2e`, `test:e2e:admin` e `db:smoke:rls` passaram; `prod:preflight` em `VERCEL_ENV=production` e `deploy:smoke` seguem pendentes de envs reais/deploy promovido.
* [ ] Testes: suite completa e smokes em ambiente isolado. Concluido parcialmente: suite web/admin E2E passou em `E2E_DATABASE_URL` isolado depois de aplicar migrations no branch `e2e`; `prod:preflight` em producao falha por envs Access/R2/Upstash/admin/deploy ausentes, segredos curtos e `sslmode=verify-full` pendente; `deploy:smoke` falha sem `DEPLOYMENT_SMOKE_URL`.
* [ ] Riscos: flakes por auth/Access externo, sandbox de provedor, Vercel CLI sem autenticacao local e validacao final em deploy promovido.
* [x] Rollback: admin/billing/email atrasados sem afetar app cliente. Concluido: gates foram adicionados de forma isolada; falhas atuais impedem release sem quebrar build/test unitario do app.

## 15. Checklist Final de Producao

Revisoes complementares: `docs/reports/admin-monorepo-full-review-2026-07-09.md` e `docs/reports/admin-monorepo-review-after-auth-extraction-2026-07-09.md`.

* [x] `bun run check` passou.
* [x] `bun run typecheck` passou para web.
* [x] `bun run test` passou.
* [x] `bun run knip` passou.
* [x] `bun run build` passou para web.
* [x] Build admin passou a partir do PR 7.
* [x] `bun run typecheck:admin` passou para admin.
* [x] `bun run test:e2e` passou com `E2E_DATABASE_URL` isolado.
* [x] `bun run test:e2e:admin` passou com `E2E_DATABASE_URL` isolado.
* [x] `bun run db:smoke:rls` passou com role runtime sem `BYPASSRLS`. Revalidado apos reautenticacao do plugin Neon: `currentUser=polaris_app`, `forcedTables=13/13`, `policies=14`, `tenantCrossCheck=ok`.
* [x] Cross-tenant smoke passou.
* [ ] `bun run prod:preflight` passou com envs reais.
* [ ] `bun run deploy:smoke` passou no deploy promovido.
* [ ] Migrations aplicadas com `DATABASE_URL_DIRECT`, nao runtime.
* [ ] `DATABASE_URL` de runtime nao usa owner/admin. Evidencia parcial: role `polaris_app` existe e o smoke RLS local roda com `currentUser=polaris_app`; falta comprovar env real de producao/promoted deploy e trocar URLs para `sslmode=verify-full`.
* [ ] Cloudflare Access ativo para `admin.*` e `staging.*`.
* [ ] Vercel Deployment Protection ativo para previews.
* [ ] OAuth callbacks corretos para app e admin.
* [ ] R2 staging/final configurados; lifecycle staging ativo.
* [ ] Upstash configurado em producao.
* [x] `prod:preflight` exige `SENTRY_DSN` e `NEXT_PUBLIC_SENTRY_DSN` em producao.
* [ ] Sentry alerts configurados para webhook/outbox/admin.
* [ ] CSP report-only validada antes de enforcement.
* [x] Platform audit obrigatoria para acoes sensiveis.
* [x] Script auditavel para bootstrap do primeiro platform admin existe: `bun run platform-admin:bootstrap`.
* [ ] Primeiro platform admin criado em ambiente real por script auditavel e evidencia registrada.
* [x] Nenhum token/secret exibido no admin.
* [x] Outbox/webhook idempotency validada antes de Resend/Woovi/Asaas.
* [ ] Resend usa dominio verificado e webhook `svix-*` validado quando habilitado.
* [x] Woovi webhook `x-webhook-signature` validado quando habilitado.
* [x] Asaas webhook `asaas-access-token` validado quando habilitado.
* [x] Nenhum dado completo de cartao/CCV armazenado.
* [x] Backup/PITR Neon revisado antes de migrations sensiveis. Revisao atual: projeto `polaris-erp` em `free_v3`, `history_retention_seconds=21600` e branch production nao protegido; migrations sensiveis ainda exigem decisao operacional antes de producao.
* [x] Rollback documentado para web/admin/schema/email/billing.

## 16. Perguntas em Aberto

* [ ] Qual dominio real sera usado: `app.*`, `admin.*`, `staging.*`?
* [ ] Qual IdP Cloudflare Access sera usado no inicio: Google Workspace, GitHub, email OTP ou outro?
* [ ] Quem sao os primeiros platform admins?
* [x] Como serao bootstrapados sem criar backdoor: `bun run platform-admin:bootstrap` usa `DATABASE_URL_DIRECT`, transacao, grant proprio e `platform_audit_events`.
* [ ] Impersonation entra no MVP ou fica fora ate suporte precisar?
* [ ] Qual sera o primeiro fluxo real de email transacional com Resend?
* [ ] Qual sera o primeiro plano/entitlement pago a modelar antes de Woovi/Asaas?
* [ ] Asaas cartao usara checkout/tokenizacao do provedor ou coleta direta no app?
* [ ] O produto sera vendido como single-owner por mais tempo ou multiusuario vira prerequisito comercial?
* [ ] Sentry e logs atuais sao suficientes para erros recentes no admin dashboard?
* [x] `aidd_docs/memory` foi criado com memoria inicial do estado do projeto.
* [x] Runbooks de cleanup destrutivo foram restaurados com SQL transacional em rollback por padrao.

## 17. Proximos Passos Reais

1. Linkar/autenticar Vercel para `apps/web` e `apps/admin`, configurar projetos/dominos reais e habilitar preview protection.
2. Configurar `ADMIN_APP_URL`, Cloudflare Access (`CLOUDFLARE_ACCESS_AUD`, `CLOUDFLARE_ACCESS_TEAM_DOMAIN`) e validar admin por origem real.
3. Atualizar URLs Postgres de producao para `sslmode=verify-full`, mantendo `DATABASE_URL`/`RLS_DATABASE_URL` com role runtime (`polaris_app`) e `DATABASE_URL_DIRECT` somente para migrations; o plugin Neon ainda gera URLs com `sslmode=require`.
4. Rodar migrations em producao com `DATABASE_URL_DIRECT` depois de revisar backup/PITR/branch protection.
5. Rodar `vercel env run -e production -- bun run prod:preflight`.
6. Rodar `DEPLOYMENT_SMOKE_URL=https://DOMINIO_REAL bun run deploy:smoke` no deploy promovido.
7. Configurar R2, Upstash, Sentry, OAuth callbacks e CSP report-only em ambiente real.
8. Validar Resend com dominio verificado e webhook `svix-*`; validar Woovi/Asaas em sandbox/producao antes de cobrar clientes.
9. Decidir respostas das perguntas abertas de dominio, IdP, primeiros platform admins, impersonation, billing e tokenizacao Asaas.
