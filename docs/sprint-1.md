# Sprint 1 - Snapshot Atual (31/03/2026)

## Status Geral

- [x] Fase 0, saneamento da base
- [x] Fase 1, fundacao de plataforma
- [x] Fase 2, remodelagem do banco para produtos/estoque
- [x] Fase 3, produtos e estoque base
- [x] Fase 4, configuracoes de catalogo e markup
- [~] Fase 5, polimento operacional
- [x] Fase 6, planejamento do modulo de vendas
- [~] Fase 7, implementacao minima de vendas

## Entregas confirmadas

- [x] Shell `(app)` protegida com autenticacao
- [x] Better Auth com email/senha, Google e One Tap
- [x] Modulo `Produtos` com cadastro, edicao e status (ativo/arquivado)
- [x] Fluxo de entrada de estoque com recalculo de custo medio
- [x] Fluxo de baixa de estoque com motivo simplificado e observacoes
- [x] Historico de movimentacoes no detalhe do produto
- [x] Configuracoes de margem minima e ideal
- [x] Busca por nome e categoria na listagem de produtos
- [x] Validacao de data ISO na borda das server actions de estoque
- [x] Testes unitarios de regras matematicas centrais
- [x] Modulo `Vendas` com listagem e detalhe
- [x] Registro de venda multi-item com baixa imediata de estoque
- [x] Cancelamento de venda com estorno automatico de estoque
- [x] Testes iniciais de dominio e integracao para vendas

## Pontos em andamento

- [~] Integracao de eventos de venda no historico de produtos
- [~] Hardening de testes de integracao para cancelamento de venda
- [~] Revisao final de documentacao para estado real com vendas

## Pendencias para proxima fase

- [ ] Dashboard operacional consolidado (alem de placeholder)
- [ ] E2E completo cobrindo fluxos principais
- [ ] Modulo de recebimentos (proxima etapa)

## Proximo passo ativo

Concluir estabilizacao do modulo de vendas:

1. Integrar eventos de venda/estorno no historico de produto.
2. Executar smoke test com dados reais de operacao para venda e cancelamento.
3. Fechar documentacao oficial no estado real antes de iniciar recebimentos.
