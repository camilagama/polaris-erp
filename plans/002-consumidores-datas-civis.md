# Consumidores de datas civis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer filtros, ranges, gráficos, metas e due dates usarem a data civil BRT sem depender do timezone do runtime.

**Architecture:** Depois da PR 1, todo “hoje” vem de `formatBusinessDate()` e
toda janela de calendário usa `shiftBusinessDate`/`getBusinessMonthBounds`.
Não converter strings civis a meia-noite e depois reformatar no fuso BRT.

**Tech Stack:** Next.js App Router, React 19, date-fns somente para apresentação, Vitest.

---

## Status

- **Priority:** P1
- **Effort:** M
- **Risk:** MED
- **Depends on:** `001-modulo-temporal-client-safe.md`
- **Planned at:** commit `97e3c3a`, 2026-07-16

## Scope

**In scope:** os arquivos de range/analytics de dashboard, produtos e vendas;
checkout Asaas; eventos admin; fallbacks dos três gráficos; default de meta e
seus testes focados.

**Out of scope:** `date` SQL/defaults, formatter de instantes e componentes
de date-picker que já mantêm `YYYY-MM-DD` como valor civil local.

## Tasks

### Task 1: Caracterizar os limites que hoje falham

- [ ] Adicionar casos a `products/analytics.test.ts`, `sales/analytics.test.ts`
  e `dashboard/metrics.test.ts` com `2026-01-01T02:30:00.000Z`; provar que 30
  datas civis consecutivas começam 29 dias antes de `today`, sem chave do dia
  anterior. Controlar o `Date` injetado ou expor helper puro, nunca `process.env.TZ`.
- [ ] Criar testes de eventos admin e checkout com 02:59Z/03:00Z e mês/ano;
  esperado: a due date/filtro muda somente na meia-noite BRT.
- [ ] Rodar cada teste focado => observar falha que reproduz o deslocamento.

### Task 2: Migrar ranges e analytics server

- [ ] Em `products/server.ts`, trocar o `new Date(`${today}T00:00:00`)` por
  `shiftBusinessDate(today, -29)`.
- [ ] Em `dashboard/date-range.ts`, `dashboard/metrics.ts`,
  `products/analytics.ts` e `sales/analytics.ts`, gerar keys, janelas e
  month bounds exclusivamente como strings civis. Para labels, use noon local
  (`T12:00:00`) ou as partes civis, sem passar o resultado para
  `formatBusinessDate`.
- [ ] Rodar testes de dashboard, produtos e vendas => todos passam.

### Task 3: Migrar bordas client/provider e fallbacks

- [ ] Trocar os dois `toISOString().slice(0, 10)` em eventos admin e os dois
  `nextDueDate` Asaas por `formatBusinessDate()`.
- [ ] Em `goal-form-dialog.tsx`, derivar o mês a partir de `getBusinessMonthBounds(formatBusinessDate())`, não `startOfMonth/endOfMonth(new Date())`.
- [ ] Nos gráficos web/admin/platform, produzir o array vazio a partir do
  business today e `shiftBusinessDate`; manter o agrupamento SQL BRT existente.
- [ ] Criar testes dos fallbacks verificando primeira/última data, ordem e
  ausência de duplicatas na transição 02:59Z/03:00Z.

## Done criteria

- [ ] Busca por `toISOString().slice(0, 10)` em `apps/` não retorna uso para
  data de negócio.
- [ ] Busca por `parseISO(`${...}T00:00:00`)` nos arquivos em escopo não é
  seguida por `formatBusinessDate` para gerar key/range.
- [ ] Ranges de 30 dias têm exatamente 30 chaves inclusive em mês/ano bissexto.
- [ ] `bun run test`, `bun run test:admin`, `bun run typecheck:all` e
  `bun x ultracite check` => exit 0.

## STOP conditions

- Se o provider Asaas documentar `nextDueDate` como UTC em vez de data civil,
  parar e registrar a evidência antes de alterar o contrato.
- Se um gráfico receber data-hora em vez de `YYYY-MM-DD`, não a truncar;
  corrigir o producer em uma extensão de escopo revisada.
