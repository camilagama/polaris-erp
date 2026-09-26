---
status: accepted
research_status: hub-and-decision-crosswalk-completed
decision_status: approved
reviewed_on: 2026-09-26
approved_on: 2026-09-26
---

# P68 — itens do Hub que não serão transplantados

P68 confirma os limites de transferência do crosswalk P67. A comparação usa o checkout local do Hub como exemplo do seu próprio contexto, não como especificação de Polaris.

| Item a não copiar cegamente | Regra Polaris aplicável |
|---|---|
| Todos os workflows e automações | P23 começa com `ci.yml` + um `operations.yml` de dispatch seletivo. Deploy/backup/restore ficam condicionados a P4/P5/P23/P44–48. |
| Árvore de 47+ documentos e diretórios Hub | Preservar a taxonomia atual segundo P7/P63; manter `aidd_docs/` e histórico no local conforme P14/P50/P51. |
| Todas as instruções `AGENTS.md` | P15–17 mantêm orientação raiz e leituras condicionais. P46 é a exceção específica de `packages/db/AGENTS.md`. |
| Cron model | Implementar/agendar apenas jobs necessários ao domínio, alinhados a P57, sem copiar cron schedules/cadências do LMS/Hub. |
| Estratégia/nomes/frequência de backup | P44 define PITR + cópia externa, RPO/RTO e restore drill medido para Polaris; não copiar bucket, retenção ou cron do Hub. |
| Topologia Neon, branches e fluxo de deploy | P4/P5/P54 definem infra e PG18 do Polaris; não copiar IDs/branches/ambientes Hub. |
| Hotfix/reconciliation choreography inteira | Reusar os gates de compatibilidade, SHA, migrations, smoke e recuperação P43–48/P65–66; manter complexidade operacional só quando necessidade demonstrada. |
| Regras de LMS | Sem equivalência de domínio no ERP Polaris. |
| Quantidade de ADRs | P11 aprova três backfills seletivos com rationale verificável e futuros ADRs por trade-off, não 17 por simetria. |

Outros exemplos já delimitados em P67: CodeRabbit é assistivo, workflow Codescan/SAST segue a opção P29, rules/labels não viram gate sem aprovação e a autenticidade de status Hub deve sempre ser validada antes de tratar snapshots como estado atual. Excluir esses detalhes do template Polaris não é licença para ignorar os requisitos de segurança, backup, restore, release ou evidência que foram aprovados especificamente para o projeto.

Nenhum arquivo do Hub foi copiado ou movido e nenhum serviço externo foi consultado.
