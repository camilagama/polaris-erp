# Cobertura de decisões materiais

**Status:** rascunho de descoberta, **não normativo**.  
**Objetivo:** verificar que cada lacuna, contradição, risco ou obrigação material da descoberta tenha uma decisão aprovada, uma decisão aberta, um gate externo ou uma justificativa explícita de não aplicabilidade. Não substitui a matriz regra-versus-teste.

## Cobertura atual

| Domínio | Achados materiais da descoberta | Decisões/gates relacionados | Situação |
| --- | --- | --- | --- |
| Identidade e tenancy | OAuth, uma organização e um owner, papel owner e suspensão | DEC-BR-001, 002, 004, 030, 043, 059, 068, 081 | Decisões de produto aprovadas; implementação e prova promovida pendentes |
| Billing e entitlements | Free/pago, quotas, inadimplência, cancelamento, checkout, recuperação e ordem de eventos | DEC-BR-003, 005–020, 024–025, 028–029, 034–035, 044, 050, 052, 064–069 | Modelo, relógio e contingência aprovados; providers permanecem gate externo |
| Catálogo e imagens | Quota cadastrada, galeria, arquivamento, remoção lógica e histórico | DEC-BR-008, 013, 017–018, 021–023, 026–027, 051, 070, 079 | Regras aprovadas; purge físico depende da retenção gateada |
| Estoque | Ledger único, concorrência, repetição de ajuste e rastreabilidade por venda | DEC-BR-033, 036, 045 | Decisões aprovadas; implementação e teste de retry pendentes |
| Vendas | Cancelamento, valor cobrado, snapshots e reconciliação | DEC-BR-032, 036, 047 | Decisões aprovadas; refund/settlement não aplicável no lançamento por decisão explícita |
| Metas | Limite por plano, unicidade por métrica e corrida de resolução | DEC-BR-014, 031, 046 | Decisões aprovadas; implementação concorrente pendente |
| Eventos e integrações | Captura parcial, retry, ordem e provider | DEC-BR-034, 035, 044, 049, 050, 062–063, 078, 080, 082–083 | Recovery, ordenação, retry, replay e telemetria aprovados; prova promovida/provider é gate |
| Privacidade e auditoria | Direitos, retenção, encerramento, incidentes e papéis de tratamento | DEC-BR-036 a 042, 072–075 | Decisões aprovadas; tabela de retenção, mapa de papéis e responsáveis nomeados são gates externos |
| Admin de plataforma | Separação entre plataforma e tenant, suporte e ações sensíveis | AS-IS em `actors-and-permissions.md`; DEC-BR-036, 043, 048 | Decisões aprovadas; implementação e auditoria de leitura sensível pendentes |
| Identidade, admin e dashboard | Linking, revogação de sessão, PII por papel, grants, escopo temporal e timezone | DEC-BR-059, 060, 061 | Decisões aprovadas; implementação e prova promovida pendentes |
| Operação de providers e release | Retry/concurrency/revisão de jobs, lifecycle de e-mail, R2, RLS e prova promovida | DEC-BR-062, 063, 076–080, 083 | Regras aprovadas; validação de ambiente e provider permanecem gates |
| Fronteira do lançamento | Domínios existentes e exclusões explícitas | DEC-BR-085 | Escopo aprovado; expansão exige nova descoberta |

## Pendências já prontas para debate posterior

As waves de pesquisa foram consolidadas. Não há decisão de produto material pendente no escopo do lançamento; permanecem gates externos, nomeação de responsáveis e implementação.

1. **Gate jurídico/contábil:** tabela de retenção por categoria, fundamento, prazo e destino final; DEC-BR-040 e 074.
2. **Gate jurídico/privacidade:** mapa de papéis, categorias, compartilhamentos, aviso e contrato; DEC-BR-042 e 072.
3. **Gate de pessoas:** Privacy Lead, Incident Commander e suplentes nomeados, com runbook exercitado; DEC-BR-075.
4. **Gate de provider:** Asaas cartão e Woovi PIX Automático precisam de sandbox, contrato, autenticação de webhook, recuperação e suporte; DEC-BR-028, 029, 034, 035, 044 e 064.
5. **Gate promovido:** RLS, backup/restore, jobs, e-mail, R2/CORS/lifecycle e OAuth precisam de prova datada; DEC-BR-076 e 077.

## Critério para encerrar o debate

O debate só estará pronto para documentação normativa quando:

1. DEC-BR-001 a 085 estiverem aprovadas, rejeitadas ou explicitamente adiadas; **concluído em 2026-07-14**;
2. cada pendência desta lista estiver decidida, marcada como não aplicável ou transformada em gate externo com responsável;
3. a cobertura for atualizada para cada decisão final;
4. a aderência de código, banco, testes e provider for registrada separadamente, sem confundir aprovação de regra com implementação.
