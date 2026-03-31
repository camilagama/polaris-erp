# DG Imports

Aplicacao interna em Next.js 16 para operacao de revenda, com autenticacao, catalogo de produtos e configuracoes operacionais centralizadas.

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
- `products`: catalogo com custo, preco de venda e estoque

## Regras operacionais importantes

- A categoria `Outros` e fixa, protegida e nao pode ser removida.
- Todo produto precisa ter categoria.
- O cadastro de produto usa as margens globais para sugerir preco minimo e ideal a partir do custo.
- Preco abaixo do minimo gera alerta visual, mas continua permitido.

