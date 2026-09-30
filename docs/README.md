# Índice e autoridade documental

**Mapa atualizado:** 2026-09-29.
Este índice define onde encontrar contratos vigentes, evidência operacional, decisões aceitas e material histórico. A existência de um procedimento ou relatório no repositório não comprova que uma configuração externa foi aplicada.

## Fontes canônicas vigentes

- [PRODUCT.md](../PRODUCT.md): público, problema, resultado esperado e limites do produto.
- [DESIGN.md](../DESIGN.md): linguagem visual, acessibilidade e apresentação de dados na interface.
- [Visão arquitetural](architecture/overview.md), [estrutura do repositório](architecture/repository-structure.md), [glossário](glossary.md), regras de negócio, módulos e documentos de banco: descrevem o domínio e o comportamento pretendido. Confirme divergências contra o código, o schema, as migrations e os testes correspondentes; atualize a fonte documental no mesmo PR.
- [Manutenção documental](maintenance.md): define quando e como atualizar documentação, fontes e referências.

O vocabulário de domínio ainda será consolidado em `CONTEXT.md`, e os ADRs seletivos aprovados em P11 serão criados em `docs/adr/`. Até esse backfill, as decisões aceitas e a ordem de execução desta fundação estão registradas no [plano mestre](../plans/fundacao-polaris-erp.md). As notas de pesquisa apoiam a análise, mas não autorizam implementação por si mesmas.

## Estado e evidência operacional

- [Registro de prontidão de produção (P43)](operations/production-readiness.md): fonte para estado de gates, configuração externa observada, evidências, responsáveis, próximas ações e gatilhos de revalidação.
- [Deploy Vercel](runbooks/deploy-vercel.md), [migrations de Production](runbooks/production-migrations.md) e [backup e recuperação](runbooks/backup-and-recovery.md) descrevem procedimentos; nenhum prova que a operação foi executada ou que o recurso externo está configurado.
- Para qualquer configuração de Vercel, Neon, provedores ou credenciais, use evidência atual registrada em P43. Código e configuração versionados descrevem a intenção implementada, não confirmam o estado remoto.

## Material histórico e planos

- [Teste fechado de produção](../aidd_docs/production-closed-test.md): snapshot histórico de 2026-07-12; IDs, hosts e comandos registrados ali não são estado atual. P43 e os runbooks vigentes são os pontos de consulta operacional.
- [Cobertura documental](documentation-coverage.md): matriz baseada no commit `886eda0`, revisado em 2026-07-14, com adendos posteriores que não revalidam a matriz inteira.
- [Plano documental original](documentation-plan.md): checklist concluída para o snapshot de julho de 2026; não é o plano de execução atual da fundação.
- Relatórios em `docs/reports/`, snapshots em `aidd_docs/` e planos em `docs/superpowers/plans/` podem ser contexto ou evidência histórica. Leia o status e o escopo de cada arquivo; não deduza lifecycle ou autoridade apenas pelo nome ou pela data.
- Antes de executar qualquer plano antigo, confirme que seu lifecycle está ativo e que nenhuma decisão ou plano posterior o substituiu. Planos marcados como superseded não devem ser executados.

## Ordem prática de leitura

1. [README principal](../README.md): produto, stack, setup e comandos.
2. [PRODUCT.md](../PRODUCT.md) e [DESIGN.md](../DESIGN.md): intenção de produto e regras de interface.
3. [Visão arquitetural](architecture/overview.md) e [glossário](glossary.md): estrutura e conceitos.
4. [Ambientes de banco, E2E e RLS](architecture/database-environments.md) e [estratégia de testes](testing/strategy.md): limites técnicos e evidência de teste.
5. P43 e o runbook específico antes de qualquer operação externa.
