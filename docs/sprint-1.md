# Sprint 1

## Status Geral

- [x] Fase 0, saneamento da base
- [x] Fase 1, fundacao de plataforma
- [x] Fase 2, remodelagem do banco
- [x] Fase 3, produtos e estoque base
- [x] Fase 4, compras e custo medio
- [x] Fase 5, vendas operacionais
- [x] Fase 6, recebimentos e eventos financeiros
- [x] Fase 7, indicadores e configuracoes
- [~] Fase 8, go-live operacional
- [ ] Fase 9, extensoes da V1 depois do nucleo

## O que ja foi entregue

- [x] Shell `(app)` protegida, login por email/senha, Google Auth e Google One Tap
- [x] Auth route do Better Auth em `/api/auth/[...all]`
- [x] Proxy protegendo rotas privadas e redirecionando para `/sign-in`
- [x] Schema novo do dominio com `products`, `purchases`, `inventory_movements`, `sales`, `sale_items`, `receipts` e `system_settings`
- [x] Migrations aplicadas no Neon com `DATABASE_URL_DIRECT`
- [x] CRUD de produtos com inativacao segura
- [x] Ajustes manuais, perdas e avarias no estoque
- [x] Compras com recebimento que recalcula custo medio
- [x] Vendas multi-itens com snapshot de custo e bloqueio de estoque negativo
- [x] Cancelamento de venda com recomposicao explicita de estoque
- [x] Recebimentos com bruto, liquido, taxas e recalculo do status financeiro da venda
- [x] Dashboard real com filtros de periodo e indicadores operacionais/financeiros
- [x] Testes unitarios das regras matematicas base
- [x] Build e lint limpos

## Criticos pendentes da Fase 8

- [x] Loading global do grupo `(app)`
- [x] Error boundary do grupo `(app)`
- [x] Seed inicial idempotente para parametros e usuario principal
- [x] Checklist operacional inicial documentado
- [x] Estados vazios especificos por modulo com orientacao operacional
- [ ] Revisao de UX mobile por tela
- [ ] E2E de login, compra, venda, recebimento e dashboard

## Marcos de aceite

- [x] Marco A: usuario entra, cadastra produto e ajusta estoque sem inconsistencias
- [x] Marco B: compra `received` aumenta saldo e recalcula custo medio corretamente
- [x] Marco C: venda multi-itens bloqueia falta de estoque e grava snapshot de custo
- [x] Marco D: recebimentos alteram o status da venda e distinguem bruto de liquido
- [x] Marco E: dashboard bate com dados transacionais e separa operacao de caixa
- [~] Marco F: operacao consegue abandonar planilha para uso diario basico

## Proximo passo ativo

Concluir a Fase 8 com polimento operacional:

1. Revisao responsiva final nas telas principais.
2. E2E cobrindo login, compra, venda, recebimento e dashboard.
3. Checklist de smoke test para go-live apos deploy.
