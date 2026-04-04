# Ambientes de banco (Neon) e E2E

## Objetivo

Evitar que Playwright, desenvolvimento local ou preview escrevam na mesma branch PostgreSQL usada pela operacao real. Dados de teste (`e2e+...@dgimports.local`, categorias `Categoria E2E`, etc.) devem existir apenas em branches dedicadas.

## Modelo recomendado

| Ambiente        | Neon branch        | `DATABASE_URL`                          |
|----------------|--------------------|-----------------------------------------|
| Producao       | `production` (protegida) | Secret na Vercel / producao      |
| Preview / dev  | `preview` ou `dev` | `.env.local` ou variavel de preview |
| E2E / CI       | `e2e` ou branch descartavel | `E2E_DATABASE_URL` (obrigatorio em CI) |

1. No console Neon, crie uma branch separada para E2E (ex.: `e2e`) a partir de um snapshot aceitavel ou vazio.
2. Rode migracoes nessa branch: `bun run db:migrate` com `DATABASE_URL` apontando para ela.
3. Em CI, defina o secret `E2E_DATABASE_URL` com a connection string dessa branch.
4. Proteja a branch de producao no Neon contra reset acidental.

## Playwright

O servidor de teste injeta `DATABASE_URL` a partir de `E2E_DATABASE_URL` quando definido (veja [playwright.config.ts](../playwright.config.ts)). Em `CI=true`, a suite falha se `E2E_DATABASE_URL` nao estiver definido.

Variaveis uteis:

- `E2E_DATABASE_URL` — connection string do banco **somente** para E2E (obrigatorio em CI).
- `E2E_CRON_SECRET` / `E2E_INTERNAL_BOOTSTRAP_SECRET` — segredos locais ao servidor E2E (opcional; padroes seguros se omitidos).
- `ALLOW_E2E_SHARED_DATABASE=true` — **nao** use em CI; apenas para desenvolvedor que aceita conscientemente usar o mesmo `DATABASE_URL` do `.env.local` nos E2E (arriscado).

## Auditoria de dados de teste (somente leitura)

Execute no SQL Editor do Neon **na branch que deseja inspecionar**:

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

**Aviso:** apaga linhas de teste com base em padroes conhecidos. Revise em staging, faca backup ou PITR no Neon antes de rodar em qualquer branch compartilhada.

Ordem sugerida (FKs): `sale_items` -> `sales` -> filhos de produto -> `products` -> `categories` (exceto sistema) -> `users` de teste.

Exemplo de rascunho — **nao** execute em producao sem adaptar e aprovar:

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
