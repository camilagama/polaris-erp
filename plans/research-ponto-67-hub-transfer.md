---
status: accepted
research_status: hub-and-decision-crosswalk-completed
decision_status: approved
reviewed_on: 2026-09-26
approved_on: 2026-09-26
---

# P67 — crosswalk de conceitos do Hub

## Regra de transferência

Reutilizar princípios que já foram validados para Polaris; não copiar files/workflows/dirs do Hub como padrão. O Hub é um monólito com `src/`, uma branch `staging`, ambientes e runbooks próprios. Suas pastas, volumes e estado remoto não definem o estado-alvo do Polaris.

## Conceitos e status no Polaris

| Conceito citado no relatório | Status/autoridade Polaris | Limite para a transferência |
|---|---|---|
| Documentação canônica e `docs/README.md` | Aprovado P7/P14/P51/P63; mapa único em atualização | Preservar taxonomia existente; sem copiar `docs/domain`, `integrations`, `reviews`, `archive` ou mover conteúdo. |
| `CONTEXT.md` | Aprovado P8/P63, ainda a criar | Glossário validado; não instruções/spec nem cópia de business rules. |
| `PRODUCT.md`/`DESIGN.md` | Aprovado P9/P35/P36/P59, reconciliar conteúdo atual | Manter concisão e identidade Polaris; não copiar copy, paleta, componentes ou volume Hub. |
| ADRs | Aprovado P11/P63, backfill de três decisões confirmadas | Não copiar os 17 ADRs Hub; não inventar rationale histórica. |
| `verify:quick`/`verify` e pre-push | Aprovado P20/P21/P61/P62, ainda a implementar | Workspace completo, sem `--affected` inicial; pre-push só após instalação/duração. |
| Proteção de `main` e branches | Aprovado P3/P66, depende da transferência do repo e CI verde | PR para `main`; sem aprovação humana; sem `staging` branch imediata. |
| Staging e release explícito | Ambiente obrigatório pré-go-live (P4/P5); branch/modelo de deploy ainda condicional; SHA/evidência P43/P47/P48/P65/P66 | Não copiar `staging → main` do Hub sem decidir hosting/DB/callbacks; release final precisa SHA rastreável e promoção segura. |
| Migrations fora do build | Aprovado P45/P46/P65; migration remote é operação isolada e target-validated | SQL versionado, replay CI, `db:push` apenas local; sem comandos/provedores Hub. |
| Backup/restore e release evidence | Aprovado P43/P44/P65, antes de dados Production | Validar RPO/RTO e restore real em alvo descartável; não copiar periodicidade/retention/nome de recursos do Hub. |
| Workflows CI e operações | Aprovado P23–29/P61–64; CI separado de um `operations.yml` inicial | Não copiar os onze workflows Hub, nem inserir CodeQL/Dependency Review que foram recusados. |
| Frontmatter/lifecycle | Seletivo P12/P13/P51/P63 | Sem meta universal/freshness em históricos; usar `historical`/`superseded` conforme risco e lifecycle. |
| CodeRabbit/review de IA | Assistivo opcional P30/P67 | Não requerer serviço, check ou aprovação externa. |
| Regras verificadas na CI | Só guards/testes deterministicamente aprovados (P10/P13/P20/P28–29/P39/P46) | Não duplicar todas as regras de domínio em workflows nem exigir ID comentário em cada código/teste. |
| Higiene do repositório | Pontual conforme P17/P19/P22/P26/P46/P55/P63 | Não copiar scripts de limpeza/regras Hub ligados a branches de recuperação e staging. |
| Autoridade canônica vs histórico | Aprovada P43/P50/P51/P57/P63 | Preservar snapshots no local e marcar apenas material selecionado; Hub `release-state` é snapshot datado. |

## Conclusão

P67 não acrescenta execução: torna visível como os princípios já aceitos no plano se relacionam com a referência Hub. O estado implementado, os itens ausentes aprovados e os itens condicionais estão classificados em P60; a ordem permanece em P61–66. Nenhum conteúdo ou configuração Hub foi copiado e nenhum provider remoto foi consultado.
