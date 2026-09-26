# Pesquisa do ponto 51 — autoridade e ciclo de vida do histórico

**Data:** 2026-09-25  
**Estado:** política aceita em 2026-09-25. Rotular históricos e planos substituídos por lifecycle dirigido por risco, sem migração em massa ou metadados de freshness universais.  
**Pergunta:** preservar documentos antigos com contexto e evidência, sem deixá-los competir com fontes canônicas atuais ou serem executados como planos.

## Conclusão provisória

O princípio do relatório é correto: relatórios históricos devem permanecer versionados, mas o índice e as instruções do agente precisam dizer que eles explicam uma observação/decisão passada e não são, por si só, estado operacional ou regra vigente. Para o Polaris, adotar uma autoridade/lifecycle map pequeno em `docs/README.md` e ponteiro no `AGENTS.md`; aplicar rótulos retrospectivos a snapshots stale ou planos executáveis de alto risco, sem frontmatter/freshness em massa. Seguir P12/P13/P14/P15 em vez de copiar a taxonomia inteira do Hub.

## Evidência e classes no Polaris

- `docs/README.md` é o índice canônico aprovado, mas ainda reporta cobertura/commit de julho de 2026 e perguntas abertas como se fossem atuais. Atualizá-lo como documento vivo; não marcar o índice inteiro como histórico.
- `AGENTS.md` ainda trata `aidd_docs/` como lugar de docs/plans/memória e carrega automaticamente a única memória (`aidd_docs/memory/project-state.md`) quando o bloco está vazio. P14/P15 já aprovaram trocar essa autoridade e apontar para `docs/README.md`; executar essa reconciliação em vez de criar regras paralelas.
- `aidd_docs/` contém poucos arquivos: `production-closed-test.md` (P50, snapshot operacional), `codebase-deep-review-2026-07-13.md` (review com estados DONE/IN PROGRESS/BLOCKED) e `memory/project-state.md` (memória automática que ainda afirma configuração Vercel ativa). Manter o diretório no lugar conforme P14; corrigir/rotular cada conteúdo conforme seu papel, não mover em bloco.
- `docs/reports/` contém auditorias e reviews datadas. Algumas já têm aviso de supersessão; outras, como `architecture-deepening-review-2026-07-13.md`, `post-pr-dev-review-analysis-2026-07-10.md`, `prs.md` e `resumo-executivo.md`, exibem estados/vereditos que podem parecer atuais. Rotular apenas os arquivos em que a leitura fora de contexto possa orientar configuração, segurança ou comportamento atual; evitar banners duplicados nos que já estão explicitamente superseded.
- `docs/superpowers/plans/` contém planos/checklists de execução datados com status mistos. Um plano antigo pode conter imperativos como “required sub-skill” e “do not implement without explicit approval” apesar do trabalho concluído. Planos que continuam executáveis precisam de lifecycle explícito; para os superseded, link de substituição e aviso “Não executar”. Não classificar todos como históricos apenas pela data.
- `plans/` contém documentos de naturezas distintas: plano mestre P1–P70 ainda ativo, notas de decisão/pesquisa da revisão e planos técnicos temporais. Cada documento mantém o status apropriado; a presença de uma data não basta para torná-lo histórico.
- P13 já aprovou não aplicar metadados atuais a todos os snapshots/planos. P12 reserva owner/última verificação/fontes para páginas canônicas selecionadas e define SHA/data como identidade do snapshot. P14 preserva `aidd_docs/` no lugar sem migração em massa. P50 preserva o snapshot de produção e o marca histórico.

## Comparação com Hub

O Hub oferece dois controles transferíveis: `docs/README.md` separa material não canônico e `documentation-relations.ts`/`check-docs.ts` exige `execution_status: superseded`, `superseded_by` e aviso “Não executar” para planos superseded. O alcance desse checker é limitado a planos e a própria taxonomia do Hub é inconsistente (`canonical`, `accepted`, `research_only`, `resolved`, `open` etc.); ele não rotula uniformemente todo `docs/reviews/`. Adotar o princípio e o guard específico de plano executável superseded, sem copiar status soltos nem presumir que pasta `reviews` torna todo conteúdo não canônico.

## Fontes externas de alta confiança

Guias públicos de ADR reforçam preservação histórica e status explícito, mas se aplicam a registros de decisão, não a qualquer relatório operacional:

- Microsoft Azure Well-Architected, [Maintain an architecture decision record](https://learn.microsoft.com/en-us/azure/well-architected/architect-role/architecture-decision-record): ADR como log append-only; criar novo registro para mudança e marcar/linkar o anterior como superseded.
- UK Government Digital Service, [Documenting architecture decisions](https://gds-way.digital.cabinet-office.gov.uk/standards/architecture-decisions.html): o ADR substituído é marcado `superseded` com link para o novo.
- Google Cloud, [Architecture decision records overview](https://docs.cloud.google.com/architecture/architecture-decision-records): manter a decisão anterior e o motivo da mudança para preservar histórico.

Essas fontes apoiam histórico rastreável e supersessão explícita; não justificam chamar relatórios antigos de ADR, mudar o status de um documento só por idade ou introduzir um processo pesado.

## Recomendação para o contrato Polaris

1. Em `docs/README.md`, separar explicitamente: **fontes canônicas vigentes**; **estado operacional verificado** (P43/runbooks); **decisões aceitas** (ADRs/decisões identificadas); **material histórico e planos de execução**. Dizer que relatório datado é evidência do estado analisado, não autoridade de produção.
2. Em `AGENTS.md`, encaminhar primeiro ao índice canônico. Relatórios, snapshots e planos completados/superseded servem para contexto; não prevalecem sobre documentação canônica atual, código e evidência remota verificável. Antes de executar um plano antigo, confirmar que seu lifecycle está ativo e que nenhuma decisão posterior o substituiu.
3. Para snapshots e reviews em que valores/ordens antigos possam induzir mudança operacional, usar cabeçalho pequeno `status: historical`, data do snapshot e commit/SHA se conhecido; adicionar `superseded_by` ou link ao runbook/registro atual quando houver substituto. Não adicionar owner/last-verified metadata de fonte vigente a relatórios históricos.
4. Para planos de execução que não podem mais ser rodados, manter conteúdo e marcar `execution_status: superseded`, `superseded_by` e “Não executar”. Planos concluídos ficam `complete`; somente planos ainda autorizados e ativos podem dizer `active`. ADR usa seu próprio ciclo aceito/superseded conforme P11.
5. Fazer primeiro um inventário dirigido a riscos: snapshot operacional P50, memória stale, reviews que afirmam estado de produção atual e planos antigos com comandos/imperativos. Preservar os arquivos e só acrescentar status/ponteiros. Não mover `aidd_docs/`, não apagar relatórios e não editar a conclusão histórica para parecer que o estado atual já era conhecido.
6. Integrar checks ao P13: validar estrutura/status/link de supersessão apenas para as classes ou allowlist acordadas; não exigir freshness atual em arquivos históricos e não confiar só no nome da pasta.

## Limitações

A revisão é de arquivos locais e documentação publicada; nenhum estado externo foi consultado. A política final precisa manter os limites já aprovados em P12/P13/P14/P15 e ser aplicada sem reclassificar a documentação canônica inteira como snapshot.
