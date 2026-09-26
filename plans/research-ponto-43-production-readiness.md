# Pesquisa do ponto 43 — registro vivo de prontidão de produção

**Data:** 2026-09-25  
**Estado:** aceito em 2026-09-25. Q1–Q3 aprovadas: registro separado, estados explícitos, escopo por lançamento e revalidação por gatilhos/antes do go-live.  
**Pergunta:** manter evidência de prontidão de produção sem tratar código como prova de configuração externa nem duplicar procedimentos operacionais.

## Recomendação

Criar `docs/operations/production-readiness.md` como um **registro curto de gates externos e evidências**, não como novo runbook nem como cópia de `docs/runbooks/deploy-vercel.md`. O registro deve apontar para o contrato implementado, para o procedimento existente e para a evidência observada no ambiente específico.

Refinar a matriz do relatório para separar três coisas que hoje poderiam parecer um único “configurado/testado”:

| Gate e ambiente | Contrato/código e procedimento | Estado da configuração externa | Resultado da validação | Evidência/escopo | Verificado em (UTC) | Responsável / próxima ação | Revalidar quando |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Ex.: RLS do runtime — Neon Production | links para regra, preflight e runbook | não confirmado / confirmado / ausente | não executado / aprovado / falhou / bloqueado / obsoleto / N/A | ID ou link sanitizado, SHA/deployment quando aplicável | data/hora | nome ou papel; ação concreta ou “sem pendência” | migration/policy/role/branch alterada; ou cadência própria do controle |

Regras para preencher a matriz:

1. **Código e configuração versionada são referências de intenção, não atestados do ambiente externo.** Uma regra de preflight ou um teste com banco efêmero demonstra o comportamento verificado nesse contexto; não prova que Vercel, Neon, OAuth, R2 ou Upstash estejam configurados ou funcionando em Production. A nota existente de ambientes já explicita esse limite.
2. **“Configuração externa confirmada” exige observação no provider e escopo claro.** Registrar apenas o que foi conferido — presença/estado, ambiente/projeto e data — sem valores de secrets, URLs completas de banco, PII, payloads, headers ou logs brutos.
3. **“Validação aprovada” exige resultado observado contra o alvo declarado.** Para smoke/deploy, registrar o ambiente e SHA/deployment; para uma configuração durável do provider, registrar conta/projeto/objeto de forma sanitizada e o momento da leitura. Uma CI verde em recurso efêmero não substitui a evidência de Production.
4. **Itens compostos devem virar gates atômicos.** “Vercel web” pode esconder domínio, variáveis, headers e proteção; “Neon” pode esconder branch, papel runtime, role de migration, backup e conectividade. Quebrar apenas quando cada parte puder passar/falhar independentemente; manter agrupamento por sistema para leitura.
5. **Toda lacuna precisa de responsável e próxima ação.** Usar `bloqueado` quando faltar acesso, confirmação externa ou condição necessária; deixar o responsável explicitamente não atribuído quando desconhecido. `N/A` exige motivo curto, não serve para esconder ausência de validação.
6. **Evidência aponta para a fonte do resultado em vez de copiá-la.** Usar run/workflow ID, SHA, ID de deployment e link ao histórico do provider, guardando resultados restritos no local aprovado. Não replicar no Markdown o histórico de deployments, logs ou passo a passo dos runbooks.
7. **A data precisa ser contextualizada por escopo.** `Verificado em (UTC)` significa quando aquela configuração ou validação foi observada. Evidência de execução deve identificar o ambiente e, quando relacionada ao software, o SHA/deployment. `Last verified` sem alvo identificável não basta.
8. **Obsolescência é acionada por mudança relevante, não por um prazo universal arbitrário.** Marcar a evidência como `obsoleto` quando ocorrer seu gatilho de revalidação. Definir prazo/due date apenas para controles com cadência ou expiração própria (por exemplo, exercício de restore ou credencial/certificado), de acordo com a decisão operacional correspondente.

Gatilhos típicos que devem invalidar ou reabrir uma evidência, quando afetarem seu escopo: mudança de projeto/domínio ou ambiente; rotação/escopo de credencial; callback OAuth; branch/role/owner/migration/policy do banco; alteração do bucket/policy/lifecycle R2; alteração de proteção/permissões do deployment; mudança de alerta/provider; novo deploy quando o teste é específico ao SHA. Não marcar toda configuração durável como obsoleta a cada commit; não reutilizar um smoke de outro SHA como prova do candidato atual.

O registro deve concentrar estado atual e pendências abertas. O histórico de deploys e workflows continua nas páginas do GitHub/Vercel. Um checkpoint pontual por SHA só deve ser acrescentado a outro artefato se o fluxo acordado exigir uma decisão de release registrada; não transformar este documento em diário de cada deploy.

## Evidência no Polaris

- `docs/operations/environments-and-deployment.md` diz que aplicações, builds e smokes têm definição versionada, mas a promoção, os projetos ativos e valores de ambiente não podem ser inferidos do repositório. Também diferencia preflight (presença/força e coerência de configuração) de testes contra serviços remotos, explica os limites do smoke e observa que workflow de restore drill não prova que um restore foi concluído.
- `docs/runbooks/deploy-vercel.md` já é o procedimento extenso: pré-requisitos, env, proteção do admin, OAuth, migrations/RLS, restore, R2 e promoção. A seção de preflight afirma que `prod:preflight` valida wiring/configuração e que a proteção real da Vercel deve ser verificada no projeto. Um novo readiness doc que repetisse esses passos criaria duas fontes propensas a divergir.
- `docs/operations/observability.md` já separa instrumentação de código da existência de dashboards, alertas e retenção confirmados no provider.
- `docs/database/rls-and-tenant-context.md` distingue policies versionadas e testes PostgreSQL efêmeros de prova de runtime, grants, role `NOBYPASSRLS`, policies reais e drift no ambiente promovido.
- `aidd_docs/memory/project-state.md` registra gates externos ainda abertos para Vercel, Neon, R2, Upstash, Sentry, OAuth e integrações. A nova matriz deve ser fonte operacional mais precisa para estado/evidência e a memória deve apontar para ela, em vez de manter listas paralelas de status.

## Comparação com o Hub

O Hub usa dois artefatos relevantes: `docs/operations/external-readiness-checklist.md` combina um snapshot datado de evidências com os procedimentos detalhados para fechar os gates; `docs/operations/release-state.md` identifica checkpoints e associa SHA, ambiente e IDs de workflows/deployments. O padrão útil é registrar escopo/data/IDs sanitizados e não repetir operações já provadas. O Polaris deve preservar o conteúdo operacional de `docs/runbooks/deploy-vercel.md` e manter o novo registro mais fino que a checklist do Hub: status atual, responsável/ação e ponteiros para procedimentos e evidências. Não copiar os checkpoints, credenciais, nomes de workflows, sequência de homologação ou volumetria específica do Hub.

## Fontes primárias atuais

- Google SRE, **Reliable Product Launches**: o processo de lançamento varia conforme características e risco; checklist bem mantido deve ser leve, robusto e adaptável, fornecer ações e ponteiros, e ser revisto para remover itens obsoletos. O texto alerta que checklists detalhadas perdem atualidade quando o ritmo de lançamentos é baixo; isso favorece um registro pequeno e gatilhos de revalidação, sem burocracia copiada de uma operação maior. [Google SRE — Reliable Product Launches](https://sre.google/sre-book/reliable-product-launches/)
- AWS Well-Architected, **Operational Readiness Reviews — Inspect the process**: acompanha quando ocorreu o último ORR e quantos itens de ação seguem abertos; pede narrativa de riscos/mitigações e mecanismo de fechamento, e usa lacunas críticas na decisão go/no-go. Sustenta registrar data e ação/responsável junto à evidência, não apenas um checkbox de “pronto”. [AWS ORR — Inspect the process](https://docs.aws.amazon.com/wellarchitected/latest/operational-readiness-reviews/inspect-the-process.html)
- GitLab Handbook, **Platform Readiness Enablement Process (PREP)**: avaliação progressiva e baseada em evidências, com respostas apoiadas por documentação, detalhes de implementação ou issue; o conjunto de categorias cresce conforme a maturidade/escopo. É um exemplo atual de readiness com evidência e completude progressivas; os vários stakeholders e aprovações formais de GitLab não se aplicam automaticamente ao Polaris com um único revisor. [GitLab PREP](https://handbook.gitlab.com/handbook/engineering/infrastructure-platforms/production/prep/)
- GitLab Runbooks define runbook como instrução para executar uma tarefa manual, recomenda-os concisos e explicitamente desaconselha duplicação; guia de readiness e ledger de estado devem apontar para eles. [GitLab Runbooks](https://runbooks.gitlab.com/)
- Vercel, **Production checklist**: separa preocupações de operação, segurança, confiabilidade, desempenho e custo e alerta para práticas dependentes do plano. Serve como índice de áreas a considerar para Vercel, não como evidência de que cada configuração do Polaris existe. [Vercel Production Checklist](https://vercel.com/docs/production-checklist)
- GitHub, **Viewing deployment history**: já registra ambientes, deployments ativos/históricos, commit associado, logs da workflow, URL e status. Isso pode ser evidência referenciada pelo registro; copiar todo o histórico ao Markdown seria duplicação. [GitHub — Viewing deployment history](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/view-deployment-history)

## Evidência comunitária (anedótica)

Em um tópico recente de `r/devops` sobre readiness para equipes pequenas, participantes enfatizam que rollback escrito não equivale a rollback exercitado, que um alerta sem dono tende a ser ignorado e que gates indiscriminados podem criar trabalho sem reduzir risco. Há discordância sobre quais controles são indispensáveis. É experiência pessoal, não norma: reforça testar o resultado, nomear quem age e manter a matriz proporcional ao risco do Polaris. [Discussão em r/devops](https://www.reddit.com/r/devops/comments/1vnxx4v/what_belongs_in_a_productionreadiness_gate_for_a/)

## Decisão recomendada para o ponto 43

1. Aprovar `docs/operations/production-readiness.md` como índice curto de estado e evidência externa, com as colunas refinadas acima (ou equivalente compacto).
2. Manter `docs/runbooks/deploy-vercel.md` e runbooks por serviço como fonte dos procedimentos. A matriz aponta para eles e não replica comandos nem instruções.
3. Separar referência de implementação, estado observado no provider e resultado de validação. Até conferência externa, registrar estado como não confirmado/pendente; nunca inferir configuração em produção de testes locais, CI ou env schema.
4. Registrar evidências sanitizadas e escopadas a ambiente/SHA quando aplicável; exigir responsável e próxima ação para cada gap; definir gatilhos específicos para atualização e `obsoleto`.
5. Atualizar o índice de status da memória do projeto para apontar à matriz quando o plano for implementado, evitando duas listas concorrentes de prontidão externa.

Este ponto decide o formato e a autoridade do registro. Não executa configurações externas, smoke, restore drill nem validação em produção; cada uma exige seu próprio procedimento e autorização operacional já definida.
