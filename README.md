# DG Imports

Aplicacao interna em `Next.js 16` para operacao de revenda com autenticacao fechada, catalogo, estoque, vendas e configuracoes operacionais.

## Stack

- `Next.js 16` com App Router
- `React 19`
- `Better Auth` com email/senha e Google
- `Drizzle ORM` com PostgreSQL
- `Tailwind CSS 4` e `shadcn/ui`
- `Vitest` para testes unitarios e de integracao
- `Playwright` para fluxos E2E principais
- `Cloudflare R2` para staging e variantes finais de imagem

## Scripts

```bash
bun dev
bun run build
bun run test
bun run test:e2e
bun run check
bun run fix
bun run knip
bun run db:generate
bun run db:migrate
```

## Modelo de acesso

- O app e interno e fechado.
- O endpoint publico de cadastro por email nao faz parte do contrato suportado.
- O login aceita apenas usuarios previamente provisionados.
- Em `development` e `test` existe um bootstrap interno de usuario em `/api/internal/auth/bootstrap-user`, protegido por `INTERNAL_BOOTSTRAP_SECRET`.
- O login com Google continua disponivel para usuarios aprovados.
- O One Tap nao e inicializado em `localhost` para evitar prompts invalidos e ruido operacional.

## Dominio atual

O schema principal fica em `src/db/schema.ts` e as migracoes em `src/db/migrations/`.

Entidades principais:

- `categories`: categorias de produto, com `Outros` protegida pelo sistema
- `system_settings`: markup e regras de parcelamento/taxa
- `products`: catalogo com custo medio, preco atual, estoque e `archivedAt`
- `product_price_changes`: historico de mudanca de preco
- `product_stock_entries`: entradas de estoque
- `product_stock_write_offs`: baixas operacionais
- `sales`: vendas concluidas e canceladas
- `sale_items`: snapshots de preco e custo por item

## Contratos operacionais

- Produto e `archive-only`: arquivar e desarquivar sao suportados; exclusao fisica nao faz parte do contrato operacional.
- Venda nasce como `completed`, baixa estoque imediatamente e pode ser corrigida apenas por cancelamento.
- O mesmo produto nao pode se repetir dentro da mesma venda.
- A tela de vendas consulta uma lista dedicada de produtos vendaveis, sem depender da pagina atual de produtos.
- Produtos e vendas usam busca e filtros server-driven via URL, com cursor opaco composto alinhado com a ordenacao real.
- Detalhe de venda cancelada preserva os valores historicos e explicita impacto operacional atual zerado.
- Alteracoes server-side devem refletir imediatamente na UI apos `refresh()`.

## Imagens de produto

- Upload vai primeiro para o bucket de staging do R2.
- O app gera as variantes finais `detail` e `table`.
- A reconciliacao diaria limpa objetos orfaos e mantem o bucket publico consistente com o banco.
- Detalhes operacionais e de CORS: `docs/product-images-r2.md`.

## Qualidade atual

Baseline esperado:

- `bun run check`
- `bun run build`
- `bun run test`
- `bun run test:e2e`
- `bun run knip`

Fluxos E2E cobertos hoje:

- redirecionamento publico/protegido
- login interno
- cadastro de produto
- entrada e baixa de estoque
- venda, cancelamento e estorno
- alteracao de preco com preservacao de snapshot
- cartao com taxa no cliente e no vendedor
- arquivamento de produto
