# RLS tenant isolation

## Decisao

RLS e obrigatorio antes de producao aberta.

O caminho aprovado e implementar isolamento em duas camadas:

1. Repository/app code continua filtrando por `organizationId`.
2. PostgreSQL RLS passa a ser a barreira obrigatoria no banco para tabelas tenant-scoped.

Essa decisao substitui o pendente anterior de "RLS ou repository tenant-scoped": repository sozinho nao e suficiente para producao.

## Evidencia atual

- Banco inspecionado em 2026-07-07: `neondb`.
- Role de conexao atual: `neondb_owner`.
- PostgreSQL: `18.4`.
- Policies existentes em `public.pg_policies`: nenhuma.
- App usa `pg.Pool` via `drizzle-orm/node-postgres` em `src/db/index.ts`.
- `DATABASE_URL` local usa endpoint pooler; `DATABASE_URL_DIRECT` existe para migrations.

## Docs consultadas

- PostgreSQL current: Row Level Security e `CREATE POLICY`.
- Neon docs via ctx7: branching temporario/schema-only para testar schema sem aplicar direto em producao.

## Arquitetura escolhida

As policies devem usar tenant de transacao, nao estado de sessao solto.

Motivo: em ambiente serverless/pooler, um `SET` de sessao pode vazar entre requests se usado incorretamente. O padrao seguro e executar queries tenant-scoped dentro de uma transacao que define:

```sql
select set_config('app.organization_id', '<organization-id>', true);
```

O terceiro argumento `true` limita o valor a transacao atual. As policies consultam:

```sql
current_setting('app.organization_id', true)
```

Se o valor nao existir, a policy deve negar acesso por padrao.

## Escopo inicial de RLS

RLS deve cobrir tabelas com dados de organizacao:

- `organization`
- `member`
- `invitation`
- `audit_events`
- `categories`
- `system_settings`
- `products`
- `product_price_changes`
- `product_stock_entries`
- `product_stock_write_offs`
- `sales`
- `sale_items`
- `goals`

Auth base do Better Auth fica fora do primeiro corte:

- `users`
- `sessions`
- `accounts`
- `verifications`

Motivo: login, callback OAuth, criacao de sessao e onboarding pre-tenant precisam funcionar antes de existir organizacao ativa. A protecao desses fluxos continua em app code e FKs; RLS entra onde ha `organization_id` ou equivalencia direta com tenant.

## FORCE RLS

Como a aplicacao conecta hoje como `neondb_owner`, habilitar RLS sem `FORCE ROW LEVEL SECURITY` pode nao proteger queries feitas pelo dono da tabela.

O corte de producao deve fazer uma destas duas coisas:

1. Criar uma role runtime nao proprietaria para a aplicacao e manter `neondb_owner` apenas para migrations.
2. Aplicar `FORCE ROW LEVEL SECURITY` nas tabelas tenant-scoped.

Para MVP, a opcao recomendada e `FORCE ROW LEVEL SECURITY` mais wrapper transacional. A criacao de role runtime fica como hardening posterior, porque exige troca coordenada de secrets em Vercel/Neon.

## Sequencia segura

1. Criar testes locais que provam a migration RLS esperada.
2. Criar helper `withTenantDb(organizationId, callback)` que abre transacao, seta `app.organization_id` com `set_config(..., true)` e executa queries via `tx`.
3. Migrar reads/writes tenant-scoped para usarem o helper ou receberem `tx` ja tenant-scoped.
4. Criar migration com `ENABLE ROW LEVEL SECURITY`, policies e `FORCE ROW LEVEL SECURITY`.
5. Testar a migration em branch Neon temporaria.
6. Rodar smoke contra branch isolada:
   - login/onboarding sem tenant ainda funciona;
   - tenant A nao le tenant B;
   - inserts/updates sem `app.organization_id` falham;
   - inserts/updates com tenant errado falham;
   - fluxos produto, estoque, venda, cancelamento e imagem funcionam com tenant correto.
7. Aplicar em producao somente depois de E2E com `E2E_DATABASE_URL` isolado.

## Criterio de aceite

- Nenhuma tabela tenant-scoped listada acima fica sem RLS.
- Queries sem `app.organization_id` nao retornam nem escrevem dados tenant-scoped.
- Queries com `app.organization_id` de outro tenant nao retornam nem escrevem dados.
- App continua funcionando nos fluxos principais quando passa pelo wrapper tenant-scoped.
- Better Auth continua funcional antes e depois de selecionar organizacao ativa.
- Migration foi validada em branch Neon temporaria antes de qualquer aplicacao em branch principal.

## Riscos

- Aplicar `FORCE RLS` antes de adaptar app code quebra reads/writes tenant-scoped.
- RLS em tabelas de auth neste corte pode quebrar login/onboarding.
- Usar `SET` de sessao em vez de `set_config(..., true)` pode vazar tenant em conexao reutilizada.
- Policies permissivas com fallback para `true` quando `app.organization_id` esta ausente anulam a protecao.

## Status

Decisao tomada. Implementacao ainda pendente.
