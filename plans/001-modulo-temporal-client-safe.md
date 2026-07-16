# Módulo temporal client-safe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar uma única API compartilhada para instantes e datas civis BRT, sem levar Zod ao bundle client.

**Architecture:** `@polaris/date` terá entrada sem dependências para a política e aritmética de `YYYY-MM-DD`; a validação Zod permanece em uma entrada server/web separada. A API recebe `Date` somente para converter um instante para data de negócio e usa componentes UTC somente como mecanismo interno de aritmética de uma data civil.

**Tech Stack:** TypeScript, `Intl.DateTimeFormat`, Bun workspaces, Vitest.

---

## Status

- **Priority:** P1
- **Effort:** M
- **Risk:** MED
- **Depends on:** none
- **Planned at:** commit `97e3c3a`, 2026-07-16

## Current state

- `apps/web/src/lib/domain/date.ts:4-35` mistura a constante, formatter,
  validação Zod e `date-fns`; `packages/platform/src/platform-dashboard.ts:8-26`
  duplica a constante/formatter.
- `apps/admin`, `apps/web` e `packages/platform` ainda não dependem de
  `@polaris/date`. `packages/date/` existe sem fonte rastreada; confirmar o
  estado antes de criar arquivos.

## Scope

**In scope:** `packages/date/**`, manifests raiz/web/admin/platform/db/ui,
`apps/web/src/lib/domain/date.ts`, nova entrada de validação web e testes.

**Out of scope:** migrar callers, alterar SQL ou mudar textos de UI; isso é
tratado pelos PRs 2–5.

## Tasks

### Task 1: Definir a API e testes primeiro

- [ ] Criar `packages/date/package.json`, `tsconfig.json`, `src/index.ts` e
  `src/index.test.ts`, seguindo exports explícitos dos outros packages.
- [ ] Escrever testes determinísticos para:
  `formatBusinessDate(new Date("2026-01-01T02:59:59.999Z")) ===
  "2025-12-31"`; `03:00:00.000Z === "2026-01-01"`; salto de mês/ano;
  `shiftBusinessDate("2024-02-28", 1) === "2024-02-29"`; e limites de mês
  retornados por `getBusinessMonthBounds("2026-02-15")`.
- [ ] Rodar `bun run --cwd packages/date test` => os testes novos falham antes
  da implementação.

### Task 2: Implementar somente primitivas client-safe

- [ ] Exportar `BUSINESS_TIME_ZONE`, `formatBusinessDate`,
  `shiftBusinessDate`, `getBusinessMonthBounds` e, se os callers precisarem,
  `businessDateParts`. Não importar Zod, Next, `server-only` ou `date-fns`.
- [ ] `formatBusinessDate` deve usar formatter `en-CA` com `timeZone` fixo.
  `shiftBusinessDate` deve decompor o ISO civil, construir `Date.UTC`, somar
  dias UTC e retornar `YYYY-MM-DD`; ela não pode chamar `formatBusinessDate`.
- [ ] Rodar `bun run --cwd packages/date test` e
  `bun run --cwd packages/date typecheck` => exit 0.

### Task 3: Separar validação e manter compatibilidade controlada

- [ ] Mover `isoDateSchema` para `apps/web/src/lib/domain/date-validation.ts`.
  O schema deve validar data de calendário e pode importar Zod; atualizar os
  três schemas web e `dashboard/date-range.ts` para essa entrada.
- [ ] Transformar `apps/web/src/lib/domain/date.ts` em fachada sem Zod que
  reexporta `formatBusinessDate` como `formatDateInputValue` e as primitivas
  civis necessárias. Adicionar dependências `workspace:*` apenas aos
  packages/apps consumidores diretos.
- [ ] Executar `bun run --cwd apps/web test -- src/lib/domain/date.test.ts` e
  `bun run typecheck:all` => exit 0.

## Done criteria

- [ ] A entrada principal de `@polaris/date` não contém `zod`, `date-fns` ou
  diretiva server-only.
- [ ] Os testes cobrem 02:59/03:00 UTC, fevereiro bissexto e virada de ano.
- [ ] Não há segunda definição de `BUSINESS_TIME_ZONE` nos arquivos migrados.
- [ ] `bun x ultracite check` => exit 0.

## STOP conditions

- Se `packages/date` já contiver código não rastreado ou dependentes não
  previstos, parar e reportar antes de substituí-lo.
- Se qualquer caller client ainda precisar validar com Zod em runtime, separar
  esse contrato numa entrada própria em vez de reintroduzi-lo no root export.
