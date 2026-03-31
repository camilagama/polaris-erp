# DG Imports

Aplicacao interna em Next.js 16 para operacao de revenda, com autenticacao, modulos de produtos/estoque, vendas e configuracoes operacionais.

## Stack

- Next.js 16 com App Router
- React 19
- Drizzle ORM com PostgreSQL
- Better Auth
- Tailwind CSS 4
- Vitest para testes unitarios

## Scripts

```bash
bun dev
bun run build
bun test
bun run check
bun run fix
bun run knip
```

## Banco de dados

O schema principal fica em `src/db/schema.ts` e as migracoes em `src/db/migrations/`.

Fluxos de dominio ja modelados:

- `categories`: categorias de produto, incluindo a categoria protegida `Outros`
- `system_settings`: configuracoes globais de markup minimo e ideal
- `products`: catalogo com custo medio, preco de venda e estoque
- `product_stock_entries`: entradas de estoque
- `product_stock_write_offs`: baixas de estoque
- `sales`: vendas concluidas e canceladas
- `sale_items`: itens por venda com snapshots de preco e custo

## Escopo atual

Disponivel hoje:

- autenticacao e area protegida
- produtos
- estoque (entrada e baixa)
- vendas (registro e cancelamento com estorno)
- configuracoes de catalogo e markup

Ainda nao implementado:

- modulo de recebimentos
- dashboard financeiro consolidado

## Regras operacionais importantes

- A categoria `Outros` e fixa, protegida e nao pode ser removida.
- Todo produto precisa ter categoria.
- O cadastro de produto usa as margens globais para sugerir preco minimo e ideal a partir do custo.
- Preco abaixo do minimo gera alerta visual, mas continua permitido.
- As baixas de estoque usam motivos simplificados (`adjustment` e `operational`) com detalhamento em observacoes.
- Datas das actions de estoque devem estar no formato ISO (`YYYY-MM-DD`).
- Vendas no MVP sao registradas como concluidas na hora, com baixa imediata de estoque.
- Cancelamento de venda estorna automaticamente as quantidades para o estoque.
- Venda nao possui exclusao fisica no MVP; o ajuste e feito por cancelamento.
- Excluir um produto remove tambem vendas vinculadas a ele por decisao operacional atual.

