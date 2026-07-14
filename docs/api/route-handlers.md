# Route handlers

Os handlers vivem em `apps/web/src/app/api` e `apps/admin/src/app/api`. Esta é a superfície HTTP observada no repositório; não confirma rotas, proxies ou autenticação adicionais configurados fora do código versionado.

## Web

| Rota | Consumer e proteção | Validação | Efeito e respostas observadas |
| --- | --- | --- | --- |
| `GET /api/health` | Sondas de disponibilidade. Pública. | Nenhuma entrada. | Executa `checkDatabaseHealth`. Retorna o estado do banco e timestamp com `200`, ou `503` quando indisponível. |
| `/api/inngest` | Inngest. O adaptador `serve` expõe as funções registradas. | Processada pelo adaptador. | Aceita disparos e crons para outbox e reconciliação de imagens. `maxDuration` é 300 segundos. |
| `GET` e `POST /api/internal/health/r2` | Operação interna. Bearer token e limite de 10 requisições/minuto. | Token em `Authorization`. | Obtém diagnósticos do staging R2. Sem token: `401`; acima do limite: `429`; falha interna: `500`. |
| `GET` e `POST /api/internal/product-images/reconcile` | Operação interna. Bearer token e limite de 10 requisições/minuto. | Token em `Authorization`. | Executa `reconcileProductImages`. Sem token: `401`; limite: `429`; falha: `500`. |
| `POST /api/product-images/presign` | Sessão Better Auth, limites por IP (60/min) e usuário (120/min), depois `products:write`. | `productImageUploadRequestSchema`. | Cria chave de staging e URL pré-assinada; grava `product_image.presign_created`. Erros: `401`, `400`, `429` ou `500`. |
| `GET /api/product-images/[organizationId]/[productId]/[version]/[variant]` | Sessão e `canReadProductImage`. A negação é deliberadamente `404`. | `organizationId` e `productId` vêm da rota; `version` deve ser inteiro e `variant` é `detail` ou `table`. | Lê objeto R2, responde conteúdo privado com `ETag`, `Vary: Cookie` e pode responder `304`. Grava `product_image.viewed`. |
| `POST /api/webhooks/asaas`, `/woovi` e `/resend` | Provedores externos. Cada rota valida seu próprio cabeçalho de assinatura. | Corpo bruto, limite de tamanho e verificação específica do provedor. | Captura o recebimento em intake/outbox e faz a reconciliação descrita em [webhooks](./webhooks.md). |
| `/api/auth/[...all]` | Clientes de autenticação. | Delegada a `auth.handler`. | Better Auth atende o conjunto de rotas; detalhes de contrato pertencem à configuração do provedor. |
| `POST /api/auth/dev/bootstrap-session` | Somente fluxos locais/de testes; bloqueado em produção. | Segredo interno e precondições de ambiente. | Cria sessão de apoio para testes. Não é endpoint operacional público. |

`checkRateLimit` usa Upstash quando configurado. Em produção, ausência ou falha do provedor de rate limit nega a requisição; em desenvolvimento/teste há fallback local em memória. A identificação de IP considera os cabeçalhos de encaminhamento aceitos pelo código, portanto a implantação precisa preservar essa cadeia de confiança.

## Admin

| Rota | Consumer e proteção | Validação | Efeito e respostas observadas |
| --- | --- | --- | --- |
| `GET /api/health` | Sondas de disponibilidade. Pública no handler. | Nenhuma entrada. | Retorna a saúde do runtime do admin. |
| `POST /api/dev/bootstrap-platform-admin` | Apenas bootstrap de E2E local autorizado pela configuração. Bearer token obrigatório. | Payload Zod e equivalência do banco E2E esperada. | Cria ou reaproveita identidade/sessão de teste e grant de plataforma. Respostas observadas: `400`, `401`, `403`, `503` e `500` para falhas; não deve ser tratado como API pública. |

## Limites conhecidos

Os handlers internos com segredo usam comparação de token no processo da aplicação. Rotação, distribuição segura e controles de borda dependem da configuração de ambiente e plataforma, não demonstradas por estes arquivos. As rotas não publicam um contrato OpenAPI versionado.

Fontes: `apps/web/src/app/api/health/route.ts:GET`, `apps/web/src/app/api/inngest/route.ts:POST`, `apps/web/src/app/api/product-images/presign/route.ts:POST`, `apps/web/src/app/api/product-images/[organizationId]/[productId]/[version]/[variant]/route.ts:GET`, `apps/web/src/app/api/internal/health/r2/route.ts:GET`, `apps/web/src/app/api/internal/product-images/reconcile/route.ts:GET`, `apps/admin/src/app/api/health/route.ts:GET`, `apps/admin/src/app/api/dev/bootstrap-platform-admin/route.ts:POST`, `apps/web/src/lib/rate-limit.ts:checkRateLimit`.
