# Banco: datas de negócio explícitas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar os defaults e a reconciliação histórica de datas de negócio independentes da TimeZone da sessão PostgreSQL.

**Architecture:** O schema declara expressões SQL BRT explícitas para futuras
linhas; uma migration nova altera defaults e corrige o ledger derivado de
`cancelled_at`. Não editar migrations aplicadas nem adicionar timezone aos
wrappers RLS.

**Tech Stack:** Drizzle, PostgreSQL/Neon, `pg`, Vitest behavior database.

---

## Status

- **Priority:** P1
- **Effort:** M
- **Risk:** MED
- **Depends on:** `001-modulo-temporal-client-safe.md`
- **Planned at:** commit `97e3c3a`, 2026-07-16

## Current state

- Defaults `CURRENT_DATE`: `schema.ts:1133,1327,1366,1452`.
- Backfill ambíguo: `20260714243000_stock_ledger.sql:28`.
- Contextos em `tenant-context.ts` usam `set_config(..., true)` para RLS;
  eles não são e não devem virar configuração temporal global.

## Tasks

### Task 1: Criar prova PostgreSQL antes da migration

- [ ] Em `packages/db/src/postgres-behavior.test.ts`, adicionar teste que abre
  sessão UTC, insere linhas omitindo cada uma das quatro datas e espera a data
  BRT para um instante perto de meia-noite. Repetir com sessão
  `America/Sao_Paulo` e exigir o mesmo resultado.
- [ ] Adicionar fixture de sale cancelada em `02:30Z` e verificar que a data
  esperada do reversal é o dia BRT anterior.
- [ ] Rodar `bun run --cwd packages/db test:postgres` contra
  `POSTGRES_BEHAVIOR_DATABASE_URL` isolada => os novos asserts falham antes
  da migration.

### Task 2: Atualizar schema e migration aditiva

- [ ] Alterar os quatro `.default(sql`CURRENT_DATE`)` para a expressão
  `sql`((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date)``.
- [ ] Gerar/adicionar uma migration nova que faz `ALTER TABLE ... ALTER COLUMN
  ... SET DEFAULT` nas quatro colunas. Não editar `20260704051610_initial.sql`
  nem snapshots históricos manualmente.
- [ ] Na mesma migration, atualizar somente `stock_movements` do tipo
  `sale_reversal` cujo `source_id` aponta para item de sale cancelada, usando
  `(sales.cancelled_at AT TIME ZONE 'America/Sao_Paulo')::date`. Antes do
  `UPDATE`, incluir query de contagem no runbook/saída de migration para revisão
  operacional; preservar `occurred_on` quando `cancelled_at IS NULL`.

### Task 3: Verificar comportamento e reversibilidade operacional

- [ ] Rodar behavior tests novamente e confirmar defaults iguais em sessões
  UTC/BRT, inclusive 02:59Z e 03:00Z.
- [ ] Rodar `bun run --cwd packages/db typecheck` e `bun x ultracite check`.
- [ ] Documentar no PR a consulta de preview, quantidade de linhas alteradas,
  backup/branch Neon e rollback: restaurar somente os valores da snapshot ou
  reverter a migration em ambiente não promovido, nunca reexecutar a migration
  histórica.

## Done criteria

- [ ] Nenhum default de data de negócio no schema usa `CURRENT_DATE` sozinho.
- [ ] Nenhuma migration nova usa `date(timestamptz)` sem `AT TIME ZONE`.
- [ ] `bun run --cwd packages/db test:postgres` passa em banco isolado.

## STOP conditions

- Sem `POSTGRES_BEHAVIOR_DATABASE_URL`, não aplicar migration: registrar o
  bloqueio e executar somente testes unitários.
- Se o preview mostrar linhas cujo `cancelled_at` é nulo ou cuja data difere por
  motivo de negócio documentado, parar antes de atualizar dados históricos.
