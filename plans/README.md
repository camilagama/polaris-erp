# Planos de implementação: tempo operacional

Gerados em 2026-07-16 a partir do commit `97e3c3a`. O contrato aprovado
`TIME-001`/`DEC-BR-049` é: `America/Sao_Paulo` define datas civis de negócio;
instantes continuam como `timestamptz`/`Date`. Cada executor deve ler o plano
por completo, fazer o drift check e atualizar somente sua linha.

## Ordem de execução e status

| PR | Plano | Prioridade | Esforço | Depende de | Status |
|---|---|---:|---:|---|---|
| 1 | [Módulo temporal client-safe](001-modulo-temporal-client-safe.md) | P1 | M | — | TODO |
| 2 | [Consumidores de datas civis](002-consumidores-datas-civis.md) | P1 | M | PR 1 | TODO |
| 3 | [Banco determinístico e migração corretiva](003-banco-datas-negocio-explicitas.md) | P1 | M | PR 1 | TODO |
| 4 | [Invariantes de cancelamento](004-invariantes-cancelamento.md) | P2 | M | PR 3 | TODO |
| 5 | [Apresentação explícita de instantes](005-apresentacao-instantes-brt.md) | P2 | M | PR 1 | TODO |

## Dependências

- PR 1 introduz a única API compartilhada. PRs 2, 3 e 5 não devem criar
  novos formatadores ou aritmética de datas.
- PR 3 corrige defaults e a conversão histórica do ledger sem depender do
  timezone de sessão. PR 4 só valida o novo invariante depois de normalizar
  dados existentes com a mesma regra.
- PR 2 e PR 5 podem seguir em paralelo depois de PR 1. PR 3 também pode,
  mas exige banco de comportamento isolado.

## Critérios de revisão transversais

- Não usar `SET timezone`, `SET LOCAL` ou `set_config('TimeZone', ..., true)`
  como política de negócio. Configuração local de sessão não cobre migrations
  e `SET` pode vazar em um pool.
- Não converter `YYYY-MM-DD` em meia-noite do runtime e depois formatar o
  resultado como BRT. Datas civis devem permanecer strings até a borda de UI.
- Preservar `now()`, `Date`, `Date.now()` e ISO completo onde o dado é um
  instante: auditoria, expiração, leases, healthchecks e cursores.
- Rodar os comandos descritos em cada plano; usar `bun x ultracite check` como
  verificação final, não `fix`.

## Achados considerados e rejeitados

- Tornar `TimeZone` uma configuração global de sessão: rejeitado. Ela é
  operacionalmente frágil em pooling e não torna SQL de migrations explícito.
- Alterar timestamps de auditoria para `date`: rejeitado. Perderia o instante
  e viola `TIME-001`.
- Migrar todo uso de `date-fns`: rejeitado. `parseISO("YYYY-MM-DDT12:00:00")`
  usado apenas para apresentar uma data civil continua seguro; o foco é a
  combinação de meia-noite do runtime com rezoneamento BRT.

## Documentos de apoio

- [Relatório de auditoria](000-relatorio-auditoria-temporal.md)
- [Pesquisa PostgreSQL primária](research-postgresql-temporal-semantics.md)
