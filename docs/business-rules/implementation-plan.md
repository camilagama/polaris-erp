# Plano de implementação das regras aprovadas

**Status:** plano de execução, não implementado.  
**Base:** [regras normativas](normative/README.md), DEC-BR-001 a DEC-BR-058.  
**Princípio:** cada PR só muda comportamento acompanhado de migração, auditoria, testes de negação e atualização da [aderência](normative/adherence.md).

## Ordem e dependências

| PR | Escopo | Depende de | Critério de aceite principal |
| --- | --- | --- | --- |
| 0 | Governança documental | nenhum | links, decisões e matriz de aderência consistentes |
| 1 | Tenancy, organização e entitlement base | 0 | uma membership/owner, estados explícitos, guard por plano e suspensão sem loop |
| 2 | Billing lifecycle e checkout | 1; gates provider | Free/pago/grace/downgrade temporal idempotentes e provider reconciliado |
| 3 | Catálogo, galeria e soft delete | 1; gate retenção para purge | quotas, 5 MiB, galeria, soft delete final e lifecycle de objetos |
| 4 | Ledger e ajustes de estoque | 1, 3 | todo saldo tem ledger; retry manual não duplica movimento |
| 5 | Vendas e reconciliação | 4 | venda/cancelamento no ledger e equação econômica verificável |
| 6 | Metas e timezone | 1 | quotas por plano, uma métrica por meta paga e corrida protegida |
| 7 | Privacidade, suporte e plataforma | 1; gates jurídicos | sem impersonation, audit de leitura, processo LGPD e runbook |
| 8 | Aderência final e release | 2–7; todos gates | matriz atualizada e provas de app/banco/teste/provider |

## PR 1 — Tenancy, organização e entitlement base

- Aplicar DEC-BR-002, 003, 010, 030, 043, 053.
- Migrar dados legados antes de impor unicidade de membership/owner.
- Modelar estados de organização `active`, `suspended` e encerramento; suspensão não pode cair em onboarding.
- Separar estado de organização de plano/entitlement; Free ativo deve permitir capacidades autorizadas.
- Testar concorrência no onboarding, isolamento cross-tenant, suspensão, encerramento e negações de acesso.

## PR 2 — Billing lifecycle e checkout

- Aplicar DEC-BR-005 a 020, 024, 025, 028, 029, 034, 035, 044, 050, 052.
- Criar matriz versionada de entitlements e contadores de produtos/metas/imagens.
- Persistir período, tolerância, versão/data de provider e transição temporal idempotente.
- Implementar recovery pós-captura, ordenação de eventos, cancelamento recorrente e avisos de lifecycle.
- Não lançar PIX recorrente ou checkout até prova de sandbox/contrato/assinatura/retry dos providers.

## PR 3 — Catálogo, galeria e soft delete

- Aplicar DEC-BR-013, 017, 018, 021 a 023, 026, 027, 051, 054, 058.
- Modelar galeria e quotas: Free uma imagem, pago cinco, 5 MiB por arquivo nos dois planos.
- Impor limite de produtos cadastrados, inclusive arquivados; soft delete somente owner, estoque zero, motivo e auditoria.
- Separar disponibilidade operacional de retenção física de fonte/variantes.
- Não ativar purge até tabela de retenção aprovada.

## PR 4 — Ledger e ajustes de estoque

- Aplicar DEC-BR-033, 036, 045, 054.
- Unificar entradas, baixas, vendas e cancelamentos em ledger imutável; migrar/reconciliar saldos existentes.
- Associar chave idempotente, auditoria e resposta a cada ajuste manual.
- Testar retry, clique duplicado, timeout, concorrência, saldo não negativo e reconstrução de saldo.

## PR 5 — Vendas e reconciliação

- Aplicar DEC-BR-032, 047, 055, 056.
- Preservar snapshots econômicos e tornar totais verificáveis a partir de itens, frete, adicional, desconto e taxa.
- Vincular cancelamento ao ledger de estoque, sem provider financeiro/refund/settlement.
- Testar arredondamento, taxa de cliente/vendedor, limite de parcelas, cancelamento repetido e escrita privilegiada divergente.

## PR 6 — Metas e timezone

- Aplicar DEC-BR-014, 031, 046, 049, 057.
- Alterar a modelagem para até três metas ativas pagas, uma por métrica, e uma Free.
- Centralizar `America/Sao_Paulo` para datas de negócio e jobs.
- Resolver metas por guarda condicional/transacional e testar corrida contra archive/update/reactivation.

## PR 7 — Privacidade, suporte e plataforma

- Aplicar DEC-BR-036, 038 a 042, 048, 051.
- Restringir suporte a painéis necessários, sem impersonation; auditar leituras sensíveis e mutações.
- Implementar procedimento de pedido LGPD via suporte, runbook de incidente e encerramento de tenant.
- Só habilitar retenção/purge, aviso e contrato públicos após validação jurídica/contábil do mapa e tabela.

## PR 8 — Aderência final e release

- Atualizar [matriz normativa](normative/adherence.md) por regra: app, banco, UI, teste, provider e gate humano.
- Executar testes unitários, integração/PostgreSQL, E2E, concorrência, idempotência, RLS runtime e sandbox de provider conforme domínio.
- Bloquear release se qualquer gate externo, regra crítica sem auditoria ou cenário de negação obrigatório continuar sem prova.
