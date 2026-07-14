# Revisão profunda do codebase e backlog de PRs

Data: 2026-07-13  
Fuso: America/Sao_Paulo  
Branch revisada: `main`  
Commit de referência: `d161079`  
Escopo: monorepo completo (`apps/*`, `packages/*`, `scripts/*`, CI, migrations, documentação e histórico recente)

## Resultado executivo

O projeto tem uma base mais madura do que uma leitura superficial sugere: os módulos compartilhados de banco, autenticação, eventos, billing e administração já existem; o isolamento tenant foi modelado com RLS; os builds e 572 testes unitários passaram; e os fluxos principais têm boa cobertura de regras de negócio.

Ainda não está pronto para promoção operacional sem correções. Três bloqueadores objetivos devem preceder novas features:

1. O admin valida o grant na aplicação, mas várias consultas e mutações não entram no contexto RLS de platform admin. Com a role runtime recomendada, sem `BYPASSRLS`, diretório, dashboard tenant e mutações administrativas podem retornar vazio ou falhar.
2. O job manual `production-preflight` fornece `SUPPORT_EMAIL`, porém o script adaptador descarta a variável antes da validação. O mesmo ocorre com `DATABASE_POOL_MAX`. O gate falha mesmo com configuração externa correta.
3. `bun run knip`, executado pela CI, termina com código 1 no commit revisado. O baseline da CI já está vermelho.

Também foram confirmados riscos relevantes em idempotência de webhooks financeiros, materialização Woovi, classificação de erros Resend, rate limiting em falha do Upstash, limite real de bytes de webhooks e consultas históricas sem agregação.

Recomendação de sequência: PR-001, PR-002 e PR-003 primeiro; depois PR-004 a PR-009; performance e refinamentos somente após os gates voltarem a representar o comportamento real.

## Regra obrigatória de manutenção deste relatório

Este arquivo é a fonte de status do backlog abaixo. Sempre que uma PR for implementada:

1. Antes da primeira alteração, trocar `TODO` por `IN PROGRESS` na linha da PR.
2. Ao concluir, trocar para `DONE` somente depois de todos os critérios de aceite e verificações passarem.
3. Adicionar uma entrada no `Registro de implementação` com data, commit, arquivos, comandos, resultado decisivo e risco residual.
4. Usar `BLOCKED: <motivo>` quando uma dependência externa impedir avanço, `DEFERRED: <motivo>` quando houver decisão explícita de adiar e `REJECTED: <motivo>` quando a abordagem deixar de ser válida.
5. Se o codebase tiver mudado nos arquivos de escopo desde `d161079`, executar o drift check indicado na PR e revalidar as evidências. Não aplicar mecanicamente um plano antigo.

Status permitidos: `TODO`, `IN PROGRESS`, `DONE`, `BLOCKED`, `DEFERRED`, `REJECTED`.

## Evidências de verificação

Executado localmente no commit `d161079`:

- `bun x ultracite check` => código 0; 488 arquivos verificados, nenhuma correção.
- TypeScript em web, admin, auth, billing, db, emails, events, platform, platform-auth e UI => código 0 em todos.
- Testes web => 119 arquivos, 484 testes aprovados.
- Testes admin => 6 arquivos, 18 testes aprovados.
- Testes de pacotes => auth 12, billing 7, db 3, events 8, platform 30, platform-auth 6 e UI 4; todos aprovados.
- Total observado => 572 testes aprovados.
- `bun run build` => build de produção web aprovado; 23 rotas processadas.
- `bun run build:admin` => build de produção admin aprovado; 12 rotas processadas.
- `bun run knip` => código 1; 4 arquivos, 39 dependências, 5 exports e 3 tipos reportados sem uso.
- `bun audit --json` => 14 advisories; os caminhos e a severidade estão registrados no baseline temporário do projeto.
- `bun run audit:baseline` => código 0; os 14 advisories atuais estão aceitos até a próxima revisão documentada.
- Varredura de segredos rastreados => nenhum segredo real confirmado; somente `.env.example` está versionado. `.env.local` permaneceu fora da inspeção de conteúdo.

Não executado:

- E2E web/admin, pois exigem banco isolado configurado e o contrato atual de configuração é um dos achados.
- `db:smoke:rls` em banco externo; a revisão não recebeu autorização para operar infraestrutura compartilhada.
- `prod:preflight` com credenciais de produção.
- `EXPLAIN ANALYZE` com dataset representativo.
- Smokes de Vercel, Neon, R2, Upstash, Resend, Inngest, Woovi ou Asaas.
- Apoio visual ou abertura de URL local, conforme instrução do projeto.

Avisos não decisivos observados: warnings de `act(...)` em testes React e aviso futuro do driver PostgreSQL sobre semântica de `sslmode`. Os builds passaram; produção já documenta `sslmode=verify-full`.

## Cobertura da revisão

Foram revisados:

- intenção do produto, roadmap, memória e relatórios arquiteturais anteriores;
- estrutura dos dois apps e nove pacotes internos;
- migrations, schema, contextos RLS e scripts operacionais;
- autenticação, autorização administrativa, billing e webhooks;
- outbox, idempotência, retries e integrações externas;
- analytics, listagens, carregamento de páginas e consultas de histórico;
- manifests, Turbo, Knip, CI, builds, testes e documentação;
- 40 commits recentes e os arquivos com maior churn.

Hotspots históricos dos últimos 40 commits: `.env.example` (14 alterações), `.github/workflows/ci.yml` (12), `package.json` (12), `turbo.json` (10), `apps/admin/src/app/page.tsx` (9), `apps/web/src/lib/env.ts` (9) e `apps/web/src/lib/app-session.ts` (7). Os achados de preflight, manifests, documentação e admin estão concentrados justamente nas áreas com maior churn.

## Leitura arquitetural

O desenho atual tem bons módulos: `@polaris/db`, `@polaris/auth`, `@polaris/events`, `@polaris/platform`, `@polaris/platform-auth` e `@polaris/billing` concentram comportamento e oferecem interfaces menores do que suas implementações. Há depth e leverage reais nesses limites.

As seams relevantes são o contexto transacional de banco, a sessão de autenticação, o dispatcher de eventos e os providers externos. O adapter PostgreSQL é o único adapter real para persistência. Por isso, esta revisão não recomenda ports ou repositórios genéricos: seriam seams hipotéticas, com uma única implementação, e diminuiriam locality.

Pelo deletion test:

- os wrappers temporários em `apps/web/src/db/*` são shallow: removê-los não redistribui complexidade útil;
- exports sem caller reportados pelo Knip são candidatos à remoção, não novas interfaces;
- `create-sale-dialog.tsx` é grande, mas deep: concentra estado, cálculos e submissão; dividi-lo só por tamanho espalharia comportamento;
- um app shell compartilhado continua rejeitado: autenticação e navegação de web/admin têm responsabilidades diferentes;
- suporte E2E compartilhado deve ser um módulo in-process pequeno, não uma nova port com adapters artificiais.

## Achados confirmados

### F-001 — Contrato RLS do admin está incompleto

Severidade: crítica  
Confiança: alta  
Impacto: operabilidade e integridade administrativa

Evidência:

- `packages/db/src/migrations/20260707205000_rls_tenant_isolation.sql:1-110` força RLS tenant em `organization`, `member`, `audit_events`, `products`, `sales` e demais tabelas operacionais.
- `packages/db/src/migrations/20260710041000_billing_rls_platform_admin.sql:76-78` concede ao contexto de platform admin somente `SELECT` em `organization`; as tabelas tenant usadas pelo diretório continuam sem policy administrativa.
- `packages/platform/src/platform-dashboard.ts:41-80` e `packages/platform/src/platform-directory.ts:150-238` consultam tabelas tenant sem `withPlatformAdminContext`.
- `apps/admin/src/app/page.tsx:38-39` obtém o contexto, mas chama `getPlatformDashboardData()` sem passá-lo.
- `apps/admin/src/app/organizations/page.tsx:31-35` valida o admin e chama `listPlatformOrganizations()` sem contexto.
- `packages/platform/src/platform-organization-mutations.ts:62-73` atualiza `organization` sem contexto; a policy administrativa atual é apenas de leitura.
- `packages/platform/src/platform-billing.ts:175-178` contextualiza a leitura, mas `:209-225` muta billing sem o mesmo contexto.
- `docs/runbooks/deploy-vercel.md:58,92` exige role runtime sem `BYPASSRLS`.

Consequência: no ambiente recomendado, o dashboard pode combinar contagens globais de tabelas sem RLS com zeros de tabelas tenant, o diretório pode ficar vazio e suspensões/reativações ou alterações manuais de billing podem não encontrar linhas. Os testes atuais usam doubles de query e não executam as policies.

### F-002 — O preflight de produção descarta configuração válida

Severidade: crítica para o processo de promoção  
Confiança: alta  
Impacto: gate operacional sempre vermelho

Evidência:

- `apps/web/src/ops/production-preflight.ts:6-36` inclui `SUPPORT_EMAIL` e `DATABASE_POOL_MAX` no contrato.
- `apps/web/src/ops/production-preflight.ts:93-112` exige `SUPPORT_EMAIL`.
- `scripts/check-production-readiness.ts:6-34` não encaminha nenhuma das duas variáveis.
- `.github/workflows/ci.yml:261-290` fornece `SUPPORT_EMAIL`, mas o adaptador o elimina.

Consequência: o job manual pode falhar por variável ausente mesmo quando GitHub/Vercel estão corretamente configurados; `DATABASE_POOL_MAX` também nunca é validado pelo caminho real.

### F-003 — O gate Knip da CI já falha

Severidade: alta  
Confiança: alta  
Impacto: CI e confiança no grafo de workspaces

Evidência:

- `.github/workflows/ci.yml:47-48` executa `bun run knip`.
- Execução local terminou com código 1.
- `knip.config.ts:18-64` omite billing, emails e UI.
- `packages/ui/package.json` possui testes e configuração Vitest no repositório, mas não expõe scripts `test` ou `typecheck`.
- O relatório inclui 4 arquivos, 39 dependências, 5 exports e 3 tipos. Parte é real, parte é configuração/ownership incorreto.

Consequência: PRs falham no gate e sinais reais, como wrappers DB sem caller e exports shallow, ficam misturados com falsos positivos causados pelos manifests.

### F-004 — Duplicatas de webhook financeiro ainda executam efeitos

Severidade: alta  
Confiança: alta  
Impacto: integridade financeira

Evidência:

- `packages/events/src/index.ts:107-126` usa `onConflictDoNothing`, retorna `void` e não informa se o evento foi reivindicado.
- `apps/web/src/integrations/webhooks/intake.ts:39-65` continua para enqueue e reconciliação mesmo quando a captura é duplicada.
- `apps/web/src/app/api/webhooks/asaas/route.test.ts:114-145` e o teste Woovi equivalente esperam duas reconciliações da mesma entrega.
- `apps/web/src/integrations/asaas/billing-reconciliation.ts:248-320` pode fazer duas transações concorrentes inserirem invoices antes de disputar o link único; a invoice da transação perdedora fica órfã.
- `docs/product/roadmap.md:41-44` define que webhook duplicado não deve alterar estado duas vezes.

Consequência: retries sequenciais repetem trabalho; concorrência Asaas pode deixar invoice sem link, contaminando totais e investigação.

### F-005 — Woovi pode marcar cobrança como processada sem invoice nem tentativa

Severidade: alta  
Confiança: alta  
Impacto: histórico financeiro incompleto

Evidência:

- `apps/web/src/integrations/woovi/billing-reconciliation.ts:105-135` cria link sem `billing_invoice_id`.
- `:178-184` usa `entityType: "invoice"`, mas ainda só liga a subscription.
- `:187-218` insere tentativa apenas se já existir alguma invoice e retorna `processed` mesmo quando o `INSERT ... SELECT` afeta zero linhas.
- `packages/db/src/schema.ts:603-605` exige `billing_invoice_id` na tentativa.

Consequência: eventos `PIX_AUTOMATIC_COBR*` podem desaparecer do histórico financeiro sem retry ou revisão visível.

### F-006 — Resend mistura assinatura inválida com falha operacional

Severidade: alta  
Confiança: alta  
Impacto: perda e diagnóstico incorreto de eventos

Evidência:

- `apps/web/src/integrations/resend/webhook.ts:56-83` envolve verificação, intake e persistência no mesmo `try/catch`.
- Qualquer falha de banco retorna `400 Invalid Resend webhook signature`.
- O fluxo não chama `markWebhookIntakeProcessed`, ao contrário de Asaas e Woovi.

Consequência: assinatura válida durante indisponibilidade do banco recebe resposta não retriable e o registro de intake pode permanecer em `received` mesmo após processamento.

### F-007 — Limite de webhooks confia apenas em `Content-Length`

Severidade: alta  
Confiança: alta  
Impacto: memória, CPU e custo

Evidência:

- `apps/web/src/integrations/webhooks/request-limits.ts:3-15` aceita corpo sem header ou com header inválido.
- Woovi e Resend chamam `request.text()` antes de autenticar o conteúdo; Asaas também lê sem limite real quando o header falta.

Consequência: transferência chunked ou header omitido contorna o teto de 256 KiB e força leitura integral de request não autenticada.

### F-008 — Rate limiting distribuído falha aberto durante indisponibilidade

Severidade: alta  
Confiança: alta  
Impacto: proteção de endpoints sensíveis

Evidência:

- `apps/web/src/lib/rate-limit.ts:137-140` converte falha do Upstash em fallback local.
- `packages/platform-auth/src/admin-rate-limit.ts:147-150` repete a política.
- Os Maps locais são por processo; em serverless não representam limite global.
- `apps/web/src/lib/rate-limit.test.ts:51-67` atualmente consagra fallback local até em produção.

Consequência: durante timeout/falha do Redis, login, upload e mutações administrativas podem receber limite por instância sem alerta.

### F-009 — Invariantes de banco, grants e outbox são testados por texto ou mocks

Severidade: alta  
Confiança: alta  
Impacto: segurança e durabilidade

Evidência:

- `apps/web/src/db/rls-tenant-isolation.test.ts:57` e testes de invariantes procuram strings em SQL/migrations.
- `packages/platform-auth/src/platform-admin-auth.test.ts:25` devolve rows já filtradas; não executa os filtros de `admin-guard.ts:96`.
- `packages/events/src/event-foundation.test.ts:87,159` roteiriza respostas e conta chamadas, sem observar estado persistido ou claims concorrentes.
- `apps/web/src/lib/admin-app-protection.test.ts:149,167` verifica strings em actions administrativas.

Consequência: policy inválida, filtro removido, claim concorrente ou guard mal posicionado pode manter a suíte verde.

### F-010 — Consultas administrativas multiplicam cardinalidades

Severidade: média/alta  
Confiança: alta  
Impacto: latência do admin

Evidência:

- `packages/platform/src/platform-directory.ts:157-176` junta organização, membros, produtos e vendas antes de `count(distinct ...)`.
- `:267-284` junta usuários, memberships, sessões e contas.
- O `limit 50` é aplicado depois da agregação.

Consequência: o banco processa `membros × produtos × vendas` e `memberships × sessões × contas` para produzir poucos contadores.

### F-011 — Analytics transferem históricos integrais

Severidade: média/alta  
Confiança: alta  
Impacto: latência, memória e egress do banco

Evidência:

- Vendas: `apps/web/src/features/sales/date-range.ts:69-92` usa all-time por padrão; `server.ts:76-151` lê todas as vendas e itens e agrega em memória.
- Produtos: `apps/web/src/features/products/server.ts:47-130` lê todo inventário e todas as entradas; a página `produtos/(catalog)/page.tsx:16-30` aguarda quatro leituras independentes em sequência.
- Detalhe do produto: `detail-page.ts:26-42` busca histórico limitado e uma segunda consulta de métricas ilimitada.
- Dashboard: `apps/web/src/features/dashboard/server.ts:231-261` transfere vendas de 18 meses para gerar células diárias.

Consequência: o custo cresce com o histórico do tenant, embora as saídas sejam agregados ou páginas pequenas.

### F-012 — Contrato E2E está duplicado e contraditório

Severidade: média  
Confiança: alta  
Impacto: confiabilidade do E2E e locality

Evidência:

- `apps/admin/playwright.config.ts:3` importa implementação interna de `apps/web/src`.
- Admin duplica parser de cookie existente nos helpers web.
- `scripts/check-e2e-db-schema.ts:17-25` sempre exige banco E2E diferente do runtime.
- Configs/docs ainda mencionam `ALLOW_E2E_SHARED_DATABASE`; esse caminho não ultrapassa o script inicial.
- O carregamento de `.env.local` no script pode sobrepor env explícita do processo.

Consequência: os apps têm uma seam não declarada, e a documentação oferece um modo de execução que o comando real bloqueia.

### F-013 — Documentação e artefatos gerados divergiram do runtime

Severidade: média  
Confiança: alta  
Impacto: operação e manutenção

Evidência:

- README afirma que onboarding pede nome, mas `completeOnboardingAction` ignora o formulário e cria a organização sem nome fornecido.
- README diz que billing está fora do sprint, embora `/billing-required` esteja ativo.
- README e runbook referenciam caminhos antigos/inexistentes para deploy, ambientes e R2.
- `aidd_docs/production-closed-test.md` usa `R2_BUCKET_PUBLIC`; código e `.env.example` usam `R2_BUCKET_FINAL`.
- `docs/runbooks/deploy-vercel.md` mistura `E2E_DATABASE_URL` com o secret específico `ADMIN_E2E_DATABASE_URL` da CI.
- `.gitignore` ignora Turbo na raiz e em apps, mas 13 logs em `packages/*/.turbo` estão rastreados e sujam o worktree após testes.

### F-014 — Advisories permanecem aceitos temporariamente

Severidade: risco aceito  
Confiança: alta sobre a presença, não sobre explorabilidade

Evidência:

- `bun audit --json` reportou 14 advisories.
- O baseline documenta revisão até 2026-08-10 e exige atualização/sign-off antes de lançamento pago.
- Vite está no caminho de teste; fast-uri aparece em build/Sentry; defu está no caminho transitivo de Better Auth. Não foi demonstrado exploit alcançável no runtime.

Consequência: não é incidente confirmado, mas o aceite expira e precisa de nova decisão baseada em upgrades e testes.

### F-015 — Outbox não recupera claim abandonado

Severidade atual: baixa; futura: alta  
Confiança: alta  
Impacto: durabilidade futura

Evidência:

- `packages/events/src/index.ts:262-277` muda `pending` para `processing` sem lease.
- `:295-352` depende do worker ativo para finalizar.
- `:378-390` permite retry manual apenas de `failed`/`dead_letter`.
- Não há producers `pending` nem dispatcher registrado no runtime atual; os webhooks usam status `observed`.

Consequência: o defeito fica latente até o primeiro dispatcher real. Deve ser corrigido antes dessa ativação, não tratado como incidente ativo hoje.

## Backlog de PRs

### Índice e status

| PR | Título | Prioridade | Esforço | Dependência | Status |
| --- | --- | --- | --- | --- | --- |
| PR-001 | Restaurar o contrato RLS do admin | P0 | L | nenhuma | TODO |
| PR-002 | Corrigir o adaptador do preflight de produção | P0 | S | nenhuma | TODO |
| PR-003 | Restaurar higiene de workspaces, Knip e gates do UI | P0 | M | nenhuma | TODO |
| PR-004 | Reivindicar webhook financeiro antes da reconciliação | P1 | M | PR-008 recomendada | TODO |
| PR-005 | Materializar invoices e tentativas Woovi | P1 | M | PR-004 | TODO |
| PR-006 | Endurecer ingress de webhooks e semântica Resend | P1 | M | PR-004 | TODO |
| PR-007 | Falhar fechado no rate limiter distribuído | P1 | S | nenhuma | TODO |
| PR-008 | Criar harness PostgreSQL comportamental | P1 | L | PR-003 | TODO |
| PR-009 | Cobrir grants e actions administrativas por comportamento | P1 | M | PR-001, PR-008 | TODO |
| PR-010 | Adicionar lease e recuperação ao outbox | P2 | M | PR-008 | DEFERRED: executar antes do primeiro dispatcher pending |
| PR-011 | Pré-agregar o diretório administrativo | P1 | M | PR-001 | TODO |
| PR-012 | Agregar vendas e contribution graph no banco | P1 | M | nenhuma | TODO |
| PR-013 | Agregar analytics de produto e remover waterfalls | P1 | M | nenhuma | TODO |
| PR-014 | Unificar suporte E2E e contrato de banco isolado | P2 | M | PR-003 | TODO |
| PR-015 | Alinhar README, runbooks, roadmap e envs | P1 | S | PR-001, PR-002, PR-014 | TODO |
| PR-016 | Revisar e reduzir advisories aceitos | P1 | M | PR-003 | TODO |
| PR-017 | Medir e lazy-load diálogos pesados | P3 | M | nenhuma | BLOCKED: requer baseline de bundle |

### PR-001 — Restaurar o contrato RLS do admin

- Status: `TODO`
- Categoria: bug, segurança, migration
- Branch sugerida: `codex/pr-001-platform-admin-rls`
- Risco: alto
- Drift check: `git diff --stat d161079..HEAD -- packages/db/src/migrations packages/db/src/tenant-context.ts packages/platform/src apps/admin/src scripts/smoke-rls-runtime.cjs`

Objetivo: toda leitura/mutação administrativa deve ocorrer na mesma transação que estabelece `app.platform_admin_id`, e as policies devem permitir somente as operações administrativas necessárias.

Escopo:

- nova migration em `packages/db/src/migrations/`;
- `packages/db/src/tenant-context.ts`;
- dashboard, directory, billing e organization mutations em `packages/platform/src/`;
- callers em `apps/admin/src/app/`;
- `scripts/smoke-rls-runtime.cjs` e testes focados.

Passos:

1. Inventariar por tabela as operações reais do admin: select global, update de status e update manual de subscription. Não conceder `ALL` por conveniência.
2. Adicionar policies específicas para contexto de platform admin. Preservar isolamento tenant quando o contexto não estiver presente.
3. Expor interfaces `...ForAdmin(platformAdminId, ...)` no módulo platform, ou exigir o contexto como argumento nas interfaces existentes. O caller não deve conseguir esquecer a transação.
4. Migrar dashboard, diretório, detalhe, billing e mutações para essas interfaces.
5. Estender o smoke RLS: sem contexto => zero/negado; tenant => apenas próprio tenant; platform admin válido => leituras globais e somente mutações previstas; cross-tenant tenant => negado.
6. Adicionar teste de regressão que execute a migration e as queries com role sem `BYPASSRLS`.

Critérios de aceite:

- admin não usa `DATABASE_URL_DIRECT` nem role owner;
- diretório, dashboard e mutações funcionam com role runtime;
- tenant comum não ganha leitura global;
- policies não aceitam contexto vazio;
- `bun run test:all`, `bun run typecheck:all`, `bun run build:admin` e `bun run db:smoke:rls` passam no ambiente isolado.

STOP: interromper se a correção exigir `BYPASSRLS`, reutilizar a role de migrations no runtime ou conceder escrita global além das duas mutações documentadas.

### PR-002 — Corrigir o adaptador do preflight de produção

- Status: `TODO`
- Categoria: bug, operação
- Branch sugerida: `codex/pr-002-production-preflight-adapter`
- Risco: baixo
- Drift check: `git diff --stat d161079..HEAD -- scripts/check-production-readiness.ts apps/web/src/ops/production-preflight.ts apps/web/src/ops/production-preflight.test.ts .github/workflows/ci.yml`

Objetivo: o script deve encaminhar integralmente o contrato tipado da validação.

Passos:

1. Adicionar `SUPPORT_EMAIL` e `DATABASE_POOL_MAX` ao objeto do adaptador.
2. Criar teste do entrypoint, não apenas da função pura, com env mínimo válido e caso de pool inválido.
3. Verificar que CI, `.env.example` e runbook usam os mesmos nomes.

Critérios de aceite:

- um ambiente mínimo válido imprime `production-preflight-ok` e sai 0;
- ausência de `SUPPORT_EMAIL` e pool inválido falham com mensagem específica;
- nenhum valor de segredo aparece no output;
- teste focado, `bun run typecheck` e `bun x ultracite check` passam.

STOP: não afrouxar a lista obrigatória para fazer o job passar.

### PR-003 — Restaurar higiene de workspaces, Knip e gates do UI

- Status: `TODO`
- Categoria: CI, DX, arquitetura
- Branch sugerida: `codex/pr-003-workspace-hygiene`
- Risco: médio
- Drift check: `git diff --stat d161079..HEAD -- package.json bun.lock knip.config.ts apps/*/package.json packages/*/package.json packages/ui apps/web/src/db .gitignore packages/*/.turbo`

Objetivo: `bun run knip` deve voltar a ser um gate confiável, e cada módulo deve declarar seu próprio grafo e verificações.

Passos:

1. Incluir todos os workspaces no Knip, com entradas reais.
2. Mover dependências runtime para o workspace consumidor; manter tooling verdadeiramente compartilhado na raiz.
3. Adicionar `test` e `typecheck` ao UI; provar execução via Turbo.
4. Classificar cada ocorrência Knip. Remover somente exports sem caller confirmados e aliases duplicados. Confirmar uso operacional dos scripts antes de removê-los.
5. Aplicar o deletion test aos wrappers `apps/web/src/db/*`; mover testes de `tenant-context` para `packages/db` e apagar wrappers sem caller.
6. Ignorar `/packages/*/.turbo/` e remover os 13 logs gerados do índice, sem apagar artefatos fora do workspace.
7. Eliminar execução duplicada do Ultracite na CI somente depois de provar que o comando raiz cobre web e admin.

Critérios de aceite:

- `bun run knip` sai 0 sem ignores genéricos;
- `bun run test:all` inclui os 4 testes UI;
- `bun run typecheck:all` inclui UI;
- `bun install --frozen-lockfile`, `bun run check:all`, `bun run test:all`, `bun run typecheck:all` e `bun run build:all` passam;
- executar testes não modifica arquivos rastreados em `.turbo`.

STOP: não remover script operacional só porque Knip não detecta caller; não adicionar ignore amplo para silenciar um workspace inteiro.

### PR-004 — Reivindicar webhook financeiro antes da reconciliação

- Status: `TODO`
- Categoria: bug, billing
- Branch sugerida: `codex/pr-004-webhook-claim`
- Risco: médio
- Drift check: `git diff --stat d161079..HEAD -- packages/events/src apps/web/src/integrations/webhooks apps/web/src/integrations/asaas apps/web/src/integrations/woovi apps/web/src/app/api/webhooks`

Objetivo: somente a primeira entrega válida de um evento financeiro executa reconciliação.

Passos:

1. Fazer `captureWebhookEvent`/intake retornar `claimed | duplicate` de forma atômica.
2. Em duplicata já processada, responder sucesso sem reconciliar novamente. Definir explicitamente o comportamento para evento anteriormente falho.
3. Tornar criação de invoice Asaas e disputa do provider link uma única operação canônica; a transação perdedora deve reutilizar a invoice vencedora, não criar órfã.
4. Trocar os testes atuais que esperam duas reconciliações por testes de efeito único.
5. Adicionar teste concorrente real com duas conexões no harness PostgreSQL.

Critérios de aceite:

- duas entregas sequenciais => uma reconciliação;
- duas entregas concorrentes => uma invoice, um link e no máximo uma tentativa por provider event;
- retry de evento falho segue política explícita;
- testes Asaas/Woovi, events e integração PostgreSQL passam.

STOP: não usar lock em memória; ele não é global em serverless.

### PR-005 — Materializar invoices e tentativas Woovi

- Status: `TODO`
- Categoria: bug, billing
- Branch sugerida: `codex/pr-005-woovi-invoice-reconciliation`
- Risco: médio
- Drift check: `git diff --stat d161079..HEAD -- apps/web/src/integrations/woovi packages/db/src/schema.ts packages/db/src/migrations`

Objetivo: todo evento de cobrança Woovi processado deve apontar para uma invoice canônica e registrar a tentativa esperada.

Passos:

1. Definir a chave canônica Woovi para invoice (`globalID`) e a regra de valores/status.
2. Criar ou localizar a invoice e gravar `billing_invoice_id` no provider link.
3. Inserir a tentativa contra essa invoice com unicidade por provider event.
4. Retornar `processed` somente se a mutação esperada ocorreu; caso contrário, retornar revisão/retry.
5. Cobrir completed, rejected, try-rejected, duplicata e ausência de subscription/invoice.

Critérios de aceite:

- nenhum `PIX_AUTOMATIC_COBR*` processado fica sem invoice/link;
- duplicata não cria segunda invoice/tentativa;
- eventos incompletos ficam visíveis para revisão;
- testes focados e PR-004 passam.

STOP: interromper se o contrato real Woovi não confirmar o significado de `globalID`; buscar documentação do provider antes de adivinhar.

### PR-006 — Endurecer ingress de webhooks e semântica Resend

- Status: `TODO`
- Categoria: bug, segurança
- Branch sugerida: `codex/pr-006-webhook-ingress-hardening`
- Risco: médio
- Drift check: `git diff --stat d161079..HEAD -- apps/web/src/integrations/resend apps/web/src/integrations/webhooks/request-limits.ts apps/web/src/integrations/asaas/webhook.ts apps/web/src/integrations/woovi/webhook.ts apps/web/src/app/api/webhooks`

Objetivo: preservar os bytes usados na assinatura, abortar acima do teto real e classificar corretamente falhas retriables.

Passos:

1. Criar leitor incremental que conte bytes e aborte acima de 256 KiB, mantendo os bytes exatos para validação de assinatura.
2. Preservar a rejeição antecipada quando `Content-Length` já exceder o teto.
3. Limitar o `catch 400` do Resend somente à verificação criptográfica.
4. Retornar 5xx para falhas de intake/persistência e registrar correlação sem expor payload/segredo.
5. Marcar intake Resend como processado após gravação idempotente.
6. Testar sem header, header inválido, chunked, multibyte, exatamente no limite, acima do limite, assinatura inválida e banco indisponível.

Critérios de aceite:

- nenhum provider chama `request.text()` sem limite real;
- assinatura inválida => 4xx; falha operacional => 5xx;
- Resend processado atualiza `webhook_events`;
- todos os testes de rota de webhook passam.

STOP: não parsear JSON antes de verificar a assinatura quando o provider assina o corpo bruto.

### PR-007 — Falhar fechado no rate limiter distribuído

- Status: `TODO`
- Categoria: segurança, disponibilidade
- Branch sugerida: `codex/pr-007-rate-limit-failure-policy`
- Risco: médio
- Drift check: `git diff --stat d161079..HEAD -- apps/web/src/lib/rate-limit.ts apps/web/src/lib/rate-limit.test.ts packages/platform-auth/src/admin-rate-limit.ts packages/platform-auth/src/admin-rate-limit.test.ts`

Objetivo: indisponibilidade do provider não pode degradar silenciosamente limites globais sensíveis para Maps por instância.

Passos:

1. Definir política por classe: admin, endpoints internos e upload devem falhar fechado em produção.
2. Manter fallback local apenas em development/test. Se login tiver modo degradado, torná-lo explícito e mensurável.
3. Emitir evento/métrica sanitizada para falha do Upstash.
4. Corrigir o teste web que hoje exige fallback em produção e adicionar matriz equivalente no admin.

Critérios de aceite:

- falha do Upstash em produção bloqueia classes sensíveis;
- ausência de configuração continua bloqueando produção;
- desenvolvimento/teste continuam utilizáveis;
- nenhum erro revela URL/token;
- testes web/platform-auth passam.

STOP: não criar retry sem timeout curto que aumente a duração de todas as mutações.

### PR-008 — Criar harness PostgreSQL comportamental

- Status: `TODO`
- Categoria: testes, segurança, arquitetura
- Branch sugerida: `codex/pr-008-postgres-behavior-harness`
- Risco: médio
- Drift check: `git diff --stat d161079..HEAD -- packages/db packages/events packages/platform-auth apps/web/src/db scripts package.json .github/workflows/ci.yml`

Objetivo: provar migrations, RLS, constraints e concorrência pela interface real do PostgreSQL.

Passos:

1. Subir PostgreSQL isolado e determinístico no teste/CI; aplicar todas as migrations do zero.
2. Criar fixtures transacionais e cleanup seguro.
3. Migrar guards textuais críticos para testes comportamentais: isolamento tenant, unicidade de venda/meta, invariantes de pagamento.
4. Expor helpers de teste internos ao módulo DB; não criar repository port, pois há um único adapter real.
5. Permitir duas conexões sincronizadas para claims/webhooks concorrentes.

Critérios de aceite:

- migrations aplicam do zero;
- role runtime sem `BYPASSRLS` nega cross-tenant;
- constraints falham pelo código/constraint esperado;
- harness roda localmente e na CI sem banco compartilhado;
- falha deixa diagnóstico sem credenciais.

STOP: não apontar o harness para `DATABASE_URL`, produção ou banco de desenvolvimento compartilhado.

### PR-009 — Cobrir grants e actions administrativas por comportamento

- Status: `TODO`
- Categoria: testes, segurança
- Branch sugerida: `codex/pr-009-admin-behavior-tests`
- Risco: médio
- Drift check: `git diff --stat d161079..HEAD -- packages/platform-auth/src apps/admin/src/app apps/admin/tests/e2e apps/web/src/lib/admin-app-protection.test.ts`

Objetivo: autorização deve ser provada por resultados e ausência de efeitos, não por strings no source.

Passos:

1. Testar `createPlatformAdminAuth` contra banco isolado: admin inativo, grant revogado, expirado, role insuficiente e grant válido mais forte.
2. Criar testes das actions de organization e support notes no padrão comportamental já usado por billing/events.
3. Cobrir validação, role, rate limit, delegação e ausência de escrita após falha.
4. Adicionar matriz E2E mínima para anonymous/support/operator/owner nas rotas críticas.
5. Remover guards textuais somente depois da cobertura substituta passar.

Critérios de aceite:

- alteração ou remoção de qualquer filtro de grant quebra um teste;
- actions não chamam mutação após falha de guard/rate limit;
- E2E usa banco isolado e não depende de imports internos do outro app.

### PR-010 — Adicionar lease e recuperação ao outbox

- Status: `DEFERRED: executar antes do primeiro dispatcher pending`
- Categoria: durabilidade
- Branch sugerida: `codex/pr-010-outbox-leases`
- Risco: médio
- Drift check: `git diff --stat d161079..HEAD -- packages/events/src packages/platform/src/platform-events.ts apps/web/src/lib/inngest-functions.ts packages/db/src/schema.ts packages/db/src/migrations`

Objetivo: um worker encerrado depois do claim não deixa evento preso indefinidamente.

Passos:

1. Adicionar `claimed_at`, `lease_expires_at` e token/versão do claim.
2. Permitir claim atômico de `pending` ou `processing` expirado.
3. Exigir token do claim para concluir/falhar e impedir worker antigo de sobrescrever o novo.
4. Fazer retry manual retornar se uma linha foi realmente alterada antes de registrar auditoria.
5. Testar crash, lease expirada, dois workers e conclusão atrasada.

Critérios de aceite:

- evento abandonado volta a ser elegível;
- apenas o dono do claim atual finaliza;
- retry/auditoria refletem mutação real;
- nenhum dispatcher `pending` entra em produção antes desta PR ficar `DONE`.

### PR-011 — Pré-agregar o diretório administrativo

- Status: `TODO`
- Categoria: performance
- Branch sugerida: `codex/pr-011-admin-directory-queries`
- Risco: médio
- Drift check: `git diff --stat d161079..HEAD -- packages/platform/src/platform-directory.ts packages/platform/src/platform-directory.test.ts scripts/analyze-listing-plans.ts`

Objetivo: manter a interface atual do módulo e remover multiplicação de linhas dentro do adapter SQL.

Passos:

1. Pré-agregar member, products e sales por organization em CTEs/subqueries.
2. Pré-agregar memberships, sessions e accounts por user.
3. Aplicar o limite à entidade principal antes de joins caros quando compatível com busca/ordenação.
4. Preservar redaction, shape e ordenação da interface pública.
5. Comparar `EXPLAIN (ANALYZE, BUFFERS)` no mesmo dataset e guardar plano sanitizado.

Critérios de aceite:

- resultados idênticos para zero/um/muitos filhos;
- plano não contém cross-product das três coleções;
- tempo/buffers não pioram no dataset de referência;
- testes e build admin passam.

STOP: não aceitar melhoria apenas teórica; medir antes/depois.

### PR-012 — Agregar vendas e contribution graph no banco

- Status: `TODO`
- Categoria: performance
- Branch sugerida: `codex/pr-012-sales-sql-analytics`
- Risco: médio
- Drift check: `git diff --stat d161079..HEAD -- apps/web/src/features/sales apps/web/src/features/dashboard`

Objetivo: o volume transferido deve acompanhar o número de grupos/dias, não o número histórico de vendas e itens.

Passos:

1. Caracterizar a saída atual de `buildSalesAnalytics` com fixtures de borda.
2. Substituir as leituras integrais por agregações SQL de totais, custos, status e forma de pagamento.
3. Agrupar contribution graph por dia no banco e preencher dias vazios em memória.
4. Preservar ranges, cancelamentos, timezone e arredondamento monetário.
5. Medir query/rows antes/depois.

Critérios de aceite:

- snapshots/contratos de analytics não mudam;
- número de rows retornadas é limitado por grupos/dias;
- ranges all-time e vazio passam;
- testes web, typecheck e build passam.

### PR-013 — Agregar analytics de produto e remover waterfalls

- Status: `TODO`
- Categoria: performance, refinamento
- Branch sugerida: `codex/pr-013-product-sql-analytics`
- Risco: médio
- Drift check: `git diff --stat d161079..HEAD -- apps/web/src/features/products apps/web/src/app/(app)/produtos apps/web/src/features/catalog`

Objetivo: catálogo e detalhe não devem reler históricos inteiros para produzir totais.

Passos:

1. Agregar investimento, estoque e série recente em SQL.
2. Depois de resolver o contexto, executar produtos, categorias, settings e analytics independentes em paralelo.
3. Substituir a consulta ilimitada de métricas do detalhe por agregação; manter somente histórico paginado/limitado.
4. Preservar custo médio, cancelamentos e janelas de datas.

Critérios de aceite:

- catálogo não transfere todas as entradas de estoque;
- detalhe não faz duas leituras sobrepostas de `sale_items`;
- resultados atuais permanecem iguais;
- medição mostra menos rows e nenhuma regressão de latência representativa.

### PR-014 — Unificar suporte E2E e contrato de banco isolado

- Status: `TODO`
- Categoria: testes, arquitetura, DX
- Branch sugerida: `codex/pr-014-e2e-support-module`
- Risco: baixo/médio
- Drift check: `git diff --stat d161079..HEAD -- apps/web/playwright.config.ts apps/admin/playwright.config.ts apps/web/tests apps/admin/tests apps/web/src/ops/playwright-env.ts scripts/check-e2e-db-schema.ts docs/architecture/database-environments.md`

Objetivo: web e admin devem consumir um único módulo de suporte E2E e um contrato inequívoco de banco isolado.

Passos:

1. Criar módulo in-process pequeno para env, bootstrap e cookie; remover imports cruzados de internals do web.
2. Escolher e documentar o contrato. Recomendação: banco E2E sempre isolado; remover `ALLOW_E2E_SHARED_DATABASE` morto.
3. Corrigir precedência: env explícita do processo deve prevalecer sobre `.env.local`.
4. Ampliar o boundary guard para imports relativos, configs e testes que resolvam dentro do outro app.
5. Alinhar nomes `E2E_DATABASE_URL` e `ADMIN_E2E_DATABASE_URL` por camada.

Critérios de aceite:

- nenhum app importa implementação interna do outro;
- banco compartilhado falha antes do Playwright;
- env explícita não é sobrescrita;
- E2E web/admin passam em branches isoladas.

### PR-015 — Alinhar README, runbooks, roadmap e envs

- Status: `TODO`
- Categoria: documentação, operação
- Branch sugerida: `codex/pr-015-operational-docs`
- Risco: baixo
- Drift check: `git diff --stat d161079..HEAD -- README.md docs aidd_docs .env.example .github/workflows/ci.yml`

Objetivo: cada afirmação operacional deve apontar para o comportamento e nome de variável atuais.

Passos:

1. Corrigir onboarding, billing e caminhos movidos no README.
2. Trocar `R2_BUCKET_PUBLIC` por `R2_BUCKET_FINAL` onde o código atual for a fonte de verdade.
3. Alinhar secrets E2E e instruções de deploy.
4. Adicionar status `not-started`, `partial`, `implemented`, `superseded` ao roadmap, com evidência por item.
5. Adicionar verificador de links Markdown e referências de env à CI.

Critérios de aceite:

- nenhum link local quebrado;
- nomes de env coincidem entre tipo, `.env.example`, CI, preflight e runbook;
- roadmap não descreve billing/admin implementados como inexistentes;
- revisão documental consistente, sem mudança de runtime.

### PR-016 — Revisar e reduzir advisories aceitos

- Status: `TODO`
- Categoria: dependências, segurança
- Branch sugerida: `codex/pr-016-dependency-advisories`
- Risco: médio
- Drift check: `git diff --stat d161079..HEAD -- package.json bun.lock docs/security/dependency-advisory-baseline.json docs/security/dependency-advisory-baseline.md`

Objetivo: tentar remover os 14 advisories e renovar somente os riscos ainda inevitáveis com justificativa e prazo.

Passos:

1. Atualizar patches/minors compatíveis de Next, Vitest/Vite, Sentry, Inngest, AWS SDK, Turbo, Knip, Biome e demais caminhos identificados.
2. Verificar se overrides seguros eliminam `defu`/`fast-uri` sem duplicar versões incompatíveis.
3. Rodar builds, testes, E2E disponível e `bun audit`.
4. Atualizar baseline apenas para advisories restantes, com caminho, alcance, mitigação, owner e nova data.

Critérios de aceite:

- nenhuma regressão de build/test/typecheck;
- contagem/severidade reduzida ou bloqueio upstream documentado;
- baseline nunca é atualizado antes da verificação;
- sign-off explícito antes de lançamento pago se restar severity high.

STOP: não usar versão major ou override incompatível apenas para zerar o contador.

### PR-017 — Medir e lazy-load diálogos pesados

- Status: `BLOCKED: requer baseline de bundle`
- Categoria: performance frontend
- Branch sugerida: `codex/pr-017-lazy-dialog-chunks`
- Risco: médio
- Drift check: `git diff --stat d161079..HEAD -- apps/web/src/components/sales apps/web/src/components/products apps/web/next.config.ts`

Objetivo: carregar código de autoria somente quando o usuário puder e quiser abrir o diálogo.

Gate antes de implementar:

1. Medir chunks de `/vendas` e `/produtos` no build atual.
2. Confirmar que `CreateSaleDialog`, register/edit/upload e gráficos estão no payload inicial e representam custo material.
3. Só então separar trigger leve e corpo lazy, preservando acessibilidade, fallback e permissões.

Critérios de aceite:

- redução mensurável do JS inicial nas duas rotas;
- diálogo continua acessível por teclado e sem layout shift relevante;
- sem regressão de submissão/validação;
- se a medição não mostrar ganho material, mudar status para `REJECTED: custo não confirmado`.

## Dependências e ordem recomendada

1. PR-001, PR-002 e PR-003 em paralelo, com merge nessa ordem se houver sobreposição de CI.
2. PR-008 pode começar após o grafo de workspaces da PR-003; ela fornece a infraestrutura de prova para PR-004, PR-009 e PR-010.
3. PR-004 antes de PR-005/PR-006 para fixar a semântica comum de intake.
4. PR-001 antes de PR-011, pois medir consultas que hoje não possuem contexto RLS válido produziria evidência enganosa.
5. PR-012 e PR-013 são independentes entre si, mas devem entrar após P0/P1 de integridade.
6. PR-014 antes da revisão documental final PR-015.
7. PR-016 depois de PR-003 para que Knip/manifests e lockfile tenham baseline estável.
8. PR-010 permanece adiada somente enquanto nenhum dispatcher `pending` existir.

## Direção de produto e engenharia

Não abrir nova frente funcional antes de PR-001 a PR-009 e da certificação externa. O risco atual não é falta de módulos; é divergência entre o modelo de segurança/operabilidade e os caminhos reais.

Depois da estabilização:

1. Fechar a certificação de produção em Vercel/Neon/R2/Upstash/Sentry/OAuth/Resend/Inngest/Woovi/Asaas com evidência. Status atual: `BLOCKED` por infraestrutura/credenciais externas não disponíveis nesta revisão.
2. Reclassificar o roadmap com evidências. Billing e admin são parciais/implementados, não futuros abstratos.
3. Próxima fatia de produto sugerida: exportação/LGPD, pois usa boundaries tenant já existentes e reduz risco operacional de retenção/portabilidade.
4. Multiusuário/convites somente após os testes comportamentais de grants e RLS. Essa feature amplia a superfície de autorização e não deve depender de guards textuais.

## Achados considerados e rejeitados

- Extrair `@polaris/domain`: rejeitado. Não há dois adapters reais nem variação suficiente para justificar a seam.
- Criar repositórios genéricos para todas as queries: rejeitado. Um único adapter PostgreSQL; a abstração seria hypothetical e reduziria locality.
- Dividir `create-sale-dialog.tsx` apenas por tamanho: rejeitado. O módulo é deep e concentra uma interação coesa.
- Extrair app shell web/admin: rejeitado. Autenticação, navegação e proteção diferem; não surgiu drift novo que compense a interface maior.
- Reescrever paginação: rejeitado. Produtos e vendas já têm cursor/limite; o problema confirmado está nos analytics paralelos.
- Classificar subquery correlacionada de vendas como N+1: rejeitado. É uma única instrução SQL.
- Reagregar as métricas principais do dashboard: rejeitado. O intervalo principal já usa SQL; somente contribution graph lê linhas históricas.
- Tratar advisories como exploração confirmada: rejeitado. Presença confirmada, alcançabilidade não demonstrada.
- Tratar outbox abandonado como incidente ativo: rejeitado. Não existe dispatcher `pending` registrado hoje; o item é gate futuro.
- Remover scripts operacionais marcados pelo Knip sem confirmação: rejeitado. Análise estática não prova ausência de uso humano/runbook.
- Abrir PR de orphan cleanup de imagem: rejeitado. Já existe reconciliação; nenhuma falha nova reproduzida.

## Riscos restantes da própria análise

- A incompatibilidade RLS foi provada por migrations e caminhos de chamada, mas não executada contra uma branch Neon runtime; PR-001 deve confirmar no smoke isolado.
- As regressões de performance foram provadas por cardinalidade e ausência de limite, não por números de latência; PR-011 a PR-013 exigem medição antes/depois.
- Contratos exatos dos providers financeiros precisam ser verificados na documentação atual durante implementação, especialmente Woovi e ordem temporal de eventos.
- E2E e integrações externas não foram executados.
- O worktree já continha logs Turbo modificados antes da criação deste relatório; eles não foram revertidos nem atribuídos a esta revisão.

## Registro de implementação

Nenhuma PR deste backlog foi implementada nesta revisão. Somente este relatório foi criado.

Formato obrigatório para futuras entradas:

```text
YYYY-MM-DD — PR-NNN — DONE|BLOCKED|REJECTED
Commit/PR: <identificador>
Arquivos: <lista curta>
Verificações: <comando => resultado>
Risco residual: <nenhum ou descrição objetiva>
```
