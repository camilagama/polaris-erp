# Observabilidade

O código inicializa Sentry somente quando o DSN correspondente está presente. Web e admin configuram inicialização para runtimes de servidor; o web também possui inicialização condicional no cliente, com tracing e replay configurados no código.

## Erros de requisição

Os hooks `onRequestError` encaminham erros para captura e escrevem um objeto JSON em `console.error` com mensagem e metadados de rota/requisição. O código versionado não estabelece uma allowlist de campos nem uma camada explícita de redaction para esse log. Assim, payloads, headers e mensagens que possam conter dados pessoais devem ser tratados como risco operacional até haver política e verificação de sanitização.

O rate limiter também emite captura para Sentry se o provedor falhar e houver DSN de servidor. Em produção, essa mesma falha é fail-closed para a requisição protegida; em desenvolvimento e teste, usa armazenamento local em memória.

## Sinais disponíveis

| Sinal | Fonte | Uso esperado |
| --- | --- | --- |
| Saúde do banco web | `GET /api/health` | Sonda de disponibilidade do web. |
| Saúde do runtime admin | `GET /api/health` do admin | Sonda de disponibilidade do admin. |
| Diagnóstico R2 | Handler interno autenticado | Diagnóstico operado, não endpoint público. |
| Eventos de audit/outbox/intake | Banco e consumidores | Rastrear mutações, entrega e reconciliação. |
| Erros Sentry e logs JSON | Instrumentação | Investigação de falhas de request e infraestrutura. |

Não há dashboards, alertas, retenção ou cobertura de PII de logs comprovados no repositório. Devem ser confirmados diretamente nos provedores antes de compor SLOs ou procedimentos de incidente.

Fontes: `apps/web/src/instrumentation.ts:register`, `apps/web/src/instrumentation.ts:onRequestError`, `apps/web/src/instrumentation-client.ts:onRouterTransitionStart`, `apps/admin/src/instrumentation.ts:register`, `apps/admin/src/instrumentation.ts:onRequestError`, `apps/web/src/lib/rate-limit.ts:checkRateLimit`, `apps/web/src/app/api/health/route.ts:GET`, `apps/admin/src/app/api/health/route.ts:GET`.
