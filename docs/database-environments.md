# Ambientes de banco Neon, E2E e RLS

## Objetivo

Separar URLs e roles por finalidade para evitar dois erros de producao:

- Playwright, desenvolvimento local ou preview escreverem na mesma branch PostgreSQL usada pela operacao real.
- Runtime da aplicacao usar role proprietaria com `BYPASSRLS`, anulando a barreira de tenant.

Dados de teste (`e2e+...@dgimports.local`, categorias `Categoria E2E`, etc.) devem existir apenas em branches dedicadas.

## Modelo recomendado

| Finalidade | Neon branch | Secret/env | Role esperada |
| --- | --- | --- | --- |
| Runtime producao | `production` protegida | `DATABASE_URL` | Role nao proprietaria sem `BYPASSRLS` (ex.: `polaris_app`) |
| Migrations | branch alvo da migration | `DATABASE_URL_DIRECT` | Role proprietaria/admin (ex.: `neondb_owner`) |
| Preview/dev | `preview` ou `dev` | `.env.local` ou env de preview | Role runtime sem `BYPASSRLS` quando RLS estiver habilitado |
| E2E / CI | `e2e` ou branch descartavel | `E2E_DATABASE_URL` | Role runtime da branch E2E, nunca producao |
| Smoke RLS manual | ambiente que sera promovido | `RLS_DATABASE_URL` | Mesma classe de role do runtime: sem `BYPASSRLS` |
| Preflight producao manual | secrets GitHub/Vercel de producao | `PRODUCTION_DATABASE_URL`, `PRODUCTION_DATABASE_URL_DIRECT` e envs externos | Runtime sem `BYPASSRLS` separado da role de migration |

1. No console Neon, crie uma branch separada para E2E (ex.: `e2e`) a partir de um snapshot aceitavel ou vazio.
2. Rode migracoes nessa branch com `DATABASE_URL_DIRECT` apontando para a role de migration.
3. Defina o runtime da branch com uma role sem `BYPASSRLS`.
4. Em CI, defina o secret `E2E_DATABASE_URL` com a connection string dessa branch.
5. Para validar a branch que sera promovida, defina `RLS_DATABASE_URL` com a connection string runtime do ambiente alvo.
6. Proteja a branch de producao no Neon contra reset acidental.

## GitHub Actions

O workflow `.github/workflows/ci.yml` possui um job `e2e` separado do `verify`.
Ele executa `bun run test:e2e` depois de `check`, Vitest, `knip` e build passarem.
Como o Playwright roda com `CI=true` no GitHub Actions, a ausencia do secret
`E2E_DATABASE_URL` falha a suite antes de subir o servidor. Isso e intencional:
nao use banco de producao, preview compartilhado ou `.env.local` para E2E em CI.

O workflow tambem possui o job manual `rls-smoke`. Ele so roda por `workflow_dispatch` e executa `bun run db:smoke:rls` com:

```yaml
DATABASE_URL: ${{ secrets.RLS_DATABASE_URL }}
```

Use esse secret para apontar para o ambiente que sera promovido. Nao reutilize `DATABASE_URL_DIRECT`: o smoke deve falhar se a URL usar uma role com `BYPASSRLS`.

O workflow tambem possui o job manual `production-preflight`, que executa `bun run prod:preflight` antes de deploy real. Configure estes secrets no GitHub Actions:

- `PRODUCTION_DATABASE_URL`: mesma classe da `DATABASE_URL` de runtime em producao, com role sem `BYPASSRLS` e `sslmode=verify-full`.
- `PRODUCTION_DATABASE_URL_DIRECT`: URL de migration/admin, separada do runtime e com `sslmode=verify-full`.
- `PRODUCTION_BETTER_AUTH_URL` e `PRODUCTION_NEXT_PUBLIC_APP_URL`: origem canonica de producao; as duas devem ter a mesma origem.
- `E2E_DATABASE_URL` e `RLS_DATABASE_URL`: branches/roles isoladas conforme descrito acima, ambas com role runtime sem `BYPASSRLS`.
- `BETTER_AUTH_SECRET` e `CRON_SECRET`: secrets fortes, com pelo menos 32 caracteres.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
- `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`.
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_STAGING` e `R2_BUCKET_PUBLIC`.

O preflight valida wiring de secrets e separacao de URLs. `E2E_DATABASE_URL` deve ser diferente tanto de `PRODUCTION_DATABASE_URL` quanto de `RLS_DATABASE_URL`, porque E2E escreve dados de teste e o smoke RLS valida o ambiente promovido. O preflight nao substitui `rls-smoke`, E2E isolado nem smoke funcional em Vercel/R2/Upstash.

## Playwright

O servidor de teste injeta `DATABASE_URL` a partir de `E2E_DATABASE_URL` quando definido (veja [playwright.config.ts](../playwright.config.ts)). Em `CI=true`, a suite falha se `E2E_DATABASE_URL` nao estiver definido.

Variaveis uteis:

- `E2E_DATABASE_URL`: connection string do banco somente para E2E (obrigatorio em CI).
- `RLS_DATABASE_URL`: connection string runtime do ambiente promovido, usada somente no job manual `rls-smoke`.
- `PRODUCTION_DATABASE_URL` / `PRODUCTION_DATABASE_URL_DIRECT`: aliases de GitHub Secrets para o job manual `production-preflight`; nao sao nomes esperados pelo runtime da aplicacao.
- `E2E_CRON_SECRET` / `E2E_INTERNAL_BOOTSTRAP_SECRET`: segredos locais ao servidor E2E (opcional; padroes seguros se omitidos).
- `ALLOW_E2E_SHARED_DATABASE=true`: nao use em CI; apenas para desenvolvedor que aceita conscientemente usar o mesmo `DATABASE_URL` do `.env.local` nos E2E.

## Smoke RLS

Rode antes de promover um ambiente com RLS:

```bash
bun run db:smoke:rls
```

O comando usa `DATABASE_URL`, nao `DATABASE_URL_DIRECT`, e faz rollback das escritas de smoke. Ele valida:

- role atual sem `BYPASSRLS`;
- policies RLS existentes;
- 13/13 tabelas tenant-scoped com `ENABLE ROW LEVEL SECURITY` e `FORCE ROW LEVEL SECURITY`;
- `organization`, `products` e `sales` invisiveis sem contexto tenant;
- insert tenant-scoped sem contexto negado por RLS;
- fluxo onboarding-like visivel dentro de transacao com `app.user_id` e `app.organization_id`.

## Auditoria de dados de teste (somente leitura)

Execute no SQL Editor do Neon na branch que deseja inspecionar:

```sql
-- Usuarios bootstrap/E2E
select count(*) filter (where email like 'e2e+%@dgimports.local') as e2e_users,
       count(*) as total_users
from public.users;

-- Produtos criados pelos testes (prefixos dos specs)
select count(*) filter (
  where name ~ '^(Produto E2E|Produto Preco|Produto Cartao) '
) as test_products
from public.products;
```

## Limpeza destrutiva (revisar antes de executar)

Aviso: apaga linhas de teste com base em padroes conhecidos. Revise em staging, faca backup ou PITR no Neon antes de rodar em qualquer branch compartilhada.

Ordem sugerida (FKs): `sale_items` -> `sales` -> filhos de produto -> `products` -> `categories` (exceto sistema) -> `users` de teste.

Exemplo de rascunho; nao execute em producao sem adaptar e aprovar:

```sql
begin;

-- Itens e vendas ligadas a produtos de teste
delete from public.sale_items
where product_id in (
  select id from public.products
  where name ~ '^(Produto E2E|Produto Preco|Produto Cartao) '
);

delete from public.sales
where id not in (select distinct sale_id from public.sale_items);

-- Ajuste conforme integridade real do seu schema

rollback; -- troque por commit apos validar
```

Prefira limpar apenas na branch `e2e` e recriar a branch a partir de `production` quando quiser um estado limpo.

## Limpeza destrutiva em producao

Para um roteiro revisado com PITR, auditoria e SQL transacional (incluindo manter apenas dois e-mails operacionais), veja [production-database-cleanup.md](./production-database-cleanup.md) e [production-database-cleanup.sql](./production-database-cleanup.sql).
