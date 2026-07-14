# PR-003: Restaurar higiene de workspaces, Knip e gates do UI

> **Para execução:** seguir este plano em ordem, preservando alterações não relacionadas já presentes no worktree.

**Objetivo:** fazer de `bun run knip` um gate confiável e tornar cada workspace responsável por seu grafo runtime e suas verificações.

**Arquivos de escopo:** `knip.config.ts`, `package.json`, `bun.lock`, `apps/web/package.json`, `apps/admin/package.json`, `packages/ui/package.json`, `apps/web/src/db/*`, `.gitignore`, arquivos rastreados em `packages/*/.turbo/`, `aidd_docs/codebase-deep-review-2026-07-13.md`.

## Sequência de execução

### 1. Cobrir todos os workspaces no Knip

1. Registrar os scripts operacionais em `scripts/` como entradas do workspace raiz, para que sejam analisados sem inferir que não possuem caller.
2. Adicionar `packages/billing`, `packages/emails` e `packages/ui` ao mapa de workspaces do Knip. O UI deve usar suas exportações públicas como entradas e todo `src/` como projeto.
3. Executar `bun run knip`; o resultado continua vermelho inicialmente e serve como lista de trabalho, não como autorização para usar ignores genéricos.

### 2. Corrigir ownership de dependências e gates do UI

1. Adicionar `test` e `typecheck` em `packages/ui/package.json`.
2. Remover do `package.json` raiz as dependências runtime que já pertencem ao UI (`@daypicker/react`, `class-variance-authority`, `clsx`, `cmdk`, `radix-ui`, `sonner`, `tailwind-merge`).
3. Remover de `apps/web/package.json` `@polaris/platform` e `@polaris/platform-auth`, após busca sem imports reais.
4. Remover de `apps/admin/package.json` `@polaris/events`, após busca sem imports reais.
5. Rodar `bun install` para atualizar apenas o lockfile e depois `bun install --frozen-lockfile` para provar sua consistência.

### 3. Remover wrappers e exports sem caller confirmado

1. Confirmar que não existem imports dos wrappers `apps/web/src/db/{index,schema,tenant-context}.ts`.
2. Mover os testes de contexto do tenant para `packages/db/src/`, onde já testam a implementação efetiva, e apagar os wrappers sem caller.
3. Remover somente exports apontados pelo Knip que não tenham consumidor confirmado, preservando APIs testadas ou operacionais. Não remover scripts operacionais.
4. Executar testes focados de DB, webhooks e UI após cada remoção relevante.

### 4. Evitar artefatos Turbo rastreados

1. Adicionar `/packages/*/.turbo/` ao `.gitignore`.
2. Remover do índice, sem apagar do disco, somente os 13 logs Turbo rastreados em `packages/*/.turbo/`.
3. Executar os gates e confirmar com `git status --short` que uma execução de teste não modifica artefatos rastreados em `.turbo`.

### 5. Verificação e rastreabilidade

1. Rodar `bun run knip`, `bun run test:all`, `bun run typecheck:all`, `bun run check:all` e `bun run build:all`.
2. Atualizar a PR-003 para `DONE` no relatório somente se todos os critérios forem satisfeitos. Caso um gate externo não possa ser executado, manter `IN PROGRESS` e registrar o bloqueio exato.

## Critérios de aceite

- Knip sem erros e sem ignore amplo.
- Turbo inclui os 4 testes UI e o typecheck do UI.
- Lockfile é reproduzível com `--frozen-lockfile`.
- Nenhum script operacional foi removido por inferência estática.
- Nenhum log de `.turbo` volta a ser rastreado após os gates.

## Resultado

- [x] Todos os workspaces relevantes foram incluídos no Knip, preservando scripts operacionais como entradas reais.
- [x] O UI passou a expor gates `test` e `typecheck`; o Turbo executou seus 4 testes e seu typecheck.
- [x] Dependências sem consumidor confirmado e wrappers web sem imports foram removidos.
- [x] Logs Turbo foram removidos apenas do índice e o padrão de ignore cobre os pacotes.
- [x] Knip, instalação congelada, testes, typecheck, check e build completos passaram.
