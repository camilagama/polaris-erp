# Apresentação explícita de instantes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exibir instantes operacionais sempre em BRT, independentemente do runtime de Server Components ou browser.

**Architecture:** A mesma entrada client-safe introduzida na PR 1 fornece
formatter de instante parametrizado por locale, com `timeZone` fixo. A UI e o
admin a consomem; datas civis continuam no formatter de data sem hora.

**Tech Stack:** TypeScript, `Intl.DateTimeFormat`, React/Next.js, Vitest.

---

## Status

- **Priority:** P2
- **Effort:** M
- **Risk:** LOW
- **Depends on:** `001-modulo-temporal-client-safe.md`
- **Planned at:** commit `97e3c3a`, 2026-07-16

## Tasks

### Task 1: Adicionar formatter e teste de apresentação

- [ ] Acrescentar `formatBusinessDateTime(value, options?)` a `@polaris/date`.
  Ele recebe um instante/ISO válido, usa locale `pt-BR`, inclui explicitamente
  `timeZone: BUSINESS_TIME_ZONE` e não é usado para `YYYY-MM-DD`.
- [ ] Testar `2026-01-01T02:30:00.000Z` => `31/12/2025, 23:30` (respeitando a
  pontuação do `Intl` do runtime) e `03:30Z` => `01/01/2026, 00:30`.

### Task 2: Substituir formatters dependentes do runtime

- [ ] Atualizar `packages/ui/src/lib/formatters.ts` para que `formatDateTime`
  use o formatter BRT; manter `formatDate` para date-only.
- [ ] Remover as quatro funções locais duplicadas em admin-access, audit,
  organization detail e user detail; trocar `formatEventDate` em admin root e
  confirmar `billing/page.tsx`/events já recebem o formatter UI.
- [ ] Preservar labels de weekday construídas a partir de `T12:00:00`, pois
  são apresentação de data civil, não instantes.

### Task 3: Verificar a superfície completa

- [ ] Criar/ajustar testes unitários dos formatters e páginas admin para um
  instante que cruza a meia-noite BRT.
- [ ] Rodar `bun run test:admin`, `bun run test`, `bun run typecheck:all` e
  `bun x ultracite check` => exit 0.

## Done criteria

- [ ] Busca por `new Intl.DateTimeFormat("pt-BR"` em `apps/admin/src` não
  encontra formatter de timestamp sem `timeZone` explícito.
- [ ] Todos os consumidores de `@polaris/ui/lib/formatters` mantêm assinatura
  e exibem o instante BRT.

## STOP conditions

- Se uma tela administrativa precisar deliberadamente exibir o timezone do
  usuário, criar API explícita para essa exceção; não remover BRT por omissão.
