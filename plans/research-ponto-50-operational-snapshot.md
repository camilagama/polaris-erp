# Pesquisa do ponto 50 — snapshot operacional versus memória vigente

**Data:** 2026-09-25  
**Estado:** decisão aceita em 2026-09-25; implementação documental aprovada em 2026-09-29 no commit `cf9eed5` da PR #2. Preservar `aidd_docs/production-closed-test.md` no local atual, marcando o snapshot de 2026-07-12 como histórico e apontando às fontes operacionais vigentes.
**Pergunta:** como preservar `aidd_docs/production-closed-test.md` sem apresentar seu estado remoto de julho como vigente.

## Conclusão provisória

A preocupação do relatório é correta: um snapshot com recursos, hosts, credenciais esperadas e comandos de deploy pode ser confundido com instrução atual. Mas a proposta de movê-lo para `docs/reviews/` conflita com P14, já aprovado: preservar `aidd_docs/` no lugar, sob demanda e sem migração em massa. Além disso, o arquivo não é carregado pelo `AGENTS.md` quando a memória é lida: o loader lê `aidd_docs/memory/`, que contém somente `project-state.md`.

Recomendo preservar o arquivo no caminho atual e adicionar uma marcação visível `status: historical`, data do snapshot (`2026-07-12`) e aviso explícito de que os IDs/hosts/configurações/comandos descrevem uma tentativa histórica, não devem ser executados nem tratados como estado Vercel/Neon atual. O registro P43 e os runbooks atuais são a autoridade para prontidão e procedimentos vigentes. Não mover o arquivo nem criar uma nova árvore de arquivo/review neste ponto.

## Evidência no Polaris

- `aidd_docs/production-closed-test.md` declara atualização em 2026-07-12 e lista IDs/hosts de Vercel e Neon, ambientes, URLs de webhooks, variáveis e comandos capazes de alterar envs/promover deploy. Isso contradiz a declaração atual do usuário de que o Polaris ainda não foi publicado/conectado à Vercel; nenhum desses valores pode ser afirmado como remoto vigente. Não há valores literais de secrets no arquivo auditado.
- O snapshot inclui o nome histórico `R2_BUCKET_PUBLIC`; documentos/código atuais usam `R2_BUCKET_FINAL`.
- O único `AGENTS.md` do checkout carrega arquivos em `aidd_docs/memory/` quando o bloco está vazio, não todos os arquivos da raiz `aidd_docs/`. Portanto, mover o snapshot não mudaria o carregamento automático atual; sua marcação evita confusão quando buscado explicitamente.
- `docs/architecture/external-integrations.md` e `docs/operations/environments-and-deployment.md` dizem que estado remoto/projetos ativos não são inferidos pelo código e que preflight local não prova configuração remota. O P43 aprovado cria `docs/operations/production-readiness.md` como registro vigente de status/evidências.
- Não há diretório `docs/reviews/` no Polaris nem convenção local estabelecida para isso. Mover o arquivo exigiria atualizar três referências e contrariaria P14 sem melhorar os fatos canônicos.

## Comparação com Hub e decisões anteriores

O Hub mantém revisões datadas separadas no índice e uma seção para material não canônico, mas seu `docs/reviews/` tem frontmatter/status inconsistente e não estabelece `historical` como enumeração universal. O aprendizado transferível é distinguir snapshots de documentos canônicos e colocar aviso/link para o estado atual, não copiar cegamente a pasta/status do Hub.

P14 já definiu que `aidd_docs/` permanece no lugar, como contexto auxiliar e histórico sob demanda, com afirmações atuais revalidadas contra código/docs/estado externo. P12 aprovou páginas históricas como snapshots identificados pela data/status original, sem metadados de freshness canônica. P50 deve reforçar essas decisões, não reabrir uma migração em massa.

## Ação recomendada para implementação posterior

1. Preservar `aidd_docs/production-closed-test.md` no local atual e seu corpo histórico.
2. Acrescentar, antes do conteúdo operacional, aviso `status: historical` com data do snapshot e a instrução: não usar IDs, hosts, envs ou comandos como configuração atual; não executar os comandos; consultar `docs/operations/production-readiness.md` e runbooks vigentes.
3. Não mover nem duplicar o conteúdo em `docs/reviews/` e não alterar instruções de startup para carregar este snapshot.
4. Reconciliar a memória `aidd_docs/memory/project-state.md` e ponteiros ativos durante a implementação de P14, sem copiar as antigas afirmações de Vercel/Neon.
5. Generalizar a regra para outros materiais históricos no P51, evitando frontmatter/status com enums conflitantes antes dessa decisão.

## Limitações

Auditoria e implementação somente documental. Não consultamos Vercel, Neon, R2, Resend ou qualquer serviço remoto; nenhuma configuração antiga foi revalidada. O corpo do snapshot foi preservado.

## Revalidação e implementação P50 — 2026-09-29

- `aidd_docs/production-closed-test.md` agora tem `status: historical`, `snapshot_date: 2026-07-12`, aviso destacado contra reutilizar IDs/hosts/envs/URLs/comandos e links para o P43 e runbooks vigentes. A inserção não moveu nem reescreveu o conteúdo do snapshot.
- `aidd_docs/memory/project-state.md` foi relido: seu ponteiro P43 já está atualizado e o texto não afirma que a Vercel esteja ativa. Nenhuma alteração adicional à memória é necessária para P50.
- A mudança é apenas documental; aprovada pelo usuário. Nenhum provider foi consultado ou alterado.
