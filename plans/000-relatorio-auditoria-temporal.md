# Relatório de auditoria: data, hora e fuso

**Data:** 2026-07-16  
**Base analisada:** commit `97e3c3a`  
**Escopo:** `apps/web`, `apps/admin`, `packages/*`, schema, migrations e testes
temporais rastreados pelo Git. Não houve alteração de código de produção.

## Veredito

O projeto já decidiu corretamente que `America/Sao_Paulo` é a zona canônica
das **datas civis de negócio** (`TIME-001`, `DEC-BR-049`), mas a decisão não é
aplicada de forma uniforme. Há bugs reais nas bordas de dia/mês e uma fonte de
inconsistência persistida no banco. A causa comum é confundir dois domínios:

- `timestamptz`/`Date`: um instante absoluto. Auditoria, expiração, health,
  leases, cursores e webhooks devem continuar assim.
- `date`/`YYYY-MM-DD`: uma data civil sem hora. Vendas, estoque, períodos,
  filtros e datas enviadas ao provider devem ser calculados explicitamente em
  `America/Sao_Paulo` e jamais reinterpretados no fuso do processo.

## Achados confirmados

1. **P1, alta confiança. Defaults e backfill SQL dependem da sessão.**
   `packages/db/src/schema.ts:1133,1327,1366,1452` usa `CURRENT_DATE`;
   `packages/db/src/migrations/20260714243000_stock_ledger.sql:28` usa
   `date(cancelled_at)`. Ambos variam com `TimeZone` da conexão. A correção é
   SQL explícito, por exemplo `(CURRENT_TIMESTAMP AT TIME ZONE
   'America/Sao_Paulo')::date` e `(cancelled_at AT TIME ZONE
   'America/Sao_Paulo')::date`, em migration nova.

2. **P1, alta confiança. Datas civis são convertidas em instantes locais e
   reformatadas como BRT.** `apps/web/src/features/products/server.ts:64-66`
   produz a janela recente com esse padrão. `dashboard/metrics.ts:221-234`,
   `products/analytics.ts:93-117`, `sales/analytics.ts:58-71` e a faixa do
   contribution graph repetem a técnica. Em runtime UTC, meia-noite ainda é o
   dia anterior em São Paulo, deslocando keys, meses e a janela de 30 dias.

3. **P1, alta confiança. “Hoje” em UTC é usado como data operacional.**
   `apps/admin/.../events/page.tsx:54,56`,
   `events-date-filter.tsx:24`,
   `pre-signup-checkout.ts:89` e `checkout-dispatcher.ts:269` usam
   `toISOString().slice(0, 10)`. Entre 21h e 23h59 BRT, a data vira o dia
   seguinte. A página de eventos pode inclusive divergir de seu filtro client.

4. **P1, alta confiança. Fallbacks dos gráficos não seguem o calendário de
   negócio.** Os fallbacks em `sales-contribution-graph-card.tsx:86-89`,
   `activity-graph.tsx:46-49` e `platform-dashboard.ts:146-151` subtraem dias
   no fuso do browser/runtime. O SQL populado do dashboard já agrupa BRT;
   somente o padding vazio está desalinhado.

5. **P2, alta confiança. Formatação de instantes no admin depende do runtime.**
   Os formatadores locais em `admin-access/page.tsx`, `audit/page.tsx`,
   `organizations/[organizationId]/page.tsx`, `users/[userId]/page.tsx` e
   `page.tsx`, além de `@polaris/ui/lib/formatters.ts`, omitem `timeZone`.
   Um instante pode aparecer UTC em Server Components, contrariando a mesma
   política operacional.

6. **P2, alta confiança. A integridade de `cancelled_on` não é garantida.**
   `sales` modela `cancelled_at` e `cancelled_on`, mas
   `packages/db/src/schema.ts:1535-1538` só restringe o primeiro. SQL futuro
   pode persistir venda cancelada sem data civil ou venda concluída com ela.

## Avaliação dos relatórios recebidos

- O primeiro relatório acertou a duplicação, os usos de UTC e a necessidade
  de testes, mas erra ao tratar timezone da sessão como solução global. `SET`
  é por sessão e `set_config(..., true)` é por transação; migrations e outros
  clientes permanecem fora dessa garantia. Também omite vários consumidores
  civis e colocaria Zod na entrada client do módulo compartilhado.
- O segundo relatório está materialmente correto: preserva timestamps,
  requer conversão SQL explícita, identifica o bug de `products/server.ts`,
  fallbacks omitidos e o risco de Zod. Esta auditoria ampliou-o com analytics,
  goal default, displays administrativos e o invariante de `cancelled_on`.

## O que está correto e não deve mudar

- `new Date().toISOString()` em healthchecks, diagnósticos e serialização de
  instantes.
- `now()` em `created_at`, `updated_at`, leases e expirações.
- `Date.now()` para TTL/rate limit.
- Conversões já explícitas de `created_at AT TIME ZONE 'America/Sao_Paulo'`
  no agrupamento SQL do dashboard de plataforma.

## Evidência externa

A pesquisa citada em `research-postgresql-temporal-semantics.md` usa apenas a
documentação oficial PostgreSQL. Ela confirma que `CURRENT_DATE` e
`date(timestamptz)` dependem de `TimeZone`; `now()` é um instante; e a
conversão correta para uma data BRT é `AT TIME ZONE` seguido de cast para
`date`.

## Cobertura e risco residual

Não houve conexão a ambiente Neon nem execução de migrations, portanto não se
afirma quais linhas históricas foram materializadas no dia errado. A PR 3 deve
rodar contra o banco de comportamento e incluir uma query de contagem/preview
antes de qualquer `UPDATE` corretivo. A suíte atual testa o formatador BRT,
mas não testa de modo suficiente seus consumidores, filtros, defaults do banco
ou todas as bordas de mês/ano.
