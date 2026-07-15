# Observabilidade

O código inicializa Sentry somente quando o DSN correspondente está presente. Web e admin configuram inicialização para runtimes de servidor; o web também possui inicialização condicional no cliente. Logs do SDK, tracing e Session Replay estão desabilitados para evitar coleta de dados pessoais antes de uma política específica aprovada.

## Erros de requisição

Os hooks `onRequestError` encaminham somente um erro operacional allowlisted para captura e escrevem um objeto JSON com digest técnico, método HTTP e tipo de rota. A configuração do SDK desabilita `userInfo` e corpos HTTP; antes do envio, remove request, usuário, contexts, extras, tags e breadcrumbs e substitui mensagem/valores de exceção por um valor operacional fixo. Portanto, a aplicação não envia ao Sentry payload, headers, cookies, query string, caminho, mensagem original de erro ou identificação de usuário.

O rate limiter também emite captura para Sentry se o provedor falhar e houver DSN de servidor. Em produção, essa mesma falha é fail-closed para a requisição protegida; em desenvolvimento e teste, usa armazenamento local em memória.

## Sinais disponíveis

| Sinal | Fonte | Uso esperado |
| --- | --- | --- |
| Saúde do banco web | `GET /api/health` | Sonda de disponibilidade do web. |
| Saúde do runtime admin | `GET /api/health` do admin | Sonda de disponibilidade do admin. |
| Diagnóstico R2 | Handler interno autenticado | Diagnóstico operado, não endpoint público. |
| Eventos de audit/outbox/intake | Banco e consumidores | Rastrear mutações, entrega e reconciliação. |
| Erros Sentry e logs JSON | Instrumentação | Investigação por stack e identificadores técnicos, sem dados de request ou usuário. |

Não há dashboards, alertas ou retenção comprovados no repositório. A sanitização do código versionado não substitui a confirmação da configuração promovida e das regras de alerta no provedor antes de compor SLOs ou procedimentos de incidente.

## Falhas terminais de outbox

O dispatcher limita cada evento de outbox a cinco tentativas, com backoff exponencial e jitter determinístico por ID do evento. Ao esgotar esse limite, o estado permanece `dead_letter` para revisão no console interno e é emitido o sinal estruturado `outbox.dead_letter`. Esse sinal contém somente `eventId`, `correlationId`, `topic` e `eventType`; não inclui payload, headers, token ou mensagem original da falha.

O console interno permite visualizar eventos terminais, mas a entrega de alerta e a configuração de regra no Sentry continuam gates externos: devem ser comprovadas no ambiente promovido antes de sustentar um SLO ou release público.

Fontes: `apps/web/src/instrumentation.ts:register`, `apps/web/src/instrumentation.ts:onRequestError`, `apps/web/src/instrumentation-client.ts:onRouterTransitionStart`, `apps/admin/src/instrumentation.ts:register`, `apps/admin/src/instrumentation.ts:onRequestError`, `apps/web/src/lib/rate-limit.ts:checkRateLimit`, `apps/web/src/app/api/health/route.ts:GET`, `apps/admin/src/app/api/health/route.ts:GET`.
