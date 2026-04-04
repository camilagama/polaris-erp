# Limpeza destrutiva do banco de produção

Este documento descreve uma **limpeza completa** dos dados operacionais e de usuários, mantendo **apenas** estes e-mails:

- `contato.juniordiniz@gmail.com`
- `gama7908@gmail.com`

O script SQL associado está em [`production-database-cleanup.sql`](./production-database-cleanup.sql).

## Avisos obrigatórios

1. **Backup / PITR**: antes de executar qualquer `DELETE` em produção, use o fluxo de **instant restore / PITR** do Neon (ou branch de backup). Ver [Neon — Instant restore](https://neon.com/docs/introduction/branch-restore).
2. **Janela de manutenção**: o app ficará inconsistente durante a transação; faça com tráfego zero ou em modo manutenção.
3. **R2**: objetos em `products/` órfãos podem permanecer até o **reconcile** (`/api/internal/product-images/reconcile`) rodar com `CRON_SECRET`.
4. **Better Auth**: usuários removidos perdem sessões. O e-mail `gama7908@gmail.com`, se ainda não existir, recebe apenas uma linha mínima em `users`; o primeiro login Google criará/atualizará `accounts` conforme o fluxo do Better Auth.

## Ordem lógica

A ordem respeita FKs definidas em [`src/db/schema.ts`](../src/db/schema.ts):

1. `sale_items` (referencia `sales` e `products`)
2. `sales`
3. `product_price_changes`, `goals` (referenciam `users`)
4. `product_stock_write_offs`, `product_stock_entries` (referenciam `products`)
5. `products` (referenciam `categories`)
6. `categories` onde `is_system = false` (preserva **Outros** e demais categorias de sistema)
7. `verifications` (limpeza geral de tokens pendentes)
8. `users` exceto os dois e-mails permitidos (`sessions` / `accounts` em cascata para removidos)

## Execução

1. Rode as consultas de **auditoria** no início do arquivo SQL (somente leitura).
2. Revise contagens.
3. Abra a transação, execute os `DELETE`, valide contagens finais.
4. Só então troque `ROLLBACK` por `COMMIT` no arquivo (ou execute `COMMIT` manualmente após validação).

## Após a limpeza

- Rode smoke tests: login dos dois usuários, criação de categoria/produto de teste em branch não-prod antes de repetir em prod.
- Dispare reconcile de imagens se necessário.
