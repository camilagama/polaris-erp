# Roadmap V1 do DG Imports

## Resumo
- O documento de negócio em [docs/01-regras-de-negocio.md](C:/Users/Junior/Documents/0%20-%20Dev/dgimports/docs/01-regras-de-negocio.md) descreve um sistema transacional, não apenas um dashboard: o núcleo é `produto + compra + estoque + venda + recebimento`, com custo médio móvel, snapshot de custo no item vendido e separação entre resultado operacional e caixa.
- A base atual já tem um shell visual reutilizável, mas ainda está em estágio de placeholder: o dashboard é mockado em [page.tsx#L1](C:/Users/Junior/Documents/0%20-%20Dev/dgimports/src/app/(dashboard)/page.tsx#L1), a navegação expõe módulos fora do escopo como `clientes` em [app-sidebar.tsx#L58](C:/Users/Junior/Documents/0%20-%20Dev/dgimports/src/components/app-sidebar.tsx#L58), o metadata ainda é default em [layout.tsx#L26](C:/Users/Junior/Documents/0%20-%20Dev/dgimports/src/app/layout.tsx#L26), e o schema atual cobre só `users/imports/import_logs` em [schema.ts#L12](C:/Users/Junior/Documents/0%20-%20Dev/dgimports/src/db/schema.ts#L12).
- `ultracite check` está limpo, mas `bun run build` falha por ausência de tipos para `pg` em [index.ts#L3](C:/Users/Junior/Documents/0%20-%20Dev/dgimports/src/db/index.ts#L3). Isso entra como fase zero do roadmap.

## Abordagens consideradas
- `Core operacional`: modelar primeiro a verdade do estoque, custo e fluxo de venda/recebimento; é a abordagem escolhida porque reduz retrabalho e atende diretamente os critérios de sucesso da V1.
- `UX primeiro`: acelerar telas com mock data; útil para validação visual, mas perigoso aqui porque as regras de cancelamento, chargeback, custo médio e estoque negativo são o coração do produto.
- `Financeiro primeiro`: acelerar caixa e lucro; falha porque lucro líquido e CMV dependem do núcleo de estoque e do snapshot correto de custo.

## Direção técnica escolhida
- Stack-base: `Next.js 16 App Router + React 19 + Tailwind 4 + shadcn + Drizzle + Neon + Better Auth`.
- Leitura de dados: Server Components buscando direto no banco, próximos da fonte.
- Mutações internas: Server Actions com validação server-side; Route Handlers ficam restritos a `/api/auth/[...all]` e futuras integrações externas.
- Runtime: Node.js, não Edge, por causa de `pg`, Drizzle e Better Auth.
- Autenticação: Better Auth com email e senha, dois usuários internos, mesma permissão total, sessão server-side, rotas protegidas por checagem de sessão no servidor e redirecionamento para login.
- Banco em produção: `DATABASE_URL` com endpoint pooled do Neon para runtime web; `DATABASE_URL_DIRECT` para migrations e operações administrativas. Em previews, usar branching do Neon por ambiente.
- Estrutura de rotas: trocar o grupo atual `(dashboard)` por um grupo protegido mais amplo, por exemplo `(app)`, e separar `(auth)` para login/recuperação. Navegação inicial: `Dashboard`, `Produtos`, `Compras`, `Estoque`, `Vendas`, `Recebimentos`, `Configurações`. `Clientes` sai da V1 inicial; `Categorias` vira campo simples de produto, não módulo próprio.
- Visual companion: assumir planejamento textual; você não confirmou uso do companion visual.

## Mudanças importantes em APIs, interfaces e tipos
- Auth: adicionar `/api/auth/[...all]/route.ts` via Better Auth; usar `auth.api.getSession({ headers: await headers() })` em páginas protegidas e `nextCookies()` para Server Actions que alteram sessão.
- Environment vars: `DATABASE_URL`, `DATABASE_URL_DIRECT`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`.
- Usuário canônico: Better Auth passa a ser a fonte de verdade do usuário. O `users` atual com `serial` não deve ser mantido como modelo principal; o domínio deve referenciar o `user.id` textual do auth.
- Schema de domínio da V1:
- `users`, `sessions`, `accounts`, `verifications` do Better Auth.
- `products`
- `purchases`
- `inventory_movements`
- `sales`
- `sale_items`
- `receipts`
- `system_settings`
- Fase posterior da própria V1:
- `attachments`
- `import_jobs`
- Tipos e invariantes obrigatórios:
- `purchase.status`: `draft | registered | received | canceled`
- `sale.status`: `draft | awaiting_payment | partially_paid | paid | finalized | canceled | refunded | chargeback`
- `receipt.status`: `pending | partial | received | canceled | refunded | chargeback`
- `inventory_movement.type`: `purchase_in | sale_out | adjustment_plus | adjustment_minus | loss | damage | customer_return | cancel_restock`
- `products.currentStock` e `products.averageCost` são campos persistidos e atualizados apenas dentro de transações.
- `sale_items.costSnapshotUnit` e `sale_items.costSnapshotTotal` são obrigatórios no momento da confirmação da venda.

## Modelo funcional a implementar
- Produto é simples, sem variação, com categoria textual opcional, status ativo/inativo e métricas derivadas visíveis.
- Compra confirma entrada de estoque apenas ao virar `received`; é esse evento que recalcula custo médio.
- Estoque é ledger + agregado: todo impacto gera `inventory_movements`, e o saldo agregado fica em `products.currentStock`.
- Venda válida consome estoque, grava snapshot de custo por item, persiste totais do pedido e bloqueia estoque negativo.
- Recebimento é separado da venda; atualiza status financeiro e visão de caixa sem recalcular CMV.
- Cancelamento, reembolso e chargeback nunca fazem edição destrutiva; sempre geram efeito compensatório explícito.

## Roadmap por fases
1. Fase 0, saneamento da base: corrigir build, alinhar `lang/metadata`, limpar navegação fora do escopo, renomear a shell protegida e preparar convenções de pasta para módulos reais.
2. Fase 1, fundação de plataforma: instalar Better Auth, integrar com Drizzle, definir variáveis de ambiente, criar fluxo de login por email/senha, logout, proteção de rotas e bootstrap do usuário administrador.
3. Fase 2, remodelagem do banco: substituir o schema placeholder por schema orientado ao domínio, padronizar ids, enums e relacionamentos, separar connection string pooled e direct, preparar migrations consistentes.
4. Fase 3, produtos e estoque base: CRUD de produtos, inativação segura, listagem com busca/filtros, tela de movimentos, ajustes manuais, perdas e avarias, sem anexos ainda.
5. Fase 4, compras e custo médio: fluxo `draft -> registered -> received -> canceled`, cálculo de custo total/unitário, transação de entrada de estoque, recomputação de custo médio, histórico mínimo de compra.
6. Fase 5, vendas operacionais: criação de venda com múltiplos itens, bloqueio de estoque insuficiente, desconto no pedido, frete cobrado, snapshot de custo por item, cancelamento com estorno explícito.
7. Fase 6, recebimentos e eventos financeiros: recebimentos parciais, cálculo líquido, status da venda, reembolso, chargeback, distinção visível entre resultado operacional e caixa.
8. Fase 7, indicadores e configurações: dashboard real com filtros por período, faturamento, lucro bruto, lucro líquido, margem, ticket médio, capital empatado, produtos parados; tela de configurações para margens e parâmetros-base.
9. Fase 8, go-live operacional: polimento mobile, estados vazios, loading/error boundaries por segmento, seed inicial, criação dos dois usuários, checklist de operação diária.
10. Fase 9, extensões da V1 depois do núcleo: CSV de produtos/compras, anexos, alertas internos. Como você escolheu começar do zero, essas três frentes ficam depois do core, não antes.

## Critérios de aceite por marco
- Marco A: usuário consegue entrar no sistema, cadastrar produto e ajustar estoque sem inconsistência.
- Marco B: compra `received` aumenta saldo e recalcula custo médio corretamente.
- Marco C: venda multi-itens bloqueia falta de estoque e grava snapshot de custo.
- Marco D: recebimentos parciais alteram o status da venda corretamente e distinguem bruto de líquido.
- Marco E: dashboard bate com dados transacionais e separa resultado operacional de caixa.
- Marco F: operação consegue abandonar planilha para uso diário básico.

## Estratégia de testes
- Unitários com Vitest para regras puras: custo total, custo unitário, custo médio móvel, cálculo de faturamento, lucro bruto, lucro líquido, margem, status derivado de recebimento.
- Testes de integração transacional para compras recebidas, venda confirmada, cancelamento com retorno ao estoque, reembolso sem retorno automático, chargeback sem retorno automático.
- E2E com Playwright para login, fluxo de compra, fluxo de venda, fluxo de recebimento e dashboard.
- Async Server Components não devem concentrar a cobertura unitária; usar E2E para validar páginas assíncronas, conforme a recomendação atual do Next.
- Cada mutação crítica deve ter ao menos um teste de “happy path” e um de bloqueio por regra de negócio.

## Defaults e pressupostos travados
- V1 é web responsiva, não PWA e não app nativo.
- Go-live começa do zero, sem migração histórica; CSV vira aceleração posterior, não pré-requisito.
- Anexos e alertas continuam na V1, mas entram depois do núcleo transacional.
- Não haverá clientes detalhados, fornecedores detalhados, múltiplos estoques, permissões granulares ou integrações externas nesta fase.
- O shell visual existente será reaproveitado, mas a arquitetura e navegação serão alinhadas às regras de negócio, não ao menu atual.
- Melhor Auth significa a biblioteca Better Auth, não apenas um desejo genérico de segurança.

## Referências usadas
- Next.js App Router, estrutura e RSC: https://nextjs.org/docs/app/getting-started/project-structure
- Next.js Server/Client Components: https://nextjs.org/docs/app/getting-started/server-and-client-components
- Next.js Forms e Server Actions: https://nextjs.org/docs/app/guides/forms
- Next.js testing com Vitest: https://nextjs.org/docs/app/guides/testing/vitest
- Next.js testing com Playwright: https://nextjs.org/docs/app/guides/testing/playwright
- Better Auth para Next.js App Router: https://github.com/better-auth/better-auth/blob/better-auth@1.3.4/docs/content/docs/integrations/next.mdx
- Better Auth com Drizzle: https://github.com/better-auth/better-auth/blob/better-auth@1.3.4/docs/content/docs/adapters/drizzle.mdx
- Neon connection pooling: https://neon.com/docs/connect/connection-pooling
- Neon branching para previews/ambientes: https://neon.com/docs/introduction/branching
