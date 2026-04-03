# Sprint 1 - Snapshot Atual (02/04/2026)

## Status Geral

- [x] Fase 0, saneamento da base
- [x] Fase 1, fundacao de plataforma
- [x] Fase 2, remodelagem do banco para produtos/estoque
- [x] Fase 3, produtos e estoque base
- [x] Fase 4, configuracoes de catalogo e markup
- [x] Fase 5, polimento operacional
- [x] Fase 6, planejamento do modulo de vendas
- [x] Fase 7, implementacao minima de vendas
- [x] Fase 8, hardening e refinamento do baseline

## Entregas confirmadas

- [x] Shell `(app)` protegida com autenticacao
- [x] Better Auth com email/senha e Google para usuarios aprovados
- [x] Cadastro publico por email removido do contrato suportado
- [x] Bootstrap interno de usuario para dev/E2E protegido por `CRON_SECRET`
- [x] Modulo `Produtos` com cadastro, edicao e ciclo `ativo/arquivado`
- [x] Exclusao fisica retirada do fluxo operacional documentado
- [x] Fluxo de entrada de estoque com recalculo de custo medio
- [x] Fluxo de baixa de estoque com motivo simplificado e observacoes
- [x] Historico de movimentacoes no detalhe do produto
- [x] Configuracoes de margem minima, ideal e parcelamento de cartao
- [x] Busca por nome e categoria na listagem de produtos
- [x] Validacao de data ISO na borda das server actions de estoque
- [x] Modulo `Vendas` com listagem, detalhe e cancelamento
- [x] Registro de venda multi-item com baixa imediata de estoque
- [x] Query dedicada de produtos vendaveis para a tela de venda
- [x] Preco do item travado pelo catalogo no momento da venda
- [x] Cursor opaco composto em produtos e vendas
- [x] Ressincronizacao de paineis client-side apos `refresh()`
- [x] One Tap desativado em localhost com mensagem explicita
- [x] Suite Vitest verde
- [x] Suite Playwright verde
- [x] `check`, `build` e `knip` tratados como baseline obrigatorio

## Validacoes concluídas

- [x] login interno
- [x] cadastro de produto
- [x] entrada de estoque
- [x] baixa operacional
- [x] venda
- [x] cancelamento com estorno
- [x] alteracao de preco preservando snapshots antigos
- [x] cartao com taxa no cliente
- [x] cartao com taxa no vendedor
- [x] arquivamento de produto

## Proxima fase

- [ ] Dashboard financeiro mais profundo
- [ ] Modulo de recebimentos
- [ ] Observabilidade adicional

## Proximo passo ativo

Iniciar o planejamento do modulo de recebimentos sobre uma base ja estabilizada:

1. mapear o contrato minimo de recebimento sem reabrir a modelagem de vendas
2. definir conciliacao operacional diaria
3. manter o baseline tecnico verde antes de cada incremento
