# Invariantes de cancelamento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Impedir estados persistidos em que a venda e sua data civil de cancelamento divergem.

**Architecture:** O banco continua registrando o instante `cancelled_at` e a
data de negócio `cancelled_on`; a constraint torna ambos coerentes com
`status`. Esta PR não redefine o instante nem reprocessa ledger, já cobertos
na PR 3.

**Tech Stack:** Drizzle, PostgreSQL, Vitest behavior database.

---

## Status

- **Priority:** P2
- **Effort:** M
- **Risk:** MED
- **Depends on:** `003-banco-datas-negocio-explicitas.md`
- **Planned at:** commit `97e3c3a`, 2026-07-16

## Tasks

### Task 1: Medir e caracterizar dados legados

- [ ] Preparar query de leitura que agrupe sales inválidas: cancelada sem
  `cancelled_on`, concluída com `cancelled_on`, e cancelada com data diferente
  de `(cancelled_at AT TIME ZONE 'America/Sao_Paulo')::date`.
- [ ] Executar-a apenas no banco de comportamento/branch Neon; anexar somente
  contagens redigidas ao PR. Se produção tiver discrepâncias, obter aprovação
  explícita do responsável antes do `UPDATE`.

### Task 2: Testar e aplicar a constraint

- [ ] Em `postgres-behavior.test.ts`, adicionar inserts que aceitam venda
  concluída sem ambos os campos e cancelada com ambos; rejeitam cancelada sem
  `cancelled_on` e concluída com `cancelled_on`.
- [ ] Criar migration nova: primeiro normalizar as linhas aprovadas da Task 1;
  depois adicionar `CHECK` que expressa “`cancelled_on` existe se e somente se
  status é cancelled”. Manter a constraint atual de `cancelled_at`.
- [ ] Decidir e documentar no PR se a igualdade com a data BRT de
  `cancelled_at` é invariante obrigatória. Só adicionar essa forma mais forte
  após a query de legados não encontrar exceção válida.

## Done criteria

- [ ] O banco rejeita os dois estados órfãos.
- [ ] A ação de cancelamento existente em `features/sales/server.ts:607-632`
  continua passando no behavior test.
- [ ] `bun run --cwd packages/db test:postgres` e typecheck passam.

## STOP conditions

- Se alguma integração autorizada cria cancelamento em duas fases, não impor a
  constraint imediata; modelar a transição ou deferir com decisão explícita.
