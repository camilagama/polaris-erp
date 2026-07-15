# Auditoria de aderência da implementação

**Data:** 2026-07-14  
**Escopo:** implementação atual versus a norma v1.2.0 (`DEC-BR-001..085`).  
**Método:** leitura estática de código, schema/migrations, testes e configurações; três frentes read-only independentes; execução de checks seguros. Não foram feitas escritas no banco, migrations, chamadas a providers ou alterações de código/norma.  
**Limite de prova:** ambiente promovido, providers, RLS vivo, restore, R2, Inngest, Resend, OAuth e alertas só são considerados comprovados com evidência externa datada. Não havia essa evidência.

## Resumo executivo

- **Regras individuais analisadas:** 28.
- **Aderentes:** 0.
- **Parcialmente aderentes:** 13.
- **Implementação contraditória:** 9.
- **Não implementadas:** 5.
- **Não verificável:** 1.
- **P0 confirmado:** 0. Não foi executada prova contra banco/ambiente promovido que permita afirmar vazamento cross-tenant.
- **P1:** 23. **P2:** 5.
- **Nota de aderência:** **23/100**. Métrica conservadora: cada regra parcialmente aderente vale 0,5; as demais valem 0. Não mede qualidade de código nem prontidão comercial.
- **Confiança global:** média-alta para código versionado; baixa para infraestrutura e providers promovidos.

**Conclusão:** não liberar publicamente. A base local de venda, locks, snapshots, alguns checks de banco, RLS versionado, adapters de billing e testes unitários é útil, mas não substitui o contrato aprovado. Os bloqueadores são Free/entitlement, lifecycle de billing, atomicidade inbox/outbox, ledger de estoque, identidade, privacidade, grants de plataforma e prova de release.

## Verificações executadas

| Comando | Resultado | Impacto na confiança |
| --- | --- | --- |
| `bun run check:all` | passou | estilo/qualidade estática dos pacotes web e admin |
| `bun run typecheck:all` | passou | tipos dos 11 pacotes com typecheck |
| `bun run test:all` | falhou | 3 asserts em `apps/admin/src/app/admin-accessibility.test.ts`; os demais pacotes passaram |
| testes focados web | 54 aprovados | prova local para venda, produto, imagem, metas e ações selecionadas |
| testes focados events/db | 30 aprovados; 7 PostgreSQL pulados | não prova banco ativo; testes integrados dependem de variável de ambiente |

Os três testes administrativos falham por esperar strings antigas de código-fonte: `aria-label="Buscar organizacoes"`, `<article` e `overflow-x-auto`. Isso é bug de teste/contrato de acessibilidade desatualizado, não prova isoladamente uma falha de regra de negócio.

## Atualização de implementação local — 2026-07-15

Esta atualização não reclassifica o baseline histórico acima sem nova auditoria integral. Ela substitui apenas a evidência de execução local que mudou durante a implementação.

| Comando | Resultado | Limite de prova |
| --- | --- | --- |
| `bun run check:all` | passou | formatação/lint dos pacotes. |
| `bun run typecheck:all` | passou | tipos dos 11 pacotes com typecheck. |
| `bun run test:all` | passou | suites unitárias/integradas locais; testes PostgreSQL condicionais permanecem skipped sem banco isolado. |
| `bun run build:all` | passou | builds de produção de web e admin. |
| `bun scripts/check-e2e-db-schema.ts` | passou | leitura do schema E2E configurado; não executa Playwright nem escreve dados. |
| `bun run --cwd packages/db test:postgres` | bloqueado com segurança | exige `POSTGRES_BEHAVIOR_DATABASE_URL` e recusa reutilizar `DATABASE_URL`. |

As migrations, policies RLS, billing e integrações não foram aplicadas a banco real nesta sessão. Também não há evidência promovida para RLS runtime, providers, R2, Resend, Inngest, alertas ou restore. Esses gates seguem bloqueadores de release.

## Matriz geral de aderência

| Regra | Domínio | Status | Severidade | Código | Banco | UI | Testes | Gap principal | PR |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AUTH-001 | autenticação | PARCIALMENTE ADERENTE | P2 | parcial | parcial | parcial | parcial | auditoria de auth incompleta | 1 |
| ACCOUNT-001 | identidade | IMPLEMENTAÇÃO CONTRADITÓRIA | P1 | contraditório | parcial | n/a | ausente | linking implícito por e-mail | 1 |
| SESSION-001 | sessão | PARCIALMENTE ADERENTE | P1 | parcial | parcial | parcial | parcial | TTL/revogação ausentes | 1 |
| ORG-001 | tenancy | PARCIALMENTE ADERENTE | P1 | parcial | parcial | parcial | parcial | unicidade de pessoa/owner | 1 |
| ORG-002 | tenancy | IMPLEMENTAÇÃO CONTRADITÓRIA | P1 | contraditório | parcial | contraditório | parcial | Free e tela de suspensão | 1,2 |
| RBAC-001 | autorização | PARCIALMENTE ADERENTE | P1 | parcial | parcial | parcial | parcial | prova RLS real e processo de caso/PII | 1,5 |
| TIME-001 | tempo | PARCIALMENTE ADERENTE | P2 | parcial | parcial | parcial | parcial | timezone São Paulo não garantido | 8 |
| REPORT-002 | relatórios | PARCIALMENTE ADERENTE | P2 | parcial | parcial | parcial | parcial | timezone/histórico dependente de produto | 8 |
| PLAN-001 | comercial | IMPLEMENTAÇÃO CONTRADITÓRIA | P1 | contraditório | contraditório | contraditório | parcial | Free e preço/plano vigentes | 2 |
| ENTITLEMENT-001 | quotas | NÃO IMPLEMENTADA | P1 | ausente | ausente | ausente | ausente | quotas e `free-over-quota` | 2 |
| SUB-001 | assinatura | IMPLEMENTAÇÃO CONTRADITÓRIA | P1 | contraditório | parcial | ausente | parcial | grace/downgrade/relógio | 4 |
| PAY-001 | checkout | PARCIALMENTE ADERENTE | P1 | parcial | parcial | ausente | parcial | checkout e gate PIX | 4 |
| BILLING-001 | billing/eventos | IMPLEMENTAÇÃO CONTRADITÓRIA | P1 | contraditório | parcial | parcial | parcial | recovery/ordem | 3,4 |
| EVENT-004 | jobs | PARCIALMENTE ADERENTE | P1 | parcial | parcial | parcial | parcial | retry, alertas, aprovação replay | 3,9 |
| EMAIL-002 | e-mail | IMPLEMENTAÇÃO CONTRADITÓRIA | P1 | contraditório | contraditório | ausente | parcial | lifecycle provider | 4 |
| PRODUCT-001 | catálogo | PARCIALMENTE ADERENTE | P1 | parcial | parcial | parcial | parcial | remoção lógica final | 6 |
| IMAGE-001 | upload | IMPLEMENTAÇÃO CONTRADITÓRIA | P1 | contraditório | contraditório | parcial | parcial | 10 MiB/uma imagem/purge | 6,9 |
| STOCK-001 | estoque | PARCIALMENTE ADERENTE | P1 | parcial | contraditório | parcial | parcial | ledger/idempotência e reconciliação promovida | 7 |
| SALE-001 | vendas | PARCIALMENTE ADERENTE | P1 | parcial | parcial | parcial | parcial | cancelamento e ledger | 7 |
| SALE-002 | financeiro | PARCIALMENTE ADERENTE | P2 | parcial | parcial | parcial | parcial | reconciliador econômico | 7 |
| GOAL-001 | metas | NÃO IMPLEMENTADA | P1 | contraditório | contraditório | parcial | parcial | quota/máquina/job | 8 |
| AUDIT-001 | auditoria | PARCIALMENTE ADERENTE | P1 | parcial | parcial | n/a | parcial | tenant fail-open | 3,5 |
| ADMIN-002 | plataforma | PARCIALMENTE ADERENTE | P1 | parcial | parcial | parcial | parcial | prova RLS real e leitura PII case-bound | 5 |
| PRIVACY-001 | privacidade | PARCIALMENTE ADERENTE | P1 | parcial | parcial | parcial | parcial | retenção/incidente e gates jurídicos | 5,9 |
| MUTATION-001 | resiliência UX | NÃO IMPLEMENTADA | P1 | parcial | ausente | parcial | parcial | protocolo transversal | 3 |
| OBS-001 | observabilidade | PARCIALMENTE ADERENTE | P1 | parcial | n/a | n/a | parcial | redaction/alertas/correlação | 9 |
| RELEASE-001 | release | NÃO VERIFICÁVEL | P1 | parcial | parcial | n/a | parcial | provas promovidas ausentes | 10 |
| SCOPE-001 | escopo | PARCIALMENTE ADERENTE | P2 | parcial | n/a | parcial | ausente | bloqueio de expansão não técnico | 10 |

## Top gaps e riscos confirmados

1. Billing webhooks podem ser capturados sem outbox/recovery durável; redelivery vira duplicata.
2. Eventos fora de ordem podem regredir assinatura/pagamento.
3. Free, grace, downgrade, cancelamento por período e `free-over-quota` não existem na execução.
4. Produto individual ainda permite identidade/linking, memberships e papéis fora do contrato.
5. Estoque não tem ledger persistido único nem idempotência para entrada/baixa.
6. Upload contradiz o limite de 5 MiB, suporta apenas uma imagem e apaga objetos incompatíveis com retenção aprovada.
7. Resolução de meta pode sobrescrever mudança concorrente e não audita a transição.
8. Auditoria de tenant é best-effort; mutação crítica pode sobreviver sem evidência.
9. Grants temporários, replay owner-only, intake manual de DSR e encerramento com cancelamento de renovação no outbox possuem evidência local; prova RLS real, retenção/incidente e alertas continuam pendentes.
10. RLS e release gates existem em código/checklists, mas não têm prova promovida.

## Relatório detalhado por regra

O texto normativo canônico, atores, estados e invariantes de cada regra estão em [perfis individuais](normative/individual-rule-profiles.md). Cada ficha abaixo registra a evidência executável, fluxo, cenários, classificação e correção. “Não verificado” não é interpretado como implementação.

### `AUTH-001` Autenticação Google exclusiva

#### Regra normativa e intenção

Somente Google OAuth; impedir senha/outro IdP e registrar eventos de segurança sem segredo. Evita contas não autorizadas e trilha incompleta.

#### Atores, evidências e fluxo atual

| Camada | Evidência | Status |
| --- | --- | --- |
| UI/API | `apps/web/src/app/(auth)/sign-in/sign-in-form.tsx`; `api/auth/google/route.ts` | parcial |
| Serviço | `packages/auth/src/auth.ts:createPolarisAuth` desabilita senha e declara Google | aderente |
| Banco | `sessions`/`accounts` | parcial |
| Auditoria/testes | `lib/auth-audit.ts`; testes de rota/formulário | parcial |

O visitante inicia OAuth, Better Auth cria sessão e o app resolve contexto. O principal cenário é protegido; falha OAuth, primeiro login, logout e revogação não têm ciclo de auditoria comprovado.

#### Status de aderência

- **Status:** PARCIALMENTE ADERENTE. **Severidade:** P2. **Confiança:** alta.
- **Divergência/riscos:** auditoria só ocorre com organização ativa e pode falhar sem bloquear. Falta prova de eventos relevantes.
- **Correção/testes/PR:** registrar lifecycle redigido e obrigatório de auth; testar primeiro login, falha, logout e revogação. **PR 1**.

### `ACCOUNT-001` Identidade por `google:sub`

#### Regra normativa e intenção

A chave é `(provider=google, providerAccountId=sub)`; e-mail não pode fazer merge implícito. Colisão requer recuperação verificada e auditada.

#### Atores, evidências e fluxo atual

| Camada | Evidência | Status |
| --- | --- | --- |
| Serviço | `packages/auth/src/auth.ts` usa `disableImplicitLinking: false` | contraditório |
| Banco | `accounts` sem unique `(provider_id, account_id)` | parcial |
| UI/API/testes | callback Google; nenhum fluxo/teste de colisão | ausente |

O callback pode confiar em provider Google para linking implícito por e-mail. Não há recuperação auditada nem defesa de concorrência no banco.

#### Status de aderência

- **Status:** IMPLEMENTAÇÃO CONTRADITÓRIA. **Severidade:** P1. **Confiança:** alta.
- **Correção/testes/PR:** desabilitar linking implícito, deduplicar legado, adicionar unicidade, recovery explicitamente auditado e testes de colisão/corrida. **PR 1**.

### `SESSION-001` Sessão com expiração e revogação

#### Regra normativa e intenção

Sete dias de inatividade e máximo absoluto de 30; logout/revogação encerram as sessões aplicáveis.

#### Atores, evidências e fluxo atual

`packages/db/src/schema.ts:sessions`, `packages/auth/src/session.ts` e `apps/web/src/lib/app-session.ts` validam sessão atual; `updatePlatformOrganizationStatus` altera organização sem revogar sessões. Há testes básicos de contexto, não dos TTLs/revogações.

#### Status de aderência

- **Status:** PARCIALMENTE ADERENTE. **Severidade:** P1. **Confiança:** alta.
- **Divergência/riscos:** sem `lastActivity`, expiração absoluta, motivo de revogação ou corrida suspensão/login tratada.
- **Correção/testes/PR:** lifecycle persistido e revogação transacional/outbox; testes idle/absoluto/logout/todas as revogações. **PR 1**.

### `ORG-001` Organização individual e owner único

#### Regra normativa e intenção

Uma pessoa pertence a uma organização e é seu único owner; sem convite, troca ou colaboração.

#### Atores, evidências e fluxo atual

Onboarding em `apps/web/src/features/onboarding/server.ts:createInitialOrganizationForUser` usa advisory lock e cria owner. A política Better Auth limita memberships, mas `member` só é unique por `(organization_id,user_id)`, aceita `owner/admin/operator` e não tem garantia de exatamente um owner.

#### Status de aderência

- **Status:** PARCIALMENTE ADERENTE. **Severidade:** P1. **Confiança:** alta.
- **Cenários faltantes:** dados legados, chamada direta, duas organizações por pessoa e corrida de owner.
- **Correção/testes/PR:** migrar memberships, constraints globais/owner, neutralizar papéis extras e testar concorrência. **PR 1**.

### `ORG-002` Acesso tenant e suspensão administrativa

#### Regra normativa e intenção

Exige sessão, tenant ativo e entitlement; suspensão bloqueia e mostra tela restrita, sem loop de onboarding.

#### Atores, evidências e fluxo atual

`requireAppContext` e `requirePageAppContext` em `apps/web/src/lib/app-session.ts` devolvem contexto nulo para suspensão e redirecionam onboarding. Migrations de RLS têm `ENABLE/FORCE RLS`; o teste Postgres é opt-in, portanto não prova produção.

#### Status de aderência

- **Status:** IMPLEMENTAÇÃO CONTRADITÓRIA. **Severidade:** P1. **Confiança:** alta para app, média para RLS real.
- **Divergência/riscos:** Free é bloqueado como falta de pagamento; suspensão cai em onboarding. Cross-tenant promovido não provado.
- **Correção/testes/PR:** resultado de acesso tipado, página restrita, smoke com role real e E2E cross-tenant. **PRs 1 e 2**.

### `RBAC-001` Autorização individual e suporte sem impersonation

#### Regra normativa e intenção

No lançamento individual não há papéis colaborativos; suporte não usa sessão/role do owner e PII exige motivo/auditoria.

#### Atores, evidências e fluxo atual

O tenant individual restringe membership ao papel `owner`; o console de plataforma não cria sessão de tenant e o diretório redige e-mail. `platform_support_cases` registra casos de suporte/DSR e `platform_support_notes` registra investigação vinculada ao alvo. Não há UI de revelação de PII, portanto nenhuma PII adicional é exibida sem caso. A prova PostgreSQL da policy real continua pendente em banco isolado.

#### Status de aderência

- **Status:** PARCIALMENTE ADERENTE. **Severidade:** P1. **Confiança:** média, pois o harness PostgreSQL isolado não estava configurado.
- **Evidência local:** `individual-tenant-policy.test.ts`, `platform-support-cases.test.ts`, páginas de suporte sem impersonation e diretório redigido.
- **Pendente:** prova de RLS em role real e fluxo futuro de revelação de PII vinculado a caso/motivo/auditoria, caso ele seja aprovado. **PRs 1 e 5**.

### `TIME-001` Timezone canônico

#### Regra normativa e intenção

Datas de negócio e jobs usam `America/Sao_Paulo` explicitamente.

#### Atores, evidências e fluxo atual

`lib/domain/date.ts` calcula datas de negócio com `America/Sao_Paulo`; presets do dashboard derivam meses, anos e janelas por essa data, sem depender do timezone do processo. O resolver de metas roda de hora em hora e também usa esse relógio. A migration/policy e o cron ainda não foram comprovados em PostgreSQL/Inngest promovidos.

#### Status de aderência

- **Status:** PARCIALMENTE ADERENTE. **Severidade:** P2. **Confiança:** alta.
- **Correção/testes/PR:** serviço de data de negócio explícito e testes de virada concluídos; faltam prova PostgreSQL real e cron promovido. **PR 8**.

### `REPORT-002` Dashboard por intervalo e snapshots

#### Regra normativa e intenção

Métricas principais respeitam filtro; histórico é separado e não depende de produto vivo.

#### Atores, evidências e fluxo atual

`features/dashboard/server.ts:getDashboardMetricsByRange` filtra `from/to`, exclui canceladas e usa snapshots de `sale_items`. Algumas consultas de inventário usam `innerJoin(products)` e timestamps implícitos.

#### Status de aderência

- **Status:** PARCIALMENTE ADERENTE. **Severidade:** P2. **Confiança:** alta.
- **Correção/testes/PR:** separar histórico, eliminar dependência de produto vivo e testar intervalos/São Paulo/caches. **PR 8**.

### `PLAN-001` Catálogo Free e pago mensal

#### Regra normativa e intenção

Nova organização nasce Free ativo; plano pago mensal custa R$49,90; não há anual/boleto/PIX manual.

#### Atores, evidências e fluxo atual

Migration `20260710052000_seed_initial_billing_plan.sql` semeia apenas `Polaris Start` por R$99,00; schema aceita `month` e `year`; onboarding cria assinatura `incomplete`; a UI exige cobrança antes de operar.

#### Status de aderência

- **Status:** IMPLEMENTAÇÃO CONTRADITÓRIA. **Severidade:** P1. **Confiança:** alta.
- **Correção/testes/PR:** catálogo Free + R$49,90 mensal, entitlement Free operacional, proibir anual e testar seed/onboarding/ofertas negadas. **PR 2**.

### `ENTITLEMENT-001` Quotas e `free-over-quota`

#### Regra normativa e intenção

Free: 50 produtos cadastrados, uma imagem e uma meta; pago: 250, cinco imagens e três metas por métrica. Excedente Free consulta e remoção, mas não venda/estoque.

#### Atores, evidências e fluxo atual

`billingPlans.entitlements` JSONB e `getEntitlementValue` são genéricos; seed atual informa limite 500. Serviços de produto/imagem/meta/venda não têm contador, lock, estado ou guard de quota.

#### Status de aderência

- **Status:** NÃO IMPLEMENTADA. **Severidade:** P1. **Confiança:** alta.
- **Correção/testes/PR:** resolução transacional de entitlement/uso, contando arquivados; state `free-over-quota`, UI e testes 50/51, 250/251, corrida e reativação. **PR 2**.

### `SUB-001` Lifecycle comercial

#### Regra normativa e intenção

Período pago, grace de sete dias, downgrade idempotente para Free, cancelamento no fim do período e PIX revogado no próximo vencimento.

#### Atores, evidências e fluxo atual

Reconcilers Asaas/Woovi atualizam status; `hasBillableAccess` só aceita `active`. Subscription não tem grace/version/clock; não existe job temporal, destino Free ou transição condicional.

#### Status de aderência

- **Status:** IMPLEMENTAÇÃO CONTRADITÓRIA. **Severidade:** P1. **Confiança:** alta.
- **Correção/testes/PR:** máquina interna de entitlement separada do provider, marcos/versionamento, job São Paulo e testes grace/downgrade/cancelamento/revogação. **PR 4**.

### `PAY-001` Checkout e meios recorrentes

#### Regra normativa e intenção

Asaas trata cartão recorrente; Woovi PIX Automático; PIX não homologado fica oculto e estorno é manual/auditado.

#### Atores, evidências e fluxo atual

Há adapters `packages/billing/src/providers/asaas.ts` e `woovi.ts`, webhooks e testes. Não há action/rota/UI de upgrade, health/elegibilidade PIX, cancelamento de fim de período ou fluxo auditado de exceção de estorno.

#### Status de aderência

- **Status:** PARCIALMENTE ADERENTE. **Severidade:** P1. **Confiança:** alta.
- **Correção/testes/PR:** comando autenticado idempotente, registro interno pré-provider, capability de meio e sandbox/provider tests. **PR 4**.

### `BILLING-001` Webhooks, recovery e comunicação

#### Regra normativa e intenção

Captura durável precede processamento; falha pós-captura recupera; fatos ordenados não regridem estado e aviso não concede acesso.

#### Atores, evidências e fluxo atual

`integrations/webhooks/intake.ts`, `packages/events`, `inngest-functions.ts` e reconcilers provider capturam e reconciliam em operações separadas. Tópicos Asaas/Woovi estão em `CAPTURE_ONLY_OUTBOX_TOPICS`: outbox observado, rota HTTP reconcilia síncrona.

#### Status de aderência

- **Status:** IMPLEMENTAÇÃO CONTRADITÓRIA. **Severidade:** P1. **Confiança:** alta.
- **Divergência/riscos:** crash entre intake/outbox ou outbox/reconcile perde recovery; redelivery pode ser duplicate; updates sem versão/data permitem regressão.
- **Correção/testes/PR:** inbox/outbox atômico, dispatcher de fatos normalizados, ordem/lease/replay e crash tests. **PRs 3 e 4**.

### `EVENT-004` Jobs, retry e revisão

#### Regra normativa e intenção

Billing/webhook: cinco tentativas em 24h, concorrência um por organização e revisão/alerta; imagem: três, concorrência dois; replay sensível exige owner.

#### Atores, evidências e fluxo atual

Outbox tem lease de cinco minutos e máximo cinco falhas. `available_at` volta a `now()`, sem backoff/jitter/24h; Inngest não declara concurrency/retry; job de imagem não tem três tentativas/duas por tenant; replay admin aceita operator sem motivo.

#### Status de aderência

- **Status:** PARCIALMENTE ADERENTE. **Severidade:** P1. **Confiança:** alta.
- **Correção/testes/PR:** política por função, `next_attempt_at`, DLQ/manual review/alerta e workflow de aprovação. **PRs 3 e 9**.

### `EMAIL-002` Lifecycle e retry de e-mail

#### Regra normativa e intenção

`pending → accepted → delivered`, ou terminal `failed/bounced/suppressed`; retry só antes de provider ID; reenvio manual gera nova comunicação auditada.

#### Atores, evidências e fluxo atual

`emailMessages` usa `sent`/`complained`; service faz `pending → sent`; webhook insere `email_events` sem atualizar mensagem. Não há timestamp/contador de tentativa, ordenação ou reenvio manual auditado.

#### Status de aderência

- **Status:** IMPLEMENTAÇÃO CONTRADITÓRIA. **Severidade:** P1. **Confiança:** alta.
- **Correção/testes/PR:** schema/migration de estados e ordem, retry pré-aceitação e testes de bounce/suppression/replay. **PR 4**.

### `PRODUCT-001` Produto e remoção lógica final

#### Regra normativa e intenção

Valores e saldo não negativos; produto arquivado não vende; remoção final exige owner, saldo zero, motivo, auditoria e não restaura.

#### Atores, evidências e fluxo atual

`products` tem checks de não negatividade; `createProductWithInitialStock`, locks, média ponderada, archive/unarchive e auditoria existem. Não há `deletedAt/deletedBy/reason` ou ação de remoção final; `sale_items.product_id` usa `onDelete: cascade`.

#### Status de aderência

- **Status:** PARCIALMENTE ADERENTE. **Severidade:** P1. **Confiança:** alta.
- **Correção/testes/PR:** estado final owner-only com saldo zero, auditoria, imagens e proibição de delete físico/cascade; testes de motivo, histórico e timeout. **PR 6**.

### `IMAGE-001` Galeria, upload e lifecycle

#### Regra normativa e intenção

JPEG/PNG/WebP até 5 MiB; Free uma e pago cinco; staging 24h, CORS/origem exata, isolamento e retenção aprovada.

#### Atores, evidências e fluxo atual

MIME/Sharp, prefixo tenant, CORS exato, CAS `imageVersion`, auditoria e reconciliador são positivos. `PRODUCT_IMAGE_MAX_BYTES` é 10 MiB; metadados ficam em `products`, logo só uma imagem; objetos finais são apagados diretamente e staging 24h depende de lifecycle externo não provado.

#### Status de aderência

- **Status:** IMPLEMENTAÇÃO CONTRADITÓRIA. **Severidade:** P1. **Confiança:** alta.
- **Correção/testes/PR:** `product_images`, quotas transacionais, 5 MiB, retenção pendente e jobs limitados/revisionáveis; prova R2 promovida. **PRs 6 e 9**.

### `STOCK-001` Ledger e ajustes

#### Regra normativa e intenção

Todo saldo resulta de ledger único; entrada, baixa, venda e cancelamento são transacionais, auditados e idempotentes.

#### Atores, evidências e fluxo atual

`stock_movements` append-only, referência única por origem, RLS e dual-write transacional para entrada, baixa, venda e cancelamento foram implementados. O job diário `reconcile-stock-ledger` enumera somente IDs de organizações sob contexto interno restrito, compara cada tenant entre `sum(delta)` e `products.stock` e devolve apenas contagens agregadas; ele não repara saldo. A migration/backfill, a política RLS do job e a reconciliação ainda não têm prova PostgreSQL real. Chaves idempotentes persistidas para ajustes e resultado de repetição permanecem pendentes.

#### Status de aderência

- **Status:** PARCIALMENTE ADERENTE. **Severidade:** P1. **Confiança:** média.
- **Correção/testes/PR:** execução local cobre ledger append-only, referência única, mesmo commit e job detector; faltam prova PostgreSQL, alertas promovidos e recuperação de replay de ajustes. **PR 7**.

### `SALE-001` Venda e cancelamento operacional

#### Regra normativa e intenção

Itens únicos/quantidade positiva, snapshot e baixa atômica; somente `completed → cancelled`; sem refund/AR; comando resiliente.

#### Atores, evidências e fluxo atual

Zod, índice único, checks, locks ordenados, snapshots e idempotência de criação são sólidos. Cancelamento recompõe estoque e tem confirmação UI, mas não recebe chave de idempotência/result lookup e não escreve ledger persistido; venda não confere entitlement.

#### Status de aderência

- **Status:** PARCIALMENTE ADERENTE. **Severidade:** P1. **Confiança:** alta.
- **Correção/testes/PR:** comando de cancelamento idempotente, entitlement antes de mutação, ledger e testes timeout/cancelamento repetido. **PR 7**.

### `SALE-002` Cálculo e reconciliação econômica

#### Regra normativa e intenção

Servidor calcula moeda, taxa, desconto, frete e parcelas; banco protege invariantes locais e reconciliador detecta divergência.

#### Atores, evidências e fluxo atual

`features/sales/calculations.ts`, Zod e checks garantem PIX sem taxa/parcela e cartão 1–12; snapshots e transação existem. Totais entre cabeçalho/itens dependem do serviço e não há reconciliador persistido.

#### Status de aderência

- **Status:** PARCIALMENTE ADERENTE. **Severidade:** P2. **Confiança:** alta.
- **Correção/testes/PR:** escrita privilegiada, checks locais possíveis, reconciliador e testes de corrupção/arredondamento. **PR 7**.

### `GOAL-001` Metas e transições

#### Regra normativa e intenção

Free uma; pago até três, uma por métrica; somente transições aprovadas, resolvidas não reabrem e job concorrente não sobrescreve estado.

#### Atores, evidências e fluxo atual

Entitlements aplicam uma meta Free e até três pagas, com uma ativa por métrica. O resolver é job separado, usa atualização condicional a partir de `active` e grava auditoria no mesmo commit; metas terminais não podem ser arquivadas ou reativadas. A migration que protege transições e autoriza o job por RLS ainda não foi executada nem comprovada em PostgreSQL real.

#### Status de aderência

- **Status:** PARCIALMENTE ADERENTE. **Severidade:** P1. **Confiança:** alta.
- **Correção/testes/PR:** quota por plano/métrica, job São Paulo, CAS transacional, auditoria obrigatória e corrida resolver/arquivar cobertos localmente; faltam migration/RLS e job promovidos. **PR 8**.

### `AUDIT-001` Auditoria obrigatória transacional

#### Regra normativa e intenção

Mutações críticas falham sem trilha de auditoria no mesmo commit; logs são redigidos e efeitos externos seguem outbox.

#### Atores, evidências e fluxo atual

Mutações de plataforma inserem audit na transação. `apps/web/src/lib/audit-log.ts:recordActorAuditEvent` usa contexto separado, timeout de 500 ms e `.catch(() => undefined)`; serviço tenant pode concluir sem audit.

#### Status de aderência

- **Status:** PARCIALMENTE ADERENTE. **Severidade:** P1. **Confiança:** alta.
- **Correção/testes/PR:** primitive audit tenant no mesmo transaction e rollback tests de todas as mutações críticas. **PRs 3 e 5**.

### `ADMIN-002` Grants, PII e replay de plataforma

#### Regra normativa e intenção

Somente platform owner ativo gere grants temporários com motivo; PII aparece no caso necessário e leitura é auditada; replay financeiro exige owner.

#### Atores, evidências e fluxo atual

`platform_admin_grants` exige expiração para novas concessões; o console owner-only cria e revoga grants com motivo, expiração e auditoria. Replay financeiro exige owner e motivo. O diretório busca somente por ID técnico e redige nomes/e-mails; não há UI de revelação de PII sem caso.

#### Status de aderência

- **Status:** PARCIALMENTE ADERENTE. **Severidade:** P1. **Confiança:** média, condicionada à migration e smoke RLS em ambiente isolado.
- **Evidência local:** `platform-admin.test.ts`, `platform-admin-rls-policy.test.ts`, `admin-access/actions.test.ts`, `platform-directory.test.ts` e `events/actions.test.ts`.
- **Pendente:** prova RLS real, alerta de policy denial/grant expirado e eventual revelação de PII vinculada a caso/motivo/auditoria. **PR 5**.

### `PRIVACY-001` DSR, retenção, incidente e encerramento

#### Regra normativa e intenção

DSR manual verificado e roteado por controlador; encerramento corta acesso; retenção/legal hold dependem de tabela aprovada; incidente tem responsáveis e runbook.

#### Atores, evidências e fluxo atual

`platform_support_cases` registra DSR manual e casos de suporte vinculados a usuário ou organização; DSR exige confirmação de verificação manual para avançar e resolução para fechar, com auditoria sem copiar a resolução. A interface não executa purge nem expõe PII adicional. O encerramento suspende a organização, revoga sessões e grava uma intenção idempotente de cancelamento de renovação no outbox, sem refund. Classificação de controlador, retenção/legal hold, incidente, runbook e purge aprovado continuam pendentes.

#### Status de aderência

- **Status:** PARCIALMENTE ADERENTE. **Severidade:** P1. **Confiança:** média.
- **Evidência local:** `platform-support-cases.test.ts`, `platform-support-cases-policy.test.ts`, `support-cases/actions.test.ts`, `platform-organization-mutations.test.ts` e `organizations/actions.test.ts`.
- **Pendente:** tabela jurídica-contábil, hold, incidente/runbook, prova de exercício e RLS real. **PRs 5 e 9**.

### `MUTATION-001` Comandos críticos resilientes

#### Regra normativa e intenção

UI não repete mutação cega; usa chave persistida, pendência e consulta do resultado.

#### Atores, evidências e fluxo atual

Criação de venda mantém UUID durante submissão e `createSaleOnce` recupera conflito. Produto, entrada, baixa, imagem, meta e cancelamento não carregam protocolo persistido/consulta de resultado.

#### Status de aderência

- **Status:** NÃO IMPLEMENTADA. **Severidade:** P1. **Confiança:** alta.
- **Correção/testes/PR:** comando genérico tenant-scoped, idempotency key/result, UI pending e testes de timeout/replay. **PR 3**.

### `OBS-001` Telemetria redigida e alertas

#### Regra normativa e intenção

Eventos estruturados/redigidos usam IDs internos e disparam métricas/alertas de billing, jobs, RLS, storage e e-mail.

#### Atores, evidências e fluxo atual

Sentry inicia somente com DSN e elimina dados de request, usuário, contextos, extras, tags, breadcrumbs e mensagens originais antes do envio. Logs do SDK, tracing e Replay estão desabilitados; `onRequestError` escreve somente digest, método e tipo de rota. Falhas terminais de outbox preservam correlação por IDs internos sem payload. Não há métricas consolidadas nem alertas promovidos.

#### Status de aderência

- **Status:** PARCIALMENTE ADERENTE. **Severidade:** P1. **Confiança:** média-alta.
- **Evidência local:** `observability.test.ts`, `server-api-error.test.ts`, `rate-limit.test.ts`, configuração Sentry redigida e typecheck de web/admin.
- **Pendente:** métricas consolidadas e regras de alerta comprovadas no ambiente promovido. **PR 9**.

### `RELEASE-001` Gate de lançamento público

#### Regra normativa e intenção

Release exige provas promovidas de RLS, restore, jobs/DLQ, e-mail, R2/CORS/lifecycle e OAuth; preview usa dados sintéticos.

#### Atores, evidências e fluxo atual

Há scripts de preflight, smoke RLS, restore checklist e deployment smoke. Não há artefato de execução promovida, role/branch real, restore exercitado, provider sandbox ou alertas ativos acessível nesta auditoria.

#### Status de aderência

- **Status:** NÃO VERIFICÁVEL. **Severidade:** P1. **Confiança:** baixa para ambiente.
- **Correção/testes/PR:** executar e arquivar evidência datada de cada gate; bloquear pipeline sem ela. **PR 10**.

### `SCOPE-001` Limite de lançamento

#### Regra normativa e intenção

Lançamento limita-se a organização individual, catálogo, estoque, venda operacional, metas, billing e suporte; colaboração, compras/fiscal, refund e integrações novas exigem descoberta.

#### Atores, evidências e fluxo atual

Documentação e plano delimitam escopo, mas schema/app ainda carregam papéis colaborativos e superfícies administrativas. Não há mecanismo técnico geral que impeça expansão; funções fora de escopo não foram identificadas como lançamento operacional.

#### Status de aderência

- **Status:** PARCIALMENTE ADERENTE. **Severidade:** P2. **Confiança:** média.
- **Correção/testes/PR:** gate de produto/release e testes de ausência/feature flags para capacidades fora de escopo. **PR 10**.

## Matriz de rastreabilidade e cobertura

As referências por regra, tabelas, constraints, ações e testes estão consolidadas em [adherence-by-rule.md](normative/adherence-by-rule.md), [rule-test-coverage-audit-2026-07-14.md](rule-test-coverage-audit-2026-07-14.md) e [adherence-matrix.md](adherence-matrix.md). Esta auditoria atualiza a classificação com evidência cruzada dos pacotes compartilhados.

| Domínio | Regras | Parciais | Ausentes | Contraditórias | Não verificáveis | Cobertura efetiva |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Identidade/tenancy/relatório | 8 | 5 | 0 | 3 | 0 | local parcial; RLS promovido ausente |
| Plano/billing/jobs/e-mail | 7 | 2 | 1 | 4 | 0 | adapters/testes locais; lifecycle não provado |
| Catálogo/estoque/vendas/metas | 6 | 3 | 2 | 1 | 0 | venda forte; ledger/quota/timezone incompletos |
| Privacidade/confiabilidade/release | 7 | 3 | 2 | 1 | 1 | controles locais parciais; gates externos ausentes |

## Invariantes e máquinas de estado

| Invariante / lifecycle | Evidência executável | Resultado da auditoria |
| --- | --- | --- |
| identidade Google única | `accounts` e Better Auth | contraditório: linking por e-mail permanece e falta unique provider/sub |
| uma pessoa, uma organização, um owner | onboarding com advisory lock; `member` | parcial: app tenta limitar, banco admite múltiplos/roles extras |
| isolamento tenant | migrations RLS e tenant context | parcial: policies versionadas; prova runtime promovida ausente e cobertura incompleta de tabelas sensíveis |
| sessão revogada não autentica | schema/guards de sessão | parcial: sem TTLs/motivos/revogação global comprovados |
| entitlement não concede acesso indevido | `hasBillableAccess` | contraditório: Free não é operacional e não há quota/downgrade |
| saldo não negativo e rastreável | checks de `products`, locks, tabelas de entrada/baixa | contraditório: saldo local protegido, mas não há ledger único/reconciliação/idempotência total |
| venda não baixa duas vezes | chave de idempotência/lock em criação de venda | parcial: criação é protegida; cancelamento e ajustes não recuperam replay e não há ledger |
| total financeiro reproduzível | snapshots, `calculations.ts`, checks locais | parcial: serviço calcula, mas não há reconciliador persistido nem proteção integral contra escrita privilegiada |
| webhook duplicado não duplica efeito | `webhook_events`, outbox e reconcilers | contraditório: dedupe pode impedir recuperação do evento capturado antes de reconcile |
| mutação crítica deixa auditoria | audit de plataforma e helper tenant | parcial: plataforma é transacional; tenant é fail-open |
| transição de meta é válida | enum/índice e services de metas | contraditório: archive aceita terminal e resolução não usa CAS/transaction/audit |
| eventos de e-mail não regridem | `email_messages`/`email_events` | contraditório: handler não atualiza mensagem nem ordena estado |

| Entidade | Estados normativos | Estado implementado / falha |
| --- | --- | --- |
| organização | `active`, `suspended`, encerramento | suspensão redireciona onboarding; encerramento não implementado |
| assinatura/entitlement | Free, paid, grace, downgrade, cancel-at-period-end | apenas status provider/incomplete-active; sem clock/version/grace |
| pagamento/provider | fatos ordenados e idempotentes | reconcilers atualizam diretamente sem ordem/versionamento |
| venda | `completed → cancelled` | transição central existe; cancelamento não é comando recuperável nem ledgerizado |
| meta | `active → completed/expired/archived`; `archived → active` | guards insuficientes, resolução page-driven e concorrência insegura |
| e-mail | `pending → accepted → delivered` ou terminal | `pending → sent`, eventos desacoplados e sem anti-regressão |
| job/outbox | pending, retry, manual review/dead letter | lease/dead letter parcial; sem janela, jitter, revisão/alerta normativos |

## Bugs e riscos classificados

| Tipo | Situação | Severidade |
| --- | --- | --- |
| bug confirmado | webhook capturado sem recovery durável e com processamento síncrono | P1 |
| bug confirmado | linking implícito por e-mail contradiz identidade `google:sub` | P1 |
| bug confirmado | Free inicial fica bloqueado; seed é R$99 e não R$49,90 | P1 |
| bug confirmado | uma imagem de 10 MiB aceita onde norma exige até 5 MiB | P1 |
| condição de corrida | resolução de meta pode sobrescrever archive/update | P1 |
| falha de idempotência | entrada/baixa/cancelamento e mutações críticas não recuperam resultado | P1 |
| falha transacional | audit tenant fail-open; Woovi faz múltiplas escritas sem transação única demonstrada | P1 |
| risco de duplicidade | ajustes de estoque sem chave única | P1 |
| risco cross-tenant | RLS local versionado, mas sem prova de role/runtime promovido | P1, não confirmado |
| erro de cobertura | três testes admin de acessibilidade esperam fonte obsoleta | P2 |

## Regras bloqueadas por decisão externa

Não há ambiguidade normativa remanescente que bloqueie desenho. Há gates externos que bloqueiam release, não implementação: contrato/sandbox de Asaas e Woovi; R2 lifecycle/CORS; Resend e OAuth promovidos; role RLS e restore Neon; tabela jurídico-contábil de retenção; Privacy Lead/Incident Commander e runbook exercitado; alertas operacionais. Nenhum deve ser tratado como concluído por presença de código.

## Próximo passo

Executar os PRs do [plano de implementação da auditoria](implementation-pr-plan.md) na ordem declarada. Não há correção implementada por esta auditoria.
