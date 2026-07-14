# Pesquisa externa: identidade, e-mail, jobs, storage e banco

**Status:** rascunho de pesquisa, **não normativo**.  
**Consulta:** 2026-07-14.  
**Método:** documentação oficial consultada via Context7. Este documento distingue comportamento documentado do provider, regra de produto e evidência do ambiente promovido.

## Better Auth e Google OAuth

- Better Auth permite desabilitar totalmente o linking de contas ou somente o linking implícito por e-mail. Com `disableImplicitLinking`, um login OAuth com e-mail já existente e conta não vinculada é rejeitado.[^better-auth-linking]
- A sessão tem expiração, renovação configurável, armazenamento em banco e cache de cookie configuráveis; esses parâmetros não definem, por si, uma política de revogação do produto.[^better-auth-sessions]
- Tokens OAuth podem ser criptografados antes de serem persistidos.[^better-auth-account]

**Aplicação ao Hub Imports:** o repositório mantém linking implícito para Google e não define revogação/auditoria completa de sessão. A política de colisão, recuperação e duração de sessão continua decisão humana. A documentação não prova o comportamento do Google nem a configuração efetivamente promovida.

## Resend e lifecycle de e-mail

- Resend recomenda chave de idempotência para evitar duplicidade em retry; a chave é válida por 24 horas e deve identificar a requisição de forma única.[^resend-idempotency]
- Eventos `email.failed` e `email.suppressed` trazem o identificador da mensagem e motivo/estado relevante.[^resend-failed][^resend-suppressed]
- Tags podem relacionar uma mensagem ao tenant em uma conta compartilhada.[^resend-tags]

**Aplicação ao Hub Imports:** o envio de boas-vindas usa chave idempotente e registra eventos recebidos, mas os webhooks não atualizam o lifecycle de `email_messages`. A confirmação de envio da API não prova entrega ao destinatário. A regra aprovada DEC-BR-050 exige definir transições, reenvio, destinatário e retenção sem usar eventos de provider como equivalentes a acesso ou billing.

## Inngest e recuperação de jobs

- Funções podem definir retries, idempotência, debounce, concorrência e throttle; esses controles devem ser configurados para a unidade de negócio adequada.[^inngest-flow-control]
- Steps são duráveis e retriáveis separadamente; cron usa o mesmo mecanismo de observabilidade e retry de gatilhos por evento.[^inngest-durable][^inngest-cron]

**Aplicação ao Hub Imports:** o dispatch de outbox e o reconcile diário de imagens usam steps/cron, mas não declaram explicitamente concorrência, retries ou chave de idempotência na definição da função. A idempotência de domínio continua responsabilidade do banco e das transições persistidas. É necessário definir política de tentativa, esgotamento e revisão humana para cumprir DEC-BR-034.

## Cloudflare R2 e imagens

- R2 é compatível com S3 e permite URLs pré-assinadas para `PUT` com `ContentType` restrito e expiração definida.[^r2-presigned]
- Upload de navegador requer CORS; objetos antigos podem ser removidos por lifecycle rules.[^r2-get-started]
- Operações de leitura de metadados, leitura e remoção fazem parte da API compatível com S3.[^r2-operations]

**Aplicação ao Hub Imports:** há presign de cinco minutos, staging separado, checagem de prefixo/tamanho/tipo e reconcile de órfãos. O código ainda aceita 10 MiB, enquanto DEC-BR-058 exige 5 MiB; só há uma imagem por produto no modelo atual. A política de retenção/purge continua dependente da tabela gateada em DEC-BR-040 e da decisão DEC-BR-051. Nenhuma consulta local prova CORS, lifecycle, credenciais ou conectividade do bucket promovido.

## Neon/Postgres e prova de isolamento

- RLS depende de privilégios/grants e da role de conexão; uma role com `BYPASSRLS` não é adequada para provar a política de usuário final.[^neon-rls]
- Migrations são o veículo para criar tabelas, políticas RLS e grants, mas código versionado não demonstra que elas foram aplicadas ao ambiente alvo.[^neon-migrations]

**Aplicação ao Hub Imports:** schema, migrations e testes locais foram lidos; não havia conexão exportada nem MCP Neon para consultar roles, políticas, índices e migrations da base promovida. Isso permanece um gate de verificação operacional, não uma lacuna que possa ser resolvida por inferência.

## Fontes primárias

[^better-auth-linking]: Better Auth, [Users and accounts: account linking](https://www.better-auth.com/docs/concepts/users-accounts), documentação oficial, consultada em 2026-07-14.
[^better-auth-sessions]: Better Auth, [Options: session](https://www.better-auth.com/docs/reference/options), documentação oficial, consultada em 2026-07-14.
[^better-auth-account]: Better Auth, [Options: account](https://www.better-auth.com/docs/reference/options), documentação oficial, consultada em 2026-07-14.
[^resend-idempotency]: Resend, [Send emails with Bun: idempotency](https://resend.com/docs/send-with-bun), documentação oficial, consultada em 2026-07-14.
[^resend-failed]: Resend, [Webhook `email.failed`](https://resend.com/docs/webhooks/emails/failed), documentação oficial, consultada em 2026-07-14.
[^resend-suppressed]: Resend, [Webhook `email.suppressed`](https://resend.com/docs/webhooks/emails/suppressed), documentação oficial, consultada em 2026-07-14.
[^resend-tags]: Resend, [Setting up Resend for multi-tenants](https://resend.com/docs/knowledge-base/setting-up-resend-for-multi-tenants), documentação oficial, consultada em 2026-07-14.
[^inngest-flow-control]: Inngest, [Flash sales and bursty workflows](https://www.inngest.com/docs/patterns/flash-sales-and-bursty-workflows), documentação oficial, consultada em 2026-07-14.
[^inngest-durable]: Inngest, [Production AI image generation pipeline](https://www.inngest.com/blog/how-to-build-a-production-ai-image-generation-pipeline-with-fal-ai-and-inngest), documentação oficial, consultada em 2026-07-14.
[^inngest-cron]: Inngest, [Reliable scheduling systems](https://www.inngest.com/docs/patterns/reliable-scheduling-systems), documentação oficial, consultada em 2026-07-14.
[^r2-presigned]: Cloudflare, [Generate presigned URLs with AWS SDK for JavaScript](https://developers.cloudflare.com/r2/api/s3/presigned-urls/), documentação oficial, consultada em 2026-07-14.
[^r2-get-started]: Cloudflare, [R2 S3 API](https://developers.cloudflare.com/r2/get-started/s3/), documentação oficial, consultada em 2026-07-14.
[^r2-operations]: Cloudflare, [Common S3 operations for R2](https://developers.cloudflare.com/r2/examples/aws/boto3/), documentação oficial, consultada em 2026-07-14.
[^neon-rls]: Neon, [Serverless driver: JWT claims and RLS](https://neon.com/docs/serverless/serverless-driver), documentação oficial, consultada em 2026-07-14.
[^neon-migrations]: Neon, [Run database migrations](https://neon.com/docs/data-api/demo), documentação oficial, consultada em 2026-07-14.
