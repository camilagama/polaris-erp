# Reauditoria integral do plano de fundação

- **Data:** 2026-10-01 (America/Sao_Paulo)
- **Plano auditado:** [fundacao-polaris-erp.md](fundacao-polaris-erp.md), pontos P1–P70 e adendos Graphify/Blacksmith
- **Checkout canônico auditado:** branch `codex/foundation-plan-audit`, `HEAD` e `origin/main` em `6f25719d808cc876a4c9523cc06bada78d38e3f9`
- **Registro operacional atualizado:** [P43 — prontidão de produção](../docs/operations/production-readiness.md)

## Parecer executivo

O plano tem uma arquitetura de decisões coerente para o estágio do Polaris: distingue retomar desenvolvimento amplo de operar com dados reais, evita copiar a estrutura do Hub sem necessidade, separa CI de operações, limita credenciais, exige migrations versionadas e mantém otimizações condicionais a medições. Os dois gates P70 continuam adequados.

**A fundação ainda não está pronta para retomar features amplas segundo o Gate A que o próprio plano aprovou.** Existem pendências concretas em P5, P37/P39 e P58/P59, atualizações autorizadas ainda não terminadas em P2/P52, e subetapas documentais pendentes em P9/P12/P13/P14. A estratégia de acessibilidade P36 também ainda não foi verificada nas jornadas representativas. Isso é trabalho delimitado, não motivo para adiar até Vercel ou Production.

**Gate B não está pronto**, e não deve ser confundido com Gate A: Staging, projetos/alvos Vercel e Neon, cópia externa de backup, restore medido, migration de Production, deployments, smoke e rollback operacional continuam ausentes, desconhecidos ou não executados. O relatório não encontrou evidência que permita chamar Production de configurada.

Há também uma divergência operacional fora do plano: o checkout primário em `D:\2 - Dev\0 - Projects\polaris-erp` está 123 commits atrás de `origin/main` e tem modificações locais/untracked. Ele não deve receber pull, reset, rebase ou limpeza automática. Antes da próxima implementação, preserve e reconcilie as alterações com a branch atualizada em uma worktree segura.

## Escopo, fontes e confiança

- Revisei as decisões e os registros do plano P1–P70, os documentos canônicos, `AGENTS.md`, memórias, workflows e código ligado aos achados. As classificações separam decisão aprovada de implementação e de operação validada.
- A auditoria local tomou como base o SHA indicado no cabeçalho. O relatório não considera artefatos não commitados como parte da `main`. A alteração local do P43 e este relatório ainda precisam de revisão/integracão pelo fluxo normal.
- A API do GitHub foi consultada somente para leitura. Foram observados ruleset `main` ativo, quatro checks requeridos, zero aprovações requeridas e bloqueios de non-fast-forward/deleção; a execução CI pós-merge `36832817188` passou nos quatro jobs no SHA auditado. Não foi feito teste de push direto.
- O Environment `Production` tem allowlist `main`, zero secrets e zero variables; a API reporta `can_admins_bypass: true`. Nenhum valor de secret foi lido. Nenhum job ou migration de Production foi executado.
- O conector Vercel não listou projetos Polaris nos teams que retornou, mas não demonstrou cobrir a conta pessoal; o estado correto permanece `desconhecido`. O conector Neon não tinha projeto associado nem ferramenta de listagem disponível; o estado de projeto, branch e plano também permanece `desconhecido`.
- `bun outdated` foi executado de forma somente leitura com Bun 1.4.2. Não instalei dependências, não alterei configuração remota e não executei deploys. Para validar documentação, `bun run docs:check` passou, incluindo 13 testes do checker; não rodei as suites de aplicação, unidade ou E2E.
- Foram usados subagentes Luna para auditorias independentes de P1–P30, P31–P60 e P61–P70. Reconciliamos os resultados com evidências do checkout e com consultas atuais; quando uma afirmação era apenas inferida ou antiga, ela foi marcada como não confirmada.
- As fontes abaixo são snapshots consultados em 2026-10-01. A documentação do próprio fornecedor prevalece para recursos e contratos; postagens de devs são evidência anedótica para discutir manutenção, não prova de benefício no Polaris.

## O que está bem fundamentado

1. **Dois gates com propósitos diferentes.** Gate A cobre controles necessários para continuar desenvolvimento com segurança; Gate B segura go-live e dados reais até haver ambientes, recuperação e promoção provados. Não há necessidade de provisionar Staging para terminar correções de Gate A.
2. **CI e operações separadas.** `ci.yml` e `operations.yml` foram integrados; operações têm dispatch selecionável, verificações de ref, permissões explícitas e não recebem credenciais de Production pela CI comum. Os pins de Actions por SHA e o cancelamento limitado à CI também foram observados.
3. **Main atualmente protegida.** Há PR obrigatório e os quatro checks do workflow estão requeridos, sem aprovação humana, conforme a decisão do usuário. As regras de non-fast-forward e deleção também estão habilitadas.
4. **Baseline técnica.** O fluxo principal de auditoria de advisories está verde na execução observada; Bun 1.4.2, Node 24 e PostgreSQL 18.6 da CI estão definidos. Isso não prova que a lista de dependências chegou às versões estáveis mais novas.
5. **Migrations e recuperação tratados como operações.** O plano não confunde `db:push` com release, migration de banco com deploy da aplicação, PITR com backup independente nem rollback de código com rollback de dados.
6. **Documentação sem migração cosmética.** CONTEXT, PRODUCT, DESIGN, mapa de autoridade, ADRs seletivas e limites do AGENTS estão orientados por responsabilidade. O plano corretamente rejeita frontmatter universal, cópia literal do Hub e pastas vazias.
7. **Verificação proporcional.** Artifacts só em falha e snapshots iniciais limitados a login são proporcionais. Relatos de praticantes indicam churn quando snapshots crescem sem fixtures determinísticas; isso reforça manter o escopo pequeno, não transforma as discussões em requisito universal. [Discussão sobre escala de visual tests](https://www.reddit.com/r/Playwright/comments/1vv8jrj/how_to_scale_visual_tests/) e [discussão sobre gates pequenos de readiness](https://www.reddit.com/r/devops/comments/1vnxx4v/what_belongs_in_a_productionreadiness_gate_for_a/) são relatos públicos, não estudos controlados.

## Matriz de revisão ponto a ponto

“Concluído” abaixo significa concluído no escopo aprovado, não que o produto inteiro ou Production estejam certificados. “Condicional” significa que a decisão aguarda um gatilho definido no plano.

| Ponto | Estado observado e parecer |
|---|---|
| P1 | **Parcial.** A leitura sobre freshness continua útil, mas a matriz `documentation-coverage.md` ainda tem base no snapshot de julho; o próprio arquivo informa a limitação. Atualizar quando a cobertura for revalidada, sem apresentar o snapshot como atual. |
| P2 | **Pendente.** A remediação de advisories e baseline está verde, porém `bun outdated` mostrou 37 pacotes com versões novas. A política aprovada pede atualização estável em batches, incluindo avaliação de majors. |
| P3 | **Implementado.** Ruleset atual exige PR e os quatro checks, sem approvals. Proposta de refinamento: avaliar checks estritos para evitar merge de PR cuja CI foi calculada sobre base desatualizada; isso repete jobs quando `main` avança. |
| P4 | **Condicional; Staging não provisionado.** A decisão de manter a branch Git `staging` suspensa continua razoável. Vercel documenta Preview branch persistente como Staging disponível em todos os planos; Custom Environments exigem plano Pro/Enterprise. |
| P5 | **Pendente de Gate A.** `.env.example` usa endpoints de produção da Asaas e Woovi; `E2E_DATABASE_URL` aparece vazia/opcional embora o harness exija quando E2E roda, e `ADMIN_E2E_DATABASE_URL` não está no exemplo. Definir sandbox como padrão e explicitar as URLs dedicadas. |
| P6 | **Condicional e parcial.** Buckets físicos e inventário R2 não foram verificados. Os nomes `STAGING`/`FINAL` descrevem etapa do objeto, não ambiente de deploy; não renomear/copiar objetos sem inventário. A documentação diz que reconciliação apaga órfãs, mas o código registra `deletedCount: 0`; acertar o contrato antes de cutover. |
| P7 | **Parcial.** `docs/README.md` é o mapa canônico aprovado; a matriz de cobertura ainda referencia um snapshot explicitamente antigo. Revalidar o que deve ser fonte atual e preservar o lifecycle dos históricos. |
| P8 | **Concluído.** `CONTEXT.md` existe e está indexado como vocabulário; “organização” é o conceito do produto e `tenant` o mecanismo técnico. |
| P9 | **Parcial.** `PRODUCT.md` registra brief e limites, mas as duas fontes antigas em `docs/product/` foram explicitamente reservadas para reconciliação antes do fechamento de P9. A pesquisa de validação de público foi confirmada pelo usuário, não localizada como artefato. |
| P10 | **Parcial.** O registro normativo DEC-BR e IDs aprovados existem; o inventário OBS deve permanecer claramente histórico/provisório ou ser arquivado com snapshot. A cobertura que associa regras a fontes/casos ainda precisa ser consolidada, sem exigir comentário por ID em cada arquivo. |
| P11 | **Concluído no escopo seletivo, com revisão de rationale.** Há três ADRs para RLS/tenant, outbox e billing normalizado; backfill histórico amplo não foi aprovado e não deve ser inventado. |
| P12 | **Parcial.** A política de metadata seletiva e aviso não bloqueador foi aprovada, mas o estado das páginas críticas selecionadas e do mecanismo de change-impact não está comprovado integralmente. Não aplicar metadados em massa. |
| P13 | **Parcial.** `docs:check` existe, mas a implementação observada é estreita e valida links Markdown locais. Falta concluir o escopo aceito: anchors/links locais, fontes raiz selecionadas, metadados e IDs aplicáveis; freshness semântica/URLs externas ficam fora do gate rápido. |
| P14 | **Parcial.** A autoridade e os ponteiros de `aidd_docs` foram redefinidos sem mover diretórios. `aidd_docs/memory/project-state.md` ainda diz que `@polaris/ui` não foi extraído, o que contradiz o código atual. |
| P15 | **Parcial.** Há instruções de manutenção e evidência, mas conferir os ponteiros do AGENTS contra `docs/README.md` e evitar duplicações. |
| P16 | **Parcial/precisa revisão de conteúdo.** A decisão aprovada é condensar regra redundante, sem meta de linhas. O relatório anterior identifica orientações de frameworks que não fazem parte da stack e sobreposição com Ultracite; remover apenas após validar no AGENTS atual, sem perseguir contagem. |
| P17 | **Implementado conforme política.** Não criar AGENTS locais genéricos; a exceção `packages/db/AGENTS.md` responde ao risco específico de `db:push`. |
| P18 | **Implementado como política.** O fluxo é adaptativo por tipo de tarefa e tem perfis de verificação atuais; usuário ainda precisa seguir a revisão do próprio autor antes do merge. |
| P19 | **Decisão válida.** Worktrees para escrita paralela independente, não para todo trabalho ou pesquisa. É regra de colaboração, sem um teste de CI aplicável. |
| P20 | **Implementado.** `verify:quick` e `verify` existem; manter a checagem full-workspace até medição que justifique `--affected`. |
| P21 | **Implementado.** Pre-push executa `verify:quick`; a CI continua fonte autoritativa. Duração deve ser reavaliada quando o workspace mudar materialmente. |
| P22 | **Implementado e revalidado.** A execução `36832817188` passou o job `verify`; relatório de run anterior registra baseline de advisories vazia. Isso não encerra a manutenção de versões P2. |
| P23 | **Implementado.** `ci.yml` e `operations.yml` estão separados; PR #2 foi integrada. Texto histórico anterior em P23/P24 que dizia que a main ainda usava fluxo antigo foi superado. |
| P24 | **Implementado com risco remanescente documentado.** Production está allowlisted para `main`, sem secrets/vars hoje; `can_admins_bypass: true`. Revisar e aceitar/documentar o risco antes de adicionar credenciais. |
| P25 | **Implementado.** Permissões mínimas e `contents: read` estão nos workflows; jobs sem token recebem `permissions: {}`. |
| P26 | **Parcial.** Actions estão pinadas por SHA. A política de atualização de pins/Dependabot permanece pendente, sem auto-merge aprovado. |
| P27 | **Implementado.** Cancelamento de runs antigas fica em jobs CI; operações não são canceladas em concorrência. |
| P28 | **Fechado sem adoção.** Dependency Review não foi aprovada para esta conta/escopo; não reintroduzir sem mudança de entitlement ou de risco. |
| P29 | **POC implementado; triagem pendente.** Execução Semgrep Code-only `36780602755`, scan `237448079`: 767 arquivos, 2.944 regras, 23 achados não bloqueadores, zero bloqueadores. Workflow segue manual e não requerido; não tornar gate sem avaliar achados, ruído, dados, termos e custo. CodeQL continua recusado. |
| P30 | **Política válida; integração assistiva não é gate.** CodeRabbit/Copilot podem ajudar no review conforme disponibilidade; CI determinística continua autoridade. A auditoria não encontrou motivo para exigir bot/reviewer no merge. |
| P31 | **Condicional, não adotado.** Remote Cache e `--affected` seguem desativados; ausência de medição de ganho é motivo suficiente para manter o caminho atual. |
| P32 | **Configuração revisada; cache permanece off.** Env/hash/outputs e Sentry foram tratados para futura decisão; não há necessidade de ligar cache remoto para fechar Gate A. Reabrir após medir e comprovar que o cache não vaza ou mascara outputs. |
| P33 | **Implementado.** Node 24 e Bun 1.4.2 aparecem como runtimes declarados. Atualização de dependências de linguagem/ferramenta continua em P2/P52. |
| P34 | **Parcial.** A referência do hook Codex quebrado foi removida. Distribuição clone-safe da skill Impeccable ainda não existe; como o usuário quer essa skill nos projetos, concluir antes de depender dela em máquinas/agents sem skill global. Não é bloqueio de backend. |
| P35 | **Implementado documentalmente.** DESIGN e tokens foram alinhados aos limites aceitos; isso não é prova de acessibilidade de todas as páginas. |
| P36 | **Parcial.** WCAG 2.2 AA é alvo interno, não declaração de conformidade. Axe e revisão manual representativa ainda não foram demonstrados. |
| P37 | **Parcial, com bypass concreto de boundary.** `apps/web/tsconfig.json` e `apps/admin/tsconfig.json` ainda redirecionam aliases de UI/hooks/utils diretamente para `packages/ui/src`, contornando exports públicos. Corrigir os aliases/consumidores e memória. |
| P38 | **Concluído como decisão.** `@polaris/domain` não foi extraído sem responsabilidade estável que justifique package próprio. |
| P39 | **Parcial.** A matriz arquitetural está documentada; os checks não cobrem completamente dependências recíprocas, imports packages→apps e caminhos relativos indicados no plano. |
| P40 | **Implementado.** Template de PR registra problema, risco e evidência sem reviewer/labels obrigatórios. |
| P41 | **Implementado.** Matriz de risco/evidência proporcional existe. |
| P42 | **Implementado.** DoD aponta para uma fonte única da estratégia. |
| P43 | **Atualizado no checkout de auditoria, operação não certificada.** Foram registradas ruleset, environment, CI e limitações de escopo Vercel/Neon; a atualização ainda não está commitada. Nada disso configura projeto, credencial, backup ou deployment. |
| P44 | **Parcial.** Runbook, RPO/RTO e critérios existem; PITR, dump externo, retenção, restore drill real e recuperação de objetos não foram configurados/medidos. Neon Free, se for o plano escolhido, oferece só 6 h de histórico (até 1 GB de mudanças), uma snapshot manual e não oferece backups agendados; não depender disso como cópia externa. |
| P45 | **Parcial.** Operação de migration manual/isolada foi integrada, mas não tem alvo, secret, migration nem falha/retomada Drizzle de Production ensaiada. |
| P46 | **Implementado com limite operacional.** Guard impede URL remota e reserva `polaris_push_scratch`; ainda é responsabilidade operacional manter o alvo descartável/vazio e recriável. |
| P47 | **Runbook implementado; operação pendente.** Não há project/deployment Vercel, promoção por ID ou rollback real observados. Hobby passou a reter menos deployments e limita armazenamento a 10 GB; exigir fallback de redeploy pelo SHA. |
| P48 | **Runbook implementado; operação pendente.** Web/Admin continuam projetos separados e promoção sequencial não atômica; projetos e smoke externos não foram confirmados. |
| P49 | **Código/runbook existem; provedor desconhecido.** Vercel Auth `All Deployments` agora é grátis em todos os planos, conforme changelog de 2026-09-09; não está configurada. Vercel Hobby continua pessoal/não comercial segundo termos e opt-in de treinamento de conteúdo é default com opt-out disponível. Rever elegibilidade, preferências de dados e acesso antes de conectar o repo. |
| P50 | **Concluído.** Snapshot antigo tem status histórico e ponteiro para fonte vigente. |
| P51 | **Implementado com uma pendência de freshness.** Mapa de autoridade e lifecycle seletivo existem; atualizar coverage de julho quando for fonte ativa e corrigir fatos arquiteturais stale na memória. |
| P52 | **Pendente em parte.** O freeze ainda não começou porque o SHA não entrou na homologação final, conforme decisão; a atualização estável autorizada não foi completada. O resultado `bun outdated` é inventário, não autorização de atualização sem verificação. |
| P53 | **Pendente.** Não há configuração Dependabot; GitHub documenta suporte ao lockfile textual `bun.lock` atual. Configurar update PRs com revisão manual e testar o comportamento antes de fechar. |
| P54 | **Implementado para CI.** Service container PostgreSQL 18.6; a versão do projeto Neon de qualquer ambiente segue desconhecida. |
| P55 | **Implementado na configuração.** Artifacts de falha têm retenção curta; os passos de upload foram pulados em runs verdes, então uma falha controlada ainda deve validar o caminho de diagnóstico. |
| P56 | **Concluído no primeiro escopo aprovado.** Logins Web/Admin têm baseline Chromium/Linux fixa; telas autenticadas permanecem fora até fixtures determinísticas. |
| P57 | **Defeito condicional de integração.** Woovi atual calcula HMAC SHA-256 em `x-webhook-signature`, mas contrato vigente especifica RSA-SHA256 Base64 sobre corpo bruto; HMAC é header distinto `x-openpix-signature`. Testes repetem implementação incorreta. Se Woovi entrar no launch, corrigir para chaves públicas com rotação/cache e testar sandbox/ping/idempotência. Asaas sandbox também precisa de validação. |
| P58 | **Pendente, bugs concretos.** Query de cancelamento de venda converte timestamp para date dependente de timezone da sessão em vez de usar data civil persistida; página Admin recebe `from`/`to` e não os propaga na consulta. |
| P59 | **Pendente, bug concreto.** Tabela de organizações Admin formata `createdAt` timestamp com `formatDate`; padronizar instantes em `America/Sao_Paulo`, sem dependência do timezone local, conforme DESIGN/TIME-001. |
| P60 | **Concluído como mapa reconciliado.** Árvore preserva conteúdo/status sem criação de diretórios vazios. |
| P61 | **Decisão de sequência válida; status antigo.** Hook, baseline, perfis, PG18, CI e ruleset já foram realizados. A sequência remanescente foi atualizada no plano principal; manter a reconciliação segura do checkout como primeiro passo operacional. |
| P62 | **Workflow aprovado e implementado.** Branch curta, teste focal, verify, PR para main, checks e revisão do próprio autor seguem compatíveis com ruleset observado. |
| P63 | **Sequência concluída; itens de conteúdo não fecham automaticamente.** P9/P12/P13/P14 ainda têm as pendências listadas nesta tabela. |
| P64 | **Texto anterior estava stale.** P55/P56 estão integrados; Semgrep POC já rodou e aguarda triagem; P54 está em PG18.6. Remote Cache/affected continuam condicionais; não incluir CodeQL/Dependency Review. |
| P65 | **Gate continua adequado; não executado.** P43 não prova operação. Providers são obrigatórios somente quando constarem do escopo de lançamento; Woovi bloqueia apenas se incluída até o contrato ser corrigido. |
| P66 | **Fluxo diário vigente.** PR para main tem checks ativos. Ambiente Staging precisa existir antes do go-live; branch `staging` só quando infraestrutura determinar. |
| P67 | **Concluído como crosswalk.** Não copiar workflows, estrutura ou gates específicos do Hub; sem nova fase. |
| P68 | **Concluído como limite de transferência.** Decisões negativas seguem válidas, sujeitas a gatilhos registrados. |
| P69 | **Desatualizado e substituído pelo plano remanescente nesta reauditoria.** Itens P20–27, P33, P40–43, P54–56 e proteção de main não são tarefas futuras; devem sair da fila. |
| P70 | **Critérios bons; nenhum gate aprovado.** Gate A continua aberto por P5/P37/P39/P58/P59/P2/P52 e reconciliação P9/P12/P13/P14/P36. Gate B continua aberto por ausência de Staging e de provas Vercel/Neon/recovery/migration/release. |

## Achados que alteram a avaliação prática

### 1. P5 — ambientes não produtivos

O exemplo local contém `WOOVI_API_BASE_URL=https://api.woovi.com` e `ASAAS_API_BASE_URL=https://api.asaas.com/v3`, que são endpoints live. O sandbox Asaas documentado usa `https://api-sandbox.asaas.com/v3`; o sandbox Woovi usa `https://api.woovi-sandbox.com`. Valores em `.env.example` devem impedir por padrão uma chamada financeira real. Além disso, o harness exige URL E2E quando os jobs rodam, mas o exemplo é vazio/opcional e não documenta URL Admin equivalente. Esta é a primeira correção de configuração a fazer.

Fontes: [Asaas — autenticação e ambientes](https://docs.asaas.com/docs/authentication), [Woovi — API de teste](https://developers.woovi.com/api-redoc).

### 2. P37/P39 — fronteiras de packages

Os dois apps contornam o surface público de `@polaris/ui` via aliases para diretórios internos de `packages/ui/src`. A regra do pacote deixa de ser fonte efetiva se o TypeScript resolve arquivos internos. Completar as exportações/dependências de package e validar import graph em ambas as direções; imports relativos também precisam entrar no checker. Atualizar o snapshot arquitetural para não orientar agentes a um estado inexistente.

### 3. P58/P59 — datas civis e instantes

A regra aprovada define datas civis separadas de timestamps. O SQL de estorno deriva a data a partir de `cancelled_at`, sujeita à timezone da sessão; já existe coluna civil de cancelamento. A tela de eventos Admin recebe os filtros de período, mas a consulta não os recebe. A listagem de organizações trata `createdAt` como data sem instante. Corrigir junto com testes de limites de dia/timezone e renderização determinística São Paulo; não trocar tudo para `DATE` nem depender da timezone do navegador/sessão.

### 4. P57 — contrato de webhook Woovi

A documentação Woovi consultada define `x-webhook-signature` como `base64(RSA-SHA256(raw body, chave privada Woovi))`; a chave pública é publicada em endpoint com possibilidade de rotação. `x-openpix-signature` é HMAC-SHA1 da configuração do webhook, não o mesmo contrato. O handler e seus testes atuais usam HMAC-SHA256 para o header RSA, portanto o teste não comprova compatibilidade. Se Woovi fizer parte do lançamento, corrigir preservação do corpo bruto, validar todas as chaves publicadas durante rotação com cache TTL, e testar assinatura inválida/válida, ping, replay/idempotência e resposta de intake. O próprio plano permite deixar o provider fora do escopo; não precisa certificar todos os pagamentos para Gate A.

Fonte: [Woovi — validar assinatura do webhook](https://developers.woovi.com/en/docs/webhook/seguranca/webhook-signature-validation) e [buscar chaves públicas](https://developers.woovi.com/docs/webhook/seguranca/webhook-public-keys).

### 5. P2/P52 — política de versões

O snapshot de 2026-10-01 encontrou **37 linhas de dependências/workspaces** com uma versão mais recente. 27 têm candidate `Update` dentro das faixas declaradas; 10 permanecem na versão atual por faixa/pin. A lista não é uma recomendação de bump automático: compatibilidade de Next/React, tipos de Node 24, Playwright e snapshots, auth/billing, ORM e ferramentas requer lotes focais e notas de release. O zero-advisory verificado pela CI é uma afirmação diferente de latest-stable.

| Pacote | Atual → Update compatível | Latest visto |
|---|---:|---:|
| `@aws-sdk/client-s3` | 3.1086.0 → 3.1144.0 | 3.1144.0 |
| `@aws-sdk/s3-request-presigner` | 3.1086.0 → 3.1144.0 | 3.1144.0 |
| `@better-auth/infra` | 0.3.6 → 0.3.7 | 0.4.13 |
| `@hugeicons/core-free-icons` | 4.2.2 → 4.3.5 | 4.3.5 |
| `@hugeicons/react` | 1.1.9 → 1.1.10 | 1.1.10 |
| `@sentry/nextjs` | 10.65.0 → 10.75.3 | 11.1.0 |
| `@tanstack/react-form` | 1.33.2 → 1.33.5 | 1.33.5 |
| `@upstash/ratelimit` | 2.0.8 → 2.2.0 | 2.2.0 |
| `@upstash/redis` | 1.38.0 → 1.39.0 | 1.39.0 |
| `better-auth` | 1.6.23 → 1.7.7 | 1.7.7 |
| `drizzle-orm` | 0.45.2 → 0.45.3 | 0.45.3 |
| `inngest` | 4.12.1 → 4.21.0 | 4.21.0 |
| `pg` | 8.22.0 → 8.23.1 | 8.23.1 |
| `resend` | 6.17.2 → 6.31.0 | 6.31.0 |
| `sharp` | 0.35.4 → 0.35.5 | 0.35.5 |
| `zod` | 4.4.3 → 4.6.5 | 4.6.5 |
| `@biomejs/biome` | 2.5.3 → 2.5.15 | 2.5.15 |
| `@playwright/test` | 1.61.1 → 1.63.0 | 1.63.0 |
| `@tailwindcss/postcss` | 4.3.2 → 4.3.3 | 4.3.3 |
| `@types/pg` | 8.20.0 → 8.23.1 | 8.23.1 |
| `@types/react` | 19.2.17 → 19.3.0 | 19.3.0 |
| `@types/react-dom` | 19.2.3 → 19.3.0 | 19.3.0 |
| `knip` | 6.24.0 → 6.39.0 | 6.39.0 |
| `lefthook` | 2.1.9 → 2.1.15 | 2.1.15 |
| `tailwindcss` | 4.3.2 → 4.3.3 | 4.3.3 |
| `turbo` | 2.11.5 → 2.11.6 | 2.11.6 |
| `ultracite` | 7.8.4 → 7.12.2 | 7.12.2 |

| Pacote sem update na faixa atual | Atual | Latest visto fora da faixa/pin |
|---|---:|---:|
| `dotenv` | 17.4.2 | 18.0.5 |
| `next` | 16.3.6 | 16.3.8 |
| `react` | 19.2.7 | 19.3.0 |
| `react-dom` | 19.2.7 | 19.3.0 |
| `recharts` | 3.8.0 | 3.10.1 |
| `@next/env` | 16.3.6 | 16.3.8 |
| `@types/node` | 24.19.0 | 26.6.3 |
| `jsdom` | 29.1.1 | 30.1.1 |
| `typescript` | 6.0.3 | 7.0.2 |
| `vitest` | 4.1.11 | 5.0.3 |

Dependabot não está configurado, mas a documentação atual do GitHub confirma suporte ao `bun.lock` textual com Bun ≥1.1.39. P53 pode ser implementado com PRs de update e revisão manual, sem auto-merge. [GitHub — ecosystems suportados pelo Dependabot](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories).

### 6. Vercel Hobby — reabrir a validação de conta antes de provisionar

O plano pode continuar usando Hobby como **referência de custo/limites**, como pediu o usuário, mas isso não valida elegibilidade para o produto:

- Os termos atuais limitam Hobby a uso pessoal ou não comercial. Como Polaris é um ERP com finalidade comercial, confirmar com Vercel se o uso de desenvolvimento/homologação proposto está dentro dos termos; caso contrário, usar Pro antes de implantar para uso comercial. Não é conclusão jurídica deste relatório. [Vercel — Terms of Service](https://vercel.com/legal/terms) e [Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines).
- Vercel declara que Hobby começa opt-in para treinamento de modelos com conteúdo/telemetria de deployment e build; há opt-out em Data Preferences. Definir opt-out antes de conectar o repo privado e registrar que dados já compartilhados não podem ser descompartilhados retroativamente. Há também usos de conteúdo para melhoria de serviço descritos nos termos. [Atualização de ToS/AI](https://vercel.com/changelog/updates-to-terms-of-service-march-2026).
- Em 2026-09-09, Vercel anunciou `All Deployments` com Vercel Authentication sem custo em todos os planos. A página de Deployment Protection ainda tem texto de janeiro que diz que All Deployments exige Pro/Enterprise; tratar o changelog mais recente como atualização e confirmar a opção no painel/conta ao provisionar. [Changelog atual](https://vercel.com/changelog/protect-production-deployments-for-free-on-every-plan), [página ainda divergente](https://vercel.com/docs/deployment-protection).
- Em 2026-09-16, Hobby passou a reter 10 GB de deployments e manter apenas conjuntos recentes; deployments antigos de Preview podem ser removidos mais cedo. O runbook P47 precisa garantir redeploy de SHA antigo se deployment ID de rollback expirou. [Vercel — retenção de Hobby](https://vercel.com/changelog/hobby-projects-now-retain-fewer-deployments-to-free-up-storage).
- Vercel permite Staging persistente por branch Preview com domínio/vars branch-specific em todos os planos; Custom Environment precisa Pro/Enterprise. Staged Production é para validar build com configuração de Production, nunca para mutações de teste que devem usar o Staging isolado. Primeiro deployment de um projeto novo é Production, então decidir production branch/domínios/protection antes do primeiro deploy. [Vercel — Environments](https://vercel.com/docs/deployments/environments).
- O conector não verificou projeto Polaris e o ownership Vercel não foi identificado. A documentação diz que importar/conectar repo pessoal GitHub exige o owner do repo. Como `camilagama` é o owner GitHub, definir quem usará a única conta Vercel e quem conectará os projetos antes do setup; validar também o limite de usuário externo do Hobby se outra pessoa precisar acessar deployments protegidos. [Vercel — GitHub projects](https://vercel.com/docs/git/vercel-for-github), [Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication).

## Plano de implementação reordenado

As etapas 0–6 fecham Gate A para features amplas. As etapas 7–8 são Gate B e só precisam ocorrer antes de go-live/dados reais. Cada etapa deve ser um PR revisável, com evidência no SHA e aprovação do usuário conforme o fluxo já combinado.

### Etapa 0 — reconciliar o checkout de desenvolvimento

**Escopo:** salvar as mudanças não commitadas/untracked do checkout D, entender se `.env.example` mudou só por formato ou contrato, atualizar a linha de trabalho para a `origin/main` atual e resolver qualquer conflito em branch/worktree isolada. Não fazer reset, clean ou pull sobre a árvore suja.

**Pronto quando:** todas as mudanças existentes têm destino intencional e o worktree implementador parte do SHA atual, sem apagar contribuições locais.

### Etapa 1 — P5, defaults seguros de ambiente

**Escopo:** Asaas e Woovi sandbox como defaults locais; variáveis E2E Web/Admin claramente documentadas; guards/validação que impeçam uso acidental de endpoint de pagamento live em Local/CI; manter os secrets de E2E separados do Environment Production.

**Pronto quando:** `env:check` e testes da configuração cobrem os defaults; E2E usa somente os endpoints/bases dedicados não produtivos; documentação dos quatro ambientes não conflita com os valores de exemplo.

### Etapa 2 — P37/P39, fronteiras executáveis

**Escopo:** remover aliases de app que apontam para `packages/ui/src`, consumir as exports públicas, declarar dependências workspace corretas, atualizar memória stale e completar checks contra imports Web↔Admin, packages→apps e caminhos relativos.

**Pronto quando:** nenhum import não autorizado contorna o public API, a matriz documentada tem checks, e `audit:boundaries` cobre os caminhos permitidos/proibidos sem exceção ampla.

### Etapa 3 — P58/P59, correções de comportamento temporal

**Escopo:** data civil de cancelamento sem SQL timezone cast; filtros de eventos Admin efetivamente aplicados; timestamps da Admin formatados como instantes em São Paulo por helpers explícitos.

**Pronto quando:** testes focalizados cobrirem mudança de timezone de sessão, limites from/to e valores de timestamp com navegadores/configurações locais distintos; relatórios mantêm a semântica DATE vs instante aprovada.

### Etapa 4 — P9/P12/P13/P14/P15/P16/P51/P63, fechar documentação viva

**Escopo:** reconciliar regras e roadmap legados com PRODUCT; atualizar `project-state.md`; refresh da matriz de cobertura que ainda aponta julho; concluir somente links/anchors/metadados/IDs selecionados no `docs:check`; preservar snapshot históricos e não adicionar frontmatter universal. Revisar AGENTS contra stack Next/React e Ultracite, reduzindo regras redundantes sem meta artificial de linhas.

**Pronto quando:** fontes atuais têm autoridade única, os dois arquivos antigos de produto não contradizem PRODUCT, checker cobre o contrato aprovado e `bun run docs:check` passa.

### Etapa 5 — P36, acessibilidade verificável proporcional

**Escopo:** avaliação de teclado/foco/labels/nomes acessíveis nas jornadas existentes e Axe em telas representativas Web/Admin, conforme decisão P36. Corrigir findings reais; não extrapolar amostra para declaração de conformidade geral.

**Pronto quando:** checks focalizados passam e o DESIGN distingue alvo interno de conformidade auditada.

### Etapa 6 — P2/P52/P53, versões estáveis e cadência

**Escopo:** reconsultar releases estáveis, agrupar updates por compatibilidade e impacto, atualizar 27 candidates compatíveis em batches e avaliar majors/pins restantes com deferimento justificado. Atualizar Playwright exige snapshots canônicos Linux revisados. Configurar Dependabot para Bun e GitHub Actions com frequência aprovada, limite de PRs e merge manual.

**Pronto quando:** cada grupo tem changelog e checks afetados verdes, lockfile reproduzível, todos os `Latest` escolhidos ou formalmente deferidos, Dependabot abre e atualiza PRs esperados, CI principal permanece verde.

### Etapa 7 — aceite Gate A

**Escopo:** verificar P5, P37/P39, P58/P59, P9/P12/P13/P14/P36 e batches P2/P52 no mesmo SHA; confirmar ruleset e checks remotos ativos, sem reviewer humano obrigatório. Antes de registrar credenciais no Environment Production, tratar `can_admins_bypass: true`: desativar se suportado para a conta privada, ou escrever o risco aceito pelo owner e validar que workflow/target guards permanecem necessários.

**Pronto quando:** SHA tem CI verde nos quatro checks, verificações focais passam, docs não se contradizem, a branch padrão segue protegida e nenhuma verificação de Gate B é falsamente declarada.

### Etapa 8 — provisionamento Vercel/Neon e Staging para Gate B

**Escopo:** decidir se Hobby é elegível para a etapa de produto prevista; aplicar opt-out de treinamento antes do código/build; alinhar a conta Vercel ao owner pessoal GitHub `camilagama`; criar projetos Web/Admin com root directory correto; escolher Preview branch Staging com domínio e vars não produtivos se continuar em Hobby; configurar Database/Asaas/Woovi sandboxes; registrar projeto/branches/alvos sem expor secrets.

**Pronto quando:** acessos e protection são testados, build inicial não é exposto como Production inadvertidamente, Web/Admin apontam a bancos/providers sintéticos, e staging persistente está registrado em P43.

### Etapa 9 — recuperação, migration e release de dados reais

**Escopo:** validar plano/retention Neon; escolher PITR adequado e cópia independente cifrada; executar restore drill e recuperar objetos R2 envolvidos; ensaiar failure/resume Drizzle em PostgreSQL 18; validar runtime role/RLS; migration Production isolada e target-validada; preparar ambos candidates por SHA/deployment ID; promoção sequencial, smoke por app e fallback por redeploy de SHA quando Hobby já tiver removido o deployment anterior. Ativar gates externos somente para capacidades do lançamento. Corrigir Woovi antes de incluí-la em payments.

**Pronto quando:** P43 contém evidência atual de gates aplicáveis, backup/restore/RPO/RTO foram medidos, migrations/release/smokes/rollback foram executados no ambiente correto e estado parcial é recuperável.

## Graphify e Blacksmith

- **Graphify:** manter a aprovação existente para piloto local depois de P37/P39 e da reconciliação documental. O grafo é índice derivado, não fonte da verdade. Começar por AST-only, corpus sem `.env`, dumps, logs ou artifacts, versão fixada, consultas reais comparadas com código/testes e rebuild/update incremental auditados. Issues upstream sobre drift incremental e relações falsas justificam que o piloto tenha critério de saída. Não adicionar à CI nem ao Gate A/B sem ganho medido. [Graphify README](https://github.com/Graphify-Labs/graphify), [issue de drift](https://github.com/Graphify-Labs/graphify/issues/2053), [issue de relações](https://github.com/Graphify-Labs/graphify/issues/2137).
- **Blacksmith:** decisão correta de não adotar permanece. O quickstart atual afirma explicitamente que o produto se limita a GitHub organizations e não está disponível para personal repositories; Polaris está na conta pessoal `camilagama`. Não trocar a propriedade por causa de runner. Reabrir apenas se o repo migrar para uma organização por motivo independente e a medição de P64 provar ganho que compense integração, permissões, dados e dependência operacional. [Blacksmith Quickstart](https://docs.blacksmith.sh/introduction/quickstart).

## Fontes atuais e leitura de práticas públicas

### Primárias

- GitHub: [rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets), [strict vs loose status checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches), [deployments/environments em repo privado](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments), [Dependabot e bun.lock](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories), [hardening de Actions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions).
- Vercel: [Hobby terms](https://vercel.com/legal/terms), [fair use](https://vercel.com/docs/limits/fair-use-guidelines), [changelog All Deployments grátis](https://vercel.com/changelog/protect-production-deployments-for-free-on-every-plan), [ambientes e branch Preview de staging](https://vercel.com/docs/deployments/environments), [GitHub repo connection](https://vercel.com/docs/git/vercel-for-github), [retention Hobby](https://vercel.com/changelog/hobby-projects-now-retain-fewer-deployments-to-free-up-storage), [preferências de training](https://vercel.com/changelog/updates-to-terms-of-service-march-2026).
- Neon: [planos e retenção](https://github.com/neondatabase/website/blob/main/content/docs/introduction/plans.md), [restore/PITR](https://github.com/neondatabase/website/blob/main/content/docs/postgres/backup-restore/branch-restore.md), [export `pg_dump` independente](https://github.com/neondatabase/website/blob/main/content/docs/guides/export-neon-postgres-compatible.md).
- Providers: [Asaas sandbox](https://docs.asaas.com/docs/authentication), [Woovi assinatura oficial](https://developers.woovi.com/en/docs/webhook/seguranca/webhook-signature-validation), [chaves Woovi e rotação](https://developers.woovi.com/docs/webhook/seguranca/webhook-public-keys).
- Ferramentas e documentação: [Bun `outdated`](https://bun.sh/docs/pm/cli/outdated), [Playwright visual snapshots](https://playwright.dev/docs/test-snapshots), [Google ADRs](https://docs.cloud.google.com/architecture/architecture-decision-records), [GitHub ADR examples](https://github.com/architecture-decision-record/architecture-decision-record).

### Relatos de praticantes

Threads de devs sobre pequenos gates recomendam preservar rollback/restore exercitado e saúde de dependências enquanto alertam contra checklists empresariais que viram cerimônia. Threads de Playwright relatam churn quando baselines crescem sem ambiente determinístico, critério humano de revisão e fixtures previsíveis. Isso converge com gates curtos e observáveis de P65/P70 e com o P56 seletivo, mas é evidência anedótica e não estabelece resultado para o Polaris. [r/devops — pequeno gate de production readiness](https://www.reddit.com/r/devops/comments/1vnxx4v/what_belongs_in_a_productionreadiness_gate_for_a/), [r/Playwright — escala de visual tests](https://www.reddit.com/r/Playwright/comments/1vv8jrj/how_to_scale_visual_tests/).

## Limites e riscos residuais

- Nenhuma configuração, secret, database, project Vercel, deployment, bucket R2 ou recurso remoto foi alterado por esta reauditoria.
- Vercel e Neon permanecem `desconhecidos` em P43 onde o escopo do conector não provou presença/ausência; o relatório não substitui a checagem do owner no painel.
- Datas/versões/capacidades de produto são temporais. O inventário de Bun é snapshot de 2026-10-01 e deve ser reexecutado antes do lote.
- O documento não prova qualidade completa do produto nem declara WCAG conforme; aponta exatamente o que deve ser provado para cada gate.
