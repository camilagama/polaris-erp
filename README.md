# DG Imports

Aplicacao interna em Next.js 16 para operacao de revenda, com autenticacao, catalogo de produtos, estoque, vendas e configuracoes operacionais.

## Stack

- Next.js 16 com App Router
- React 19
- Better Auth com email/senha, Google e One Tap
- Drizzle ORM com PostgreSQL
- Tailwind CSS 4 e shadcn/ui
- Vitest para testes unitarios e de integracao
- Playwright para cobertura E2E principal

## Scripts

```bash
bun dev
bun run build
bun test
bun run check
bun run fix
bun run knip
bun run db:generate
bun run db:migrate
```

## Banco de dados

O schema principal fica em `src/db/schema.ts` e as migracoes em `src/db/migrations/`.

Fluxos de dominio modelados hoje:

- `categories`: categorias de produto, incluindo a categoria protegida `Outros`
- `system_settings`: configuracoes globais de markup minimo, markup ideal e regras de taxa por pagamento
- `products`: catalogo com custo medio, preco de venda, estoque e arquivamento
- `product_price_changes`: trilha leve de alteracoes de preco por produto
- `product_stock_entries`: entradas de estoque
- `product_stock_write_offs`: baixas operacionais de estoque
- `sales`: vendas concluidas e canceladas
- `sale_items`: itens por venda com snapshots de preco e custo

## Escopo atual

Disponivel hoje:

- autenticacao e shell protegida
- produtos
- estoque com entrada e baixa
- vendas com cancelamento e estorno
- configuracoes de catalogo, markup e taxas de pagamento

Ainda nao implementado:

- modulo de recebimentos
- dashboard financeiro consolidado

## Arquitetura de autenticacao

- `proxy.ts` atua como barreira otimista de borda para rotas protegidas e publicas.
- `requireSession()` protege layouts e paginas server-side.
- `requireActionSession()` protege todas as Server Actions mutantes.
- O app assume `proxy` para UX e redirecionamento rapido, mas a autorizacao real sempre acontece novamente na camada server.

## Notas operacionais

- Login com email/senha permanece o caminho principal em qualquer ambiente.
- Google One Tap e SSO social dependem de origem autorizada pelo Google; em localhost o app reduz comportamento automatico para evitar prompts invalidos.
- Exclusao de produto continua destrutiva por decisao operacional, mas requer confirmacao forte quando houver vendas vinculadas.
- O fluxo de imagem de produto usa Cloudflare R2 com upload temporario em staging e duas variantes finais (`detail` e `table`). Veja `docs/product-images-r2.md`.

## Testes E2E

- O Playwright deve rodar contra um servidor previsivel e isolado na porta `3001`.
- A suite cobre redirecionamento publico/protegido, login, produtos, vendas, configuracoes basicas e `not-found`.

## Regras operacionais importantes

- A categoria `Outros` e fixa, protegida e nao pode ser removida.
- Todo produto precisa de categoria.
- O cadastro de produto usa as margens globais para sugerir preco minimo e ideal a partir do custo.
- A edicao de produto permite alterar o preco atual do catalogo sem reescrever vendas anteriores.
- Cada alteracao de preco registra valor anterior, valor novo, usuario e data.
- Preco abaixo do minimo gera alerta visual, mas continua permitido.
- As baixas de estoque usam motivos simplificados (`adjustment` e `operational`) com detalhamento livre em observacoes.
- Datas recebidas nas actions devem estar no formato ISO `YYYY-MM-DD`.
- Vendas no MVP nascem como `completed`, com baixa imediata de estoque.
- A venda valida se o preco visivel ainda corresponde ao preco atual do produto antes de concluir.
- O mesmo produto nao pode se repetir dentro da mesma venda.
- O total final da venda segue a formula oficial:
  - `subtotal dos itens + frete + adicional - desconto + taxa`
- A taxa aplicada depende da regra selecionada em `paymentOptionCode`.
- Cancelamento de venda estorna estoque e exige consistencia entre `status` e `cancelledAt`.
- Excluir um produto continua sendo uma operacao fisica destrutiva.
- Se houver vendas vinculadas ao produto excluido, essas vendas tambem sao removidas por decisao operacional atual.
