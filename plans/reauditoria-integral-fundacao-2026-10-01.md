# Reauditoria integral do plano de fundação

- **Data:** 2026-10-01 (America/Sao_Paulo)
- **Plano auditado:** [fundacao-polaris-erp.md](fundacao-polaris-erp.md), pontos P1–P70 e adendos Graphify/Blacksmith
- **Base de código auditada:** `origin/main` em `6f25719d808cc876a4c9523cc06bada78d38e3f9`, confirmada por `git fetch origin main` em 2026-10-01.
- **Worktree de consolidação:** `codex/foundation-plan-audit`, `HEAD 610b0e1` sobre a base acima; contém atualizações documentais desta reauditoria ainda não commitadas e a nota de distribuição P34 não rastreada. Nenhum código foi alterado neste ciclo.
- **Registro operacional atualizado:** [P43 — prontidão de produção](../docs/operations/production-readiness.md)

## Parecer executivo

O plano tem uma arquitetura de decisões coerente para o estágio do Polaris: distingue retomar desenvolvimento amplo de operar com dados reais, evita copiar a estrutura do Hub sem necessidade, separa CI de operações, limita credenciais, exige migrations versionadas e mantém otimizações condicionais a medições. Os dois gates P70 continuam adequados.

**A fundação ainda não está pronta para retomar features amplas segundo o Gate A que o próprio plano aprovou.** Existem pendências concretas em P5, P37/P39 e P58/P59, atualizações autorizadas ainda não terminadas em P2/P52, e subetapas documentais pendentes em P9/P12/P13/P14. A estratégia de acessibilidade P36 também ainda não foi verificada nas jornadas representativas. Isso é trabalho delimitado, não motivo para adiar até Vercel ou Production.

**Gate B não está pronto**, e não deve ser confundido com Gate A: Staging, projetos/alvos Vercel e Neon, cópia externa de backup, restore medido, migration de Production, deployments, smoke e rollback operacional continuam ausentes, desconhecidos ou não executados. O relatório não encontrou evidência que permita chamar Production de configurada.

**Etapa 0 concluída e aprovada pelo usuário em 2026-10-01:** o checkout primário `D:\2 - Dev\0 - Projects\polaris-erp` está limpo na branch `codex/fundacao-plano`, `HEAD 5716f3c`, mas diverge do `origin/main` atual em 123 commits atrás e 1 à frente. O único commit exclusivo contém documentação P24/P26/revisão de práticas; seu conteúdo foi comparado e preservado na worktree de auditoria, sem incorporar a história antiga em bloco. A branch D permanece intocada. Continuar na worktree auditada, cuja base agora coincide com `origin/main`; manter as alterações documentais existentes e não fazer pull/reset/rebase/cherry-pick sobre o checkout primário.

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
| P4 | **Acesso definido; Staging e primeira prova ainda pendentes.** Manter `camilagama` como owner/importer Vercel e `juniordinim` como único viewer externo por grant individual, sem Shareable Links. Hobby limita colaboração externa e não dá permissões de projeto. A documentação Git Vercel mais recente isenta colaboradores de contas Git pessoais do check de acesso do autor, mas uma página de troubleshooting anterior diverge; testar o primeiro Preview protegido vindo de PR antes de usá-lo como gate. Não criar branch `staging` agora; homologação persistente continua antes do go-live. |
| P5 | **Decisão refinada aprovada em 2026-10-01; implementação pendente.** `.env.example` deve usar bases Sandbox atuais Asaas/Woovi e chaves vazias; validação deve rejeitar hosts Production em Local/CI/Staging; CI/E2E devem permanecer sem credenciais externas e com providers fake; URLs de banco E2E devem ser marcadas como obrigatórias nos jobs Web/Admin. A leitura confirmou mocks `fetch` nos testes unitários, mas o isolamento de todas as jornadas E2E ainda precisa ser verificado. A configuração de credenciais Preview/Staging depende do escopo de branch aprovado em P4. |
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
| P24 | **Implementado com risco residual aceito em 2026-10-01.** Production está allowlisted para `main`, sem secrets/vars hoje; `can_admins_bypass: true`. O usuário aceita o owner como possível ator de bypass. Reconsultar a disponibilidade da opção e validar ref não permitida sem credenciais antes de provisionar secrets. |
| P25 | **Implementado.** Permissões mínimas e `contents: read` estão nos workflows; jobs sem token recebem `permissions: {}`. |
| P26 | **Parcial.** Actions estão pinadas por SHA. A política de atualização de pins/Dependabot permanece pendente, sem auto-merge aprovado. |
| P27 | **Implementado.** Cancelamento de runs antigas fica em jobs CI; operações não são canceladas em concorrência. |
| P28 | **Fechado sem adoção.** Dependency Review não foi aprovada para esta conta/escopo; não reintroduzir sem mudança de entitlement ou de risco. |
| P29 | **POC e decisão concluídos em 2026-10-01.** Execução Semgrep Code-only `36780602755`, scan `237448079`: 767 arquivos, 2.944 regras, 23 achados não bloqueadores, zero bloqueadores. A triagem de origem foi aprovada; os achados permanecem abertos, sem suppressions ou baseline. Workflow segue manual e não requerido; isso não mede precisão global nem justifica gate amplo. CodeQL continua fora do escopo aprovado. |
| P30 | **Política válida; integração assistiva não é gate.** CodeRabbit/Copilot podem ajudar no review conforme disponibilidade; CI determinística continua autoridade. A auditoria não encontrou motivo para exigir bot/reviewer no merge. |
| P31 | **Condicional, não adotado.** Remote Cache e `--affected` seguem desativados; ausência de medição de ganho é motivo suficiente para manter o caminho atual. |
| P32 | **Configuração revisada; cache permanece off.** Env/hash/outputs e Sentry foram tratados para futura decisão; não há necessidade de ligar cache remoto para fechar Gate A. Reabrir após medir e comprovar que o cache não vaza ou mascara outputs. |
| P33 | **Implementado.** Node 24 e Bun 1.4.2 aparecem como runtimes declarados. Atualização de dependências de linguagem/ferramenta continua em P2/P52. |
| P34 | **Decisão de distribuição aprovada em 2026-10-01; implementação pendente.** O usuário escolheu a recomendação de versionar a build Codex completa numa versão estável exata em `.agents/skills/impeccable`, sem hook automático, com licença/NOTICE, allowlist mínima no `.gitignore`, ponteiro em `AGENTS.md` e validação em clone limpo. O hook Codex quebrado permanece removido. |
| P35 | **Implementado documentalmente.** DESIGN e tokens foram alinhados aos limites aceitos; isso não é prova de acessibilidade de todas as páginas. |
| P36 | **Parcial.** WCAG 2.2 AA é alvo interno, não declaração de conformidade. Axe e revisão manual representativa ainda não foram demonstrados. |
| P37 | **Decisão arquitetural previamente aprovada; implementação pendente.** Revalidação confirmou cerca de 150 imports Web por aliases diretos para `packages/ui/src`; Admin não tem consumidores atuais, mas ambos os `tsconfig` conservam esses aliases e um alias amplo `@polaris/ui/*`. Migrar Web aos subpaths declarados, remover os aliases de ambos os apps e reforçar o guard; dependências `workspace:*` e exports já existem. Não é necessário criar pacote ou configurar `transpilePackages` sem evidência. |
| P38 | **Concluído como decisão.** `@polaris/domain` não foi extraído sem responsabilidade estável que justifique package próprio. |
| P39 | **Matriz e estratégia de teste aprovadas; execução incompleta.** A revalidação confirmou gaps em Web↔Admin, packages→Admin, dependências internas workspace declaradas para todos os packages, ciclos e caminhos relativos/aliases entre source. Os testes atuais ainda não cobrem a matriz inteira. Turborepo Boundaries continua experimental; manter a implementação própria com AST TypeScript já aprovada. |
| P40 | **Implementado.** Template de PR registra problema, risco e evidência sem reviewer/labels obrigatórios. |
| P41 | **Implementado.** Matriz de risco/evidência proporcional existe. |
| P42 | **Implementado.** DoD aponta para uma fonte única da estratégia. |
| P43 | **Matriz por capacidade aprovada e atualizada no checkout; operação não certificada.** Registro agora distingue Google OAuth, jobs/outbox/DLQ, e-mail de billing, imagens R2, rate limit, alertas, Asaas e Woovi. Asaas é gate obrigatório do plano pago; Woovi fica `N/A`. O checker continua sem status por capability e exige providers universalmente. Nenhuma configuração externa, credencial, backup ou deployment foi criada/verificada por essa edição. |
| P44 | **Parcial.** Runbook, RPO/RTO e critérios existem; PITR, dump externo, retenção, restore drill real e recuperação de objetos não foram configurados/medidos. Neon Free, se for o plano escolhido, oferece só 6 h de histórico (até 1 GB de mudanças), uma snapshot manual e não oferece backups agendados; não depender disso como cópia externa. |
| P45 | **Parcial.** Operação de migration manual/isolada foi integrada, mas não tem alvo, secret, migration nem falha/retomada Drizzle de Production ensaiada. |
| P46 | **Implementado com limite operacional.** Guard impede URL remota e reserva `polaris_push_scratch`; ainda é responsabilidade operacional manter o alvo descartável/vazio e recriável. |
| P47 | **Runbook implementado; operação pendente.** Não há project/deployment Vercel, promoção por ID ou rollback real observados. Hobby passou a reter menos deployments e limita armazenamento a 10 GB; exigir fallback de redeploy pelo SHA. |
| P48 | **Runbook implementado; operação pendente.** Web/Admin continuam projetos separados e promoção sequencial não atômica; projetos e smoke externos não foram confirmados. |
| P49 | **Código/runbook existem; configuração externa desconhecida.** Vercel Authentication com All Deployments está disponível no Hobby desde a mudança de 2026-09-09; não está configurada. `juniordinim` poderá receber grant individual para visualizar deployments protegidos, dentro do limite Hobby de um usuário externo; esse grant não dá acesso de projeto/configuração. Confirmar acesso de Preview e Admin Production por separado na implantação. Vercel Hobby continua pessoal/não comercial segundo termos; opt-in de treinamento de conteúdo exige opt-out antes de conectar o repo. |
| P50 | **Concluído.** Snapshot antigo tem status histórico e ponteiro para fonte vigente. |
| P51 | **Implementado com uma pendência de freshness.** Mapa de autoridade e lifecycle seletivo existem; atualizar coverage de julho quando for fonte ativa e corrigir fatos arquiteturais stale na memória. |
| P52 | **Pendente em parte.** O freeze ainda não começou porque o SHA não entrou na homologação final, conforme decisão; a atualização estável autorizada não foi completada. O resultado `bun outdated` é inventário, não autorização de atualização sem verificação. |
| P53 | **Pendente.** Não há configuração Dependabot; GitHub documenta suporte ao lockfile textual `bun.lock` atual. Configurar update PRs com revisão manual e testar o comportamento antes de fechar. |
| P54 | **Implementado para CI.** Service container PostgreSQL 18.6; a versão do projeto Neon de qualquer ambiente segue desconhecida. |
| P55 | **Implementado na configuração.** Artifacts de falha têm retenção curta; os passos de upload foram pulados em runs verdes, então uma falha controlada ainda deve validar o caminho de diagnóstico. |
| P56 | **Concluído no primeiro escopo aprovado.** Logins Web/Admin têm baseline Chromium/Linux fixa; telas autenticadas permanecem fora até fixtures determinísticas. |
| P57 | **Escopo de ambos providers revisado.** O usuário confirmou o plano pago mensal no primeiro lançamento: Asaas/cartão recorrente é gate obrigatório P43 antes de expor checkout pago; homologação Sandbox ponta a ponta ainda não foi executada. Woovi/Pix Automático fica `N/A` e oculto no primeiro lançamento; reabrir somente com demanda confirmada e homologar assinatura/ping/mapeamento em Staging. Nenhum dos dois bloqueia Gate A; Asaas bloqueia o go-live pago. |
| P58 | **Semântica aprovada; implementação pendente.** `cancelSale` grava `sales.cancelled_on` com helper São Paulo, mas `products/queries.ts` ainda projeta/filtra com `date(cancelled_at)`, dependente da timezone da sessão. Admin Events recebe `from/to` e não propaga; o usuário aprovou filtrar criação/recebimento (`created_at`) nos dois conjuntos, com intervalo semiaberto São Paulo, mantendo `available_at` separado para retries. |
| P59 | **Contrato aprovado; implementação pendente com gaps ampliados.** A tabela Admin formata `createdAt` (instante) como data sem hora. `formatDate(Date|string)` mistura `DATE` e instante; `formatDateTime` aceita string sem exigir offset. O dashboard duplica formatter de instante e ancora um `DATE` como timestamp para obter o dia da semana. O rótulo de fuso aprovado não aparece em `apps/` ou `packages/`. Corrigir helpers e consumidores, explicitar strings de instante, adicionar a nota uma vez nas telas densas e testar invariância por timezone; sem migration. |
| P60 | **Concluído como mapa reconciliado.** Árvore preserva conteúdo/status sem criação de diretórios vazios. |
| P61 | **Decisão de sequência válida; status antigo.** Hook, baseline, perfis, PG18, CI e ruleset já foram realizados. A sequência remanescente foi atualizada no plano principal; manter a reconciliação segura do checkout como primeiro passo operacional. |
| P62 | **Workflow aprovado e implementado.** Branch curta, teste focal, verify, PR para main, checks e revisão do próprio autor seguem compatíveis com ruleset observado. |
| P63 | **Sequência concluída; itens de conteúdo não fecham automaticamente.** P9/P12/P13/P14 ainda têm as pendências listadas nesta tabela. |
| P64 | **Texto anterior estava stale.** P55/P56 estão integrados; Semgrep POC já rodou e aguarda triagem; P54 está em PG18.6. Remote Cache/affected continuam condicionais; não incluir CodeQL/Dependency Review. |
| P65 | **Gate continua adequado; matriz P43 refinada; operação não executada.** Asaas exige prova Sandbox/reconciliação antes do plano pago; Woovi permanece fora do escopo e `N/A`. As demais capacidades seguem as regras normativas e o mapa P43; checker scope-aware continua pendente. |
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

### 6. Vercel Hobby — limites e acesso para provisionar

O plano pode continuar usando Hobby como **referência de custo/limites**, como pediu o usuário, mas isso não valida elegibilidade para o produto:

- Os termos atuais limitam Hobby a uso pessoal ou não comercial. Como Polaris é um ERP com finalidade comercial, confirmar com Vercel se o uso de desenvolvimento/homologação proposto está dentro dos termos; caso contrário, usar Pro antes de implantar para uso comercial. Não é conclusão jurídica deste relatório. [Vercel — Terms of Service](https://vercel.com/legal/terms) e [Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines).
- Vercel declara que Hobby começa opt-in para treinamento de modelos com conteúdo/telemetria de deployment e build; há opt-out em Data Preferences. Definir opt-out antes de conectar o repo privado e registrar que dados já compartilhados não podem ser descompartilhados retroativamente. Há também usos de conteúdo para melhoria de serviço descritos nos termos. [Atualização de ToS/AI](https://vercel.com/changelog/updates-to-terms-of-service-march-2026).
- Em 2026-09-09, Vercel anunciou `All Deployments` com Vercel Authentication sem custo em todos os planos; a documentação foi atualizada em 2026-09-15 para refletir a disponibilidade no Hobby. No Admin isso permite proteger domínio Production sem add-on; no Web, manter o domínio Production público quando o produto for lançado. Confirmar o setting efetivo no painel ao provisionar. [Changelog](https://vercel.com/changelog/protect-production-deployments-for-free-on-every-plan), [Deployment Protection atual](https://vercel.com/docs/deployment-protection).
- Em 2026-09-16, Hobby passou a reter 10 GB de deployments e manter apenas conjuntos recentes; deployments antigos de Preview podem ser removidos mais cedo. O runbook P47 precisa garantir redeploy de SHA antigo se deployment ID de rollback expirou. [Vercel — retenção de Hobby](https://vercel.com/changelog/hobby-projects-now-retain-fewer-deployments-to-free-up-storage).
- Vercel permite Staging persistente por branch Preview com domínio/vars branch-specific em todos os planos; Custom Environment precisa Pro/Enterprise. Staged Production é para validar build com configuração de Production, nunca para mutações de teste que devem usar o Staging isolado. Primeiro deployment de um projeto novo é Production, então decidir production branch/domínios/protection antes do primeiro deploy. [Vercel — Environments](https://vercel.com/docs/deployments/environments).
- **Decisão do usuário:** `camilagama` será owner/importer da conta/projetos Vercel por ser owner do repositório pessoal; `juniordinim` será o único viewer externo autorizado no Hobby. O convite de acesso a deployment permite visualização, não membership/configuração de projeto. Não usar Shareable Links, pois eles ignoram a proteção. [Vercel — GitHub projects](https://vercel.com/docs/git/vercel-for-github), [compartilhamento de Preview](https://vercel.com/docs/deployments/sharing-deployments).
- **Limite ainda a provar:** a documentação Git atualizada em 2026-09-18 exclui colaboradores de contas Git pessoais da checagem de acesso do commit author; a página de troubleshooting atualizada em 2026-03 ainda diz genericamente que Hobby exige autoria do owner. Para o repo pessoal `camilagama`, a página Git mais nova/específica sugere que commits de `juniordinim` podem criar Preview; validar um PR privado protegido antes de depender do Preview como gate. [Vercel — Git, regra atual](https://vercel.com/docs/git), [troubleshooting com regra genérica](https://vercel.com/docs/deployments/troubleshoot-project-collaboration).

## Plano de implementação reordenado

As etapas 0–6 fecham Gate A para features amplas. As etapas 7–8 são Gate B e só precisam ocorrer antes de go-live/dados reais. Cada etapa deve ser um PR revisável, com evidência no SHA e aprovação do usuário conforme o fluxo já combinado.

### Etapa 0 — reconciliar o checkout de desenvolvimento

**Escopo:** manter o checkout D intacto; mapear seu commit documental exclusivo `5716f3c` e verificar onde P24/P26/práticas foram preservados; revalidar `origin/main` e manter a implementação na worktree isolada de auditoria já existente. A inspeção confirmou D limpo, portanto não há modificações/untracked locais a recuperar ali; as alterações da worktree de auditoria são revisões documentais intencionais e permanecem preservadas. Não fazer reset, clean, rebase ou cherry-pick em bloco sobre D.

**Concluída e aprovada pelo usuário em 2026-10-01:** cada contribuição exclusiva foi reconciliada por conteúdo; a branch primária permaneceu preservada; a worktree implementadora usa o `origin/main` atualizado; e nenhuma mudança local foi descartada. P24 e P26 foram conferidos nas versões atuais do plano/pesquisa, e a revisão de práticas foi preservada como conteúdo mais completo na worktree de auditoria.

### Etapa 1 — P5, defaults seguros de ambiente

**Escopo:** Asaas e Woovi sandbox como defaults locais; variáveis E2E Web/Admin claramente documentadas; guards/validação que impeçam uso acidental de endpoint de pagamento live em Local/CI; manter os secrets de E2E separados do Environment Production.

**Concluída e aprovada pelo usuário em 2026-10-01:** defaults Asaas/Woovi Sandbox com credenciais vazias; guard rejeita hosts live fora de `VERCEL_ENV=production`; CI não recebe chaves dos providers; E2E documenta os secrets Web/Admin separados; e a taxonomia de quatro ambientes está alinhada. Os checks focais passaram: 41 testes, `env:check`, typecheck Web, Ultracite, `docs:check` (13 testes/122 Markdown) e `git diff --check`. P4 ainda deve confirmar a exposição das variáveis de sistema Vercel nos dois projetos antes de configurar Production.

### Etapa 2 — P37/P39, fronteiras executáveis

**Escopo:** executar em duas passagens aprovadas. **P37 primeiro:** migrar imports dos apps para exports públicos de `@polaris/ui`, remover aliases dos tsconfigs Web/Admin e internos do pacote UI, revisar padrões semânticos compartilhados, corrigir a memória stale e adicionar guards locais para os antigos aliases. **P39 depois da revisão de P37:** ampliar os guards Vitest com AST para a matriz apps↔packages, dependências declaradas, ciclos, imports relativos e re-exports/dinâmicos relevantes; registrar a matriz em `docs/architecture/overview.md` e apontá-la em `AGENTS.md`.

**P37 e P39 aprovados pelo usuário em 2026-10-01:** P37 cobre imports públicos, remoção de aliases, correções de significado UI e seu guard. P39 adiciona o guard AST de dependências com fixtures permitido/proibido, atualiza o mapa arquitetural e aponta para ele em `AGENTS.md`. `verify:quick` passou com 12 tarefas de typecheck e 11 tarefas de teste; os 17 testes focais passaram. A Etapa 2 está concluída no escopo aprovado nesta worktree; as alterações continuam locais, sem commit ou integração.

**Pronto quando:** P37 usa somente exports públicos e mantém as composições visuais fiéis ao significado de cada app; P39 cobre os caminhos permitidos e proibidos da matriz com casos focais na suíte existente; e `audit:boundaries` permanece separado como verificação de auditoria transacional.

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

**Escopo:** reconsultar releases estáveis, agrupar updates por compatibilidade e impacto, atualizar 27 candidates compatíveis em batches e avaliar majors/pins restantes com deferimento justificado. Atualizar Playwright exige snapshots canônicos Linux revisados. Configurar Dependabot para Bun e GitHub Actions com frequência aprovada, limite de PRs e merge manual somente depois de P5 provisionar os alvos E2E e cadastrar as URLs não produtivas como Dependabot secrets, ou depois de implementar um caminho equivalente de E2E que não dependa de secrets remotos. Workflows de `dependabot[bot]` não recebem Actions secrets normais; não pular nem colocar em quarentena os checks E2E.

**Pronto quando:** cada grupo tem changelog e checks afetados verdes, lockfile reproduzível, todos os `Latest` escolhidos ou formalmente deferidos, Dependabot abre e atualiza PRs esperados com os E2E executáveis sem secrets de Production, CI principal permanece verde.

### Etapa 7 — aceite Gate A

**Escopo:** verificar P5, P37/P39, P58/P59, P9/P12/P13/P14/P36 e batches P2/P52 no mesmo SHA; confirmar ruleset e checks remotos ativos, sem reviewer humano obrigatório. O risco residual `can_admins_bypass: true` do P24 foi aceito pelo usuário. Antes de registrar credenciais no Environment Production, reconsultar se a opção está disponível para a conta privada; se não estiver, validar a rejeição de refs não permitidas sem credenciais reais e preservar o menor escopo por job.

**Pronto quando:** SHA tem CI verde nos quatro checks, verificações focais passam, docs não se contradizem, a branch padrão segue protegida e nenhuma verificação de Gate B é falsamente declarada.

### Etapa 8 — provisionamento Vercel/Neon e Staging para Gate B

**Escopo:** antes de conectar, registrar opt-out aprovado de uso de conteúdo; confirmar elegibilidade Hobby para o uso pretendido; `camilagama` importa/conecta o repo e administra projetos; `juniordinim` recebe grant individual de leitura, sem Shareable Links. Testar um PR protegido do colaborador em repo pessoal, pois duas páginas Vercel divergem sobre commit author no Hobby. Criar projetos Web/Admin com root directories corretos e confirmar, em ambos, a exposição das variáveis de sistema Vercel usada pelo contrato de ambiente (`VERCEL_ENV`). Manter branch Git `staging` suspensa até necessidade demonstrada; preparar Preview branch persistente com domínio/vars não produtivos e Neon branch de Staging antes do go-live. P5 Sandbox deve estar implementado. Como o plano pago entra no primeiro lançamento, Asaas Sandbox precisa validar Checkout→webhook→outbox→reconciliação; Woovi/Pix Automático segue `N/A`/oculto.

**Pronto quando:** `All Deployments` no Admin e a proteção necessária no Preview são provados com o viewer autorizado e com acesso negado a terceiros; o primeiro Preview por PR funciona ou a limitação foi resolvida antes de usá-lo como gate; as variáveis de sistema Vercel estão expostas nos dois projetos e `VERCEL_ENV` é reconhecido no Preview; build inicial não é exposto como Production inadvertidamente; Web/Admin apontam a banco/provedores sandbox/fake; Staging persistente está registrado em P43 com Asaas não produtivo e Woovi fora do escopo.

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

## Atualização após a auditoria — 2026-10-01

- **P3:** após autorização do usuário, `camilagama` atualizou a ruleset `main` pela interface GitHub para exigir base atualizada antes do merge. A interface exibiu `Ruleset updated` e a API read-only confirmou `strict: true`, enforcement `active`, os mesmos quatro checks (`verify`, `e2e`, `postgres-behavior`, `admin-e2e`) e zero approvals. Não alterei outras regras, não fiz push experimental e não simulei um merge de branch desatualizado. O snapshot da matriz P1–P70 acima foi feito antes dessa atualização; o status vigente está em P43 e na atualização do plano principal.
- **P24:** em 2026-10-01, o usuário aceitou o owner como possível ator de bypass residual. A API read-only confirmou allowlist `main`, `can_admins_bypass: true`, zero secrets/variables; nenhum job de Production foi executado. Antes de provisionar credenciais, reconsultar se o controle é suportado e validar a rejeição de refs não permitidas sem secrets reais.
- **P29:** a decisão posterior à matriz foi registrada no plano principal: POC e triagem de origem concluídos; 23 findings ficam abertos, sem suppressions/baseline, e o workflow segue manual/não requerido. Isso encerra a decisão do POC, não declara o scanner preciso nem cria gate de segurança.
- **P34:** o usuário delegou a escolha da distribuição em 2026-10-01; o plano agora aprova a recomendação de cópia Codex completa versionada, sem hook automático. A skill ainda não foi instalada ou commitada; P34 permanece parcial até o teste em clone limpo.
- **P5:** o usuário aprovou usar URLs Sandbox Asaas/Woovi em `.env.example`, com credenciais vazias e host guard contra endpoints live em Local/CI/Staging. Os callbacks permanecem separados das URLs de saída; CI/E2E devem permanecer sem credenciais externas e com providers fake; validar esse isolamento em todas as jornadas E2E ao implementar. Nenhuma variável ou integração externa foi alterada; scoping Vercel Preview/Staging permanece dependente de P4.
- **P37:** a arquitetura aprovada continua válida; revalidação detalhou a execução: migrar aproximadamente 150 imports Web de aliases para subpaths públicos existentes, remover aliases dos dois tsconfigs e ampliar o guard. Não adicionei configuração Next ou dependência; essa correção continua pendente de implementação.
- **P58 (snapshot da auditoria):** este registro descrevia o estado anterior à implementação abaixo; as decisões de timezone e semântica DATE/instante permanecem, e o usuário confirmou que Admin Events filtra criação/recebimento (`created_at`) enquanto `available_at` é a agenda de retry. Consulte a atualização de implementação ao final deste documento para o estado vigente da worktree.
- **P71:** o usuário aprovou adicionar uma revisão de duração/simplificação da CI antes de ampliar triggers/checks para Staging. A amostra `36832817188` levou cerca de 14,1 minutos de relógio e 16,8 runner-minutos somados nos quatro jobs; uma execução não é baseline estatística. A etapa P71 medirá várias execuções e consultará o estado contemporâneo do Hub quando o gatilho chegar. Ela preserva todos os checks de `main` até que uma alternativa com cobertura equivalente seja demonstrada.
- **P4/P49:** após delegação do usuário, Hobby permanece a referência; `camilagama` conecta/importa o repo pessoal e administra os projetos; `juniordinim` será o único viewer externo individual, sem Shareable Links. All Deployments + Vercel Authentication está disponível no Hobby. A documentação atual Git permite a leitura de que colaboradores de repositórios pessoais podem gerar Preview no Hobby, mas uma página de troubleshooting anterior diverge; o primeiro PR protegido deve validar isso antes de contar Preview como gate. Staging persistente continua Gate B, sem branch Git `staging` inicial.
- **P43/P65:** o usuário aprovou separar gates por capability normativa. O P43 foi expandido para Google OAuth, jobs/outbox/DLQ, email transacional, imagens/R2, rate limiting, alertas, Asaas e Woovi. Asaas é obrigatório para vender o plano pago; Woovi é `N/A` e oculta. Inngest/Resend/R2 são os providers atuais; Upstash é exigido enquanto o código de rate limit depender dele; alerting é obrigatório mas Sentry não é vendor obrigatório. O checker `scripts/check-production-certification.ts` ainda precisa aceitar status por capability/`N/A` justificado e deixar de exigir vendors fora do escopo. A matriz documental não configura nem valida serviços externos.
- **P57/Asaas:** o usuário confirmou primeiro lançamento com plano pago. P43 exige Checkout recorrente Asaas em Sandbox de Staging, webhook, outbox/reconciliação, idempotência, falha/retry e retorno ao Free antes de expor o plano. Não há sandbox remoto validado nem cobrança real feita. Woovi só reabre com demanda confirmada e correção do contrato RSA/ping.
- **P59 (fotografia pré-implementação):** a auditoria abaixo foi substituída pela atualização de 2026-10-02 ao final deste documento.

## Atualização de implementação — P58 — 2026-10-01

P58 foi implementado na worktree `codex/foundation-plan-audit` e aprovado pelo usuário em 2026-10-02; permanece parcial até replay em PostgreSQL 18 descartável e o follow-up de interpretação da hora de parede no formulário de expiração de grants. Não foi commitado, integrado nem aplicado a banco remoto. A leitura de estorno agora usa `cancelled_on`; Admin Events propaga o intervalo de datas civis de São Paulo às consultas por `created_at`, separa a data de criação da disponibilidade/retry e trata entradas inválidas com fallback sinalizado. A migration `20261001220238_long_hammerhead.sql` adiciona os dois índices B-tree e alinha seis nomes de FK ao schema Drizzle. `bun run verify:quick` passou, incluindo lint, typecheck dos 13 pacotes e testes unitários; o teste focal também passou. Testes de comportamento PostgreSQL 18 permanecem não executados porque `POSTGRES_BEHAVIOR_DATABASE_URL` não está configurada. Nenhum banco remoto foi acessado.
## Atualização de implementação — P59 — 2026-10-02

P59 está implementado na worktree e foi aprovado pelo usuário em 2026-10-02. Os helpers separam data civil e instante; strings ISO de instante são validadas e exibidas em São Paulo; a tela Admin Organizations e dashboard local foram corrigidos; rótulos civis de gráficos foram tornados independentes de timezone; `<time dateTime>` e avisos de fuso foram adotados seletivamente nas superfícies densas. `bun run verify:quick` passou (docs, lint, typecheck dos 13 pacotes, testes unitários). A marca visual Impeccable não foi executada porque sua CLI não está disponível/resolvível; nenhuma URL local foi aberta. Sem migration ou dependência nova.

Fotografia anterior à implementação do follow-up: `datetime-local` e `new Date(value)` podiam depender do runtime. O gap foi corrigido e aprovado em 2026-10-02, conforme `research-ponto-58-timezone.md`. P58 permanece parcial pelos testes reais PG18 pendentes. Nenhum commit/push foi realizado.
## Follow-up P58 — implementado localmente, aguarda revisão — 2026-10-02

Esta atualização substitui o diagnóstico “Ainda não corrigido” acima. O formulário
agora interpreta exclusivamente São Paulo por Temporal server-only fixado em 0.5.1,
rejeita input duplicado/invalidado e horários inexistentes ou repetidos. Os prazos
medem períodos de 24 horas: grants support/operator/owner têm máximos 14/30/90 dias,
enrollment no máximo 168 horas e nunca além do grant. O claim revalida o prazo e o
limite do papel, inclusive para enrollment antigo, e falha transacionalmente se
não conseguir consumir/criar o grant sob os guards SQL de relógio corrente.

Admin: 16 testes focais/typecheck passaram; parser também passou em UTC e Tóquio;
detector Impeccable da tela retornou zero achados. A revisão Luna não encontrou
bloqueios no Admin. CodeRabbit está desconectado. A execução ampla teve falhas
intermitentes no Web; 57 testes desses arquivos passaram isolados e a repetição
do perfil passou. O resultado do estado final está em `research-ponto-58-timezone.md`.
P71 deve investigar a instabilidade sem elevar timeout nem remover gates por suposição.

Os testes de admissão são mocks; execução SQL e rollback real devem ser comprovados
no PostgreSQL 18 descartável junto do replay pendente. Nenhum banco remoto foi
acessado. Sem migration nova nesta subetapa, commit ou push. O usuário aprovou esta subetapa em 2026-10-02.
**Verificação do estado final (2026-10-02):** `bun run verify:quick` passou após a correção de enrollment legado: documentação (13 testes/122 arquivos), Ultracite (621 arquivos), typecheck do workspace e suites unitárias. Testes focais desta subetapa: 16 no Admin e 25 na plataforma, incluindo limite máximo e máximo +1ms por papel, recusa durante o claim e convite legado excessivo. O Web final passou 578 testes; um teste PostgreSQL permanece condicional e não executado. `git diff --check` também passou. Sem prova de SQL/rollback real até PostgreSQL 18 descartável; sem banco remoto, commit ou push. Implementação aprovada pelo usuário em 2026-10-02.

### Status após revisão do usuário — follow-up P58 — 2026-10-02

O usuário aprovou a implementação local do follow-up de expiração de grants. O status “aguarda revisão” registrado acima está superado. A subetapa está aprovada, sem commit/integração; P58 como um todo continua parcial até replay da migration e prova comportamental/rollback real em PostgreSQL 18 descartável. A próxima análise está em `research-ponto-58-timezone.md`.
### Follow-up P58 — suíte PostgreSQL 18 de admissão implementada e aprovada — 2026-10-03

A pedido do usuário, foi adicionada integração real via clone descartável loopback do serviço PostgreSQL 18.6 no CI. O URL Neon pooled fornecido não foi usado; guard loopback não foi relaxado. A implementação local foi aprovada pelo usuário em 2026-10-03; `verify:quick` passou, mas os quatro novos testes foram skipped por falta do alvo PostgreSQL local. A prova efetiva de execução e rollback depende do job CI com `POSTGRES_BEHAVIOR_DATABASE_URL` e `DATABASE_URL` temporários para o clone. Nenhum banco remoto ou commit foi acessado.

## Reconciliação de execução posterior à auditoria — 2026-10-04

Esta auditoria continua sendo a fotografia das fontes e configurações verificadas em 2026-10-01. Esta nota substitui somente os rótulos de execução e “próximo item” que ficaram antigos; não reescreve decisões P1–P70 nem declara Gate A/B concluído.

- **P5:** o residual de isolamento foi concluído e aprovado pelo usuário em 2026-10-04. No CI do SHA 464d795, verify/PostgreSQL passaram; E2E Web/Admin fizeram preflight read-only e falharam ao carregar Playwright config CommonJS por import.meta. A correção de raiz local passou Playwright --list Web (12)/Admin (6), sem servidor/banco; o segundo CI (410ee7d) revelou que workers reimportam o config após a sanitização e precisam receber a URL E2E dedicada. O runner agora preserva essa URL e continua removendo DATABASE_URL e os outros aliases privilegiados. O terceiro CI, 37230049223 no SHA 563d32d, passou verify, e2e, admin-e2e e postgres-behavior em 7m11s de parede. Nenhuma chamada a provider ou escrita no banco remoto foi observada; o valor/branch/role real do secret remoto não foi consultado.
- **P36:** baseline Axe e correções automatizadas implementadas/aprovadas. Revisão manual de teclado, foco e leitor de tela continua gate pré-produção; P36 não é a próxima implementação.
- **P37/P39:** implementação aprovada e validada no PR #7. O PR permanece Draft e não integrado à `main`.
- **P58/P59:** implementações aprovadas e validadas nos quatro checks do PR #7; isso não declara integração em `main`.
- **P69/P70:** não repetir P5, automação P36, P37/P39 ou P58/P59. Gate A continua aberto; a integração do PR #7 e os itens restantes do plano ainda são necessários. Gate B continua não comprovado.
- **P71:** experimento pré-Staging executado no commit `7d10f79` do PR #7. Em três tentativas no mesmo SHA, todos os quatro checks passaram; a mediana de parede caiu de 12,30 para 7,25 minutos. O detalhe, a ressalva de falha do `verify` e os limites da amostra estão no ponto P71 do plano principal. A revisão mais ampla antes de adicionar triggers de Staging continua pendente.
- **P34 / P2/P52:** a recomendação de distribuição clone-safe foi substituída pela escolha do usuário por instalação global, implementada e aprovada em 2026-10-04; ver adendo abaixo. Os seis primeiros batches P2/P52 (Next.js/@next/env 16.3.8 no commit 697d92e, Sharp 0.35.5 no commit 3b3d770, par AWS S3 3.1146.0 no commit 71f2b99, stack PostgreSQL no commit 16618e8, Upstash Ratelimit 2.2.0/Redis 1.39.0 no commit `3617633` e Biome 2.5.15 no commit `ce069f1`) foram aprovados e passaram os quatro checks; o sexto passou na CI `37251818336`. P2/P52 continua aberto. A próxima análise proposta, baseada no `bun outdated` atual, é `@tanstack/react-form` 1.33.2 → 1.33.5; o changelog mostra correção em `form-core` para preservar campos irmãos ao excluir um nome com prefixo compartilhado. Playwright é adiado para análise própria por alterar as revisões dos browsers e a evidência visual.

O commit `7d10f79` permanece no PR #7 Draft, sem merge. Nenhum estado remoto de Vercel, Neon, Production, recuperação ou Staging foi inferido das execuções da CI.

### Adendo P34 — Impeccable global — 2026-10-04

Após a recomendação anterior de distribuição clone-safe, o usuário escolheu atualizar e usar a skill global. Neste perfil Codex, a instalação foi atualizada pelo CLI Impeccable 4.1.0 para a skill 4.5.0 e engine 0.1.11; a instalação usou `--no-hooks`. O plano principal foi ajustado para não adicionar cópia, exceção ao `.gitignore` ou ponteiro local no `AGENTS.md`. O usuário aprovou a instalação e a alteração de plano em 2026-10-04.

Essa escolha substitui a distribuição versionada aprovada em 2026-10-01: outros perfis e clones não recebem a skill automaticamente. Reabrir P34 antes de exigir Impeccable em outro colaborador ou de depender dela como requisito reproduzível do repositório. O status aqui é de configuração local; nenhum hook ou arquivo da skill foi adicionado ao repo.

### Follow-up P5 — isolamento do servidor E2E local — 2026-10-04

Auditoria somente leitura encontrou que ambos os `playwright.config.ts` carregavam variáveis do repositório/app com `@next/env` e passavam `process.env` ao servidor. O Admin ainda relia dotenv com precedência sobre o ambiente do processo. CI mantém as chaves Asaas/Woovi ausentes, e os fluxos E2E atuais não iniciam checkout desses providers. Não foi observada chamada externa ou lido qualquer arquivo dotenv real.

Isso reabriu somente a conclusão de P5: a regra aprovada de providers fake/sem credenciais para CI/E2E não era demonstrável no processo E2E local. A implementação local agora mascara variáveis atuais e o contrato do `.env.example`, restaura apenas URLs loopback e valores sintéticos, sanitiza também os workers Playwright e impede dotenv específico de Production no build E2E. A autenticação Admin ignora dotenv só quando o marker E2E está ativo; o comportamento normal foi preservado. O target E2E é validado contra aliases de banco disponíveis no processo e role Neon owner, mas branch/role remoto não foram consultados. A implementação aguarda revisão do usuário e CI no SHA atualizado; não houve chamada autenticada, banco remoto ou leitura de valores dotenv. A auditoria remota de `VERCEL_ENV`/Preview continua uma tarefa de P4.

O P5-base já concluído continua registrado; o residual é de defesa preventiva para E2E local/futuro, sem evidência de incidente. A decisão de Sandbox e as URLs aprovadas não mudam. A pesquisa atualizada dos endpoints e limites dos providers está em `research-ponto-05-environments.md`.

**Atualização após CI — 2026-10-04:** o commit 464d795 passou verify e postgres-behavior. Web/Admin executaram o preflight de schema somente-leitura via E2E_DATABASE_URL e depois falharam ao carregar o pacote e2e-support, porque Playwright transpila o config para CommonJS e import.meta não estava disponível. Não houve chamadas a providers ou escritas no banco. A raiz agora é localizada subindo a partir de process.cwd; os configs Playwright Web/Admin foram enumerados localmente (12/6 testes) com URL sintética, sem servidor/conexão. A correção ainda precisa ser commitada/enviada e ter CI reexecutada.

**Segundo CI — 2026-10-04:** no commit 410ee7d, verify/PostgreSQL passaram e os jobs E2E iniciaram, mas o config reimportado nos workers já não recebia E2E_DATABASE_URL, removida intencionalmente do ambiente runner. A sanitização foi ajustada para manter somente a URL E2E dedicada entre variáveis de database, além de remover aliases auxiliares; os 40 testes focais passam localmente. O terceiro run aguarda push/revalidação. O preflight remoto foi somente-leitura e não houve chamadas a providers.
