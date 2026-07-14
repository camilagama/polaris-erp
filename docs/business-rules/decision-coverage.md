# Cobertura de decisões materiais

**Status:** rascunho de descoberta, **não normativo**.  
**Objetivo:** verificar que cada lacuna, contradição, risco ou obrigação material da descoberta tenha uma decisão aprovada, uma decisão aberta, um gate externo ou uma justificativa explícita de não aplicabilidade. Não substitui a matriz regra-versus-teste.

## Cobertura atual

| Domínio | Achados materiais da descoberta | Decisões/gates relacionados | Situação |
| --- | --- | --- | --- |
| Identidade e tenancy | OAuth, uma organização e um owner, papel owner e suspensão | DEC-BR-001, 002, 004, 030, 043 | Decisões de produto aprovadas; implementação ainda pendente |
| Billing e entitlements | Free/pago, quotas, inadimplência, cancelamento, checkout, recuperação e ordem de eventos | DEC-BR-003, 005–020, 024–025, 028–029, 034–035, 044, 050, 052 | Modelo, relógio, comunicação e encerramento aprovados; PIX recorrente Woovi é gate externo |
| Catálogo e imagens | Quota cadastrada, galeria, arquivamento, soft delete e histórico | DEC-BR-008, 013, 017–018, 021–023, 026–027, 051 | Regras de produto aprovadas; purge físico depende da tabela de retenção gateada |
| Estoque | Ledger único, concorrência, repetição de ajuste e rastreabilidade por venda | DEC-BR-033, 036, 045 | Decisões aprovadas; implementação e teste de retry pendentes |
| Vendas | Cancelamento, valor cobrado, snapshots e reconciliação | DEC-BR-032, 036, 047 | Decisões aprovadas; refund/settlement não aplicável no lançamento por decisão explícita |
| Metas | Limite por plano, unicidade por métrica e corrida de resolução | DEC-BR-014, 031, 046 | Decisões aprovadas; implementação concorrente pendente |
| Eventos e integrações | Captura parcial, retry, ordem e provider | DEC-BR-034, 035, 044, 049, 050 | Recovery, ordenação, expiração, timezone e comunicação aprovados; sandbox/contrato de provider é gate |
| Privacidade e auditoria | Direitos, retenção, encerramento, incidentes e papéis de tratamento | DEC-BR-036 a 042 | Decisões aprovadas; tabela de retenção e mapa de papéis são gates externos |
| Admin de plataforma | Separação entre plataforma e tenant, suporte e ações sensíveis | AS-IS em `actors-and-permissions.md`; DEC-BR-036, 043, 048 | Decisões aprovadas; implementação e auditoria de leitura sensível pendentes |
| Identidade, admin e dashboard | Linking, revogação de sessão, PII por papel, grants, escopo temporal e timezone | DEC-BR-059, 060, 061 | Decisões aprovadas; implementação e prova promovida pendentes |
| Operação de providers | Retry/concurrency/revisão de jobs, lifecycle de e-mail, R2 e prova do Neon promovido | DEC-BR-062, 063; `research-operational-platforms-2026-07-14.md` | Regras aprovadas; validação de ambiente e provider permanecem gates |

## Pendências já prontas para debate posterior

Os lotes 11 a 13 foram consolidados. Não há decisão de produto material pendente; permanecem gates externos e de implementação.

1. **Gate jurídico/contábil:** tabela de retenção por categoria, fundamento, prazo e destino final; DEC-BR-040.
2. **Gate jurídico/privacidade:** mapa de papéis, categorias, compartilhamentos, aviso e contrato; DEC-BR-042.
3. **Gate de provider:** Woovi PIX recorrente, Asaas e qualquer contrato de checkout precisam de sandbox, assinatura de webhook, recuperação e política de suporte antes de release; DEC-BR-028, 029, 034, 035 e 044.

## Critério para encerrar o debate

O debate só estará pronto para documentação normativa quando:

1. DEC-BR-001 a 063 estiverem aprovadas, rejeitadas ou explicitamente adiadas; **concluído em 2026-07-14**;
2. cada pendência desta lista estiver decidida, marcada como não aplicável ou transformada em gate externo com responsável;
3. a cobertura for atualizada para cada decisão final;
4. a aderência de código, banco, testes e provider for registrada separadamente, sem confundir aprovação de regra com implementação.
