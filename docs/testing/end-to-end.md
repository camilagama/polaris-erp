# Testes end-to-end

Os testes E2E são Playwright e exercitam aplicações locais após build. O web usa porta 3001; o admin, 3002. A configuração habilita duas tentativas em CI e trace apenas na primeira repetição para diagnóstico.

## Cobertura observada

| Aplicação | Suites | Fluxo exercitado |
| --- | --- | --- |
| Web | `shell.e2e.ts` | Navegação e shell autenticado. |
| Web | `operations.e2e.ts` | Operações de aplicação e fluxos autenticados. |
| Web | `product-images-api.e2e.ts` | Contrato do endpoint de imagens de produto. |
| Admin | `admin-access.e2e.ts` | Controle de acesso e navegação administrativa. |

Os helpers E2E criam o contexto necessário para os fluxos locais. Os endpoints de bootstrap exigem segredo interno e são bloqueados em produção. A única exceção é `isLocalProductionE2eBootstrap`: exige a flag de Playwright, hostname loopback e `DATABASE_URL` igual ao banco E2E; ela também exclui explicitamente os ambientes Vercel preview e produção. Portanto não habilita bootstrap em Vercel produção.

## Limites de interpretação

Essas suites verificam comportamento usuário-aplicação no ambiente controlado. Elas não demonstram, por si, RLS contra banco de produção, resolução de DNS, e-mail entregue, webhook assinado por provedor, cron Inngest executado ou objeto R2 persistido remotamente. Essas condições exigem smoke/observação do ambiente alvo.

Para reproduzir localmente, use os scripts E2E declarados no `package.json` e a configuração de ambiente de teste correspondente. Não use banco compartilhado nem valores de produção: os testes fazem mutações e pressupõem isolamento.

Fontes: `apps/web/tests/e2e/helpers.ts:login`, `apps/web/tests/e2e/shell.e2e.ts`, `apps/web/tests/e2e/operations.e2e.ts`, `apps/web/tests/e2e/product-images-api.e2e.ts`, `apps/admin/tests/e2e/admin-access.e2e.ts`, `apps/web/src/app/api/auth/dev/bootstrap-session/route.ts:isLocalProductionE2eBootstrap`, `apps/admin/src/app/api/dev/bootstrap-platform-admin/route.ts:isLocalProductionE2eBootstrap`, `apps/web/playwright.config.ts:default`, `apps/admin/playwright.config.ts:default`, `package.json:scripts.test:e2e`.
