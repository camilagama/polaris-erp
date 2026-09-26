# Pesquisa do ponto 17 — `AGENTS.md` aninhados em monorepo

**Data:** 2026-09-24  
**Pergunta:** instruções aninhadas melhoram o fluxo de agentes no Polaris; em quais áreas elas acrescentam regra própria em vez de repetir fontes canônicas?

## Síntese

Instruções aninhadas são um mecanismo suportado por Codex e por alguns outros harnesses, mas a disponibilidade e a precedência variam entre ferramentas. Elas são adequadas quando uma subárvore tem uma regra de risco, workflow ou toolchain diferente e uma instrução local pode carregá-la somente quando o agente trabalha ali. A existência de pastas separadas, por si só, não demonstra necessidade.

A documentação oficial do Codex diz que os arquivos aplicáveis se acumulam da raiz até o diretório de trabalho, e o arquivo mais próximo vem depois e pode refinar o guidance anterior. Codex inclui no máximo um arquivo por diretório e limita o tamanho combinado (32 KiB por padrão); os docs sugerem dividir quando esse limite ou a especialização justificarem ([Codex: `AGENTS.md`](https://developers.openai.com/codex/guides/agents-md)). GitHub Copilot CLI também descobre instruções em diretórios ancestrais e aninhados, mas combina instruções e não define precedência geral entre todos os tipos, recomendando evitar conflitos ([GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions)). VS Code documenta AGENTS aninhado como experimental para o agente local e desativado por padrão; para Agent Host valem as regras do harness escolhido ([VS Code custom instructions](https://code.visualstudio.com/docs/agent-customization/custom-instructions)). Portanto, arquivos aninhados são portáveis em parte, não uma garantia uniforme para todo agente.

## Evidência de uso de contexto

Estudos recentes divergem. Um estudo com 10 repositórios e 124 PRs associou presença de `AGENTS.md` a redução de runtime e tokens, sem diferença observada de conclusão. Outro teste em SWE-bench/CTXbench encontrou queda de sucesso e aumento de custo em várias condições, apontando instruções desnecessárias como fator de dificuldade. As amostras, agentes, modelos e protocolos diferem; nenhum resultado prova se um arquivo local específico ajudará o Polaris. A conclusão prudente é exigir uma regra local concreta e pequena, não preencher os diretórios por convenção ([Lulla et al., 2026](https://arxiv.org/abs/2601.20404); [Gloaguen et al., 2026](https://arxiv.org/abs/2602.11988)).

## Auditoria local do Polaris

- Só existe [um `AGENTS.md` raiz](../AGENTS.md); nenhum arquivo em `apps/` ou `packages/`.
- `apps/web` e `apps/admin` usam Next/React. O limite administrativo já está descrito em [`authorization-model.md`](../docs/architecture/authorization-model.md) e é protegido por teste de fronteira; guias de módulo/integração cobrem a lógica por superfície. A orientação Next pode permanecer geral e condicional enquanto ambas as apps usam o mesmo framework.
- `packages/events` tem responsabilidades específicas (outbox, intake, leases/retries), mas [webhooks](../docs/api/webhooks.md) e [jobs/workflows](../docs/operations/jobs-and-workflows.md) já documentam fluxos e fontes de implementação/teste. Não foi observada uma política local adicional que justifique carregar uma instrução própria automaticamente.
- `packages/db` é o candidato mais forte: concentra schema, migrations, contexto tenant, RLS e conexão; tem scripts distintos `db:migrate`, `db:push` e `test:postgres`. A documentação de [migrations](../docs/database/migrations.md) e [ambientes de banco](../docs/architecture/database-environments.md) cobre aplicação, branches/roles e prova em banco descartável, mas não contém no próprio pacote uma instrução curta sobre quando carregar esses guias nem uma política explícita de `db:push` em todos os ambientes persistentes. O README raiz proíbe usar migration/push contra produção. Qualquer regra adicional sobre branches persistentes precisa ser explicitamente aprovada e ficar também na documentação operacional canônica.
- Após P14/P15, a raiz do `AGENTS.md` apontará a `docs/README.md` e a `docs/maintenance.md` conforme a tarefa. Esse roteamento geral reduz a necessidade de replicar as tabelas de regras nos diretórios.

## Recomendação proporcional

Não criar `AGENTS.md` para `apps/web`, `apps/admin` ou `packages/events` neste ciclo: os contratos relevantes têm guias e testes, e não foi encontrada uma convenção local distinta que precise ser carregada em toda tarefa nessas pastas.

`packages/db` é o candidato mais forte, mas os guias já cobrem migrations/RLS e o root `AGENTS.md` pode apontá-los condicionalmente. A recomendação atual é não criar arquivos locais até haver evidência de que esse roteamento falha ou uma regra local exclusiva for ratificada. Se o projeto escolher depois um `packages/db/AGENTS.md`, ele deve complementar as fontes canônicas, não copiá-las. “Nunca `db:push` em qualquer banco persistente” é mais amplo que a proibição atual contra produção; definir esse alcance requer aprovação e registro canônico antes de incluí-lo como instrução.

## Limites

O checker, os scripts e os guias existentes não provam que agentes já tenham cometido erros por falta de contexto local; não há esse incidente/audit evidence no escopo avaliado. A recomendação não infere que cada package seja um bounded context. O ganho potencial de uma instrução local deve ser reavaliado depois de decisões explícitas de segurança operacional e do contrato final do root `AGENTS.md`.

## Decisão após alinhamento

Em 2026-09-24, o usuário aprovou manter apenas o `AGENTS.md` raiz nesta fase, sem criar arquivos aninhados. Reavaliar somente quando surgir evidência de uma regra durável, específica a uma subárvore e não atendida pela documentação condicional. A política de `db:push` em bancos persistentes deve ser decidida na fonte canônica antes de virar instrução local.

Essa decisão encerra o P17. O P18 avaliará um fluxo de trabalho comum para tarefas com IA.
