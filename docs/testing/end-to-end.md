# Testes end-to-end

Os testes E2E são Playwright e exercitam aplicações locais após build. O web usa porta 3001; o admin, 3002. A configuração habilita duas tentativas em CI e preserva trace/screenshot de falhas para diagnóstico.

## Evidências de falha na CI

Web e Admin produzem relatório HTML/JSON, trace e screenshot apenas para testes que falham; o CI envia os diretórios `playwright-report/` e `test-results/` em artefatos separados somente quando a etapa E2E correspondente falha. Cada artefato expira após 7 dias. Vídeo e logs genéricos do servidor permanecem desligados.

Traces incluem DOM, capturas de tela e dados de requisições/respostas. Use somente os bancos E2E não produtivos e fixtures sintéticas. Os artefatos ficam acessíveis a qualquer pessoa com leitura do repositório privado; não são storage público nem evidência durável de produção.

## Regressão visual

O conjunto inicial compara somente as telas de login sem sessão de Web e Admin. As duas telas usam conteúdo estático; dashboard, catálogo, vendas e console Admin ficam adiados até haver fixtures determinísticas para essas superfícies. Os testes visuais rodam apenas nos jobs E2E da CI, fixados em `ubuntu-24.04`, Chromium e Playwright resolvido pelo lockfile; cada app usa um worker. O teste define viewport, locale, fuso, tema e movimento reduzido; a captura espera as fontes e neutraliza a integração externa de Google One Tap.

O Playwright está configurado com `updateSnapshots: "none"`: execução normal nunca cria nem substitui baselines. Se um baseline estiver ausente, o teste anexa uma captura candidata ao artifact E2E de falha; se divergir, o Playwright também registra `actual` e `diff`. Para aceitar uma mudança visual intencional, revisar a captura candidata/diff, copiar a imagem escolhida para o diretório de snapshots do teste na branch e executar a CI novamente. Não gerar nem atualizar imagens no Windows local. Baselines e artifacts usam apenas telas de autenticação estáticas; nunca dados ou capturas de Production.

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
