# Sprint 1 - Snapshot Atual (31/03/2026)

## Status Geral

- [x] Fase 0, saneamento da base
- [x] Fase 1, fundacao de plataforma
- [x] Fase 2, remodelagem do banco para produtos/estoque
- [x] Fase 3, produtos e estoque base
- [x] Fase 4, configuracoes de catalogo e markup
- [~] Fase 5, polimento operacional
- [x] Fase 6, planejamento do modulo de vendas
- [x] Fase 7, implementacao minima de vendas

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
- [x] Preco do item travado pelo catalogo no momento da venda
- [x] Venda com pagamento (`Pix`/`Cartao`) e composicao de total por frete/taxa
- [x] Cancelamento de venda com estorno automatico de estoque
- [x] Testes iniciais de dominio e integracao para vendas
- [x] Integracao de venda e estorno no historico de produtos
- [x] Hardening de exclusao de produto com alerta de impacto em vendas
- [x] Revisao da documentacao para estado real

## Pontos em andamento

- [~] Smoke test operacional com dados reais para fluxo de venda e cancelamento

## Pendencias para proxima fase

- [ ] Dashboard operacional consolidado (alem de placeholder)
- [ ] E2E completo cobrindo fluxos principais
- [ ] Modulo de recebimentos (proxima etapa)

## Proximo passo ativo

Concluir validacao final antes de iniciar recebimentos:

1. Executar smoke test com dados reais de operacao para venda e cancelamento.
2. Confirmar consistencia entre relatorio operacional e historico por produto.
3. Definir backlog minimo do modulo de recebimentos.
