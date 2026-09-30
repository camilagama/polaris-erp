---
status: accepted
research_status: repo-and-policy-crosswalk-completed
decision_status: approved
reviewed_on: 2026-09-26
approved_on: 2026-09-26
---

# P70 — prontidão para desenvolvimento e para go-live

## Conclusão

O checklist P70 é útil, mas mistura duas perguntas distintas: quando o projeto pode voltar a receber mudanças grandes e quando pode operar com dados reais de Production. O usuário aprovou dois gates separados para não exigir configuração remota/backup real antes de continuar desenvolvimento local com dados sintéticos e, ao mesmo tempo, não liberar Production sem essas provas.

## Gate A — retomar features amplas

Esse gate confirma que o ciclo comum é previsível e protegido:

- baseline atual consertada, sem quarentena (P22);
- `verify:quick` e `verify` cobrindo o workspace segundo P20, com hook P21 condicionado a instalação/medição;
- PostgreSQL CI em 18 conforme P54 e upgrades estáveis P2/P52 em batches;
- `ci.yml` separado de `operations.yml`, permissions/SHA pins/concurrency dentro das decisões P23–27/P61–64;
- repositório transferido à conta GitHub Pro do irmão e `main` protegida pelo owner com PR e checks estáveis, sem aprovação humana obrigatória (P3);
- fluxo de migrations versionadas/replay CI e guard `db:push` local (P45/P46);
- mapa documental, CONTEXT, PRODUCT, DESIGN, ADRs e validação seletiva implementados conforme P63.

Esse gate não certifica hospedagem, providers, backup/restore real, estado de Neon/Vercel ou capacidade operacional de Production. O estado remoto de `main` continua desconhecido até o owner efetivar/configurar a transferência.

## Gate B — go-live e primeiro dado real

Esse gate protege o corte para Production:

- persistent Staging completa e ensaiada antes do go-live (P4/P5);
- P43 atualizado, com fatos separados para código/config, configuração externa observada e validação contra ambiente/SHA; requisitos limitados às capacidades do lançamento;
- parity PostgreSQL 18, branch Neon real e runtime role/RLS provados;
- migration de Production via operação separada, SHA aprovado e validação do host/branch; sem `db:push` remoto (P45/P46);
- PITR, backup cifrado externo e restore drill real em alvo descartável; medir RPO≤1h/RTO≤8h e ajustar antes de dados reais (P44);
- deployment staged de Production para SHA selecionado, verificação e promoção do deployment ID sem rebuild quando suportado; Web/Admin sequenciais com candidatos prontos, smoke por app e estado parcial registrado se houver falha (P47/P48);
- Admin com proteção externa Vercel e autorização `platform_admin` interna; smoke autenticado não pode ser substituído por 401/403 (P49/P57);
- integrações e canários somente para recursos incluídos no lançamento; transações financeiras e e-mails de clientes nunca são gerados para “passar” o checklist (P57/P65).

### Vercel: Preview, Staging e staged Production

A documentação atual diferencia Local, Preview e Production por padrão; Custom Environments como `staging` dependem de Pro/Enterprise; uma Preview branch pode simular staging em qualquer plano; e staged Production valida com variáveis de Production antes de atribuir os domínios. A Vercel informa que o primeiro deployment de um projeto é sempre Production e que staged Production pode acessar Production services/data. Portanto, preparar proteção/domínios/variáveis antes do primeiro deploy, usar Preview/Staging isolado para mutações e tratar staged Production como dado/serviço live. [Vercel Environments](https://vercel.com/docs/deployments/environments)

GitHub rulesets/branch protection aplicam-se ao branch de origem e exigem checks selecionados; são configuração remota do owner, não consequência de ter YAML versionado. Proteção de `main` depende da transferência para a conta Pro e baseline/check contexts verdes (P3/P61). [GitHub About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)

## Limites

Os arquivos locais e planos aprovados não comprovam Settings do GitHub, projeto/deployment Vercel, branch/role Neon, secrets, callbacks, alertas nem restore real. Nenhum teste, deployment, migration, backup/restore ou consulta de contas foi executado nesta revisão.
