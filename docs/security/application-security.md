# Segurança da aplicação

**Status:** controles implementados e fontes versionadas descritos abaixo; configurações de provedores e ambiente promovido permanecem não confirmadas.
**Última verificação:** 2026-07-14.
**Commit analisado:** `886eda0` em `main`.

## Escopo e fronteiras

As principais fronteiras são navegador/web, admin interno, banco tenant-scoped, provedores OAuth/billing/email, armazenamento de imagens e jobs internos. Esta documentação é defensiva: descreve controles observados e lacunas, não procedimentos de exploração.

| Fronteira | Controle observado | Limitação declarada |
| --- | --- | --- |
| Navegador → web | Sessão Better Auth, `proxy` otimista e guards server-side. | `proxy` não substitui guard de action/handler. |
| Web → dados tenant | Contexto de transação e RLS versionada. | Banco promovido/role runtime não verificados nesta tarefa. |
| Browser → upload | Sessão, role, schema, rate limit e URLs preassinadas staging. | Configuração real de R2/CORS/lifecycle não verificada. |
| Provedor → webhook | Limite de tamanho, token/assinatura, captura deduplicada e headers redigidos. | Recebimento real e segredos de provider não verificados. |
| Navegador → admin | Grant interno mais barreira Vercel alegada pela UI. | Vercel Authentication e sessão cross-origin não confirmados. |

## Identidade e sessões

Google é o provider social configurável; senha está desabilitada. A rota de início OAuth aplica origem canônica, callback relativo seguro e limite por IP. `nextCookies()` integra a dependência à aplicação, mas os atributos efetivos de cookie não são configurados explicitamente neste repositório e não são afirmados aqui.

| Situação | Controle | Fonte |
| --- | --- | --- |
| Callback aberto | Só aceita caminho relativo que não inicia `//`. | `apps/web/src/app/api/auth/google/route.ts:getSafeCallbackUrl`. |
| Origem divergente | Redireciona para origem Better Auth canônica antes do OAuth. | `apps/web/src/app/api/auth/google/route.ts:getCanonicalRedirectUrl`. |
| Explosão de tentativas OAuth | Limite de 20 por minuto e resposta `429`. | `apps/web/src/app/api/auth/google/route.ts:GET`. |
| Login por senha | Desabilitado. | `packages/auth/src/auth.ts:createPolarisAuth`. |
| Logout | Chama a API Better Auth e redireciona. | `apps/web/src/features/auth/actions.ts:signOutAction`. |

Ban/desban, reset de senha, imposição local de email verificado, revogação global e propriedades efetivas de expiração/renovação de sessão não foram encontrados ou não foram confirmados. O detalhe completo fica em `docs/modules/authentication.md`.

## Autorização e tenancy

O web exige sessão, membership, organização ativa, billing e role antes de ações. O admin exige grant separado e role mínima. Em banco, `set_config(..., true)` limita contextos de tenant/usuário/platform admin à transação e as migrations versionadas criam RLS nas tabelas tenant-scoped.

| Risco | Defesa observada | Lacuna |
| --- | --- | --- |
| IDOR entre organizações | `organizationId` do contexto, queries tenant-scoped e RLS versionada. | Teste/live smoke contra ambiente promovido pendente. |
| Escalada de organization admin a admin interno | `requirePlatformAdmin` valida tabela/grant próprios. | Não há prova de Vercel Authentication externa. |
| Mutation sem permissão | `requireAppContext(permission)` e role mínima nas actions admin. | Novas actions precisam preservar o padrão. |
| Organização suspensa | Contexto web é recusado. | Pode resultar em loop de onboarding, sem UX de reativação confirmada. |
| Múltiplas memberships | Plugin tenta limitar, schema aceita. | Seleção/troca de organização não é robustamente coberta. |

Fontes: `apps/web/src/lib/app-session.ts`, `apps/web/src/lib/app-context.ts`, `packages/platform-auth/src/admin-guard.ts`, `packages/db/src/tenant-context.ts` e migrations em `packages/db/src/migrations/`.

## Rate limit, headers e erros

Rate limits de web e admin usam Upstash quando configurado. Sem provider ou em erro, produção falha fechada; desenvolvimento/teste usam fallback local. Isso reduz abuso, mas cria dependência de disponibilidade do provider.

O web envia HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` e `Permissions-Policy`. Não foi encontrada Content Security Policy nesses headers versionados. Fontes: `apps/web/src/lib/rate-limit.ts:checkRateLimit`, `packages/platform-auth/src/admin-rate-limit.ts:checkRateLimit`, `apps/web/src/lib/security-headers.ts:getSecurityHeaders`.

`instrumentation.ts:onRequestError` escreve JSON contendo `message`, caminho e metadados de rota e sempre chama `captureRequestError`; o código lido não demonstra allowlist/redação desses campos. Portanto, segurança de logs e entrega ao Sentry são lacunas a confirmar, não garantias. Fonte: `apps/web/src/instrumentation.ts:onRequestError`.

## Webhooks, uploads e segredos

Handlers de Asaas, Woovi e Resend recusam configuração ausente, validam token/assinatura, impõem tamanho máximo e registram intake deduplicado. `captureWebhookEvent` redige nomes de headers sensíveis antes de persistir os headers e armazena hash do corpo bruto. Fontes: `apps/web/src/integrations/asaas/webhook.ts`, `apps/web/src/integrations/woovi/webhook.ts`, `apps/web/src/integrations/resend/webhook.ts`, `packages/events/src/index.ts:redactWebhookHeaders`, `packages/events/src/index.ts:captureWebhookEvent`.

O endpoint de presign de imagem exige sessão e `products:write`, limita IP e usuário, valida schema e registra auditoria. A leitura de imagem exige sessão e acesso ao produto; devolve `404` para acesso/parâmetros inválidos. Fontes: `apps/web/src/app/api/product-images/presign/route.ts:POST`, `apps/web/src/app/api/product-images/[organizationId]/[productId]/[version]/[variant]/route.ts:GET`.

`.env.example` enumera categorias de variáveis sem valores. Não reproduza valores de secrets, cookies, connection strings ou payloads reais em documentos, logs, tickets ou testes. Configuração real de OAuth, R2, Upstash, Sentry, billing e webhooks é externa e não confirmada. Fonte: `.env.example`.

## Privacidade e operação

Dados de conta incluem nome, email, imagem, sessões e memberships no schema. O diretório de plataforma mascara emails para exibição, mas platform admins continuam vendo outros identificadores e dados operacionais necessários ao suporte. Fontes: `packages/db/src/schema.ts:users`, `sessions`, `packages/platform/src/platform-directory.ts:redactEmail`.

Não foram encontrados neste escopo fluxos completos de LGPD para exportação, exclusão, retenção, classificação de dados, resposta a incidente ou auditoria de acesso a PII por role. Esses itens devem ser definidos operacionalmente, sem assumir que mascaramento de email satisfaz tais obrigações.

## Testes e próximos controles

Testes relevantes: `apps/web/src/app/api/auth/google/route.test.ts`, `apps/web/src/lib/app-session.test.ts`, `apps/web/src/app/api/product-images/presign/route.test.ts`, `packages/platform-auth/src/platform-admin-auth.test.ts`, `apps/web/src/db/rls-tenant-isolation.test.ts` e `packages/db/src/platform-admin-rls-policy.test.ts`.

Prioridades de validação: OAuth/cookie real, sessão admin em origem separada, RLS com role de runtime em ambiente promovido, fluxo suspensão/onboarding, múltiplas memberships, sanitização de logs e configuração externa de Vercel Authentication.

## Referências principais

- `docs/modules/authentication.md`
- `docs/modules/organizations-and-tenancy.md`
- `docs/modules/platform-admin.md`
- `docs/architecture/authorization-model.md`
