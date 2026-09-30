# Índice e autoridade documental

**Mapa atualizado:** 2026-09-30.
Este índice define onde encontrar contratos vigentes, evidência operacional, decisões aceitas e material histórico. A existência de um procedimento ou relatório no repositório não comprova que uma configuração externa foi aplicada.

## Fontes canônicas e estado de reconciliação

- [PRODUCT.md](../PRODUCT.md): fonte de produto para público, problema, resultado esperado e limites; brief reconciliado em P9 em 2026-09-30. A validação de público/problema foi confirmada pelo responsável, mas o artefato de pesquisa não está versionado.
- [DESIGN.md](../DESIGN.md): fonte de design para linguagem visual, acessibilidade e apresentação de dados; contrato documental reconciliado na etapa 3 de P63 em 2026-09-30. Axe e avaliação das jornadas (P36), além das correções de código P58/P59 previstas em P69, seguem pendentes.
- [CONTEXT.md](../CONTEXT.md): vocabulário aprovado de produto e domínio, sem regras ou detalhes de implementação.
- [Regras normativas aprovadas](business-rules/normative/README.md) definem o comportamento de negócio aprovado. Os documentos de arquitetura, módulos, API, segurança e banco descrevem seus contratos técnicos ou o comportamento observado; confronte implementação com código, schema, migrations e testes, e registre divergências na fonte documental correspondente.
- O [glossário técnico](glossary.md) nomeia mecanismos e identificadores do código; não substitui o vocabulário de domínio em `CONTEXT.md`.
- [Manutenção documental](maintenance.md): define quando e como atualizar documentação, fontes e referências.

Os ADRs seletivos aprovados em P11 serão criados em `docs/adr/`. Até esse backfill, as decisões aceitas e a ordem de execução desta fundação estão registradas no [plano mestre](../plans/fundacao-polaris-erp.md). As notas de pesquisa apoiam a análise, mas não autorizam implementação por si mesmas.

## Estado e evidência operacional

- [Registro de prontidão de produção (P43)](operations/production-readiness.md): fonte para estado de gates, configuração externa observada, evidências, responsáveis, próximas ações e gatilhos de revalidação.
- [Deploy Vercel](runbooks/deploy-vercel.md), [migrations de Production](runbooks/production-migrations.md) e [backup e recuperação](runbooks/backup-and-recovery.md) descrevem procedimentos; nenhum prova que a operação foi executada ou que o recurso externo está configurado.
- Para qualquer configuração de Vercel, Neon, provedores ou credenciais, use evidência atual registrada em P43. Código e configuração versionados descrevem a intenção implementada, não confirmam o estado remoto.

## Material histórico e planos

- [Teste fechado de produção](../aidd_docs/production-closed-test.md): snapshot histórico de 2026-07-12; IDs, hosts e comandos registrados ali não são estado atual. P43 e os runbooks vigentes são os pontos de consulta operacional.
- [Regras de negócio V1.5](product/01-regras-de-negocio.md): snapshot histórico de 2026-04-02, preservado para contexto; não é fonte normativa nem prova do estado atual.
- [Roadmap pós-MVP anterior](product/roadmap.md): plano superseded; não executar. Ideias antigas foram preservadas, sem constituir compromissos ou prioridades atuais.
- [Cobertura documental](documentation-coverage.md): matriz baseada no commit `886eda0`, revisado em 2026-07-14, com adendos posteriores que não revalidam a matriz inteira.
- [Plano documental original](documentation-plan.md): checklist concluída para o snapshot de julho de 2026; não é o plano de execução atual da fundação.
- Relatórios em `docs/reports/`, snapshots em `aidd_docs/` e planos em `docs/superpowers/plans/` podem ser contexto ou evidência histórica. Leia o status e o escopo de cada arquivo; não deduza lifecycle ou autoridade apenas pelo nome ou pela data.
- Antes de executar qualquer plano antigo, confirme que seu lifecycle está ativo e que nenhuma decisão ou plano posterior o substituiu. Planos marcados como superseded não devem ser executados.

## Ordem prática de leitura

1. [README principal](../README.md): produto, stack, setup e comandos.
2. [PRODUCT.md](../PRODUCT.md), [DESIGN.md](../DESIGN.md) e [CONTEXT.md](../CONTEXT.md): intenção de produto, regras de interface e vocabulário de domínio.
3. [Visão arquitetural](architecture/overview.md) e [glossário técnico](glossary.md): estrutura e termos de implementação.
4. [Ambientes de banco, E2E e RLS](architecture/database-environments.md) e [estratégia de testes](testing/strategy.md): limites técnicos e evidência de teste.
5. P43 e o runbook específico antes de qualquer operação externa.
