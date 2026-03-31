# Setup Neon + Drizzle ORM - dgimports

## Configuracao inicial

### 1. Connection string do Neon

1. Acesse o projeto no Neon.
2. Copie a connection string com SSL.
3. Salve no `.env.local`:

```bash
DATABASE_URL="postgresql://..."
DATABASE_URL_DIRECT="postgresql://..."
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

### Tabelas de autenticacao

- `users`
- `sessions`
- `accounts`
- `verifications`

### Tabelas de dominio operacional

- `categories`
- `system_settings`
- `products`
- `product_stock_entries`
- `product_stock_write_offs`

## Regras principais do dominio atual

- estoque agregado por produto
- custo medio movel recalculado em entradas
- baixa de estoque com motivos simplificados (`adjustment` e `operational`)
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

- schema principal: `src/db/schema.ts`
- migracoes: `src/db/migrations/`
- regras operacionais: `docs/01-regras-de-negocio.md`
