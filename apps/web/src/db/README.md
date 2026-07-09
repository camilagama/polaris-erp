# Setup Neon + Drizzle ORM - Polaris

## Configuracao inicial

### 1. Connection string do Neon

1. Acesse o projeto no Neon.
2. Copie a connection string com SSL.
3. Salve no `.env.local`:

```bash
DATABASE_URL="postgresql://..." # pooled (para a aplicacao)
DATABASE_URL_DIRECT="postgresql://..." # direto (para migracoes)
```

### 2. Fluxo de migracoes

```bash
bun run db:generate
bun run db:migrate
```

Em desenvolvimento, pode usar `db:push` quando necessario:

```bash
bun run db:push
```

## Estrutura atual do banco

### Tabelas de autenticacao (Better Auth)

- `users` — IDs gerados pelo Better Auth como TEXT
- `sessions` — indexado por user_id
- `accounts` — indexado por user_id
- `verifications`

### Tabelas de dominio operacional

- `categories` — UUID nativo
- `system_settings` — singleton de configuracao
- `products` — UUID nativo, partial indexes para archived_at
- `product_stock_entries` — UUID nativo, indice composto (product_id, stocked_on)
- `product_stock_write_offs` — UUID nativo, indice composto (product_id, happened_on)
- `sales` — UUID nativo, indices compostos (status+occurred_on, payment_method+occurred_on)
- `sale_items` — UUID nativo, unique index (sale_id, product_id)

## Decisoes de design

### IDs
- **Tabelas de auth**: `TEXT` (gerenciados pelo Better Auth)
- **Tabelas de dominio**: `UUID` nativo do PostgreSQL (16 bytes, gen_random_uuid())

### Timestamps
- Todos os timestamps usam `timestamptz` (WITH TIME ZONE)
- Armazenados internamente em UTC pelo PostgreSQL

### Valores monetarios
- `DECIMAL(12, 2)` para todos os campos financeiros
- CHECK constraints para nao-negatividade

### Indexacao
- Indices compostos seguindo a regra "igualdade primeiro, range depois"
- Partial indexes para produtos ativos/arquivados
- Indices em FKs de tabelas de auth (sessions.user_id, accounts.user_id)

### Paginacao
- Queries de listagem usam cursor-based pagination (default 50 por pagina)
- Sub-queries de detalhe limitadas a 200 registros como safety net

### Connection pool
- max: 10 conexoes
- idle timeout: 30s
- connection timeout: 10s

## Regras principais do dominio atual

- estoque agregado por produto
- custo medio movel recalculado em entradas
- baixa de estoque com motivos simplificados (`adjustment` e `operational`)
- venda concluida no ato com baixa imediata de estoque
- venda registra meio de pagamento (`pix` ou `card`)
- venda registra `total_amount` como valor operacional e `charged_amount` como valor cobrado do cliente
- parcelamento de cartao usa regras globais em `system_settings.payment_fee_rules`
- `fee_amount` so representa custo quando a taxa e absorvida pelo vendedor
- preco do item na venda e snapshot do preco atual do produto
- cancelamento de venda com estorno automatico
- detalhes da baixa devem ir em `notes`
- validacoes de integridade por constraints (estoque/custos/quantidades)

## Comandos uteis

```bash
bun run db:studio
bun run db:generate
bun run db:migrate
bun run db:push
```

## Referencias

- schema principal: `packages/db/src/schema.ts`
- migracoes: `packages/db/src/migrations/`
- config Drizzle: `packages/db/drizzle.config.ts`
- wrappers de compatibilidade do web: `apps/web/src/db/schema.ts`, `apps/web/src/db/tenant-context.ts`, `apps/web/src/db/index.ts`
- regras operacionais: `docs/01-regras-de-negocio.md`
