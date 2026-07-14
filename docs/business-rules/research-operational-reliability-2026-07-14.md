# Pesquisa externa: confiabilidade operacional e provas promovidas

**Status:** rascunho de pesquisa, **não normativo**.  
**Consulta:** 2026-07-14.  
**Escopo:** Neon/Postgres, Inngest, Resend, Cloudflare R2 e Google OAuth/Better Auth. Não altera código, configuração, credenciais ou decisões já aprovadas.

## Conclusão

O repositório possui controles locais importantes: transações e RLS versionado, outbox persistente com `dead_letter`, deduplicação de webhooks, idempotência no e-mail de boas-vindas, staging de imagens por organização/usuário e OAuth Google via Better Auth. Isso **não prova** a configuração ou o comportamento do ambiente promovido. Os gates abaixo devem produzir evidência datada e sem expor segredos antes de qualquer afirmação de confiabilidade de produção.

## Achados por tecnologia

### Neon/Postgres

- A documentação da Neon separa uma conexão autenticada, que aplica RLS, da conexão administrativa com `BYPASSRLS`; a segunda serve a migrations e jobs privilegiados, não à requisição tenant-facing.[^neon-rls]
- O repositório já aplica `FORCE ROW LEVEL SECURITY` e policies por `app.organization_id` nas tabelas operacionais, mas a análise local não confirma a role realmente conectada nem migrations aplicadas no ambiente promovido. [RLS migration](../../packages/db/src/migrations/20260707205000_rls_tenant_isolation.sql) e [estado do projeto](../../aidd_docs/memory/project-state.md).

**Recomendação técnica condicionada:** tratar a prova promovida como gate de release: registrar revision de migration, `rolbypassrls`/grants da role runtime, `pg_policies`, e um smoke de dois tenants que confirme leitura/escrita própria e negação cross-tenant. Usar a conexão privilegiada somente para migration/job explicitamente identificado.

**Decisão necessária:** quem autoriza esse gate e qual procedimento de recuperação/backup é exigido antes de migration destrutiva ou de reversão de schema.

### Inngest, retries e dead-letter

- Inngest documenta retries por step e oferece controles explícitos de idempotência, concorrência, debounce e throttle; a chave deve representar a unidade de negócio que não pode duplicar.[^inngest-controls]
- O outbox local já faz claim por lease/token e encaminha para `dead_letter` após o máximo de tentativas; retry administrativo reabre eventos `failed`/`dead_letter`. Evidência: `packages/events/src/index.ts:364` e `packages/events/src/index.ts:442`.
- O reconcile de imagens e o dispatch são funções Inngest, mas a descoberta anterior não encontrou política explícita de `retries`/`concurrency` por função. Isto é lacuna de configuração, não evidência de falha do provider. [pesquisa anterior](research-operational-platforms-2026-07-14.md)

**Recomendação técnica condicionada:** para cada função, declarar e testar: chave de idempotência, limite de concorrência na entidade afetada, retry/backoff, timeout, condição terminal e o vínculo ao outbox persistido. O handler deve poder reexecutar sem repetir efeito externo; Inngest não substitui a transição idempotente no banco.

**Decisões necessárias:**

1. Tentativas, backoff e timeout por classe de job: webhook/billing, e-mail, imagem e manutenção.
2. Quem recebe alerta, quem pode reabrir dead-letter e qual evidência é obrigatória antes do retry manual.
3. Se duas execuções para a mesma organização/produto podem coexistir ou devem ser serializadas.

### Resend e lifecycle de e-mail

- Resend recomenda chave de idempotência por envio; ela expira em 24 horas e uma chave repetida com payload diferente retorna conflito.[^resend-idempotency]
- `email.delivered` significa entrega ao servidor de e-mail do destinatário, enquanto `email.failed` e `email.suppressed` carregam a causa/estado do insucesso.[^resend-delivered][^resend-failed][^resend-suppressed]
- O envio de boas-vindas já usa `welcome:<userId>`, persiste `pending → sent|failed` e guarda o identificador do provider. O status `sent` é definido após aceitação da API, não após `email.delivered`; os webhooks atuais não são a fonte de transição de `email_messages`. Evidência: `apps/web/src/integrations/resend/email-service.ts:198` e `apps/web/src/integrations/resend/webhook.ts:67`.

**Recomendação técnica condicionada:** diferenciar aceitação pelo provider de entrega/supressão/falha no modelo de leitura, correlacionando pelo `providerMessageId` e mantendo intake idempotente. Não condicionar acesso, billing ou mudança financeira a evento de e-mail.

**Decisões necessárias:**

1. Quais comunicações precisam de prova de entrega versus somente aceitação para envio.
2. Regra de reenvio, inclusive para `failed` e `suppressed`, e quem pode iniciá-lo.
3. Retenção e acesso a destinatário, motivo de falha e payload bruto de webhook.

### Cloudflare R2, CORS e ciclo de vida

- R2 requer CORS no bucket para upload por browser com URL pré-assinada; a policy deve restringir origem, métodos, headers e headers expostos necessários.[^r2-cors]
- URL pré-assinada de `PUT` pode fixar `ContentType`; regras de lifecycle podem expirar objetos por prefixo/idade.[^r2-presigned][^r2-lifecycle]
- O código emite presign de cinco minutos, exige sessão e `products:write`, verifica prefixo `staging/<organization>/<user>/`, tipo e tamanho antes do processamento. Evidência: `apps/web/src/app/api/product-images/presign/route.ts:1` e `apps/web/src/features/products/image-storage.ts:168`.
- Existe health check de R2/CORS e reconcile de órfãos, mas nenhuma leitura local prova buckets, CORS, lifecycle ou credenciais promovidas. Evidência: `apps/web/src/features/products/image-storage.ts:544`.

**Recomendação técnica condicionada:** no ambiente promovido, executar health sem revelar nomes sensíveis/segredos e validar uma origem exata de produção, `PUT` e `HEAD`, `Content-Type` e somente headers de resposta indispensáveis. Configurar lifecycle explícito para staging abandonado; reconcile de aplicação continua sendo controle complementar para órfãos finais.

**Decisões necessárias:**

1. TTL de staging e retenção/purge de imagens finais depois de soft delete.
2. Se preview e produção possuem origens/buckets isolados e como a mudança de domínio atualiza CORS.
3. SLO e responsável quando reconcile falha ou remove objeto inesperado.

### Google OAuth, account linking e sessão local

- Google OIDC exige `state` contra CSRF; a URI de retorno deve ser autorizada e `nonce` protege contra replay no fluxo aplicável.[^google-oidc]
- A configuração Better Auth atual mantém `disableImplicitLinking: false`, portanto admite linking implícito por e-mail. Evidência: `packages/auth/src/auth.ts:174`.
- Better Auth documenta que `disableImplicitLinking: true` impede esse linking silencioso e requer linking explícito para usuário já autenticado.[^better-auth-linking]

**Recomendação de segurança condicionada:** identificar a conta externa pelo identificador estável do provider e adotar linking explícito/recovery auditado em colisão de e-mail, salvo decisão consciente de manter linking implícito. Logout ou revogação de consentimento Google não substitui política própria de expiração, renovação, revogação e auditoria de sessões locais.

**Decisões necessárias:**

1. Manter linking implícito por e-mail ou exigir linking explícito com sessão já autenticada/suporte verificado.
2. Duração máxima, inatividade, renovação, revogação individual/global e auditoria de sessão.
3. Procedimento para alteração de e-mail, perda de acesso Google e conta Google já associada a outro usuário.

## Checklist mínimo de prova promovida

1. **Banco:** revision, roles/grants, ausência de `BYPASSRLS` na conexão tenant-facing, RLS smoke de dois tenants e backup/restore testado.
2. **Inngest:** funções sincronizadas, cron ativo somente no ambiente pretendido, política configurada de retry/concurrency, alerta e exercício de dead-letter/retry.
3. **Resend:** domínio e webhook verificados, assinatura validada, teste de aceitação, `delivered`, `failed` e `suppressed` com correlação local.
4. **R2:** buckets/credenciais, CORS de origem exata, PUT/HEAD real via browser, lifecycle de staging e exercício seguro de reconcile.
5. **OAuth:** redirect URIs promovidas, fluxo real com validação state/nonce, colisão de e-mail e logout/revogação local testados.

## Limites

Este relatório não escolhe TTL, retry, SLO, política de linking, retenção, responsáveis ou semântica de entrega. Essas são decisões humanas; as recomendações apenas delimitam os controles e provas que as fontes técnicas tornam necessários.

## Fontes primárias

[^neon-rls]: Neon, [Run RLS queries with Drizzle ORM](https://neon.com/docs/guides/rls-query-execution), documentação oficial, consultada em 2026-07-14 via Context7.
[^inngest-controls]: Inngest, [Flash sales and bursty workflows](https://github.com/inngest/website/blob/main/shared/Patterns/_patterns/flash-sales-and-bursty-workflows.mdx), fonte oficial, consultada em 2026-07-14 via Context7.
[^resend-idempotency]: Resend, [Send with Remix: idempotency](https://resend.com/docs/send-with-remix), documentação oficial, consultada em 2026-07-14 via Context7.
[^resend-delivered]: Resend, [Webhook `email.delivered`](https://resend.com/docs/webhooks/emails/delivered), documentação oficial, consultada em 2026-07-14 via Context7.
[^resend-failed]: Resend, [Webhook `email.failed`](https://resend.com/docs/webhooks/emails/failed), documentação oficial, consultada em 2026-07-14 via Context7.
[^resend-suppressed]: Resend, [Webhook `email.suppressed`](https://resend.com/docs/webhooks/emails/suppressed), documentação oficial, consultada em 2026-07-14 via Context7.
[^r2-cors]: Cloudflare, [Use CORS with a presigned URL](https://developers.cloudflare.com/r2/buckets/cors/), documentação oficial, consultada em 2026-07-14 via Context7.
[^r2-presigned]: Cloudflare, [Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/), documentação oficial, consultada em 2026-07-14 via Context7.
[^r2-lifecycle]: Cloudflare, [Object lifecycles](https://developers.cloudflare.com/r2/buckets/object-lifecycles/), documentação oficial, consultada em 2026-07-14 via Context7.
[^google-oidc]: Google for Developers, [OpenID Connect](https://developers.google.com/identity/protocols/oauth2/openid-connect), documentação oficial, consultada em 2026-07-14 via Context7.
[^better-auth-linking]: Better Auth, [Users and accounts](https://github.com/better-auth/better-auth/blob/v1.6.23/docs/content/docs/concepts/users-accounts.mdx), documentação oficial, versão `v1.6.23`, consultada em 2026-07-14 via Context7.
