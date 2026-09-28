# Plano de fundação do Polaris ERP

**Estado:** revisão dos 70 pontos concluída; implementação da fundação em andamento

**Iniciado em:** 2026-09-24  
**Revisão integral:** 2026-09-26  
**Fonte de escopo:** `C:\Users\Junior\Desktop\relatorio de fundação.md`

## Processo de revisão

Cada um dos 70 pontos do relatório foi avaliado separadamente:

1. Conferir a afirmação contra o estado atual do Polaris e do Hub.
2. Distinguir fatos locais, configurações remotas e pontos ainda desconhecidos.
3. Pesquisar documentação atual e práticas relevantes de outros projetos e equipes.
4. Apresentar uma recomendação ajustada ao estágio e aos objetivos do Polaris.
5. Resolver as decisões em aberto com o usuário antes de registrar o ponto como aceito.
6. Ordenar as mudanças aprovadas por dependência, risco e esforço (P61–P70).

As recomendações do relatório são hipóteses de trabalho, não instruções de implementação.

## Como usar o plano na execução

- Os 70 pontos abaixo registram **decisões aceitas e sua justificativa**, não execução concluída. O checkout, o CI e os provedores devem ser verificados novamente na implementação; data ou SHA de uma auditoria anterior não prova o estado atual de um serviço.
- P61–P64 e P69 são o roteiro de execução. P70 define dois marcos distintos: retomar desenvolvimento amplo e, depois, operar com dados reais. Tarefas sem dependência direta podem avançar em paralelo, desde que cada mudança tenha evidência própria e preserve os gates existentes.
- Uma tarefa é concluída quando o artefato previsto existe, a verificação adequada passa e a evidência fica vinculada ao PR/SHA ou ao registro operacional P43. Configuração remota, instalação de ferramentas e custo recorrente exigem confirmação no provedor e não são inferidos de YAML, README ou um teste local.
- Novas ferramentas propostas após a revisão dos 70 pontos estão no adendo final. Elas não alteram automaticamente os gates aceitos; dependem dos critérios explícitos de adoção naquele adendo.

## Execução iniciada

- **P33 — padronizar Node 24:** concluído e aprovado pelo usuário em 2026-09-28 no commit `19ae693`. O runtime local, manifests, lockfile, README/AGENTS e jobs CI/operações foram alinhados; typecheck, instalação congelada, Ultracite e `docs:check` passaram. `actionlint` e execução remota de Actions não estavam disponíveis nesta etapa.
- **P55 — higiene local de Playwright:** `.last-run.json` gerados e rastreados foram removidos do Git; `test-results/` e `playwright-report/` são ignorados. Upload de artifacts failure-only nos jobs CI segue pendente.
- **P34 / P61 — remover o hook Codex quebrado:** concluído e aprovado em 2026-09-26 na branch `codex/foundation-hook`. `.codex/hooks.json` foi removido porque chamava um arquivo inexistente em `.agents/`, ignorado pelo Git. Isso conclui apenas a remoção da referência inválida; a introdução futura de Impeccable no projeto permanece pendente até haver integração distribuível e validada.
- **P2/P22 — recuperação e remediação de advisories:** primeiro batch implementado em 2026-09-26 na branch `codex/foundation-hook`; Next `16.3.6` alinhado entre workspaces, `next typegen` incorporado ao typecheck Web, variáveis sintéticas Admin adicionadas ao build CI e rotas Admin dependentes de sessão autorizadas a bloquear. Segundo batch, `sharp@0.35.4`, commit `cfab2f4`, aprovado em 2026-09-27; teste focal de imagem (2/2) e builds Web/Admin passaram. Terceiro batch, override de `fast-uri` em `3.1.8`, commit `0976984`, aprovado em 2026-09-27; typecheck do workspace (12 tarefas) e builds Web/Admin passaram. Quarto batch, commit `79d7c55`, aprovado em 2026-09-27: PostCSS raiz `8.5.28`, NanoID `3.3.19` e Browserslist `4.29.1`; builds Web/Admin e typecheck de todo o workspace passaram. Quinto batch, `undici@7.30.0` via `jsdom`, commit `1187580`, aprovado em 2026-09-27; suíte unitária completa passou após tornar o ambiente Vitest determinístico e corrigir asserções frágeis de ambiente/CRLF. Sexto batch, overrides por consumidor para `brace-expansion`, commits `44936d1` e `17aa9c1`, aprovado em 2026-09-27; `minimatch@10` resolve `5.0.12` e `minimatch@9` resolve `2.1.7`. Como o Bun grava lockfile v3 para overrides aninhados, raiz e CI foram alinhadas a Bun `1.4.2`; Turborepo `2.11.4` passou a interpretar o lockfile sem aviso. Sétimo batch, commit `68d14b1`, aprovado após revisão em 2026-09-27: `smol-toml@1.9.0`, `@babel/core@7.29.7` e Vitest `4.1.11`; `bun audit` caiu de 6 para 2 entradas (1 moderate, 1 low), ambas de `esbuild`. Oitavo batch, commit `6237122`, aprovado após revisão em 2026-09-27: Drizzle Kit `0.31.11`, `tsx@4.23.15` e override escopado de `@esbuild-kit/core-utils` para `esbuild@0.25.12`; `bun audit` e `audit:baseline` agora passam com zero advisories. **Revalidação P22 em 2026-09-28:** a branch Neon E2E indicada pelo usuário estava vazia (sem tabelas em public nem journal Drizzle); o histórico SQL versionado foi aplicado por `bun run db:migrate` usando conexão direta, sem `db:push`, e o preflight de schema passou. E2E Web passou 9/9 e Admin 4/4 nessa branch não produtiva; os testes criaram registros sintéticos de usuários, organizações, operações e admins. `bun run test:all` passou em 11 tarefas e `bun run typecheck:all` em 12 tarefas; dez testes PostgreSQL dependentes de serviço foram ignorados pelo guard local. A CI remota foi executada em commits anteriores e revelou fixtures PostgreSQL sem owner, uma comparação de valores Date por identidade e uso indevido de TLS contra o serviço PostgreSQL local; o último run também mostrou que a base E2E configurada estava sem `platform_audit_events.actor_admin_user_id`. Essa base continha cinco platform admins, cinco grants e cinco eventos de auditoria legados, ligados por `actor_user_id`; a migration de isolamento de identidades bloqueia deliberadamente esse estado. Os registros foram preservados e foi criado o banco limpo `polaris_e2e_ci` no branch E2E validado; recebeu as 42 migrations versionadas e os grants/default privileges do role runtime. Os secrets E2E do GitHub e o `E2E_DATABASE_URL` local apontam agora para essa base. Web E2E passou 9/9 e Admin E2E 4/4 localmente; `bun run verify:quick` passou com 12 typechecks e 11 tarefas. O harness agora cobre TLS local/remote, remove overrides SSL da URL antes do Pool, usa fixtures owner válidas, inclui `dateCreated` na fixture Asaas e valida a coluna de auditoria no preflight; revisão independente não encontrou outros problemas. P22 segue em andamento até a CI do commit atualizado passar integralmente, incluindo `postgres-behavior` em PostgreSQL 18.6.
- **P20 — perfis `verify:quick`/`verify`:** implementado no commit `b0f52d7` (`feat(tooling): add workspace verification profiles`) em `codex/foundation-hook`. O runtime local foi atualizado para Bun `1.4.2`, alinhado ao `packageManager` e aos pins da CI. `verify:quick` passou; execução forçada dos gates Turbo em Bun `1.4.2` também passou. Knip, `env:check`, auditorias e builds Web/Admin passaram durante a validação P20. **Ressalva:** o perfil `verify` não executou os testes PostgreSQL reais porque `POSTGRES_BEHAVIOR_DATABASE_URL` não está configurada; o guard recusa a execução sem uma URL loopback distinta de `DATABASE_URL`.
- **P21 — cobertura do hook `pre-push`:** implementado no commit `46f5c21` (`ci(hooks): run workspace verification before push`). `lefthook.yml` agora chama `bun run verify:quick` uma vez; Lefthook foi sincronizado e `check-install` passou. `lefthook run pre-push` passou em 3,2 s com cache aquecido; o limite sem cache medido antes foi 47,5 s.
- **P54 — major PostgreSQL da CI:** implementado no commit `8250195` (`ci(db): align behavior tests with PostgreSQL 18.6`). O serviço `postgres-behavior` agora usa `postgres:18.6`; a asserção do workflow passou (18/18) e o `pre-push` passou (557 testes aprovados, 1 teste PostgreSQL ignorado). O job real da CI ainda não foi executado contra a imagem 18.6 porque não houve push.
- **P23 — separar CI de operações:** implementado localmente no commit `ee56f23` (`ci(operations): separate manual operations workflow`). `ci.yml` agora cobre somente push/PR; `operations.yml` exige uma escolha, recusa dispatch sem operação ou fora de `main`, e executa somente o job selecionado. Os seis jobs foram movidos; preflight/RLS/smokes usam valores vazios e falham antes de acessar recursos, enquanto os checklists continuam usando `vars`. `env:check`, 19 testes focais, Ultracite e `verify:quick` passaram (12 typechecks, 557 testes aprovados, 1 PostgreSQL ignorado). Os scripts de preflight/RLS/smoke também foram executados com valores vazios e falharam antes de conectar/chamar endpoints. **Pendente:** push/CI remoto e configuração do Environment/ref policy; production secrets não foram adicionados, conforme a sequência P23/P24.

**Ordem curta de trabalho:** (1) recuperar baseline, hook e perfis de verificação; alinhar PG18 e dependências estáveis (P2/P20–22/P34/P52/P54/P61); (2) separar/endurecer CI e operações, medir, transferir o repo e proteger `main` após checks verdes (P3/P23–27/P61–64); (3) em paralelo, reconciliar contrato de ambiente, documentação, fronteiras de código e semântica temporal (P5/P7–18/P35–42/P58–59/P63); (4) comprovar Gate A antes de features amplas (P69/P70); (5) provisionar Staging, recuperação, migração e release por SHA, fechando Gate B antes de dados reais/go-live (P4/P43–49/P65/P70). Otimizações de cache, SAST, snapshots visuais e Graphify seguem seus critérios de medição; Blacksmith não é aplicável ao ownership aprovado.

## Decisões revisadas

### Ponto 1 — diagnóstico geral

**Estado:** aceito com correções em 2026-09-24.

**Diagnóstico de trabalho:** o Polaris tem uma base técnica estruturada. As lacunas verificadas estão principalmente na atualidade da documentação e na formalização do release dentro do repositório. As afirmações sobre configurações remotas de governança e certificação externa precisam ser separadas de evidências do checkout. A alegação específica de exceção no baseline de testes não foi confirmada.

**Evidências e ressalvas:**

- `package.json`, `apps/web`, `apps/admin`, os pacotes compartilhados e `.github/workflows/ci.yml` comprovam a estrutura e a existência de guardrails. A quantidade de testes versionados não prova, isoladamente, qualidade nem aprovação atual.
- `docs/README.md`, `docs/documentation-coverage.md` e `README.md` referenciam `886eda0`, enquanto `main` local e remoto está em `5f3f91a4ca47d7105a2cfc84ae63d12f3eb1912e` (2026-07-16), que contém alterações posteriores. A lacuna de atualização documental é verificável.
- O repositório contém um workflow versionado de CI com jobs operacionais manuais. Não foi encontrado workflow de promoção/release no checkout; isso não determina sozinho se existem configurações externas na Vercel.
- A afirmação do relatório de que `main` está sem proteção foi confirmada em 2026-09-24: a API de branches retorna `protected: false` para `main`. As APIs de detalhes de branch protection e rulesets respondem que o repositório privado precisa do plano GitHub Pro ou ser público para habilitar esse recurso. O branch está desprotegido; os detalhes de checks obrigatórios não estão disponíveis no plano atual.
- Não foi encontrada evidência versionada para exceções em testes ou uso de `--no-verify`. A consulta aos runs remotos mostra que o último CI no `main` (2026-07-16) falhou em `Typecheck`; os jobs dependentes de E2E/PostgreSQL foram ignorados. Isso comprova um baseline CI vermelho naquela execução, não uma exceção autorizada de teste. O baseline de advisories tinha revisão prevista para 2026-08-14; não executei o CI novamente.
- A ausência de evidência local de certificação não prova que as integrações externas estejam incompletas. O estado operacional externo permanece desconhecido.
- A comparação com o Hub procede quanto à existência remota de regras protegendo `main` e `staging`, além de regras de PR e release no workflow. O Hub também tem ressalvas atuais: o SHA de `staging` auditado não apresentava o check `CI` requerido pelo fluxo de promoção, e as políticas remotas dos Environments divergiam do documento de release.

**Pesquisa de apoio:** [pesquisa do ponto 1 sobre governança e release](research-ponto-01-governanca-release.md).

## Registro dos demais pontos

### Ponto 2 — decisões de stack a preservar

**Estado:** aceito em 2026-09-24, com escopo definido.

**Direção aprovada:** aproveitar a fase de teste e fundação para atualizar as tecnologias atuais para releases estáveis recentes, incluindo majors estáveis. RCs, betas e canaries ficam fora da base principal. Substituições de tecnologia ou fornecedor podem ser propostas quando a comparação mostrar trade-offs positivos para o Polaris; não são uma troca automática só por existir uma alternativa mais nova.

**Critério de execução a detalhar no plano final:** separar migrações por camada e validar cada etapa antes da seguinte, para localizar regressões. Reavaliar versões e advisories no momento da implementação.

**Execução parcial em 2026-09-27:** além do batch de Next.js e `@next/env` em `16.3.6`, com as declarações de Next alinhadas em `packages/auth`, `packages/platform-auth` e `packages/ui`, foi atualizado o `sharp` direto para `0.35.4` e removida a cópia aninhada duplicada do Next no lockfile. O uso TypeScript passou a importar o tipo `Metadata` exportado pelo pacote. Também foi avançado o override de `fast-uri` de `3.1.2` para `3.1.8`, último patch v3 compatível com o intervalo do `ajv`. No quarto batch, o PostCSS direto da raiz passou a `8.5.28`, seu override global foi removido e o lockfile preservou `8.5.23` nas resoluções próprias de Next e Vite; NanoID passou a `3.3.19` e Browserslist a `4.29.1`. No quinto batch, `undici` transitivo de `jsdom` passou de `7.28.0` a `7.30.0`. No sexto batch, `brace-expansion` foi separado por faixa declarada: `5.0.12` para `minimatch@10` e `2.1.7` para `minimatch@9`, evitando forçar a major 5 sobre o consumidor que pede a major 2. A resolução aninhada requer Bun `1.4.2`, que foi alinhado no `packageManager` e nos dez passos Bun da CI; Turborepo foi atualizado a `2.11.4` para remover o aviso de parsing de lockfile v3. No sétimo batch, `smol-toml` transitivo de Knip foi atualizado a `1.9.0`, `@babel/core` transitivo de Sentry a `7.29.7` e Vitest a `4.1.11` na raiz e em `packages/ui`; a versão vulnerável de `@vitest/mocker` foi eliminada pelo alinhamento do conjunto Vitest. No oitavo batch, Drizzle Kit passou de `0.31.10` para `0.31.11` nas duas declarações diretas, `tsx` transitivo passou a `4.23.15` e `@esbuild-kit/core-utils@^3.3.2` recebeu override local de `esbuild@0.25.12`; a cadeia `tsx` resolve `esbuild@0.28.2`. O override cruza a faixa declarada `~0.18.20` pelo pacote legado, então o config real e `drizzle-kit generate` foram exercitados com saída em pasta temporária: 42 tabelas lidas, três artefatos gerados, nenhuma conexão ao banco e nenhum arquivo de migration alterado. `@esbuild-kit` continua sendo dependência deprecated do Drizzle Kit upstream; a resolução é local, escopada e deve ser revista quando houver release estável que remova esse loader. A baseline de advisory agora tem lista vazia e sem `reviewBy`; o checker exige data válida/futura apenas enquanto há advisories aceitos, e mantém todo advisory atual como novo quando a lista está vazia. `bun install --frozen-lockfile`, `bun audit`, `bun run audit:baseline`, `bun run test:all` (11 tarefas; Web: 548 passaram/1 foi pulado; Admin: 39 passaram; 10 testes dependentes de PostgreSQL foram pulados), `bun run typecheck:all` (12 tarefas) e teste focal do baseline (8/8) passaram. A validação local usou Bun `1.4.0`, enquanto `packageManager` e CI estão em `1.4.2`; a CI remota não foi executada. P22 ainda requer os testes PostgreSQL/E2E e a CI remota; esta nota não declara P22 concluído.

**Pesquisa de apoio:** [pesquisa do ponto 2 sobre versões e migração da stack](research-ponto-02-stack.md).

### Ponto 3 — proteger `main`

**Estado:** aprovado em 2026-09-24. A implementação remota ainda não foi executada.

**Evidência inicial:** em 2026-09-24, `gh api repos/juniordinizm/polaris-erp/branches/main` retornou `protected: false`; a API de configurações de proteção respondeu que é necessário GitHub Pro ou tornar o repositório público. O CI versionado separa os checks de PR (`verify`, `e2e`, `postgres-behavior`, `admin-e2e`) dos jobs operacionais manuais. A última execução remota consultada, em 2026-07-16, falhou em `verify` no passo `Typecheck`, e os jobs dependentes foram ignorados. Portanto, a lista final de checks obrigatórios depende de resolver o baseline e conferir os contextos estáveis.

**Decisão aprovada pelo usuário:** manter GitHub e transferir o repositório privado para a conta pessoal GitHub Pro do irmão. O irmão ficará como owner/admin e responsável por manter o Pro e as configurações; o usuário ficará como colaborador com write e trabalhará por branches/PRs. A transferência ainda depende da aceitação do irmão na conta destino.

**Política de branch aprovada:** exigir PR para `main`; bloquear push direto, force-push e deleção; exigir os checks de CI selecionados depois de restaurar o CI verde. Não exigir aprovação humana porque o usuário é o único revisor. Conversas resolvidas ficam opcionais no início. Aplicar a proteção também ao owner/admin quando a configuração escolhida permitir, pois a regra clássica do GitHub isenta admins por padrão; conferir o estado efetivo após configurar. Bypass administrativo não será usado como rotina. [GitHub — protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

**Ordem para implementação:** (1) corrigir/restaurar o baseline de CI; (2) transferir o repo e confirmar que branches, PRs, secrets e webhooks foram preservados; (3) irmão aceitar o convite do proprietário anterior como colaborador, caso necessário; (4) owner configurar proteção de `main`, sem aprovação requerida; (5) executar um PR de verificação e confirmar que pushes diretos ficam bloqueados e checks são exigidos; (6) reconectar/configurar Vercel quando a hospedagem for criada após a fundação.

**Clarificação operacional:** Polaris ainda não está publicado nem conectado à Vercel; não há deploy atual para preservar. A conexão Vercel pode ser criada depois da fundação pelo proprietário GitHub do repo.

**Pesquisa de apoio:** [pesquisa do ponto 3 sobre proteger `main`](research-ponto-03-protecao-main.md).

### Ponto 4 — branch `staging`

**Estado:** aceito em 2026-09-24, com acompanhamento futuro.

**Evidência local:** o remoto Polaris tem apenas `main`; a CI roda em push/PR para `main`, com testes PostgreSQL/RLS e E2E separados para web/admin. O runbook descreve branches Neon preview/dev/E2E, mas não comprova ambientes ou deploys ativos. O usuário informou que Vercel ainda não está conectada e poderá ser configurada depois da fundação.

**Comparação com Hub:** Hub usa uma branch persistente `staging`, um ambiente Vercel persistente e promoção de SHA para `main`; não usa Vercel PR Previews nem branches Neon por PR. É um modelo válido, mas mais específico que a abstração do relatório.

**Recomendação preliminar:** manter PRs curtos para `main` protegida e CI. Quando Vercel/Neon forem configuradas, decidir se Preview por PR e banco isolado atendem aos fluxos ou se webhooks/OAuth/aceite integrado precisam de uma URL persistente. Se necessário, a estratégia de branch depende do plano Vercel: branch duradoura `staging` pode gerar Preview com URL/variáveis de branch; Custom Environment persistente requer Vercel Pro/Enterprise e pode acompanhar uma branch sem tornar o ambiente e a linha Git o mesmo conceito.

**Decisões do usuário:** não criar uma branch Git `staging` como requisito inicial; usar PRs curtos para `main` e observar a necessidade conforme o projeto avança. Criar/configurar uma homologação persistente antes do go-live, escolhendo hospedagem, callbacks, variáveis e branches de banco quando essa configuração for desenhada.

**Pesquisa de apoio:** [pesquisa do ponto 4 sobre `staging`, ambientes e previews](research-ponto-04-staging.md).

### Ponto 5 — contrato dos ambientes

**Estado:** aceito em 2026-09-24, com quatro ambientes canônicos.

**Evidência local:**

- `verify` usa placeholders para builds/checks; `postgres-behavior` usa PostgreSQL 16 efêmero para aplicar migrations e validar RLS/constraints; E2E web/admin usam `E2E_DATABASE_URL` e `ADMIN_E2E_DATABASE_URL` vindos de secrets, então nem toda CI usa DB efêmero.
- Preview por PR e homologação Vercel não estão provisionados. O usuário confirmou que Vercel ainda não está conectada.
- Testes unitários de Asaas/Woovi usam `fetch` falso; não comprovam acesso a sandboxes remotos. A certificação real de providers é manual.
- A auditoria observou que `.env.example` aponta endpoints Asaas/Woovi para hosts de produção por padrão, embora o relatório classifique Local como sandbox/dev. As credenciais de exemplo estão vazias; não li `.env.local` e preservei a modificação de `.env.example` que já existia. O contrato local “sandbox/dev” não é atualmente garantido apenas pelo valor de host de exemplo.
- `.env.example` rotula `E2E_DATABASE_URL` como opcional, enquanto o helper de E2E exige esse valor. Isso é inconsistência documental/configuração a considerar na consolidação dos ambientes.

**Referência do Hub:** seu runbook descreve Development, E2E, Staging e Production; Preview aparece como candidato efêmero separado. O Hub mistura alguns providers compartilhados/sandbox no staging por exceções documentadas. O modelo deve ser ajustado ao Polaris, sem copiar essas exceções.

**Recomendação preliminar:** formalizar Local, CI, Staging e Produção como os quatro contratos. CI deve distinguir builds/unit com fakes, PostgreSQL efêmero para migrations/RLS e E2E contra uma base não produtiva isolada. Preview será um deploy efêmero ligado a PR/SHA, usando Neon isolada quando habilitado; não será um quinto ambiente canônico. Staging será persistente antes do go-live e não compartilhará DB mutável com Preview; Produção usará credenciais live isoladas, Neon protegida e roles runtime/migration separadas. Distinguir ambiente implantado, SHA do código e branch Neon; não exigir branch Git `staging`.

**Decisões do usuário:** simplificar para quatro ambientes como no Hub: **Local, CI, Staging e Produção**. Staging é a homologação persistente aprovada antes do go-live. PR Preview fica como modalidade de deploy efêmero no fluxo não produtivo, não como quinto ambiente canônico. Fora de Produção, usar dados sintéticos e providers fake/sandbox. Manter por enquanto as URLs E2E dedicadas e não produtivas; criar Neon branches descartáveis por PR quando Preview for configurado.

**Correções planejadas para a consolidação documental/configuração:** separar a explicação do CI entre placeholders/fakes, PostgreSQL efêmero para comportamento/migrations e bancos isolados para E2E; alinhar `.env.example` para não sugerir endpoints live em Local e marcar `E2E_DATABASE_URL` conforme sua obrigatoriedade. O `.env.example` já estava modificado e foi preservado nesta revisão.

**Pesquisa de apoio:** [pesquisa do ponto 5 sobre o contrato dos ambientes](research-ponto-05-environments.md).

### Ponto 6 — nomes dos buckets R2

**Estado:** aceito em 2026-09-24, condicionado a inventário Cloudflare antes de migração física.

**Evidência local:** `R2_BUCKET_STAGING` recebe uploads brutos pré-assinados sob o prefixo `staging/{organizationId}/{userId}/{uuid}`. O servidor valida, processa e grava WebP finais em `R2_BUCKET_FINAL`, depois tenta apagar o upload. Portanto, `STAGING` indica fase temporária da imagem, não o ambiente Vercel/Neon. `.env.example` e a documentação chamam o destino final de imagens processadas/variantes privadas.

**Risco/escopo:** renomear somente env keys é mudança contratual local (código, schema de env, preflight, CI, Turbo, testes e docs) e não move objetos. Substituir bucket físico exige confirmar inventário externo, configurar CORS/lifecycle e copiar dados se existentes. Mudar o object-key prefix também exige compatibilidade/migração das keys; não está persistido em DB para imagens finais, mas pode haver uploads temporários em trânsito. O estado real dos buckets R2 não foi verificado.

**Achado adjacente a reconciliar antes de qualquer migração física:** a documentação afirma que o reconcile diário apaga imagens órfãs, enquanto `image-reconcile.ts` atualmente retorna `deletedCount: 0` e conta as órfãs. Não assumir que a reconciliação limpará dados durante cutover sem resolver essa divergência.

**Recomendação preliminar:** usar nomes de variável por função (`R2_BUCKET_RAW_UPLOADS`, `R2_BUCKET_PROCESSED_IMAGES`) e nomes de recursos físicos por produto/função/ambiente. Só provisionar buckets físicos novos após inventário; se já existirem, preferir renomear apenas o contrato lógico, salvo benefício que justifique cópia planejada. Alterar o prefixo `staging/` para `uploads/` apenas depois de confirmar ausência de objetos em trânsito ou incluir período compatível/expiração.

**Decisões do usuário:** aprovou as variáveis `R2_BUCKET_RAW_UPLOADS` e `R2_BUCKET_PROCESSED_IMAGES`; aprovou usar `uploads/` para novas chaves temporárias e nomes físicos por produto, função e ambiente. Antes de trocar buckets físicos ou apagar dados, inventariar recursos/objetos e planejar copy/cutover; se já houver buckets, manter os nomes físicos até esse plano.

**Risco adjacente:** reconciliador atual não apaga órfãs apesar de a documentação afirmar isso; corrigir/verificar antes de depender dele para limpeza de bucket ou cutover.

**Pesquisa de apoio:** [pesquisa do ponto 6 sobre nomes/lifecycle R2](research-ponto-06-r2-naming.md).

### Ponto 7 — documentação canônica

**Estado:** aceito em 2026-09-24, adaptado à estrutura existente.

**Evidência inicial:** Polaris já tem `docs/README.md` como índice, um `README.md` raiz que aponta para ele e mais de cem documentos distribuídos por arquitetura, módulos, regras de negócio, banco, API, operações, segurança e testes. A documentação não precisa começar de uma árvore nova. O índice e documentos centrais ainda declaram o SHA `886eda0`/verificação de 2026-07-14, enquanto o checkout está em `5f3f91a4`; `docs:check` valida links locais, não frescor nem autoridade. O README raiz e o índice têm ordens de leitura diferentes. `aidd_docs/memory/project-state.md` também tem afirmações datadas sobre Vercel que não representam o estado que o usuário acabou de informar.

**Recomendação preliminar:** preservar a taxonomia existente, manter `docs/README.md` como mapa documental único e fazer o README raiz encaminhar ao mapa sem duplicar ordem de leitura. Definir uma hierarquia curta por tipo de afirmação: código/schema/migrations/testes para comportamento implementado; decisões aprovadas para intenção de produto/arquitetura; configuração remota consultada com data para estado de provedores; planos, auditorias e relatórios datados como proposta/snapshot até promoção explícita. Atualizar primeiro o SHA/data e classificar o material existente; mover diretórios somente se duplicidade ou navegação difícil forem demonstradas. Metadados/checks de freshness ficam para os pontos 12–13.

**Comparação com Hub:** o Hub fornece exemplos de índice, autoridade e classificação de histórico, mas seu checker de docs tem mais regras e também não detecta conteúdo semanticamente defasado. A cópia deve ser conceitual e menor.

**Decisões do usuário:** preservar as categorias atuais de `docs/`; manter `docs/README.md` como único mapa documental e `README.md` como entrada curta que aponta para ele. Adotar a hierarquia de autoridade por tipo de afirmação descrita acima; não duplicar informação ou reorganizar pastas sem evidência de dificuldade de navegação.

**Pesquisa de apoio:** [pesquisa do ponto 7 sobre documentação canônica](research-ponto-07-canonical-docs.md).

### Ponto 8 — `CONTEXT.md` como glossário do domínio

**Estado:** aceito em 2026-09-24, com escopo e autoridade definidos.

**Evidência:** o Polaris tinha dois glossários com escopos/hierarquias confusos: `docs/glossary.md` documenta termos técnicos observados no código e contém roles desatualizadas; `docs/business-rules/glossary.md` já reúne termos de negócio, mas seu título “normativo” conflita com o README da área de descoberta, que classifica esses documentos como não normativos. O glossário de negócio também não aparece no índice `normative/`. O Hub usa um `CONTEXT.md` raiz canônico, referenciado no índice e em `AGENTS.md`; seu vocabulário é de outro produto e não deve ser copiado.

**Direção aprovada:** manter um `CONTEXT.md` na raiz como fonte canônica do vocabulário de produto/domínio, sem transformá-lo em resumo geral, instrução de agente, especificação ou cópia de regras. Usar termos em português e apontar identificadores em inglês quando ajudarem a localizar o código. “Organização” é o conceito interno; `tenant` fica reservado ao mecanismo técnico de isolamento; `workspace` não será usado como sinônimo de Organização. Você valida a linguagem do produto. Termos legais, fiscais, contábeis ou regulatórios ficam pendentes até validação apropriada.

**Estrutura documental a implementar após o plano dos 70 pontos:** `CONTEXT.md` substitui o conteúdo de vocabulário de negócio duplicado; `docs/business-rules/glossary.md` passa a apontar para essa fonte; `docs/glossary.md` continua técnico/arquitetural e deve ter seu escopo e divergências corrigidos. `docs/README.md` indexa o arquivo canônico; `AGENTS.md` instrui agentes a consultá-lo em tarefas que dependam da linguagem de domínio. As regras em `docs/business-rules/normative/` continuam autoridade para comportamento. Só adicionar termos depois de validar seu significado; exemplos como “Vendedor” e sua relação com owner/pagador de taxa permanecem pendentes.

**Pesquisa de apoio:** [pesquisa do ponto 8 sobre vocabulário de domínio](research-ponto-08-contexto-glossario.md).

### Ponto 9 — ampliar `PRODUCT.md`

**Estado:** aceito em 2026-09-24, com direção de produto e limites documentais definidos.

**Evidência:** `PRODUCT.md` já declara público geral (pequenos vendedores/revendedores locais), substituição de planilhas, gestão de vendas/estoque e princípios de experiência. O usuário confirmou que o público e o problema foram validados; os artefatos dessa validação não foram localizados neste review. Regras normativas já definem a fronteira do lançamento (`SCOPE-001`), papéis, billing, invariantes e comportamento. `docs/product/01-regras-de-negocio.md` e `docs/product/roadmap.md` ainda contêm descrições anteriores sobre autenticação, roles e billing; precisam ser reconciliados, não reproduzidos em `PRODUCT.md`.

**Direção aprovada:** confiabilidade de estoque e vendas é requisito básico; rapidez e facilidade em relação às planilhas são o principal benefício; análises de margem/desempenho são resultado posterior. Os limites propostos no relatório (marketplace público, ERP fiscal completo, operação pública multivendedor) devem ser tratados apenas como fora do lançamento atual, não como proibições permanentes. `PRODUCT.md` será um brief estratégico conciso com problema/público, resultado prioritário, jornadas macro, limites do lançamento, critérios/sinais de sucesso e links para as fontes canônicas. Não deve duplicar glossário, invariantes, estados de billing, schema, critérios detalhados de aceite ou arquitetura. Sinais numéricos ficam para quando houver métrica apropriada e baseline.

**Trabalho correlato para a execução consolidada:** reconciliar `docs/product/01-regras-de-negocio.md` e `docs/product/roadmap.md` com as regras normativas aprovadas; registrar a fonte da validação de público/problema no brief ou em pesquisa de produto, caso disponível.

**Pesquisa de apoio:** [pesquisa do ponto 9 sobre o contrato de produto](research-ponto-09-product-contract.md).

### Ponto 10 — sistema explícito de regras de domínio

**Estado:** aceito em 2026-09-24, com reutilização dos IDs canônicos e separação do snapshot de descoberta.

**Evidência:** Polaris já possui IDs normativos por domínio em `docs/business-rules/normative/approved-rules.md`, decisões `DEC-BR-001` a `DEC-BR-085` e perfis/matrizes de aderência. O relatório não percebe esse sistema e propõe `REG-*`, uma família redundante. A lacuna está nos IDs provisórios de `rules-inventory.md`, reutilizados para significados AS-IS diferentes dos IDs normativos. A matriz de cobertura existe, mas não aponta sistematicamente para caminhos de código e casos de teste concretos. `docs:check` verifica links, não unicidade ou rastreabilidade de IDs; fontes/testes em `apps/` e `packages/` não incluem referências explícitas aos IDs.

**Direção aprovada:** manter os IDs atuais de regras (`AUTH-001`, `ORG-001`, `STOCK-001` etc.) e `DEC-BR-NNN` para decisões; não criar `REG-*` paralelo. Não renumerar/reutilizar IDs: conservar o ID quando o significado continua o mesmo; quando a obrigação/escopo mudar materialmente, criar sucessor e marcar o anterior como substituído. A matriz deve ligar cada regra a caminhos/símbolos de código e testes concretos. Mudanças comportamentais devem referenciar os IDs afetados nos artefatos de revisão; não exigir que cada comentário de código/teste repita o ID.

**Decisão sobre descoberta:** manter `rules-inventory.md` como snapshot histórico AS-IS, não como catálogo ativo de regras. A escolha se baseia em seus links atuais: ele apoia descoberta e auditorias datadas, enquanto `approved-rules.md`, perfis individuais e matriz de aderência são as fontes normativas e atuais. Remover o inventário da navegação de regras ativas; preservar o snapshot e referências provenientes de auditorias históricas com rótulo explícito. Seus IDs permanecem locais ao snapshot, não canônicos; não criar `OBS-*` para esse material arquivado.

**Estrutura documental a implementar após o plano dos 70 pontos:** explicitar em `normative/README.md` a separação entre regras vigentes, registro de decisões e evidência histórica; revisar a indicação de status/caminhos em `decision-register.md` e `governance.md`; marcar o inventário de descoberta como snapshot histórico e ajustar links; detalhar evidências concretas na matriz; avaliar um check leve para IDs únicos, referências existentes e supersession válido. A governança ampla só será promovida depois de reconciliar o documento que hoje está marcado como proposta.

**Pesquisa de apoio:** [pesquisa do ponto 10 sobre IDs e rastreabilidade](research-ponto-10-domain-rule-ids.md).

### Ponto 11 — registros de decisão arquitetural (ADR)

**Estado:** aceito em 2026-09-24, com convenção e backfill seletivo aprovados.

**Evidência preliminar:** o Polaris não possui ADRs no checkout. `docs/business-rules/decision-register.md` registra decisões de produto/domínio, enquanto `docs/architecture/*` descreve principalmente estado e limites técnicos, sem capturar sistematicamente contexto, alternativas, rationale e consequências. O Hub tem 17 ADRs, mas seu snapshot apresenta defasagem, uma duplicação no índice e variação de formato; copiar quantidade/template sem avaliar esses custos seria inadequado.

**Recomendação preliminar:** adotar ADRs leves apenas para escolhas técnicas significativas, separadas de `DEC-BR` e regras normativas. Registrar em um diretório indexado no `docs/README.md`, com contexto, decisão, alternativas reais, consequências, estado/data e links de implementação. Não reconstruir rationale inexistente. Três candidatos fortes são: fronteira RLS/autorização tenant-plataforma, outbox transacional e adaptadores de billing; Neon e escolha do fornecedor R2 devem esperar a análise de stack do P2; monorepo e `@polaris/date` não qualificam sem evidência adicional de trade-off relevante.

**Decisão aprovada:** usar `docs/adr/` para ADRs técnicas significativas, concisas e distintas das decisões de produto/negócio `DEC-BR`. Uma ADR registrará contexto, escolha, alternativas reais, consequências, status/data e links de evidência; decisões substituídas serão ligadas à sucessora. Backfill não deve inventar rationale histórica.

**Backfill aprovado para a execução consolidada:** (1) fronteira de segurança RLS/autorização tenant-plataforma; (2) outbox transacional para eventos externos; (3) adaptadores de billing com estado normalizado. Usar apenas rationale confirmado por documentação/código ou pelo usuário; se a motivação histórica exata não estiver provada, declarar essa lacuna ou registrar uma decisão presente com data atual. Adiar ADR de seleção de Neon/R2 até a revisão de stack do P2; não criar ADR agora para o monorepo ou `@polaris/date` sem nova evidência de trade-off relevante.

**Pesquisa de apoio:** [pesquisa do ponto 11 sobre ADRs](research-ponto-11-adrs.md).

### Ponto 12 — freshness da documentação

**Estado:** aceito em 2026-09-24, com metadados seletivos e aviso não bloqueante.

**Evidência preliminar:** `README.md`, `docs/README.md`, `docs/documentation-coverage.md` e vários guias de arquitetura, banco, módulos e segurança ainda registram o snapshot `886eda0`, verificado em 2026-07-14. O checkout `main` está em `5f3f91a4ca47`, 39 commits adiante e inclui mudanças posteriores, como a fundação temporal. O `docs:check` passa, mas só valida links Markdown locais; isso não é prova de frescor semântico. O Hub também registra `last_verified_commit`, mas seu checker só verifica se aquele SHA existe, não se a documentação foi revista contra o `HEAD`.

**Direção aprovada:** usar SHA/data no índice de cobertura para identificar o snapshot da auditoria, não como selo global de que cada página está atual. Atualizar docs junto à mudança quando ela alterar comportamento documentado. Aplicar owner/data/fontes mapeadas somente a páginas canônicas e de maior risco (segurança, banco, release/integrações e contratos de produto); históricos e ADRs devem permanecer snapshots identificados pela data/status original. Mudança nos caminhos-fonte mapeados gera aviso e revisão direcionada no PR, sem bloqueio universal por avanço de SHA.

**Decisão aprovada:** metadados de owner, última verificação e fontes mapeadas serão seletivos, para páginas canônicas de maior risco; históricos e ADRs preservam data/status próprios. Mudanças em fontes mapeadas geram aviso e revisão direcionada no PR, sem bloqueio universal por freshness. O SHA global continua identificando auditorias de cobertura, não certificando freshness de todas as páginas.

**Pesquisa de apoio:** [pesquisa do ponto 12 sobre freshness docs-as-code](research-ponto-12-doc-freshness.md).

### Ponto 13 — ampliar `docs:check`

**Estado:** aceito em 2026-09-24, com falhas estruturais bloqueadoras e freshness separada.

**Evidência preliminar:** `docs:check` executa somente `scripts/check-markdown-links.ts`. O script verifica arquivos locais citados em links Markdown inline dentro de `README.md` e `docs/**/*.md`; ignora fragmentos/anchors, URLs externas, frontmatter, freshness e IDs/referências. Não cobre `PRODUCT.md`, `DESIGN.md`, `AGENTS.md`, o futuro `CONTEXT.md` nem `plans/`. O `check-docs.ts` do Hub faz mais, mas ainda aceita SHAs antigos por apenas verificar que existem e mantém uma lista manual grande de documentos canônicos.

**Direção aprovada:** manter `docs:check` rápido, offline e bloqueador para integridade estrutural determinística: links e âncoras locais, metadados nas páginas críticas selecionadas e referências/IDs quando adotados. Incluir os documentos canônicos da raiz e `docs/`, não todos os snapshots e planos históricos. Freshness de fontes mapeadas e disponibilidade de URLs externas serão avisos em lanes separadas, sem falha universal de CI; snippets executáveis podem ser uma etapa posterior. Planos e snapshots históricos não receberão metadados atuais por padrão.

**Pesquisa de apoio:** [pesquisa do ponto 13 sobre validação docs-as-code](research-ponto-13-docs-check.md).

### Ponto 14 — autoridade de `aidd_docs/`

**Estado:** aceito em 2026-09-24, mantendo os snapshots no local atual.

**Evidência preliminar:** `AGENTS.md` diz que docs, memória, specs e planos vivem em `aidd_docs/` e, com o bloco de memória vazio, manda ler todo `aidd_docs/memory/`. Há apenas `project-state.md` nessa memória, revisto em 2026-07-13; ele afirma que o projeto admin da Vercel está ativo, contradizendo a informação atual do usuário de que Polaris ainda não foi conectado/publicado na Vercel. `production-closed-test.md` e `codebase-deep-review-2026-07-13.md` também são snapshots de julho. Enquanto isso, as fontes atuais de produto, design, regras, guias e planos estão em `README.md`, `PRODUCT.md`, `DESIGN.md`, `docs/` e `plans/`; o usuário aprovou `docs/README.md` como mapa canônico único.

**Recomendação preliminar:** corrigir `AGENTS.md` para encaminhar ao `docs/README.md` e carregar apenas os documentos canônicos relevantes à tarefa; remover a leitura obrigatória de toda `aidd_docs/memory/`. Preservar `aidd_docs/` como histórico/contexto auxiliar, consultado sob demanda e sempre revalidado, sem migração ou exclusão em massa. Reconciliar o `project-state.md` obsoleto na execução consolidada.

**Direção aprovada:** `docs/README.md` é o mapa canônico; `AGENTS.md` deve apontar para ele e carregar guias conforme o tipo de tarefa. Remover a afirmação de que specs/planos atuais vivem em `aidd_docs/` e o carregamento automático de toda a memória. Preservar `aidd_docs/` no lugar, como histórico/contexto auxiliar sob demanda, revalidando afirmações atuais contra código, docs ou estado externo. Reconciliar/identificar o snapshot de julho sem migração em massa.

**Pesquisa de apoio:** [pesquisa do ponto 14 sobre autoridade e memória de agentes](research-ponto-14-aidd-docs-authority.md).

### Ponto 15 — instruções do agente e manutenção da documentação

**Estado:** aceito em 2026-09-24; a implementação será consolidada com P14 e P7.

**Evidência:** `docs/maintenance.md` já exige atualizar documentação no mesmo PR quando uma mudança afeta comportamento, contrato, dados, autorização, operação ou risco, e fornece uma matriz/checklist detalhados. O `AGENTS.md` já contém regras gerais de evidência e verificação, mas sua seção documental ainda aponta para `aidd_docs/`; após P14, precisa encaminhar a `docs/README.md` e, para mudanças documentais, a `docs/maintenance.md`. O `docs/README.md` menciona manutenção na descrição de cobertura, mas não tem link para o guia. O Hub adota ponteiro ao índice e regra de atualização, porém o snapshot local também tem deriva entre README/índice; sua estrutura não deve ser copiada literalmente.

**Recomendação preliminar:** aproveitar a regra que já existe em `docs/maintenance.md`, sem duplicar sua matriz no `AGENTS.md`. Acrescentar no AGENTS um ponteiro por tarefa ao `docs/README.md` e um ponteiro condicional ao guia de manutenção, com lembrete conciso de atualizar fonte canônica no mesmo PR quando contrato/comportamento documentado mudar. Incluir `docs/maintenance.md` no mapa `docs/README.md`. Rever na execução os gatilhos relacionados ao glossário à luz de P8; a regra detalhada permanece no guia de manutenção.

**Direção aprovada:** adicionar no `AGENTS.md` ponteiros concisos ao índice canônico e ao guia de manutenção; atualizar o índice para listar `docs/maintenance.md`. Manter o lembrete de atualizar fontes canônicas no mesmo PR quando a semântica/contrato documentado mudar; conservar a matriz/checklist detalhada apenas em `docs/maintenance.md`.

**Pesquisa de apoio:** [pesquisa do ponto 15 sobre instruções de agente](research-ponto-15-agent-instructions.md).

### Ponto 16 — reduzir o `AGENTS.md` raiz

**Estado:** aceito em 2026-09-24, com revisão regra por regra e sem meta de linhas.

**Evidência preliminar:** `AGENTS.md` tem 246 linhas e é aplicável a todo trabalho no repositório. Inclui orientações para Solid/Svelte/Vue/Qwik apesar da stack Next/React, listas extensas de estilo que se sobrepõem em parte ao Ultracite/Biome, e regras de teste/verificação repetidas em mais de uma seção. Também contém instruções de alto valor persistente (evidência, preservação de trabalho, mudanças cirúrgicas, no-commit/push sem pedido, verificação) e o requisito de consultar docs Next versionadas antes de escrever Next.js. Porém `node_modules/next/dist/docs` não existe no checkout atual, então essa orientação precisa de fallback documental. O `package.json` distingue `bun x ultracite check` de `bun run check`/`check:all`, e `fix` pode alterar arquivos; esses escopos não devem ser misturados. O AGENTS do Hub tem 251 linhas, então não serve como prova de concisão nem alvo literal.

**Recomendação preliminar:** reduzir redundância, não buscar uma contagem fixa de linhas. Manter no root autoridade/prioridade documental, ponteiros (P14–P15), workflow e segurança operacional, critérios de verificação, regras que a ferramenta não impõe e instruções de framework realmente específicas. Remover orientações para linguagens não usadas; conferir cobertura do Ultracite antes de eliminar regras específicas; condensar listas TypeScript/React/testing/review genéricas em princípios de alto valor e delegar detalhes condicionais a docs especializadas. Preservar instrução Next com fallback para documentação oficial/Context7 quando os guias locais não existirem. Não criar ainda `AGENTS.md` aninhados: decidir necessidade/localidade no P17.

**Pesquisa de apoio:** [pesquisa do ponto 16 sobre escopo e tamanho de AGENTS.md](research-ponto-16-agents-md-size.md).

**Direção aprovada:** revisar o conteúdo regra por regra, manter instruções globais de alto valor, remover instruções de tecnologias não usadas e condensar somente as regras cuja cobertura pelo tooling tenha sido confirmada. Não estabelecer um limite fixo de linhas. A necessidade de instruções aninhadas será decidida no P17.

### Ponto 17 — instruções `AGENTS.md` locais

**Estado:** aceito em 2026-09-24; manter somente o `AGENTS.md` raiz nesta fase.

**Evidência preliminar:** não há arquivos `AGENTS.md` em `apps/` ou `packages/`; só o root. As apps compartilham Next/React e os guias por módulo/web/admin já descrevem contratos. `packages/events` tem operações especializadas de outbox/webhook, mas elas estão cobertas por `docs/api/webhooks.md` e `docs/operations/jobs-and-workflows.md`. `packages/db` concentra schema, migrations, RLS e comandos próprios `db:migrate`, `db:push` e `test:postgres`, sendo o candidato local mais forte. A documentação de migrations/ambientes cobre esses fluxos; o README proíbe db push/migrations contra produção, mas não há regra canônica sobre todos os ambientes persistentes.

**Pesquisa/recomendação preliminar:** Codex acumula arquivos de instrução do root até o diretório atual e permite orientação mais específica; outras ferramentas diferem em discovery/precedência, e alguns ambientes têm suporte aninhado opcional. Estudos empíricos sobre context files são mistos, então não criar arquivos por simetria. Minha recomendação é manter somente o root por enquanto e usar ponteiros condicionais às fontes canônicas existentes. `packages/db` é o candidato mais forte para revisão futura, mas os guias atuais já explicam migrations, RLS e ambientes; se for definida uma regra adicional para `db:push` em bancos persistentes, documentá-la primeiro como política canônica. Criar arquivo local apenas se houver uma regra específica de subtree que precise ser automaticamente carregada e não possa ser resolvida por um ponteiro curto.

**Pesquisa de apoio:** [pesquisa do ponto 17 sobre AGENTS aninhados](research-ponto-17-nested-agents.md).

**Decisão aprovada:** não criar arquivos `AGENTS.md` aninhados agora. O root manterá as regras globais e apontará a guias por tarefa. Reavaliar apenas se surgir evidência de uma regra durável e exclusiva de uma subárvore que não possa ser atendida por documentação canônica condicional. A política de `db:push` em bancos persistentes deve ser definida e documentada antes de qualquer AGENT local.

### Ponto 18 — fluxo de trabalho de IA

**Estado:** aceito em 2026-09-24; distinguir etapas universais de etapas condicionais por tipo de tarefa.

**Evidência preliminar:** `AGENTS.md` já manda consultar fonte antes de editar, provar bugs, fazer mudanças cirúrgicas, testar/verificar e reportar resultado; `docs/maintenance.md` já define quando atualizar docs, fontes e diff/CI. O CI roda verificação em PR/push para `main`, e preflight/deploy/homologação têm comandos/gates próprios. O script `verify:quick` citado por P18 não existe em `package.json` nem foi localizado no repo.

**Recomendação preliminar:** usar um ciclo comum conciso para mudanças de código: entender o resultado e o critério de aceite; consultar apenas regras, arquitetura, implementação e testes pertinentes; fazer uma mudança coerente e revisar o diff; verificar pelo sinal mais próximo e suficiente; relatar evidências e limites. Reproduzir/provar antes de corrigir apenas em bugfixes. Planejar antes de codificar quando requisitos ou abordagem estiverem incertos, ou a mudança for transversal, de alto impacto ou difícil de reverter; tamanho sozinho não é o gatilho. Em features maiores, esclarecer cenário, escopo e critérios de aceite antes da implementação. Atualizar documentação canônica no mesmo PR quando semântica/contrato mudar. PR e CI para mudanças destinadas à `main`; staging/preflight apenas para release ou validação dependente de ambiente. Não instituir uma lista de 13 passos universais. Usar scripts existentes; avaliar `verify:quick`/`verify` separadamente no P20.

**Achados adicionais:** “identificar invariantes” e revisar diff de código não estão explícitos como passos; PR já dispara CI no workflow. Staging/homologação não é etapa por PR e permanece etapa de release após configuração de hospedagem. O comando `verify:quick` não existe e não deve ser documentado como executável.

**Comparação com o Hub:** o Hub tem `verify:quick` e `verify` implementados como perfis nomeados em `scripts/verify.ts` e `src/tooling/verification-profiles.ts`; o perfil rápido executa verificação de migrations, typecheck, check e testes, enquanto o completo acrescenta docs, build e Knip. Isso melhora a descoberta dos comandos naquele repositório, mas os gates e custos precisam ser avaliados para o Polaris no P20 antes de copiar o contrato. O `AGENTS.md` do Hub também cobre inspeção, prova de bugs, verificação estreita e manutenção documental, além de regras específicas do próprio Hub, como consulta ao runbook CodeRabbit para alterações de código/configuração e higiene de worktrees; estas últimas não são requisitos universais de P18.

**Pesquisa de apoio:** [pesquisa do ponto 18 sobre workflow de coding agents](research-ponto-18-ai-workflow.md).

**Decisão aprovada:** adotar o fluxo adaptativo descrito acima como orientação para o futuro `AGENTS.md`. Planejamento depende de incerteza, impacto, transversalidade ou dificuldade de reversão; reprodução é específica de bugfix; os aliases de verificação ficam para o P20; PR/CI integram mudanças à `main`; homologação fica ligada a release ou validação dependente de ambiente.

### Ponto 19 — worktrees para tarefas com agentes

**Estado:** aceito em 2026-09-25; separar CI de operações manuais.

**Proposta do relatório:** padronizar `1 task = 1 branch = 1 worktree` para desenvolvimento paralelo com IA, a fim de reduzir interferência entre agentes, sujeira no working tree e conflitos de PR.

**Evidência no Polaris:** o checkout está em `main` e `git worktree list --porcelain` mostra apenas o worktree principal. O working tree contém `.env.example` modificado e os planos desta revisão não rastreados; um worktree Git padrão criado do commit não os levaria consigo. A criação gerenciada pelo app Codex pode aplicar alterações locais selecionadas, enquanto a ferramenta `create_worktree` usada nesta sessão declara que não copia alterações não commitadas; por isso o processo concreto precisa ser conferido. `.env.local` e dependências são ignorados pelo Git, então um worktree novo exige provisionar ambiente/dependências conscientemente. Não há política ou automação de worktrees no `AGENTS.md` nem no setup atual.

**Comparação com o Hub:** o `AGENTS.md` do Hub define higiene e remoção cautelosa de worktrees, branches e stashes, mas o fluxo diário documenta branch dedicada sem exigir worktree por tarefa. Há dois worktrees observados e ambos têm alterações locais; não devem ser tratados como descartáveis com base apenas em seu nome ou estado de tracking. Guias do Hub também deixam claro que trocar worktree/branch não troca o banco de desenvolvimento. A existência de instruções de limpeza, portanto, não valida uma regra universal de criação.

**Trade-offs pesquisados:** worktrees dão diretórios, índices e branches de trabalho separados e ajudam quando tarefas que editam código ocorrem em paralelo. Permanecem ligados ao mesmo repositório; não isolam automaticamente bancos, portas, provedores ou outros serviços externos. Dependências, artefatos e arquivos locais ignorados podem precisar de setup próprio; secrets não devem ser copiados sem avaliação. Worktrees por tarefas sequenciais, pequenas ou somente de leitura adicionam setup e limpeza sem o mesmo ganho. O suporte integrado em ferramentas de coding agents indica que é um mecanismo comum de isolamento para paralelismo, não uma exigência para toda tarefa.

**Recomendação preliminar:** manter a branch por mudança/PR conforme P3; usar worktree e branch separadas para cada fluxo independente de escrita de código que precisa avançar em paralelo. Não exigir worktree para análise somente de leitura nem trabalho pequeno e sequencial. Antes de criar, conferir `git status`, escolher o commit-base explicitamente e decidir como preservar mudanças locais relevantes; o comportamento de transportar alterações depende de como o worktree é criado, então não presumir que dados não commitados ou ignorados acompanharão. Provisionar dependências e configuração local conscientemente. Se tarefas iniciarem serviços ou usarem DB mutável, separar portas e dados por fluxo ou executá-las em sequência. Inspecionar alterações e estado da worktree antes de cleanup, sem remoção forçada ou presumida.

**Pesquisa de apoio:** [pesquisa do ponto 19 sobre branches e worktrees](research-ponto-19-worktrees.md).

**Decisão aprovada:** worktree é padrão para fluxos independentes de escrita de código executados em paralelo. Tarefas sequenciais usam o checkout da branch de mudança; leitura e pesquisa não exigem worktree. Antes de paralelizar, verificar o estado local e o método de criação, e isolar recursos mutáveis como bancos e portas ou serializar a execução.

### Ponto 20 — comandos canônicos de verificação

**Estado:** aceito em 2026-09-25.

**Proposta do relatório:** criar `bun run verify:quick` para o ciclo diário e `bun run verify` para verificação completa; avaliar execução de tarefas afetadas com Turborepo, mantendo gates completos para release.

**Evidência no Polaris:** não existem os aliases `verify:quick`/`verify` nem um runner de perfis. Os scripts raiz `check`, `typecheck` e `test` filtram somente `@polaris/web`; há versões `:admin` separadas. `typecheck:all` e `test:all` executam essas tarefas por todo o workspace, mas `test:all` significa Vitest, não Postgres nem E2E. `check:all` seleciona web e admin, porém ambos chamam o mesmo `bun x ultracite check` na raiz, podendo repetir uma varredura que já é global. `build:all` cobre os builds web/admin disponíveis; `knip` roda como tarefa web com configuração de repo. As variantes `:all` são escopo de uma tarefa, não perfil completo de verificação.

**CI atual:** o job principal em PR/push para `main` inclui audit baseline/boundaries, lint, typecheck, unit, Knip, docs, contrato de env e builds web/admin. Web E2E, comportamento PostgreSQL e admin E2E são jobs adicionais executados após o job principal no workflow; isso não prova que seus contexts já estejam marcados como checks requeridos na proteção remota de `main`. RLS smoke, preflight, deployment smoke e checklists operacionais são manuais. O hook pre-push atual executa apenas check/test web-only; sua política é P21. Portanto, um alias local “full” não deve ser chamado de equivalente à CI completa se não cobrir os jobs ambientais adicionais.

**Comparação com o Hub:** `verify:quick`/`verify` existem como perfis sequenciais, mas o runner não usa Turbo nem entende `--affected`. Quick roda migration-check, typecheck, Ultracite e Vitest; full soma docs, build e Knip. A CI do Hub também tem gates adicionais, então a existência dos aliases comprova descoberta de comandos, não paridade total com CI. Além disso, os aliases `check`/`typecheck`/`test` no Hub não têm o mesmo escopo dos scripts web-only do Polaris.

**Trade-offs de `--affected`:** a documentação do Turbo descreve mudança entre referências Git e dependentes. Em CI de PR a base pode ser detectada pelo GitHub; localmente a base padrão é `main`/`master` ou configurada em `TURBO_SCM_BASE`, e histórico raso pode ampliar a seleção para todos. Root config/lockfile e `globalDependencies` também ampliam para todas as tarefas; `--filter` intersecta com afetados, então filtrar `@polaris/web` pode omitir admin. Docs e scripts root precisam de verificações explícitas. O lockfile atual fixa Turbo `2.10.4`; revalidar após P2. Não presumir que a comparação entre refs cobre alterações ainda não commitadas.

**Recomendação preliminar:** criar aliases canônicos com cobertura explícita de todo o workspace. `verify:quick`: `docs:check`, uma varredura global do Ultracite, `typecheck:all` e `test:all`, sem Postgres/E2E/build. Inicialmente evitar `--affected` como única garantia; só adotá-lo após validar base, histórico, comportamento com alterações locais e cobertura de dependentes, além de medir que a economia compensa. `verify`: quick mais baseline/boundaries, contrato de env, build all, Knip e Postgres comportamental contra banco local não produtivo. Manter E2E web/admin como gates de CI separados; declarar que `verify` é o gate local full e não substitui o conjunto de checks obrigatórios de PR. Na implementação, reutilizar definições de gates com o job estático de CI onde isso não causar duplicação dos jobs de banco/E2E paralelos.

**Pesquisa de apoio:** [pesquisa do ponto 20 sobre comandos de verificação](research-ponto-20-verification-commands.md).

**Decisão aprovada:** adotar `verify:quick` para `docs:check`, uma verificação global do Ultracite, `typecheck:all` e `test:all` em todo o workspace. Não usar `--affected` como escopo inicial; reavaliar após medição e validação da base Git, histórico e seleção de dependentes. `verify` será o gate local full descrito na recomendação; E2E web/admin permanecem gates separados do CI.

**Execução em 2026-09-27:** `scripts/verify.ts` implementa os dois perfis; o runner limpa credenciais de cache remoto e URLs de E2E/RLS, usa variáveis sintéticas para builds e encaminha a URL PostgreSQL comportamental somente às etapas necessárias. O guard exige `localhost`, `127.0.0.1` ou `::1`, compara host/porta/banco lógico com `DATABASE_URL` mesmo quando credenciais e opções diferem, e nunca exibe credenciais. `.env.example` documenta `POSTGRES_BEHAVIOR_DATABASE_URL`. A configuração do Biome usa newline automático por sistema operacional; o parser de `env:check` agora normaliza CRLF para não falhar em Windows.

**Verificação registrada:** em Bun `1.4.2`, `bun run verify:quick` passou em 2,6 s com todas as tarefas Turbo em cache. Execução sem cache (`docs:check`, Ultracite, `turbo run typecheck --force` e `turbo run test --force`) passou em 47,5 s: 12 typechecks, 556 testes passaram e um teste PostgreSQL foi ignorado por exigir banco. Knip, `env:check`, `audit:baseline` (zero advisories), `audit:boundaries` e builds Web/Admin também passaram na validação P20. `bun run verify` com URLs vazias parou corretamente no guard antes de qualquer conexão.

**Limite pendente:** nenhum banco local descartável foi provisionado; portanto, a conexão e os testes PostgreSQL reais do perfil `verify` ainda não foram validados. Não tratar a aprovação do quick profile como prova desse gate.

### Ponto 21 — cobertura do hook `pre-push`

**Estado:** aceito em 2026-09-25.

**Proposta do relatório:** substituir os comandos web-only atuais no `pre-push` por `verify:quick` ou, no mínimo, por check/typecheck/test de todos os workspaces. Manter os hooks como conveniência local e a CI como autoridade.

**Evidência no Polaris:** `lefthook.yml` configura `pre-push` com `bun run check` e `bun run test`. Ambos são filtros web-only; o hook não executa `typecheck` nem os testes admin. O script `check` chama Ultracite na raiz, portanto a cobertura de lint parece mais ampla que o escopo do Turbo, mas isso não cobre typecheck/testes do admin. `package.json` instala Lefthook via `prepare`, exceto em CI/Vercel ou checkout sem `.git`; no checkout inspecionado, `.git/hooks` contém apenas exemplos e `core.hooksPath` não está definido, então a configuração do hook não está ativa neste ambiente. Confirmar a instalação durante a execução do plano.

**CI atual:** o job principal em PR/push roda lint, typecheck e unit para web e admin, além de audits, docs, env e builds. PostgreSQL comportamental e E2E web/admin são jobs separados do workflow. A CI continua sendo o gate de integração conforme P3; o hook dá feedback local e não substitui os checks do PR.

**Comparação com o Hub:** no checkout `staging` do Hub, `lefthook.yml` define apenas `pre-commit` para autofix; não há `pre-push` configurado/ativo. Os perfis manuais Quick/Full executam gates em sequência e deixam Postgres/E2E para jobs próprios de CI. Portanto, o pre-push proposto no relatório é uma política específica para Polaris, não um padrão transferido do Hub.

**Trade-off:** após P20, `verify:quick` cobre docs, Ultracite global uma vez, typecheck e Vitest de todo o workspace. Chamá-lo no pre-push fecha as lacunas web/admin e evita listas duplicadas no Lefthook. Ele roda em todo push local e pode tornar a espera perceptível; não há medição de duração ainda. O hook pode avaliar estado adicional presente no checkout além das refs enviadas, enquanto a CI valida o commit no workflow.

**Recomendação preliminar:** substituir os dois comandos atuais por um único `bun run verify:quick`, depois de garantir que Lefthook está efetivamente instalado. Medir a duração em uso representativo na implementação. Manter o hook se o tempo for aceitável; se a espera for alta, preservar `verify:quick` como comando manual e reduzir o hook ao gate curto definido pelo usuário. Manter CI e proteção de `main` como autoridade de integração.

**Pesquisa de apoio:** [pesquisa do ponto 21 sobre o hook pre-push](research-ponto-21-pre-push.md).

**Decisão aprovada:** depois de existir `verify:quick`, o `pre-push` o executará como um único comando. Na implementação, confirmar que Lefthook está instalado no checkout e medir a duração em uso representativo. Manter CI e os checks do PR como autoridade de integração; se o tempo local ficar alto, manter `verify:quick` manual e reduzir o hook.

**Revalidação em 2026-09-27:** `bun x lefthook check-install` retornou código 0, indicando que os hooks deste checkout estão instalados e sincronizados; `core.hooksPath` não tem override. `lefthook.yml` ainda contém os dois comandos antigos (`bun run check` e `bun run test`). Com Bun `1.4.2`, a rodada em cache de `verify:quick` levou 2,6 s; os mesmos gates executados sem cache passaram em 47,5 s. A medição sem cache é o limite conservador; a execução incremental precisa ser reavaliada após uma mudança real representativa.

**Execução P21 em 2026-09-27:** o `pre-push` foi consolidado em um único job `bun run verify:quick` no commit `46f5c21`. `bun x lefthook validate`, `bun x lefthook install` e `bun x lefthook check-install` passaram; `bun x lefthook run pre-push` executou o perfil e passou em 3,2 s com cache aquecido. Nenhum push foi realizado. CI e checks do PR continuam sendo a autoridade de integração.

### Ponto 22 — baseline vermelho e `--no-verify`

**Estado:** aceito em 2026-09-25; corrigir a causa, sem quarentena como atalho.

**Proposta do relatório:** tratar falhas preexistentes de testes e uso de `--no-verify` como problema de processo, preservar os gates e recuperar um baseline verde antes de seguir adicionando fundação.

**Evidência remota no Polaris:** a PR #1, “feat(web): onboarding com Free resiliente e checkout pré-cadastro”, foi aberta e mesclada em 2026-07-15. A descrição da PR registra três falhas “preexistentes” em testes de bootstrap/admin/preflight e que o hook levou ao uso de `--no-verify`; também declara que typecheck/build passaram localmente. Isso confirma o autorrelato escrito na PR, mas não identifica os três testes nem demonstra que eram preexistentes. A CI no commit base antes da PR (run `29417503626`) já falhou em `Typecheck`; a CI no HEAD da PR (`90c3e0f`, run `29446634302`) também falhou com `TS2304: Cannot find name 'PageProps'` em sete arquivos web. Em ambas, unit tests e jobs dependentes foram ignorados. Há divergência entre o resultado local descrito e a CI, sem evidência para explicar a causa. Isso confirma Typecheck vermelho anterior à PR, mas não confirma nem refuta as três falhas unitárias descritas. Os logs versionados de alguns pacotes compartilhados exibem testes passando, mas não cobrem todos os apps nem isolam a alegação.

**Estado do baseline atual:** o HEAD local/remoto de `main` permanece em `5f3f91a` (2026-07-16). A última execução remota listada para esse SHA é a CI run #29 (`29524367993`), também falha em `Typecheck` com `TS2304: Cannot find name 'PageProps'` em sete arquivos web; unit tests, admin tests, E2E e PostgreSQL foram ignorados por dependência do job principal. Não encontrei commits nem execuções posteriores em `main` até a consulta de 2026-09-25. Assim, o baseline registrado para o commit atual continua vermelho em typecheck e não há resultado contemporâneo para as suítes ignoradas. A PR #1 foi mesclada apesar da CI falhar; a auditoria de P1 também encontrou `main` sem proteção. A política de P3 para restaurar o CI antes de configurar checks requeridos continua necessária.

**Revalidação da implementação em 2026-09-26:**

- A consulta a GitHub ainda lista a run `29524367993` como a última execução em `main`; `gh run view` confirma que `verify` falha no typecheck Web e que os jobs dependentes foram ignorados. O log contém sete `TS2304` para `PageProps`, nos arquivos `apps/web/src/app/(app)/page.test.ts`, `(app)/page.tsx`, `produtos/(catalog)/page.tsx`, `produtos/[id]/page.tsx`, `vendas/(list)/page.tsx`, `vendas/[id]/page.tsx` e `(auth)/sign-in/page.tsx`.
- Naquela execução, `bun audit:baseline` passou e aceitou três advisories, antes da data de revisão. O JSON ainda tem `reviewBy: 2026-08-14`; o script atual valida essa data antes de chamar `bun audit`. Portanto, uma execução atual falharia na etapa de validade, sem medir os advisories atuais.
- Executado `bun audit --json` no lockfile do checkout em 2026-09-26: retornou código 1 e encontrou advisories atuais nas dependências, incluindo `@babel/core`/`esbuild` já aceitos, além de `@vitest/mocker`, `baseline-browser-mapping`, `brace-expansion`, `browserslist`, `fast-uri`, `nanoid`, `next`, `postcss`, `sharp`, `smol-toml`, `undici` e `vitest`. A saída inclui advisories high/critical; não prova por si só que uma condição de exploração específica é alcançável, mas prova que o baseline e as versões travadas precisam ser reavaliados. O pacote direto `next` está fixado em `16.2.10`; os ranges reportados incluem correções acima de `16.2.10` e dois advisories críticos afetando versões anteriores a `16.3.3`. Atualizar para a versão estável atual fica dentro da autorização de P2.
- Evidência local: `.github/workflows/ci.yml` executa Typecheck antes do build e não chama `next typegen`; `apps/web/tsconfig.json` inclui `next-env.d.ts` e `.next/types`, mas `apps/web/next-env.d.ts` e os diretórios de tipos gerados estão ausentes neste clone limpo. Os usos encontrados de `PageProps` estão em Web; não há uso de `PageProps`, `LayoutProps` ou `RouteContext` em Admin.
- A documentação oficial atual do Next confirma que os helpers globais de rotas são gerados por `next dev`, `next build` ou `next typegen`; a CLI recomenda `next typegen` antes de `tsc` em CI, sem build completo. `next typegen` também gera `next-env.d.ts` e carrega `next.config.ts` na fase de build de produção, então variáveis/dependências requeridas pela configuração precisam estar disponíveis. [Next.js — TypeScript](https://nextjs.org/docs/app/api-reference/config/typescript), [Next.js CLI — `next typegen`](https://nextjs.org/docs/app/api-reference/cli/next).
- O Context7 CLI retornou `fetch failed` mesmo na chamada fora do sandbox; a validação acima usou a documentação oficial do Next diretamente. Não instalei dependências nem executei typecheck/typegen nesta etapa de análise.

**Hipótese técnica para `PageProps`:** geração ausente dos tipos do App Router antes de `tsc` é agora a causa mais provável e é sustentada pelo log, workflow, clone limpo e documentação oficial. A correção a testar é executar `next typegen` para Web antes do `tsc` (de preferência no contrato local de `typecheck` para manter CI e uso local iguais), com a versão estável escolhida no batch P2. Como `next.config.ts` é carregado durante `typegen`, verificar se os placeholders de ambiente já definidos para build bastam. Confirmar que o typecheck passa e que os sete usos ganham tipos gerados; não é uma correção comprovada até esse teste.

**Sequência reconciliada e aprovada em 2026-09-26:** a evidência nova torna inexequível declarar o baseline de advisories restaurado antes de atualizar dependências: a revisão venceu e o audit atual encontra avisos além dos três antigos, inclusive em Next. Separar a recuperação em (1) corrigir o typecheck por geração de tipos e upgrade estável focal de Next; (2) atualizar dependências vulneráveis em batches pequenos dentro de P2, sem allowlist/quarentena; (3) remover da baseline as exceções resolvidas e renovar sua data somente depois do audit atual não reportar advisories pendentes; (4) executar as suítes atualmente ignoradas e então declarar baseline verde. P20/P21 continuam dependentes do perfil/typecheck recuperado. O primeiro batch foi aplicado; a remediação do audit continua pendente.

**Execução parcial em 2026-09-27:** o upgrade focal para Next `16.3.6` removeu seus advisories do audit atual. Foi provado `next typegen` → `tsc` no Web; `bun run typecheck:all` passou (12 tarefas). Builds Web e Admin passaram com placeholders sintéticos. A CI agora fornece variáveis sintéticas próprias exigidas pelo build Admin; os segmentos `(auth)` e `/access-denied` declaram `instant = false`, pois a checagem de sessão depende de cabeçalhos da requisição e essas rotas já aguardavam esse resultado antes de renderizar. O batch de `sharp@0.35.4` removeu as entradas de advisories desse pacote; `image-processing.test.ts` passou (2/2). O override de `fast-uri` passou a `3.1.8`, eliminando as seis entradas reportadas pelo Bun Audit para esse pacote; a versão também cobre o advisory oficial GHSA-hrr3 que não aparecia no resultado do `bun audit` anterior. O batch CSS removeu as entradas de PostCSS, NanoID e Browserslist; preservou PostCSS `8.5.23` para Next/Vite e `8.5.28` na raiz. O batch Undici atualizou `7.28.0` para `7.30.0` e removeu cinco entradas do audit. No batch brace-expansion, as resoluções foram corrigidas por consumidor; Bun `1.4.2` e Turborepo `2.11.4` eliminaram a incompatibilidade do lockfile v3. `bun run test:all` passou (11 tarefas); Web: 546 testes passaram, 1 ignorado; Admin: 39 passaram. Dez testes que exigem PostgreSQL foram ignorados por falta de banco dedicado. O ambiente de teste Web agora injeta apenas valores sintéticos para `DATABASE_URL` e `BETTER_AUTH_SECRET`; nenhum teste depende de credenciais reais. O audit ainda reporta 6 entradas em 5 nomes de pacote (1 high, 3 moderate, 2 low); o baseline não foi alterado e `reviewBy` não foi renovado. E2E, testes PostgreSQL dedicados e CI remota ainda não foram executados neste SHA.

**Escopo da regra de branches:** Polaris não tem uma branch Git persistente `staging` aprovada nesta fase (P4). Exigir baseline verde agora se aplica a `main`; a homologação persistente e seus gates entram antes do go-live conforme P4/P5. Não inferir que `staging` precisa existir para aplicar a regra.

**Comparação com o Hub:** a documentação canônica do Hub também define CI como gate de PR/release, exige validar o SHA candidato e proíbe `.skip` para mascarar suítes. O workflow mantém integrações Postgres/E2E isoladas; um retry de Playwright é registrado em métricas e não transforma silenciosamente o resultado em sucesso. Não foi encontrada lane/política persistente de quarentena. Um plano antigo registrou um falso alarme em um teste que já não existe na árvore atual, então o Hub também exige revalidar snapshots históricos contra o estado atual.

**Recomendação preliminar:** manter zero falhas silenciosas no baseline de `main`. Resolver primeiro o Typecheck que falha no último SHA; a hipótese a validar é gerar os tipos Next antes de `tsc`. Depois executar os gates que foram ignorados e restaurar a CI antes de habilitar branch protection. Para cada falha conhecida, corrigir a causa; remover um teste somente se ele for comprovadamente inválido e a mudança registrar rationale. O usuário rejeitou quarentena como atalho para adiantar a fundação. Não transformar as três falhas relatadas em allowlist sem identificar/reproduzir. Reexecução pode diagnosticar flakiness, mas não substitui a falha original sem explicação verificável. Tratar `--no-verify` como bypass local, nunca como resultado de CI ou autorização de merge.

**Pesquisa de apoio:** [pesquisa do ponto 22 sobre baseline e falhas conhecidas](research-ponto-22-baseline.md).

**Decisão aprovada:** não usar quarentena para avançar a fundação. Corrigir a causa das falhas conhecidas; remover um teste apenas se for comprovadamente inválido, com justificativa. A implementação deve começar pela falha de Typecheck atual, validar a hipótese `next typegen` antes de `tsc`, executar os gates completos no SHA candidato e só então tratar o baseline como restaurado. A regra verde se aplica a `main` agora; eventual branch `staging` fica para revisão quando for criada.

### Ponto 23 — separar CI de operações de produção

**Estado:** aceito em 2026-09-25; separar CI e dispatches operacionais.

**Proposta do relatório:** manter validações de código em CI e separar smoke tests, preflight, certificação de produção e restore drills em fluxos operacionais manuais ou protegidos por ambiente.

**Evidência no Polaris:** `ci.yml` é acionado por push/PR em `main` e `workflow_dispatch` sem inputs. Além dos jobs normais de verify/E2E/PostgreSQL, os seis jobs operacionais usam apenas `if: github.event_name == 'workflow_dispatch'`. Um dispatch manual da CI executa esses seis jobs junto com os jobs de CI; não há seleção explícita de operação. Nenhum job declara `permissions`, `environment` ou `concurrency`. O `production-preflight` recebe nomes de secrets de produção; o `rls-smoke` conecta a um banco configurado e tenta rollback; `deployment-smoke` acessa URLs externas. `restore-drill-checklist` e `production-certification-checklist` validam evidências e variáveis; não executam restore nem certificação em provedores. Não há automação de deploy/backup/restore implementada e Vercel ainda não está conectada.

**Comparação com o Hub:** o Hub tem workflows separados para CI, staging, migração e promoção/produção, com branch, SHA e operação já definidos por runbooks e configuração real de Vercel/Neon. É um modelo mais maduro e não deve ser copiado como nove arquivos de workflow para Polaris antes de escolher e configurar hospedagem, callbacks, banco e recuperação (P4/P5).

**Documentação e trade-offs:** GitHub permite selecionar a branch/ref ao despachar manualmente; `workflow_dispatch` exige write access e o checkout padrão usa a ref do evento. Como os jobs operacionais atuais não restringem `github.ref`, a separação de arquivos por si só não impediria código de outra ref de rodar com credenciais. GitHub recomenda permissões mínimas para `GITHUB_TOKEN`; os segredos de Environment só chegam a jobs que referenciam o Environment depois das regras configuradas. Em repositório privado, GitHub Pro habilita Environment, secrets e branch filters; required reviewers/wait timers não estão disponíveis no plano Pro para repo privado, em linha com a decisão de não exigir aprovação humana. A separação melhora o escopo de triggers e evita que um dispatch de operação inicie toda a CI, mas os controles de segurança ficam em ref permitida, permissions e escopo de secrets.

**Recomendação preliminar:** manter `.github/workflows/ci.yml` para push/PR de código, mais um único workflow manual `operations.yml` com input obrigatório `operation` e condições para executar somente o job escolhido. Manter `workflow_dispatch` na CI apenas se for útil para repetir validação de código. Antes de associar credenciais de produção, criar/configurar o Environment privado depois da transferência para a conta Pro; limitar jobs a `main` protegida ou SHA de release, declarar `permissions: contents: read` salvo necessidade demonstrada e guardar secrets no Environment correspondente. Não criar agora workflows próprios de deploy, backup ou restore; revisitá-los depois das escolhas de P4/P5. O owner precisa configurar o Environment no GitHub antes de o YAML referenciá-lo, para evitar um Environment implícito sem regras.

**Pesquisa de apoio:** [pesquisa do ponto 23 sobre CI e operações](research-ponto-23-ci-operations.md).

**Decisão aprovada:** manter a CI de código em `ci.yml` para PR/push; separar operações manuais em `operations.yml` com seleção explícita de uma operação por dispatch. Configurar ref permitida, Environment e permissões mínimas antes de associar secrets de produção, após transferência para a conta Pro. Não criar automações de deploy/backup/restore até P4/P5 definirem os serviços.

### Ponto 24 — segredos de produção fora da CI comum

**Estado:** aceito em 2026-09-25.

**Proposta do relatório:** workflows disparados por PR não devem receber secrets de produção; credenciais devem ser escopadas a workflows/jobs de operações protegidos por ref e Environment.

**Evidência atual no Polaris:** o job automático `verify` usa placeholders e não referencia production secrets. E2E Web/Admin continuam com nomes de secrets dedicados, e o teste comportamental usa serviço PostgreSQL efêmero; os valores/alvos remotos não foram lidos. P23 moveu os seis jobs operacionais para `operations.yml`, que atualmente não contém referências `secrets.*` nem `environment:`; as variáveis necessárias a RLS/preflight/smokes estão vazias para que cada script falhe antes de acessar qualquer serviço. Os dois checklists continuam usando `vars`, sem credenciais.

**Escopo e controles atuais:** P25 foi implementado localmente no commit `e7f9196`: os dois workflows declaram `permissions: contents: read`, o job `validate-dispatch` usa `permissions: {}`, e cada checkout desativa credenciais persistidas. `operations.yml` continua sem `environment:` e sem secrets de produção; mantém seleção placeholder que falha em vez de despachar uma operação implicitamente e condiciona cada job operacional a `refs/heads/main`. Consulta read-only ao GitHub em 2026-09-27: o repositório segue privado em `juniordinizm/polaris-erp` e `main` reporta `protected: false`. Um Environment chamado `Production` existe, mas tem `protection_rules: []`, `deployment_branch_policy: null`, zero secrets e zero variables. Os valores de secrets nunca foram lidos.

**Comparação com o Hub:** a CI do Hub não usa `secrets.*`, e a documentação separa os bancos descartáveis de CI dos dados/URLs de produção. As operações usam Environments, mas o isolamento não é completo: `production-backup` contém credenciais e não tem branch policy; `NEON_API_KEY` e `VERCEL_TOKEN` permanecem em escopo de repositório; o Environment `vercel-staging` permite `main` enquanto o deploy workflow é disparado por `staging`. Isso reforça a separação como direção, mas também mostra por que é preciso auditar refs e escopo efetivos em vez de copiar nomes/workflows.

**Recomendação preliminar:** preservar CI normal sem production credentials; reservar `E2E_DATABASE_URL`, `ADMIN_E2E_DATABASE_URL` e PostgreSQL efêmero para testes não produtivos. Em `operations.yml`, mapear cada production secret apenas no job que precisa dele e escopá-lo ao Environment `production`. Configurar o Environment real nas Settings, incluindo allowlist de refs e branch protection aplicável, depois da transferência para a conta Pro e antes de inserir `environment: production` no YAML. Revalidar destinos/nome por nome quando P4/P5 definirem hospedagem, banco e callbacks; não tratar variáveis vazias do P23 nem a existência do Environment como prova de que a operação está configurada.

**Pesquisa de apoio:** [pesquisa do ponto 24 sobre secrets de produção](research-ponto-24-production-secrets.md).

**Decisão aprovada:** CI de PR/push sem production secrets. Guardar credenciais de produção no Environment `production`, usadas somente por jobs operacionais com refs permitidas. Manter URLs E2E separadas e não produtivas; configurar secrets/Environment após a transferência para o GitHub Pro e as escolhas de P4/P5.

**Revalidação em 2026-09-27:** `gh repo view` retorna `nameWithOwner: juniordinizm/polaris-erp`, `isPrivate: true`, `viewerPermission: ADMIN`; a transferência planejada para a conta Pro do irmão não ocorreu. A consulta read-only de `main` reporta `protected: false`. O Environment `Production` já existe, mas a API retorna `protection_rules: []` e `deployment_branch_policy: null`; as APIs de metadados retornam zero secrets e zero variables, sem leitura de valores. A documentação oficial confirma que em repositório privado Pro/Team/Enterprise é necessário para configurar Environments, o owner da conta pessoal deve configurá-los, e secrets só chegam aos jobs que referenciam o Environment depois das regras aplicáveis. Um Environment inexistente referenciado no workflow pode ser criado sem regras nem secrets. Assim, P24 não deve substituir os valores vazios de P23 nem adicionar `environment: production` até a transferência, a proteção de `main` conforme P3 e a configuração/verificação da allowlist de `Production`. A política de required reviewers permanece fora de escopo porque o usuário é o único revisor e o repo privado no plano Pro não oferece esse recurso.

**Atualização da pesquisa:** [pesquisa P24 sobre secrets e Environments](research-ponto-24-production-secrets.md) registra as fontes oficiais consultadas e a fotografia remota read-only; nenhum valor de secret foi lido.

### Ponto 25 — permissões mínimas do `GITHUB_TOKEN`

**Estado:** aceito em 2026-09-25.

**Proposta do relatório:** adicionar `permissions: contents: read` no CI e conceder somente as permissões adicionais exigidas por cada workflow/job.

**Evidência no Polaris antes da alteração:** `ci.yml` era o único workflow; os dez jobs faziam checkout e não declaravam permissões. A auditoria não encontrou uso de `GITHUB_TOKEN`, `github.token`, Octokit, CLI `gh` para escrita, chamadas à API do GitHub ou `git push`. Credenciais externas usadas por testes/operações não justificavam permissões de escrita no `GITHUB_TOKEN`.

**Comparação com o Hub:** `.github/workflows/ci.yml` do Hub declara `permissions: contents: read` no nível do workflow, igual à recomendação do relatório. Seus workflows com operações GitHub concedem permissões adicionais quando há chamadas identificadas de leitura/escrita. A auditoria encontrou algumas permissões workflow-level mais amplas que todos os jobs precisam, portanto o padrão útil é declarar um baseline restrito e escopar exceções por job; não copiar cegamente cada bloco existente.

**Documentação e exemplos atuais:** GitHub documenta que `permissions` no topo do workflow se aplica a todos os jobs; no nível de job permite exceções mais estreitas. Ao declarar qualquer escopo, os demais ficam sem acesso. O README atual de `actions/checkout` recomenda `contents: read`. O workflow de build/release do Next.js/Vercel usa permissões por job: somente o job de publicação recebe `contents: write`, enquanto jobs de build declaram seus escopos próprios e um job de alerta sem acesso ao token usa `permissions: {}`. Discussões de usuários confirmam que permissões extras devem ser reavaliadas ao compor reusable workflows; servem como experiência operacional, não substituem a documentação oficial.

**Recomendação aprovada:** declarar `permissions: contents: read` em cada workflow que faça checkout; usar `permissions: {}` nos jobs sem necessidade do token; conceder escopos adicionais somente ao job que demonstrar essa necessidade. Secrets de produção e credenciais externas continuam separados do `GITHUB_TOKEN`. Ao chamar reusable workflows, conceder no job chamador os escopos necessários; um workflow chamado não pode elevar permissões além das recebidas.

**Pesquisa de apoio:** [pesquisa do ponto 25 sobre permissões do `GITHUB_TOKEN`](research-ponto-25-token-permissions.md).

**Decisão aprovada:** declarar `permissions: contents: read` nos workflows que fazem checkout. Jobs que não precisem do token podem usar `permissions: {}`; escopos adicionais devem ser concedidos somente ao job que demonstrar necessidade. Ao chamar reusable workflows, conceder os escopos necessários no job chamador, sem presumir que o workflow chamado poderá elevá-los.

**Implementação concluída em 2026-09-27 — commit `e7f9196`:** `ci.yml` e `operations.yml` declaram `contents: read`; `validate-dispatch` tem `permissions: {}`; os quatro checkouts da CI e seis de operações usam `persist-credentials: false`. O teste `apps/web/src/ops/ci-workflow.test.ts` verifica esses contratos, a contagem de checkouts e a ausência de permissões de escrita.

**Verificação registrada:** `bun x vitest run src/ops/ci-workflow.test.ts` passou (19/19); `bun x ultracite check` passou; `bun run verify:quick` passou (12 typechecks, 558 testes aprovados, 1 teste PostgreSQL ignorado por exigir banco local). Não foi feita configuração remota do GitHub neste item.

### Ponto 26 — fixar GitHub Actions por SHA

**Estado:** aceito em 2026-09-25, com Q1, Q2 e Q3 aprovadas; pinning local implementado em 2026-09-27 no commit `ce6d3a7`. Exigência remota de SHA e agenda Dependabot permanecem condicionais a P3/P5.

**Proposta do relatório:** substituir referências de actions por tags mutáveis, como `actions/checkout@v4` e `oven-sh/setup-bun@v2`, por SHAs completos, seguindo o padrão encontrado no Hub.

**Baseline antes da implementação:** `ci.yml` tinha quatro referências a `actions/checkout@v4` e quatro a `oven-sh/setup-bun@v2`; `operations.yml` tinha seis de cada. Não havia `.github/dependabot.yml`, reusable workflows ou actions locais. P25 já limitava o token e desativava credenciais persistidas no checkout, mas as tags ainda eram móveis.

**Comparação com o Hub:** o snapshot auditado tem 25 referências externas, todas por SHA completo com comentário de versão na mesma linha. `.github/dependabot.yml` agenda atualizações semanais de `github-actions` para `staging`; o padrão é útil, mas o Polaris não adotou branch persistente `staging`. O snapshot do Hub usa `actions/checkout@v5.1.0`, abaixo da release estável mais recente observada nesta revisão; copiar o método, não congelar as versões do Hub.

**Documentação, trade-offs e alternativas:** GitHub identifica o SHA completo como a única referência imutável para uma action e recomenda verificar que o commit vem do repositório oficial. Comentários semver na mesma linha preservam legibilidade e permitem que Dependabot faça version updates de refs SHA. Em contrapartida, Dependabot Alerts não gera alertas para actions pinadas por SHA; version updates regulares e monitoramento de advisories devem ser tratados separadamente. Na data desta revisão, as releases estáveis candidatas são `actions/checkout@v7.0.1` e `oven-sh/setup-bun@v2.2.0`; a versão final e seus SHAs devem ser revalidados na implementação conforme P2. O `github/gh-actions-lock` oficial pode automatizar lock e verificação de dependências, mas está em Technical Preview/pre-1.0 e tem limitações atuais; não é candidato à fundação estável neste momento.

**Q1 aprovada:** pinning de todas as referências externas por SHA completo verificado no upstream, com comentário `# vX.Y.Z`; habilitar a exigência de SHA completo nas configurações do repositório após a transferência, se disponível.

**Q3 aprovada:** adiar `gh-actions-lock` enquanto estiver em Technical Preview/pre-1.0 e reavaliar quando estabilizar.

**Q2 aprovada:** manter P4 até Vercel, banco e E2E não produtivos estarem configurados. Enquanto isso, direcionar version update PRs a `main` e não habilitar auto-merge; quando Preview estiver disponível, inspecionar o PR e fazer merge manual. A decisão evita tratar Preview (deploy efêmero por PR) como uma branch de homologação. O comportamento de `target-branch` não muda o destino documentado dos security update PRs: eles continuam mirando a branch padrão. PRs do Dependabot não recebem Actions secrets normais, então os E2E remotos atuais não podem ser presumidos disponíveis nesses runs.

**Racional da decisão Q2:** `main` está sem proteção no snapshot remoto de 2026-09-27. O GitHub só conclui auto-merge quando os requisitos efetivos do PR, como status checks obrigatórios, passam. Portanto, não habilitar auto-merge enquanto P3 não exigir os checks certos e enquanto as condições P4/P5 de Vercel, banco e E2E não produtivos estiverem pendentes. Preview continua sendo deploy efêmero de PR; só reabrir a branch `staging` se a necessidade de homologação persistente for reavaliada explicitamente.

**Pesquisa de apoio:** [pesquisa do ponto 26 sobre pinning de GitHub Actions](research-ponto-26-action-sha.md).

**Pesquisa de apoio Q2:** [Dependabot, branches de destino e auto-merge](research-ponto-26-dependabot-staging.md).

**Decisão aprovada:** pinning de todas as referências externas por SHA completo upstream-verificado, com comentário `# vX.Y.Z`, e exigência de SHA completo nas Settings após a transferência, se disponível. Adiar `gh-actions-lock` até estabilizar. Manter P4 por enquanto: Dependabot abre PRs para `main`; sem auto-merge até Vercel, banco e E2E não produtivos estarem configurados. Quando Preview estiver disponível, inspecionar o PR e fazer merge manual. Reavaliar o fluxo de staging antes do go-live; auto-merge em uma eventual branch `staging` exigirá CI/E2E completos, checks obrigatórios e promoção manual do SHA homologado para `main`.

**Revalidação para implementação em 2026-09-27:** o inventário local confirma que as vinte refs acima cobrem todos os `uses:` externos dos dois workflows. As páginas upstream marcam `actions/checkout@v7.0.1` e `oven-sh/setup-bun@v2.2.0` como releases mais recentes estáveis. A API pública do GitHub resolveu os tags para `3d3c42e5aac5ba805825da76410c181273ba90b1` e `0c5077e51419868618aeaa5fe8019c62421857d6`, respectivamente; ambos os commits retornaram assinatura verificada (`verified: true`, `reason: valid`). A release do setup-bun v2.2.0 atualizou sua action runtime para Node.js 24, alinhada ao runtime Node 24 aprovado em P33. Reconfirmar versões, SHAs, assinatura e compatibilidade no momento da implementação.

GitHub continua documentando que apenas SHA completo dá referência imutável e recomenda confirmar que o SHA vem do repositório upstream; a mesma linha `# vX.Y.Z` permite ao Dependabot atualizar a descrição da versão. A documentação também confirma que Dependabot pode abrir version update PRs para actions SHA-pinned, mas seus Dependabot Alerts não sinalizam actions pinadas por SHA. Portanto, atualizar por PR semanal e revisar o upstream, tag e release notes não substitui acompanhar advisories separadamente. Consultas: [Secure use](https://docs.github.com/en/actions/reference/security/secure-use), [Dependabot para Actions](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/auto-update-actions), [releases checkout](https://github.com/actions/checkout/releases), [releases setup-bun](https://github.com/oven-sh/setup-bun/releases).

**Gate adicional da atualização Dependabot:** os jobs `e2e` e `admin-e2e` rodam em todo `pull_request` e recebem `E2E_DATABASE_URL`/`ADMIN_E2E_DATABASE_URL` de GitHub Actions secrets. `requireE2eDatabaseUrl` lança erro se o valor faltar, e `check-e2e-db-schema.ts` conecta ao banco antes dos testes. A documentação do GitHub confirma que workflows iniciados pelo Dependabot não recebem Actions secrets; recebem apenas Dependabot secrets. Consulta de metadados read-only em 2026-09-27 encontrou zero Actions secrets e zero Dependabot secrets no repositório; nenhum valor foi consultado. Portanto, ativar agora a agenda criaria PRs Dependabot cuja CI falha nos dois E2E. Pinning local pode prosseguir, mas a agenda só deve ser habilitada quando P5 provisionar os destinos E2E não produtivos e seus segredos dedicados estiverem disponíveis também no escopo Dependabot, ou quando existir outro caminho que execute integralmente os E2E sem secrets remotos. Não pular nem colocar esses jobs em quarentena.

**Implementação local concluída em 2026-09-27 — commit `ce6d3a7`:** as 20 referências em `ci.yml` e `operations.yml` foram fixadas nos SHAs integrais verificados de `actions/checkout@v7.0.1` e `oven-sh/setup-bun@v2.2.0`, com comentários de release. O teste `apps/web/src/ops/ci-workflow.test.ts` agora exige que toda referência externa tenha SHA de 40 caracteres e comentário semver. A configuração semanal do Dependabot continua adiada até P5 provisionar E2E não produtivo e seus secrets dedicados; a política remota de exigir SHA completo continua depois da transferência para o owner.

**Verificação:** `bun x vitest run src/ops/ci-workflow.test.ts` passou (20/20); `bun run verify:quick` passou, incluindo docs, lint, 12 typechecks e os testes do workspace. Os testes que requerem PostgreSQL ficaram ignorados por dependerem de banco. A CI remota não foi executada nem houve push.

### Ponto 27 — cancelar execuções obsoletas de CI

**Estado:** aceito em 2026-09-25; implementação parcial local em 2026-09-27 no commit `a0306e1`. Cancelamento ativo de E2E permanece condicional a P5.

**Proposta do relatório:** adicionar `concurrency` ao workflow de CI e cancelar runs antigos quando um novo commit do mesmo PR/ref chegar, economizando runners em validações já obsoletas.

**Evidência atual no Polaris:** `.github/workflows/ci.yml` dispara apenas em `push` para `main` e `pull_request` para `main`; seus jobs são `verify`, `e2e`, `postgres-behavior` e `admin-e2e`. `.github/workflows/operations.yml` é apenas `workflow_dispatch`. Nenhum workflow ou job declara `concurrency`; P23 já separou os fluxos operacionais, então cancelar CI não interrompe os dispatches de operações.

**E2E e efeitos parciais:** Web/Admin exigem `E2E_DATABASE_URL`/`ADMIN_E2E_DATABASE_URL`; a API do GitHub retornou zero Actions secrets e zero Dependabot secrets na consulta de 2026-09-27. `scripts/check-e2e-db-schema.ts` exige a URL antes de conectar; hoje, os jobs E2E falham antes de gravar. Os testes geram IDs aleatórios, mas não foi encontrado teardown geral, portanto isso não comprova que interromper E2E seja inofensivo depois de provisionar URLs. P5 prevê Neon branches descartáveis por PR quando Preview for configurado, mas ainda não há branches provisionadas.

**Comparação com o Hub:** os onze workflows auditados declaram concurrency. A CI usa `ci-${github.workflow}-${github.event.pull_request.number || github.ref}` com `cancel-in-progress: true`; os dez workflows operacionais usam `cancel-in-progress: false`. Nenhum configura `queue: max`. O padrão diferencia CI descartável de backup, migration, reset, cleanup, workers e deploy. Ressalva: os nomes de grupos operacionais do Hub geralmente são próprios por workflow, não um lock comum a todos os workflows que acessam o mesmo ambiente; grupos diferentes não se bloqueiam entre si.

**Semântica e riscos:** o GitHub mantém por padrão no máximo um run ativo e um pendente em cada grupo; um novo pendente substitui o anterior. `cancel-in-progress: true` também interrompe o ativo, mas não desfaz efeitos externos já aplicados. `queue: max` aceita até 100 pendentes e não pode ser combinado com cancelamento do ativo. Os eventos `pull_request` e `push` usam refs diferentes; a chave por número de PR/ref cancela updates do mesmo PR e pushes repetidos da mesma ref, sem fundir o check do PR com o push pós-merge em `main`.

**Revalidação documental em 2026-09-27:** GitHub confirma que workflow-level `concurrency` cancela a execução inteira; job-level afeta somente o job nomeado. Por grupo, o padrão mantém no máximo um run ativo e um pendente; um novo pendente substitui o anterior. `queue: max` permite até 100 pendentes, mas não pode ser combinado com `cancel-in-progress: true`; nomes de grupo são case-insensitive e compartilhados entre workflows do mesmo repositório. O cancelamento envia sinais ao processo e pode encerrar a árvore; não há rollback documentado de efeitos já aplicados em serviços externos. A falta de `workflow_dispatch` em `ci.yml` remove a necessidade de política especial para esse evento.

**Escopo aprovado para implementação:** aplicar concurrency em nível de job apenas a `verify` e `postgres-behavior`, com grupos distintos contendo `github.workflow`, ID do job e número do PR ou ref, e `cancel-in-progress: true`. São verificações sem estado externo persistente: build/testes usam placeholders e o job PostgreSQL usa um serviço descartável por execução. Manter `e2e` e `admin-e2e` fora do cancelamento ativo até P5 provisionar branches E2E descartáveis por PR e a evidência confirmar que dados parciais ficam contidos. Manter `operations.yml` sem cancelamento ativo; depois da prova P5, reavaliar se a CI completa pode receber workflow-level concurrency. Isso implementa a parte segura de P27 sem cancelar E2E potencialmente compartilhados.

**Pesquisa de apoio:** [pesquisa do ponto 27 sobre concurrency](research-ponto-27-concurrency.md).

**Decisão aprovada:** depois de P23 separar CI e operações, cancelar apenas runs de CI obsoletos do mesmo workflow e PR/ref. Se `workflow_dispatch` permanecer na CI, isolá-lo em grupo próprio. Não cancelar operações ativas; quando seus alvos forem definidos em P4/P5, serializar por recurso compartilhado sem cancelamento ativo, escolhendo a fila conforme o tipo de operação. Antes de ativar o cancelamento E2E, confirmar que uma execução interrompida deixa apenas dados descartáveis/isolados.

**Implementação parcial concluída em 2026-09-27:** concurrency job-level em `verify` e `postgres-behavior`, com grupos distintos por workflow/job/PR-ref e `cancel-in-progress: true`. `e2e`, `admin-e2e` e `operations.yml` não receberam cancelamento. A ampliação para E2E depende da evidência de isolamento por PR/run e descarte de efeitos parciais em P5.

**Verificação:** `bun x vitest run src/ops/ci-workflow.test.ts` passou (21/21); `bun run verify:quick` passou; os testes que requerem PostgreSQL foram ignorados por dependerem de banco. Não houve execução remota de GitHub Actions nem push.

### Ponto 28 — Dependency Review

**Estado:** fechado sem adoção em 2026-09-27, conforme Q1 aprovada; Q2 foi satisfeita por P22.

**Proposta do relatório:** adicionar GitHub Dependency Review para comparar dependências alteradas por PR e bloquear vulnerabilidades high/critical, avaliando moderate mais tarde.

**Evidência atual no Polaris:** `ci.yml` chama `bun run audit:baseline`, que executa `bun audit --json`, compara advisories com `docs/security/dependency-advisory-baseline.json` e falha para advisories novos. O lockfile raiz é `bun.lock`; não há `package-lock.json`, `.github/dependabot.yml` nem `actions/dependency-review-action`. P22 restaurou o baseline: `acceptedAdvisories` está vazio, `generatedAt` é `2026-09-27` e não há `reviewBy`. A execução local de `bun run audit:baseline` passou com zero advisories atuais.

**Comparação com o Hub:** o Hub usa `bun audit --production` na CI e Dependabot para atualização de Bun/Actions, mas não encontrei Dependency Review Action nem gate/licença específico. A comparação sugere que audit via Bun já é um padrão de CI útil, embora o Hub limite o audit às dependências de produção e mantenha uma regra isolada para Browserslist.

**Disponibilidade e cobertura:** a documentação atual oferece Dependency Review a repositórios públicos e a repositórios pertencentes a organizações GitHub Team com GitHub Code Security; privados também podem usar quando Code Security/Advanced Security está habilitado. Code Security só pode ser adquirido em Team/Enterprise. A transferência aprovada em P3 é para uma conta pessoal GitHub Pro, portanto não habilita essa feature. Dependency Review cobre os ecossistemas do Dependency Graph; a tabela atual lista npm com `package-lock.json`/`package.json`, mas não Bun nem `bun.lock`. Dependabot aceitar `bun.lock` para version updates é um recurso distinto e não comprova cobertura transitiva no Dependency Review. Mesmo elegível, o check só bloqueia merge se for exigido na branch protegida. O audit atual examina advisories correntes do Bun e cobre uma necessidade diferente: vulnerabilidades já presentes, sem diff de PR ou política de licenças.

**Resultado:** não adicionar Dependency Review, não comprar Code Security nesta fundação e não criar política de licenças. Manter `bun audit:baseline` em CI; P22 já removeu os advisories aceitos e a verificação atual passou. Reabrir P28 se o repositório se tornar público, migrar para organização/plano com Code Security, ou se GitHub documentar suporte de Dependency Review ao grafo resolvido de `bun.lock`; testar essa cobertura em PR antes de tratá-la como gate.

**Pesquisa de apoio:** [pesquisa do ponto 28 sobre Dependency Review e auditoria Bun](research-ponto-28-dependency-review.md).

**Q1 aprovada:** não adicionar GitHub Dependency Review Action sob o repo privado em conta pessoal GitHub Pro nem pagar Code Security como parte desta fundação. A cobertura da action para `bun.lock` não está documentada. Reavaliar se a propriedade/plano do repo ou o suporte oficial a Bun mudarem.

**Q2 aprovada:** restaurar `bun audit:baseline` conforme P22: corrigir os três advisories temporariamente aceitos, remover exceções quando resolvidos e não apenas estender `reviewBy`. Depois da baseline limpa, qualquer advisory novo deve bloquear o CI, independentemente da severidade. Não adicionar política de licenças sem validação.

### Ponto 29 — CodeQL para JavaScript/TypeScript

**Estado:** aceito em 2026-09-25.

**Proposta do relatório:** adicionar análise CodeQL para JavaScript/TypeScript como uma camada SAST para auth, webhooks, uploads/storage, billing, SQL e multi-tenancy.

**Evidência atual no Polaris:** o workspace contém `apps/web`, `apps/admin` e pacotes TypeScript/TSX compartilhados. `.github/workflows/ci.yml` e `operations.yml` não contêm CodeQL, upload SARIF ou Semgrep. Os checks existentes cobrem lint/format, tipos, testes, higiene e advisories; `bun audit:baseline` é SCA e `audit:boundaries` verifica pontos específicos, sem substituir análise semântica SAST.

**Comparação com o Hub:** CodeQL aparece ativo remotamente no Hub e há execuções históricas bem-sucedidas, mas não há workflow/configuração versionados. A API não mostrou check CodeQL nos SHAs atuais de `main`/`staging` e os rulesets consultados exigem somente `CI`; os detalhes do default setup remoto não puderam ser lidos. É um exemplo de uso de CodeQL, não evidência de cobertura atual ou gate bloqueador a copiar.

**Cobertura e elegibilidade:** CodeQL é tecnicamente adequado a JS/TS e tem modelos para Next.js; JS/TS não exige build para análise. Porém, CodeQL/code scanning em repositório privado exige GitHub Code Security com Team/Enterprise. A configuração P3 aprovada mantém o Polaris privado numa conta pessoal GitHub Pro, e P28 aprovou não comprar Code Security nesta fundação; portanto, o workflow CodeQL proposto não é elegível no plano atual.

**Alternativa e trade-off:** Semgrep Free Edition é candidata a SAST sem licença adicional de GitHub, com limite anunciado de até 10 repositórios privados/10 contribuidores. Na modalidade CI autogerida, o código permanece no runner, mas metadados de findings são enviados ao serviço Semgrep. Isso adiciona uma dependência de fornecedor; Semgrep Community Edition e suas regras têm condições de licença específicas para SaaS, então não tratar `semgrep scan --config auto` como substituto automaticamente liberado. `bun audit` permanece separado: SCA de dependências não é SAST.

**Recomendação preliminar:** não adicionar CodeQL ao repo privado pessoal Pro nem torná-lo required sob o plano atual. Avaliar um POC delimitado do Semgrep Free Edition em CI autogerida, após P22 restaurar o baseline, para medir cobertura JS/TS, falsos positivos, tempo e política de dados. Se adotado, pin sua action/insumos conforme P26, manter fonte no runner, limitar segredo Semgrep ao job de scan e decidir se findings serão required somente após revisão dos resultados. Se não quiser um novo fornecedor, deixar SAST adiado até Code Security ficar elegível.

**Decisão aprovada:** não adicionar CodeQL enquanto o repositório permanecer privado em conta pessoal GitHub Pro sem Code Security. Após restaurar o baseline P22, executar um POC do Semgrep Free Edition em CI autogerida, sem Managed Scans; manter o código no runner e limitar o que é enviado ao serviço aos metadados de findings. Revisar cobertura, ruído, duração, termos e tratamento do token antes de decidir se o check passa a ser obrigatório. Se o POC não for aprovado, adiar SAST até mudar o plano/entitlement; não usar regras Community Edition sem validar os termos específicos para SaaS.

**Revalidação em 2026-09-27:** a documentação confirma que GitHub Free/Pro limita code scanning a repositórios públicos; privado requer Team/Enterprise com Code Security. Transferir para outra conta pessoal Pro não muda essa elegibilidade. Semgrep Free Edition anuncia Code/SAST com Pro Rules, limite de 10 repositórios privados e 10 contributors; sua página de preços diferencia CI/CD via infraestrutura Semgrep de integração CI/CD customizada Enterprise. A documentação também mostra `semgrep ci` em workflow GitHub Actions, mas a combinação exata do tenant Free com runner do Polaris deve ser comprovada no POC, sem habilitar Managed Scans. Na execução local/CI, o fornecedor declara que fonte não sai do runner, enquanto findings/metadados são enviados; recursos opcionais de AI podem enviar trechos de arquivos e Managed Scans clona o repo. O POC deve desativar AI e Managed Scans e avaliar explicitamente metadados, token e contagem de contributors. Semgrep Community Edition e as regras mantidas pela Semgrep têm licença distinta, que não deve ser presumida compatível com a SaaS.

P22 satisfaz a pré-condição da baseline: `bun run audit:baseline` passou em 2026-09-27 com zero advisories atuais e `acceptedAdvisories: []`. O POC aprovado pode avançar após confirmar que o tenant Free permite `semgrep ci` no runner GitHub Actions e que o usuário aceita os campos de findings/metadados enviados. Começar em modo Monitor, sem tornar o check required; Semgrep documenta que Monitor registra findings sem afetar o PR, enquanto Comment/Block alteram o fluxo do PR. ([Semgrep: modos de política](https://semgrep.dev/blog/2026/preventing-vulnerable-code-from-merging-without-blocking-developers/)) Executar sem Managed Scans e sem AI; manter a fonte no runner; limitar `SEMGREP_APP_TOKEN` ao job; fixar a imagem/versão do scanner em release estável e referência imutável. Se o Free exigir scan hospedado pelo Semgrep, não mudar para Managed Scans sem aprovação explícita; se a conexão runner→platform não estiver elegível, adiar SAST em vez de usar regras CE sem validação de licença. Nenhuma credencial foi configurada ou lida nesta revisão.

**Estado da implementação (2026-09-27):** o workflow manual `.github/workflows/semgrep-poc.yml` foi criado no commit `1103905`, com dispatch manual, validação da ref `main`, permissões `contents: read`, token limitado ao passo de scan via Environment `semgrep-poc`, checkout por SHA e imagem Semgrep 1.178.0 fixada por digest. O scan ainda não foi executado: primeiro é necessário integrar o workflow em `main`, restringir o Environment à branch `main`, adicionar nele `SEMGREP_APP_TOKEN` e confirmar no tenant Free a política Monitor com AI e Managed Scans desligados e a elegibilidade do modo conectado. Portanto, o código do POC está implementado; a avaliação do SAST e qualquer decisão sobre gate continuam pendentes.

**Pesquisa de apoio:** [pesquisa do ponto 29 sobre CodeQL/SAST](research-ponto-29-codeql.md).

### Ponto 30 — CodeRabbit assistivo; CI como autoridade

**Estado:** aceito em 2026-09-25, com Q1 aprovada.

**Proposta do relatório:** manter CodeRabbit como reviewer assistivo e CI como autoridade; não tornar a disponibilidade de um agente externo requisito absoluto.

**Evidência no Polaris:** não há `.coderabbit.yaml`/`.coderabbit.yml` nem referências versionadas ao CodeRabbit. `.github/workflows/ci.yml` já cobre verificações, testes, builds e operações manuais. Nesta máquina, CodeRabbit CLI 0.7.6 está instalado e autenticado; `coderabbit doctor` passou 9/9 verificações. A revisão do workflow P29 usou a franquia Free porque o repo não está ligado a uma organização CodeRabbit acessível. A árvore local continua sem provar instalação do GitHub App nem quais status checks são exigidos pelas regras remotas de `main`.

**Comparação com o Hub:** o runbook `docs/operations/code-review-with-coderabbit.md` define a revisão como opcional, permite seguir quando CLI/serviço estiver indisponível, diz que um resultado limpo não autoriza merge e desaconselha tornar o check do CodeRabbit obrigatório. O release flow mantém CI e critérios de release como autoridade. A política aproveita essa separação sem copiar a branch `staging` nem os detalhes operacionais específicos do Hub.

**Ferramentas e trade-offs (revalidados em 2026-09-27):** GitHub Copilot Student é um plano gratuito e a documentação atual reserva Copilot Code Review aos planos pagos; não devemos contar com Student para solicitar review em PR. Reavaliar apenas se houver outra licença/entitlement, confirmada antes do uso. CodeRabbit Free aceita repositórios privados e oferece reviews por CLI/IDE, com limite atual de 3 reviews CLI por desenvolvedor/hora e até 150 arquivos por review. Review automático em PR pelo GitHub App exige plano Essentials ou superior. A CLI não é offline: envia diff/contexto ao serviço; CodeRabbit declara que o código não treina modelos, mas pode reter dados derivados para melhorar reviews e oferece opt-out. Excluir secrets, credenciais, dados pessoais e URLs reais do diff; não habilitar pay-as-you-go nem usar `--use-credits` sem aprovação.

**Decisão aprovada, revalidada:** manter CI e critérios de release como autoridade. Usar CodeRabbit Free CLI como segunda opinião sob demanda em mudanças de maior risco, findings incertos ou pedido explícito; não executar reviews em todos os PRs. Não contar com Copilot Student para code review; só reavaliar Copilot se existir entitlement elegível separado. Não instalar CodeRabbit GitHub App, adicionar configuração para revisão automática nem tornar qualquer reviewer/check/aprovação de IA obrigatório. Findings são sugestões a verificar; não enviar secrets, credenciais, dados pessoais ou URLs reais. Não habilitar cobrança excedente sem limite deliberado e aprovação explícita.

**Evidência operacional em 2026-09-27:** `coderabbit review --committed --base-commit 019c3b4 --dir .github/workflows --agent` revisou somente `.github/workflows/semgrep-poc.yml`, concluiu sem findings e sem opção de créditos pagos. Isso prova que a CLI Free funciona neste host para este diff; não prova ausência de defeitos nem disponibilidade em outros hosts.

**Implementação aprovada em 2026-09-27:** `AGENTS.md` agora instrui o agente a usar CodeRabbit CLI em mudanças de alto risco quando instalado/autenticado, revisar apenas o diff relevante, proteger dados sensíveis e validar findings. Se a CLI faltar ou atingir limite, a verificação normal continua; não usar créditos pagos sem autorização. Nenhum GitHub App, `.coderabbit.yaml`, reviewer obrigatório ou gate foi adicionado. O usuário aprovou esta orientação; P30 está implementado.

**Pesquisa de apoio:** [pesquisa do ponto 30 sobre CodeRabbit e Copilot Student](research-ponto-30-coderabbit.md).

### Ponto 31 — aproveitar melhor o Turborepo

**Estado:** aceito em 2026-09-25, com Q1 aprovada.

**Proposta do relatório:** habilitar Remote Cache para compartilhar resultados entre máquinas/agentes/CI e avaliar `--affected` para `verify:quick`, mantendo a validação completa de release.

**Evidência no Polaris:** o workspace já usa Turbo para o grafo de tarefas, dependências, cache local e outputs de build. `turbo.json` define as relações entre build/test/check/typecheck/knip e desabilita cache em E2E, PostgreSQL e operações com side effects. `package.json` declara `turbo@^2.11.4`, mas o checkout resolve `2.11.4`; o release estável `2.11.5` já está publicado e deve entrar na cadência P2/P52 antes de qualquer teste de Remote Cache. Não há Remote Cache nem `--affected` configurados na CI. `scripts/verify.ts` limpa `TURBO_TEAM` e `TURBO_TOKEN` de todos os subprocessos, então `verify:quick` não herdará credenciais remotas sem uma integração explícita e restrita. O checkout da CI não solicita histórico completo; cache inputs/envs/logs também dependem da auditoria P32. O Hub não usa Turborepo.

**Trade-offs e dependências revalidados em 2026-09-28:** o usuário usará uma conta Vercel, sem segunda identidade. O Remote Cache não tem preço separado e está sujeito a fair use; uma conta/team pode conter Web e Admin e compartilhar outputs/logs com CI, com expiração em sete dias. Para uso comercial, Hobby não é adequado; o Pro custa US$ 20/mês, inclui uma seat Owner/Member e US$ 20 de créditos de uso. Uma seat adicional de Owner/Member só seria necessária se outra pessoa precisasse de acesso direto ao team; CI pode autenticar-se por OIDC/token escopado sem uma segunda conta humana. Assim, não aplicar a estimativa de US$ 40/mês como custo-base deste cenário. Antes de qualquer ativação, P32 deve auditar hashes/envs/inputs/outputs/logs e o side effect do upload Sentry; credenciais e writers devem ser limitados. `verify:quick` também precisa de integração opt-in sem desfazer a neutralização segura atual de credenciais.

**Decisão aprovada:** manter Turborepo. Registrar Vercel Remote Cache como primeira opção, a habilitar somente depois da auditoria P32 de hashes, envs, outputs e logs e após definir owner/team/scope e credenciais limitadas para CI. A hospedagem do app na Vercel não é requisito para este cache. Preservar a decisão P20: `verify:quick` cobre o workspace todo, sem `--affected`. Reconsiderar `--affected` somente depois de medir a duração e validar a base Git em PR/push, dependentes e gates executados fora do Turbo; a validação de release permanece completa.

**Decisão revisada aprovada em 2026-09-28:** usar uma única identidade Vercel para os projetos Web/Admin e um seat Pro; CI pode autenticar-se separadamente por OIDC/token, sem compartilhar senha entre pessoas. O Pro custa US$ 20/mês com uma seat e US$ 20 em créditos de uso; outra seat de Owner/Member só será necessária se uma segunda pessoa precisar de acesso Vercel próprio. Hobby/trial Pro ficam restritos a um app sintético descartável; não enviar código, artifacts ou dados do Polaris. Para o código real, usar Pro pago após rever controles de dados. Manter Remote Cache desligado até P32; depois, considerá-lo se Pro já for escolhido para hospedagem ou se medição justificar seu custo. `--affected` permanece fora e `verify:quick` segue cobrindo todo o workspace.

**Estado de execução:** nenhuma conta/team Vercel, secret ou Remote Cache foi configurado; ativação continua dependente de P32 e da escolha de hospedagem em P4/P5. Hobby não será usado com o repositório ou artifacts reais do Polaris.

**Condição para teste no Hobby (2026-09-28):** os Termos da Vercel limitam Hobby a uso pessoal/não comercial e permitem usar conteúdo submetido em Hobby ou trial Pro para treinamento de modelos e compartilhamento com terceiros; Pro pago desliga esse uso por padrão. Os termos não dão uma exceção explícita para desenvolvimento/teste de pré-lançamento. Como Polaris é um ERP planejado para uso comercial, a inferência segura é não implantar nem enviar o código real, outputs ou logs privados do Polaris através de Hobby/trial Pro. Hobby pode servir para validar o fluxo com um app descartável e sintético; testar Polaris real exige resolver o plano pago e os controles de dados primeiro. Credenciais Vercel são individuais e não devem ser compartilhadas; um owner + CI pode usar uma conta/seat, mas acesso direto de uma segunda pessoa e commits que disparem deploys precisam ser resolvidos no P4/P5. [Vercel Terms](https://vercel.com/legal/terms), [Vercel Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines).

**Pesquisa de apoio:** [pesquisa do ponto 31 sobre Turborepo e Remote Cache](research-ponto-31-turborepo.md).

### Ponto 32 — auditar envs do Turborepo antes do Remote Cache

**Estado:** aceito em 2026-09-25, com Q1 aprovada.

**Proposta do relatório:** revisar variável por variável o `turbo.json`, pois `globalPassThroughEnv` é amplo; valores que alteram outputs devem influenciar o hash, e secrets devem ser pass-through somente nas tasks necessárias.

**Evidência inicial registrada em 2026-09-25:** `turbo.json` tinha 53 variáveis em `globalPassThroughEnv`, 11 em `globalEnv` e `.env*`/`knip.config.ts` em `globalDependencies`; strict mode já era o padrão. A classificação inicial tratou `ASAAS_CARD_CHECKOUT_ENABLED` e `RLS_SMOKE_EXPECTED_RUNTIME_ROLE` como variáveis consumidoras sem allowlist, classificação refinada na revalidação abaixo. O Hub não usa Turborepo; seus workflows mantêm CI comum sem secrets e injetam secrets em jobs operacionais/Environments.

**Risco concreto revalidado:** `apps/web/next.config.ts` e `apps/admin/next.config.ts` habilitam upload de source maps quando `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` e `SENTRY_PROJECT` existem. Como `build` é cacheável e esses valores são apenas pass-through, um cache hit pode pular o upload. O SDK instalado tem `deleteSourcemapsAfterUpload: false` por padrão e a configuração não substitui esse default; source maps podem continuar em `.next/**`, que está entre os outputs de build. Isso cria possível exposição via artifacts de cache além da omissão do upload. O CI atual não fornece credenciais e nenhum build com upload foi executado; a presença exata de `.map` nos outputs Polaris ainda precisa ser verificada antes de ativar cache remoto.

**Decisão aprovada:** manter strict mode. Inventariar nomes de variáveis e seus consumidores, sem ler valores `.env`/secrets; reduzir `globalPassThroughEnv`/`globalEnv` a escopos por task. Valores que alterem outputs devem entrar no hash via `env`/`globalEnv`; `passThroughEnv` deve ficar para valores necessários à task que não mudam seu output, especialmente em operações sem cache. Restringir `.env*` às tasks/apps que realmente os consomem e `knip.config.ts` à task `knip`; remover vars sem consumidor após confirmar, e incluir as vars faltantes somente onde o uso real exigir. Resolver o upload Sentry para que cache não omita o side effect, preferencialmente separando-o em uma operação não cacheável; se continuar no build, impedir cache hit quando o upload for requerido. Não ativar Remote Cache até a classificação, correção e validação de hashes, outputs, logs e upload estarem concluídas. Então executar a dependência P31 para habilitar Remote Cache conforme decisão aprovada.

**Pesquisa de apoio:** [pesquisa do ponto 32 sobre envs, hashes e Turbo](research-ponto-32-turbo-env.md).

**Revalidação pré-implementação em 2026-09-28:** a auditoria do worktree confirmou 11 `globalEnv`, 53 `globalPassThroughEnv`, duas `globalDependencies` e nenhuma allowlist local de `env`/`passThroughEnv`. Quatro sample-rate vars Sentry estavam declaradas em `.env.example`, `turbo.json` e docs, sem consumidor executável encontrado. `ASAAS_CARD_CHECKOUT_ENABLED` é lida em página `connection()`/request-time; não deve ser global. `RLS_SMOKE_EXPECTED_RUNTIME_ROLE` controla uma asserção opcional em `db:smoke:rls`. Sentry, `SAFE_VERIFY_ENV`, `.env*`, `knip.config.ts` e consumidores constam no inventário detalhado.

**Estado P32: concluído em 2026-09-28 após aprovação do usuário.** Strict mode permanece ativo e as allowlists globais foram removidas. As 11 variáveis que alteram bundles/configuração estão hasheadas só em `@polaris/web#build` e `@polaris/admin#build`; credenciais e outros valores necessários foram escopados às tasks de build, desenvolvimento, execução ou operação que os consomem. Arquivos `.env*` entram somente no hash dos dois builds Next; `knip.config.ts`, somente em `@polaris/web#knip`. `ADMIN_E2E_DATABASE_URL` foi removida de `SAFE_VERIFY_ENV`, pois a CI a mapeia para `E2E_DATABASE_URL` e não há consumidor com o nome original. `DATABASE_URL` permanece disponível somente para tarefas cujo código o usa ou compara com um alvo; migrações e `db:push` recebem a URL direta e runtime para preservar a validação de destinos distintos. `ASAAS_CARD_CHECKOUT_ENABLED` está limitada a `@polaris/web#dev`/`@polaris/web#start`; `RLS_SMOKE_EXPECTED_RUNTIME_ROLE`, somente a `@polaris/web#db:smoke:rls`. A workflow operacional ainda não fornece a role esperada, então a asserção só fica ativa quando esse valor chegar à task.

O Turborepo foi atualizado para 2.11.5 estável. Os builds Sentry configuram remoção dos mapas client-side após upload; o Turbo exclui todo `*.map` dos outputs, inclusive mapas server-side que o SDK pode manter. O comando raiz de build detecta a configuração Sentry completa no processo ou nos arquivos `.env` da aplicação selecionada e usa `--force` para impedir cache reads; a raiz Vercel de Web já chama esse comando. O carregador local do Admin agora respeita valores explícitos do processo antes de `.env.local`, preservando os placeholders vazios de `verify`. A CI comum continua sem credenciais Sentry; o Remote Cache permanece desligado.

As quatro sample-rate vars sem consumidor foram removidas do `.env.example` e do runbook Vercel vigente; o documento histórico P50 foi preservado. As vars Inngest continuam pass-through apenas nas tasks Web de build/desenvolvimento/execução/preflight devido ao uso implícito ainda não resolvido pelo SDK.

**Verificação:** `bun x turbo --version` retornou 2.11.5. Dry-runs JSON de Web, Admin, banco e operações resolveram os envs por task e confirmaram `cache: false` nas tasks operacionais/persistentes, outputs de build com exclusão de mapas e inputs `.env*` apenas nos dois builds. `bun x ultracite check`, `bun run docs:check` e `git diff --check` passaram. Nenhum teste, build com Sentry ou conexão com banco foi executado. P32 está concluído; o Remote Cache continua desligado até o fluxo Sentry e os outputs serem confirmados em ambiente controlado, como pré-condição de P31.

### Ponto 33 — padronizar Node.js e Bun

**Estado:** aceito em 2026-09-25, com Q1 aprovada.

**Proposta do relatório:** remover a chamada incidental de `node` do hook `prepare`, mantendo Bun como ferramenta do projeto, e declarar/documentar o Node esperado pela Vercel.

**Evidência inicial em 2026-09-25:** `package.json` fixava Bun `1.3.11`, mas não declarava `engines.node`; não havia `.node-version`/`.nvmrc`. O `prepare` chamava `node scripts/install-git-hooks.mjs`. CI fixava Bun `1.3.11`, mas não Node. `vercel.json` usava Bun para install/build e não declarava Node. O ambiente auditado reportou Node 22.20.0 e Bun 1.4.0.

**Comparação com o Hub:** o Hub declara `engines.node: 24.x` e `packageManager: bun@1.3.11`, e chama Bun no `prepare`. Não tem `.node-version` nem `actions/setup-node`, portanto seu exemplo não prova paridade de Node na CI; Polaris adotará uma pinagem mais explícita.

**Versão selecionada e trade-off:** Node 24.x é a linha LTS atual e é default/suportada pela Vercel; Node 26 é Current e não é a escolha de runtime de produção. Next.js 16 requer Node 20.9+. O Node continua relevante para Next/CLIs com shebang e para o runtime de produção, então converter só o hook para Bun não padronizaria o Node usado nas outras superfícies.

**Decisão aprovada:** adotar Node 24.x como runtime suportado. Declarar `engines.node: "24.x"`, adicionar um `.node-version` canônico para desenvolvimento local e `actions/setup-node` nos jobs CI que usam CLIs Node, lendo esse arquivo; fixar a action por SHA verificado conforme P26. Quando os projetos Vercel forem criados, confirmar Node 24.x no runtime e que o manifest efetivo do Root Directory declara essa versão. Alterar `prepare` para `bun scripts/install-git-hooks.mjs`, sem reescrever o `.mjs` para TypeScript. Alinhar `@types/node` ao major 24. Manter Bun como package manager/runtime do projeto e resolver a divergência Bun local/manifest/CI dentro da migração de stack aprovada em P2.

**Pesquisa de apoio:** [pesquisa do ponto 33 sobre Node.js e Bun](research-ponto-33-node.md).

**Revalidação para execução em 2026-09-28:** P2 já alinhou Bun em `1.4.2` no `packageManager` e nos quatro jobs de CI; a divergência antiga de Bun foi resolvida e não deve ser reaberta em P33. A auditoria inicial encontrou Node local `22.20.0`; depois o usuário atualizou manualmente para `24.21.0` x64. `prepare` ainda executava Node e `scripts/run-next-with-local-env.ts` também chama `node` explicitamente. Não havia `engines.node`, arquivo de versão ou `actions/setup-node`. Node 24 segue LTS até abril de 2028 e é o runtime default da Vercel; Node 26 ainda está no canal Current e não é listado entre os runtimes Vercel. O Bun 1.4.2 respeita shebangs `node` por padrão, e o binário Turbo usado nos scripts tem shebang `node`, então fixar Bun não fixa o Node PATH. Fontes oficiais e detalhes no registro P33.

**Implementação P33 aprovada em 2026-09-28:** `engines.node: "24.x"` foi declarado na raiz e em `apps/admin/package.json`, `.node-version` fixa a linha 24, o `prepare` agora é executado por Bun, e as declarações diretas `@types/node` da raiz e `packages/ui` foram alinhadas à linha 24 (lock resolve 24.19.0). Cópias transitivas mantidas por dependências upstream não foram substituídas por override global. `actions/setup-node` v7.0.0 está pinada ao SHA verificado `820762786026740c76f36085b0efc47a31fe5020`, lendo `.node-version` e buscando o patch 24 mais recente. A configuração foi adicionada aos quatro jobs de CI e aos quatro jobs operacionais que invocam Turbo; os jobs de checklist Bun-only e o dispatch shell-only não recebem a action. README e AGENTS agora descrevem a separação entre Bun e Node. O Node local já está em 24.21.0; não foi adicionado version manager.

**Verificação P33:** Node `v24.21.0` e Bun `1.4.2` confirmados. `CI=true bun install --frozen-lockfile` passou; `bun run typecheck:all` passou nos 12 tasks após alinhar os manifests raiz e `packages/ui`; `bun x ultracite check`, `bun run docs:check` e `git diff --check` passaram. O SHA do setup-node v7.0.0 foi verificado (`verified: true`, `reason: valid`). `actionlint` não está instalado; as inserções YAML foram revisadas contra a sintaxe oficial. Nenhum teste ou workflow Actions remoto foi executado. A implementação foi aprovada pelo usuário em 2026-09-28.

### Ponto 34 — hook Codex e Impeccable

**Estado:** aceito em 2026-09-25, com a clarificação de que Impeccable será introduzido no Polaris.

**Proposta do relatório:** garantir que o hook Codex do repositório funcione em clone limpo ou seja explicitamente opcional, sem depender silenciosamente de uma skill instalada só na máquina.

**Evidência:** `.codex/hooks.json` está versionado em Polaris e Hub, mas ambos apontam para `.agents/skills/impeccable/scripts/hook.mjs`, que não existe em nenhum dos dois repositórios. A skill Impeccable atualmente instalada na máquina também não contém esse caminho; ela oferece um CLI e instruções para instalar/configurar o hook. O comando atual é relativo ao cwd da sessão.

**Documentação atual:** OpenAI Docs define hooks de projeto como não gerenciados: exigem confiança explícita; comandos executam com o cwd da sessão; paths de repo devem resolver pela raiz Git; o script precisa existir no ambiente. A documentação oficial do Impeccable recomenda instalar a skill por projeto, habilitar hooks via sua ferramenta e aprovar/trust `PostToolUse` e `Stop` no Codex; seu `doctor` detecta script ausente. [OpenAI Docs — Hooks](https://learn.chatgpt.com/docs/hooks), [Impeccable — instalação](https://impeccable.style/tutorials/getting-started), [Impeccable — hooks](https://impeccable.style/docs/hooks/).

**Decisão aprovada:** não manter o `.codex/hooks.json` atual com a referência quebrada. Introduzir Impeccable como skill de projeto no Polaris durante a fundação, usando a instalação oficial em escopo de projeto e gerando novamente a configuração do hook pela ferramenta oficial. Versionar/distribuir tudo o que o hook realmente precisa; resolver script pela raiz Git e garantir que clone limpo não falhe se a ferramenta estiver ausente. Codex ainda exige confiança explícita do usuário via `/hooks`; o hook de design é assistivo e não gate de CI/release. Até a integração do Impeccable estar presente e validada, remover a entrada obsoleta do hook. Se a instalação não fornecer artefatos portáveis no repo, manter uso manual/local ou escolher uma distribuição compartilhada (como submodule) antes de reintroduzir hook de projeto. Não copiar o estado atual do Hub.

**Pesquisa de apoio:** [pesquisa do ponto 34 sobre hook Codex e Impeccable](research-ponto-34-codex-hook.md).

### Ponto 35 — `DESIGN.md` como contrato de interface

**Estado:** aceito em 2026-09-25, com Impeccable confirmado como parte da fundação.

**Proposta do relatório:** evoluir `DESIGN.md` para documentar tokens e fundamentos visuais, shells e layout, apresentação de dados, tabelas, formulários, estados, gráficos e comportamentos responsivos.

**Evidência no Polaris:** `DESIGN.md` já contém um contrato parcial, então a revisão deve corrigi-lo e completá-lo, não substituir o arquivo por um guia genérico. `packages/ui/src/globals.css` implementa os tokens compartilhados e temas claro/escuro usados por `apps/web` e `apps/admin`; ambos iniciam em tema escuro. Há divergências entre o texto e a implementação: o documento chama de “Roxo Escuro” um token secundário que é cinza-claro, presume superfícies brancas e proíbe sombras apesar de haver sombras funcionais em overlays, tooltips e notificações. Também prescreve fonte monoespaçada para valores monetários embora o código use números tabulares e formatadores compartilhados. `.impeccable/design.json` já está versionado e contém dados que se sobrepõem a tokens/regras, apesar de a integração da skill ainda não estar instalada no projeto.

**Comparação com Hub:** o `DESIGN.md` do Hub mostra como organizar um contrato de interface com regras e estados explícitos, mas seu volume, identidade visual, paleta, domínio, páginas e componentes são próprios daquele produto. Aproveitar a estrutura e o nível de clareza; não copiar seu conteúdo nem expandir o arquivo do Polaris até o mesmo tamanho sem necessidade.

**Decisão aprovada:** revisar `DESIGN.md` como contrato conciso, acionável e ligado às fontes reais do Polaris. Organizar o conteúdo por escopo e precedência; fundamentos visuais e temas; layout comum e diferenças entre web/admin; dados, tabelas e gráficos; formulários, status e interações; estados de carregamento, vazio, erro, sucesso, desabilitado, permissão negada, conteúdo longo e telas estreitas. Corrigir a nomenclatura dos tokens e descrever o tema escuro padrão e o suporte ao tema claro. Preferir regras funcionais a proibições absolutas: sem elevação decorativa por padrão, permitindo sombras que expliquem a hierarquia de overlays e feedback. Para números, documentar alinhamento e dígitos tabulares, remetendo aos formatadores; para gráficos, escolher baseline e apresentação segundo o tipo de métrica. Manter `packages/ui/src/globals.css` como fonte de implementação dos tokens, `PRODUCT.md` como contrato de produto e `CONTEXT.md` como vocabulário do domínio. Detalhes normativos de acessibilidade ficam no ponto 36, com referências cruzadas para evitar duplicação.

**Impeccable:** introduzir a skill no Polaris conforme o ponto 34. Usar `/impeccable document` como apoio para observar e redigir uma primeira versão; revisar o resultado contra o produto, CSS, componentes e decisões aprovadas. Reconciliar o `DESIGN.md` gerado e `.impeccable/design.json` para não manter cópias conflitantes de tokens ou regras. Não migrar para o formato DTCG sem uma necessidade concreta de intercâmbio entre ferramentas; os CSS custom properties já alimentam as duas aplicações.

**Pesquisa de apoio:** [pesquisa do ponto 35 sobre o contrato de design](research-ponto-35-design-contract.md).

### Ponto 36 — contrato conciso de acessibilidade

**Estado:** aceito em 2026-09-25, com Q1–Q3 aprovadas.

**Proposta do relatório:** tornar verificáveis as expectativas de acessibilidade, cobrindo navegação por teclado, foco visível, HTML semântico, labels e nomes acessíveis, alvos de interação, estados que não dependem só de cor, tabelas e diálogos.

**Evidência no Polaris:** `PRODUCT.md` pede legibilidade e bom contraste de forma genérica; `AGENTS.md` já contém regras gerais sobre HTML semântico, teclado e labels, e `DESIGN.md` já menciona foco em alguns componentes. Primitivos compartilhados usam estilos `focus-visible`, componentes Radix e markup nativo. Ainda não há um contrato curto que reúna os critérios; os testes estáticos de acessibilidade do admin são seletivos e não encontrei varredura Axe. O `Button` oferece variantes de 20 px que aparecem em algumas telas e merecem revisão do alvo efetivo e das exceções WCAG; a API de tabela também expõe `onRowClick` só por ponteiro, mas não encontrei uso atual dessa opção. Esses achados são candidatos para corrigir/verificar, não uma declaração de falha em todas as telas.

**Comparação com Hub:** o Hub formaliza critérios no `DESIGN.md` e usa Axe em jornadas Playwright de CI, além de verificações de teclado. Aproveitar o formato do contrato e a combinação de automação/manual; não copiar os limiares de severidade nem as regras específicas do Hub sem validar escopo e comportamento no Polaris.

**Decisão aprovada:** adotar WCAG 2.2 nível AA como referência interna para a interface web e admin, sem afirmar conformidade do produto inteiro antes de avaliação completa. Criar uma seção compacta em `DESIGN.md`, complementar às regras gerais de `AGENTS.md`; manter em `PRODUCT.md` o princípio de inclusão com ponteiro para a regra operacional. Aplicar os critérios a toda interface nova ou alterada e revisar/corrigir as jornadas existentes antes da primeira produção, sem colocar defeitos conhecidos em quarentena. Cobrir no contrato: teclado e foco; semântica/nome/função/estado; rótulos, instruções e erros; mensagens de status; estados sem dependência exclusiva de cor; contraste nos dois temas; alvos de pelo menos 24×24 CSS px quando exigido pelo critério AA, aplicando apenas as exceções documentadas; cabeçalhos e relações de tabela; e nome/foco/fechamento de diálogos. Não elevar exigências AAA — como Focus Appearance ou alvos universais de 44×44 px — a mínimos AA.

**Verificação aprovada:** adicionar Axe às jornadas E2E representativas como check de CI depois de corrigir o baseline inicial e configurar os bancos E2E não produtivos. Complementar com revisão manual de teclado e foco nas mudanças interativas e verificação direcionada de leitor de tela para widgets complexos. O scanner não certifica conformidade; não fazer alegação WCAG AA do produto sem avaliação completa das páginas e processos no escopo.

**Pesquisa de apoio:** [pesquisa do ponto 36 sobre acessibilidade](research-ponto-36-accessibility.md).

### Ponto 37 — `@polaris/ui` como fundação visual única

**Estado:** aceito em 2026-09-25, com Q1–Q3 aprovadas.

**Proposta do relatório:** manter primitives compartilhadas em `packages/ui`, composições específicas em app/feature e não criar um segundo design system local.

**Evidência no Polaris:** `apps/web` e `apps/admin` já dependem de `@polaris/ui`; não encontrei outro diretório local de primitives nas aplicações. `packages/ui` mantém exports declarados e os testes `package-interface.test.ts`/`package-boundary.test.ts` cobrem partes da interface do pacote. Porém, aliases `@/components/ui/*`, `@/hooks/*` e `@/lib/utils` nos `tsconfig` apontam diretamente para `packages/ui/src` e contornam as verificações que operam sobre imports com `@polaris/ui/...`. A memória `aidd_docs/memory/project-state.md` ainda diz que `@polaris/ui` não foi extraído, embora a estrutura atual prove o contrário; reconciliar essa afirmação no trabalho de memória/documentação já aprovado.

**Limite observado:** `components/shared` reúne primitives e padrões úteis entre apps, mas também composições de negócio. O dashboard admin apresenta atividade da plataforma e alimenta `SalesCountChart` e `RevenueProfitChart` com métricas de vendas/lucro zeradas. `ContributionGraph` tem rótulo padrão “vendas”. Isso demonstra que compartilhar código não garante compartilhar o mesmo significado. `ThemeToggle` e `AdminThemeToggle` são quase duplicados e podem ser consolidados se a política de tema continuar igual. As composições visuais específicas devem ficar em `apps/<app>/src/components/<área>` ou `_components` junto à rota; não movê-las automaticamente para `apps/web/src/features`, que tem uma fronteira arquitetural própria.

**Comparação com Hub:** o Hub é um app único, sem `packages/ui`, e mantém primitives em `src/components/ui`. Seu contrato é boa referência para não duplicar tokens e componentes canônicos; a topologia não deve ser copiada para o monorepo de duas aplicações do Polaris.

**Decisão aprovada:** manter `@polaris/ui` como fonte única de tokens, primitives e padrões de UI que compartilhem intenção, interação e contrato. Deixar no app/rota as páginas, rótulos, dados, regras e composições específicas de domínio. Promover um padrão conforme responsabilidade estável e uso/contrato real, sem limiar rígido de consumidores e sem abstrair apenas por expectativa futura. Não duplicar Buttons, Inputs, tokens ou primitivas equivalentes localmente. Usar subpaths públicos declarados de `@polaris/ui` em todas as importações entre apps e pacote; retirar os aliases locais que contornam essa fronteira e reforçar o teste para rejeitar esses imports em web e admin.

**Correções aprovadas para a implementação:** manter primitives genéricas de gráfico em `@polaris/ui`, mas levar as composições de vendas/lucro para a área de negócio correta. A área admin deve usar métricas e rótulos próprios da plataforma ou remover/adiar a visualização até existirem dados reais, sem reutilizar gráficos de vendas com zeros. Tornar os rótulos de `ContributionGraph` contextuais. Consolidar `ThemeToggle` entre apps se a verificação confirmar a mesma política e comportamento. Atualizar a memória arquitetural stale como parte da reconciliação documental aprovada.

**Pesquisa de apoio:** [pesquisa do ponto 37 sobre a fronteira de UI](research-ponto-37-shared-ui.md).

### Ponto 38 — não criar um pacote `domain` genérico

**Estado:** aceito em 2026-09-25, com critério refinado.

**Proposta do relatório:** manter a prudência de não criar packages por estética; exigir uma fronteira conceitual estável e compartilhamento/necessidade reais, evitando dezenas de pacotes microscópicos.

**Evidência no Polaris:** não há `packages/domain` nem `@polaris/domain`. O monorepo já tem packages com propósitos concretos (`auth`, `billing`, `date`, `db`, `events`, `platform`, `platform-auth` etc.) e features de ERP em `apps/web/src/features`. Testes verificam fronteiras entre features, rotas, UI e acesso ao banco. `@polaris/platform` é focado na administração e tem um consumidor app direto; seu limite mostra que um único app consumidor pode ser suficiente quando o package isola uma capacidade/ownership real. A revisão de código de julho rejeitou o pacote amplo por falta de uma seam justificável; a conclusão continua coerente, mas o argumento de número de adapters não deve virar um requisito universal para extração.

**Comparação com Hub:** o Hub é um app Next único, sem workspaces de apps/packages; organiza áreas por `src/features`. Isso é referência para manter capacidades locais coesas, não uma justificativa contra ou a favor de packages num monorepo de duas aplicações.

**Decisão aprovada:** não criar agora um `@polaris/domain` genérico nem packages vazios para catálogo, vendas, produtos ou metas. Manter regras e composições dentro das features proprietárias ou nos packages atuais com responsabilidade explícita. Futuramente, criar `packages/<capacidade>` apenas quando a capacidade tiver vocabulário validado, coesão/invariantes próprios, API estável e benefício arquitetural concreto (consumo com mesmo significado, isolamento de dependências/runtime, teste/ownership ou outra fronteira demonstrável). Dois apps consumidores são evidência forte, não condição obrigatória; também não basta duas telas importarem uma função por conveniência. Evitar abstrações especulativas e packages microscópicos. A reconciliação da memória de julho será feita conforme o trabalho documental aprovado, preservando o fato correto de que `@polaris/domain` não existe.

**Pesquisa de apoio:** [pesquisa do ponto 38 sobre packages de domínio](research-ponto-38-domain-package.md).

### Ponto 39 — contrato executável de fronteiras do workspace

**Estado:** aceito em 2026-09-25, com Q1–Q2 aprovadas.

**Proposta do relatório:** formalizar um grafo simples em que as aplicações dependem de packages, não importam source uma da outra e packages não importam apps; validar as direções com testes/scripts pequenos.

**Evidência no Polaris:** já há testes Vitest específicos para várias camadas do web, para imports Admin→Web e para partes da interface do `@polaris/ui`. A cobertura do workspace ainda é parcial: não há check recíproco Web→Admin nem packages→Admin; Admin→Web não cobre todos os imports relativos; verificação de dependências/exports está concentrada em UI. `audit:boundaries` na CI é um check diferente, sobre chamadas de auditoria transacional. Os testes web/admin já rodam no job `verify`, portanto o contrato pode bloquear CI sem workflow novo.

**Comparação com Hub:** o Hub é um app único, sem grafo `apps/*`/`packages/*`; tem testes estreitos para fronteiras locais, mas não um contrato de dependências entre múltiplas aplicações e packages. Usá-lo como referência para checks pequenos, não como modelo de monorepo.

**Decisão aprovada:** documentar esta matriz: `apps/web` e `apps/admin` podem depender de packages por dependências/subpaths declarados; apps não importam source umas das outras em nenhuma direção; packages não importam source de apps; dependências package-to-package são declaradas e o grafo não tem ciclos. Não impor uma camada ordenada rígida entre todos os packages neste ponto. Manter os contratos internos existentes por camada e registrar a matriz em `docs/architecture/overview.md`, com ponteiro curto nas instruções de agentes.

**Verificação aprovada:** ampliar os helpers/testes Vitest existentes para cobrir a matriz, incluindo imports por alias, relativos, re-exports e dinâmicos relevantes, usando a AST do TypeScript e os `tsconfig` reais onde regex não for suficiente. Reforçar a validação de dependências e exports públicos, alinhando-a ao P37. Manter os checks sob a suíte atual executada pela CI; não adicionar Nx, dependency-cruiser ou outro framework por enquanto. `turbo boundaries` e suas tags continuam experimentais segundo a documentação atual; reavaliar quando estiverem estáveis ou se as regras crescerem além do teste próprio. O `audit:boundaries` transacional não será reutilizado como nome/implementação desse contrato.

**Pesquisa de apoio:** [pesquisa do ponto 39 sobre fronteiras](research-ponto-39-boundaries.md).

### Ponto 40 — template curto de pull request

**Estado:** aceito em 2026-09-25, com Q1 aprovada.

**Proposta do relatório:** criar um template curto para registrar objetivo, mudanças, risco, banco/migrations, providers, documentação, validação e homologação, especialmente útil em PRs preparados por IA.

**Evidência e contexto:** Polaris não tinha template de PR; o Hub já tem um. Os prompts de base `staging`, hotfix e CodeRabbit obrigatório do Hub não se aplicam ao fluxo Polaris. O template do GitHub preenche o corpo do PR; CI e proteção de branch continuam sendo controles separados. As decisões P3/P4/P5/P30 definem PRs para `main`, sem aprovação humana obrigatória, homologação antes do go-live após configuração dos ambientes e reviewers de IA opcionais.

**Decisão aprovada:** criar um único `.github/pull_request_template.md` em português com prompts centrais de problema/resultado esperado, solução/escopo e verificação relevante para revisão humana. Incluir um bloco condicional para impactos de banco/migrations/RLS, providers/ambiente, documentação e rollout/reversão quando aplicável; nunca pedir valores de secrets ou dados reais. Não repetir lint/typecheck/test/build que a CI já mostra, não exigir CodeRabbit/Copilot ou aprovação humana, não fixar base `staging`/hotfix e não exigir homologação em PRs enquanto o ambiente não estiver configurado. Preview/Staging será informado quando existir e for relevante. O campo de risco usará os níveis definidos no ponto 41.

**Pesquisa de apoio:** [pesquisa do ponto 40 sobre template de PR](research-ponto-40-pr-template.md).

### Ponto 41 — classificação de mudança por risco

**Estado:** aceito em 2026-09-25, com Q1–Q2 aprovadas.

**Proposta do relatório:** usar três níveis (`low`, `medium`, `high`) e associar a cada um um nível proporcional de verificação.

**Decisão aprovada — classificação:** classificar pelo efeito plausível, alcance, reversibilidade e incerteza, não pelo caminho/extensão dos arquivos nem pelo tamanho do diff. Usar o maior nível aplicável; uma combinação só eleva a classe quando cria um novo modo de falha ou aumenta o blast radius. Se houver dúvida material entre níveis, usar o superior até delimitar o efeito.

- **Low:** apresentação/copy/refatoração localizada sem alteração de regra relevante, dados, permissões, integração externa ou operação/deploy.
- **Medium:** comportamento de negócio, endpoint ou integração com alcance e recuperação limitados, sem tocar fronteiras críticas de identidade, tenancy, finanças, schema/dados ou produção.
- **High:** auth/autorização privilegiada, isolamento entre organizações/RLS, billing/estados financeiros/webhooks, migrations/backfills/deleções difíceis de reverter, secrets/workflows de produção ou efeitos externos amplos/difíceis de reverter. Alterações visuais em fluxo sensível não são Low apenas por serem visuais; um provider simulado pode ser Medium, enquanto cobrança real ou efeito financeiro é High.

**Verificação aprovada:** manter os mesmos checks de CI e o mesmo `verify:quick`/pre-push aprovados em P20/P21 para todos os PRs; nenhum nível serve de bypass ou substitui CI. `Low` não adiciona uma camada fixa além da verificação base e do teste focal quando há comportamento. `Medium` pede evidência focada no caminho alterado (unit/integration/E2E conforme o invariante) e atualização documental se mudar contrato. `High` pede testes especializados do invariante afetado (auth/tenant/RLS, migration/dados, billing/provider ou workflow/secrets), compatibilidade e plano de recuperação/rollback/forward-fix quando relevante. Smoke em Staging é exigido antes de produção quando o ambiente estiver configurado; até lá, validar em CI/local não produtivo e não alegar teste de produção. Não exigir aprovação humana adicional, label obrigatória, bypass ou uso obrigatório de reviewers de IA.

**Relação com P40:** o template registra um único nível de risco com justificativa concisa, sem copiar esta matriz ou a lista de verificações. Os procedimentos específicos por domínio permanecem nas fontes técnicas/runbooks correspondentes.

**Pesquisa de apoio:** [pesquisa do ponto 41 sobre classificação de risco](research-ponto-41-risk.md).

### Ponto 42 — Definition of Done por risco

**Estado:** aceito em 2026-09-25, com Q1 aprovada.

**Proposta do relatório:** tornar explícito em `AGENTS.md` o que cada nível Low/Medium/High precisa provar antes de declarar o trabalho concluído.

**Evidência:** `AGENTS.md` já tem um critério geral de conclusão, mas não aponta à matriz aprovada no P41 nem exige teste focal para mudança comportamental. `docs/testing/strategy.md` já descreve as camadas e limitações dos testes, e é a fonte adequada para abrigar a matriz operacional. `docs/README.md` ainda não lista esse guia diretamente. `docs/maintenance.md` cobre atualização documental e deve manter esse escopo. P15/P16 orientam usar ponteiros curtos e evitar duplicação no arquivo raiz.

**Decisão aprovada:** manter `docs/testing/strategy.md` como fonte única para a matriz Low/Medium/High de P41 e suas evidências proporcionais. Indexá-la em `docs/README.md`. Em `AGENTS.md`, preservar o critério geral de conclusão e acrescentar um ponteiro acionável: em implementação/refatoração/mudança de comportamento, classificar o risco, consultar a estratégia e provar o comportamento afetado com teste focal; compilação/typecheck isolados não demonstram comportamento correto. Não copiar a matriz inteira para `AGENTS.md`. Manter `docs/maintenance.md` dedicado à matriz de atualização documental. Enquanto P20/P21 ainda não forem implementados, não apresentar `verify:quick`/`verify` ou hooks futuros como comandos existentes.

**Pesquisa de apoio:** [pesquisa do ponto 42 sobre Definition of Done](research-ponto-42-dod.md).

### Ponto 43 — registro vivo de prontidão de produção

**Estado:** aceito em 2026-09-25, com Q1–Q3 aprovadas.

**Proposta do relatório:** criar uma matriz atualizada de configuração, testes, evidências e última verificação para os sistemas necessários à produção.

**Evidência no Polaris:** não existe registro único de status de produção. `docs/operations/environments-and-deployment.md` já distingue configuração/preflight de evidência externa e afirma que o restore drill versionado não prova uma restauração concluída. `check-production-readiness.ts` valida o preflight local; `check-production-certification.ts` valida valores/evidências declarados no ambiente; `check-restore-drill.ts` valida campos de um checklist. Nenhum desses scripts comprova sozinho conectividade com Vercel/Neon/providers nem execução bem-sucedida de backup/restore. O usuário confirmou que Polaris ainda não foi publicado na Vercel. Para os demais providers, ausência de evidência local não determina seu estado real.

**Comparação com Hub:** `docs/operations/release-state.md` registra checkpoints datados com SHA implantado/verificado/documentado, ambiente e evidências externas. É uma boa referência para escopo e proveniência, mas pode ficar desatualizado; o conteúdo sensível, histórico detalhado e sequência operacional do Hub não deve ser copiado. Polaris já tem runbooks que permanecem fontes dos procedimentos.

**Decisão aprovada:** criar `docs/operations/production-readiness.md` como registro curto de estado e evidências, apontando para regras/runbooks existentes e sem duplicar seus passos. Adicionar um link a partir de `docs/operations/environments-and-deployment.md` e indexar o arquivo em `docs/README.md`. Cada item identifica gate/sistema e ambiente, condição de aceite e procedimento, configuração remota e resultado de validação como fatos distintos, evidência sanitizada, data UTC, responsável/próxima ação e gatilho de revalidação.

**Estados aprovados:** `não provisionado`, `desconhecido` (sem verificação externa), `configurado, não validado`, `validado em não produção`, `validado em produção`, `bloqueado` e `fora do escopo`/`adiado` com motivo. Não deixar campos vazios que pareçam “passou”; não inferir configuração externa a partir de código, schema ou CI efêmera. Evidências não podem conter secrets, URLs com credenciais, PII, payloads ou dumps.

**Escopo e atualização aprovados:** incluir gates requeridos pelo lançamento escolhido; integrações candidatas sem decisão de go-live ficam adiadas/fora de escopo com motivo, sem presumir que todo provider implementado seja obrigatório. Revalidar após mudanças de domínio/configuração, secret scope/rotação, callbacks, branch/role/schema/RLS, provider, deploy ou exercício de recuperação, e antes da produção. Não adotar prazo universal de expiração; aplicar cadência própria apenas quando exigida pelo controle ou provider. Não transformar o registro em diário de cada deploy; apontar para IDs/SHA/workflows e histórico existentes.

**Pesquisa de apoio:** [pesquisa do ponto 43 sobre prontidão de produção](research-ponto-43-production-readiness.md).

### Ponto 44 — estratégia de backup e recuperação

**Estado:** aceito em 2026-09-25, com Q1–Q3 aprovadas.

**Proposta do relatório:** elevar backup e restauração a prioridade anterior à produção; configurar Neon PITR/backup, documentar o procedimento, executar um restore drill real e definir RPO/RTO.

**Evidência no Polaris:** não há automação versionada que faça backup ou restore de produção. `scripts/check-restore-drill.ts` valida campos de evidência declarados; o job manual da CI não conecta ao Neon nem executa `pg_restore`. `docs/operations/environments-and-deployment.md` já explicita esse limite. As imagens finais de produto são bytes duráveis em R2, fora do PostgreSQL; PITR e `pg_dump` não as recuperam. Uploads de `staging` são temporários por desenho.

**Comparação com Hub:** o Hub demonstra uma implementação de `pg_dump` cifrado em bucket R2 separado, credenciais segregadas e restore em destino descartável com medição. Aproveitar esses controles e a prova de restauração, sem copiar sua frequência, retenção, nomes de recursos, custo ou configuração de credenciais.

**Decisão aprovada:** antes de armazenar dados reais de produção, configurar Neon PITR e manter cópia periódica `pg_dump` cifrada antes do upload em bucket R2 privado e dedicado, separado dos buckets de imagens. PITR será a via para recuperar erros recentes dentro da janela disponível; snapshots Neon podem servir como checkpoints de operações arriscadas ou retenção adicional se plano e custo justificarem, mas não substituem a cópia externa. Definir frequência, retenção e plano Neon de forma que o último backup externo verificado atenda ao objetivo de negócio, após medir tamanho, crescimento, churn/WAL, transferência e restauração; não copiar sizing do Hub nem presumir que o plano Free seja adequado.

**Objetivos iniciais aprovados:** para perda total do projeto Neon, RPO máximo de 1 hora e RTO máximo de 8 horas até banco e aplicação estarem operacionais. A frequência do backup externo deve manter o último artefato verificado dentro desse RPO e sinalizar falhas/atrasos; se a medição pré-produção mostrar que a meta não é atendida, ajustar a arquitetura, plano ou processo antes do go-live, sem declarar a meta cumprida apenas por agenda configurada. Para erro operacional recente com Neon disponível, usar PITR até o ponto imediatamente anterior ao incidente, dentro do histórico configurado.

**Escopo e validação aprovados:** incluir imagens finais de produto no plano de recuperação com cópia/retention ou procedimento de reconstrução/reenvio validado junto aos metadados do banco. Uploads temporários de `staging` ficam fora do objetivo enquanto forem descartáveis. Executar restore drills em branch/banco não produtivo descartável, sem endpoint público, validando archive/hash, cifra e chave, schema/migrations, invariantes críticos e prontidão da aplicação; medir idade do backup, perda observada e tempo de recuperação. Nunca restaurar sobre produção durante o drill. Separar credenciais de backup/restauração por bucket e privilégio, guardar chave privada fora do repositório, CI e storage, e definir retenção/lifecycle/lock sem expor o bucket nem impedir operações legítimas de retenção. Registrar configuração e evidências sanitizadas no registro de prontidão P43; repetir antes do go-live e após mudanças relevantes em ferramentas, chaves, destino, schema ou processo de recuperação.

**Ajuste da revisão integral:** medir o RPO do último dump externo completo, legível e restaurável no instante do incidente, incluindo atraso e falha de agenda; uma frequência nominal de uma hora não comprova o RPO máximo aprovado de uma hora. Definir também o cenário de perda/exclusão dos objetos finais R2: bucket separado na mesma conta não isola comprometimento ou perda da conta Cloudflare. A proteção de objetos deve ser escolhida segundo esse cenário e comprovada no drill, sem presumir que um `pg_dump` os recupere. [PostgreSQL — backup](https://www.postgresql.org/docs/current/backup.html), [Cloudflare — R2 Bucket Lock](https://developers.cloudflare.com/r2/buckets/bucket-locks/).

**Pesquisa de apoio:** [pesquisa do ponto 44 sobre backup e recuperação](research-ponto-44-backup-restore.md).

### Ponto 45 — migrations deliberadas, fora do build

**Estado:** aceito em 2026-09-25, com Q1–Q3 aprovadas.

**Proposta do relatório:** manter migrations separadas do build e do deploy automático da aplicação, com uma sequência deliberada de schema, migration versionada, replay em CI, homologação, backup/recuperação, migration de produção e smoke.

**Evidência no Polaris:** `vercel.json` chama `bun run build`; não há migration nesse comando. `@polaris/db` já separa `db:generate`, `db:migrate` e `db:push`; `db:migrate` exige `DATABASE_URL_DIRECT` distinto de `DATABASE_URL`, mas o guard atual não confirma que a conexão aponta para o host/branch pretendido. O job CI `postgres-behavior` aplica as 42 migrations atuais em PostgreSQL 16 descartável e executa testes de comportamento/RLS; isso valida replay do zero, não upgrade ou configuração de uma branch Neon real. Não há workflow versionado que aplique migrations em produção.

**Comparação com Hub:** o Hub mantém migration em operação/job separado do build, valida o branch e o SHA e serializa execução. Serve como referência de controle, mas sua automação, credenciais e fluxo de promoção não devem ser copiados sem considerar as decisões P4/P23–P27 do Polaris.

**Divergência documental:** `docs/runbooks/deploy-vercel.md` e `docs/runbooks/saas-organization-migration-runbook.md` não expressam uma única sequência completa entre migration, runtime, deploy e smoke. Consolidar esses runbooks durante a implementação para cada mudança saber se é compatível antes do deploy ou exige fases separadas.

**Decisão aprovada:** não executar migrations no build de PR/Preview/Production nem em hooks de instalação/build. Manter `generate` → revisão/ajuste de SQL → migration versionada no repositório → replay e testes em CI → `migrate` como aplicação deliberada. Não editar arquivos de migration já aplicados; corrigir com uma migration nova. A regra específica para `db:push` fica no ponto 46.

Aplicar migrations de produção por operação operacional separada, iniciada por `workflow_dispatch`, com um único alvo/ação por execução, SHA de release aprovado e credenciais no Environment `production`, sem exigir aprovação humana adicional. Antes de executar, validar de forma segura o projeto/host/branch esperado, sem registrar connection strings ou credenciais nos logs; `DATABASE_URL_DIRECT` separado do runtime não basta para confirmar o alvo. Serializar por recurso do banco e não cancelar uma migration em andamento. A automação deverá respeitar a divisão de CI e operações e o escopo de secrets já aprovados em P23–P27.

**Sequência aprovada:** desenvolver e revisar SQL; reaplicar todas as migrations em PostgreSQL efêmero na CI; ensaiar a mudança em branch Neon descartável por PR quando configurada; usar Staging persistente após provisionar a infraestrutura escolhida; confirmar a evidência de recuperação P44 antes da produção; executar migration de produção compatível ou faseada; implantar a aplicação; executar smoke de banco e funcional; registrar SHA, migration, resultado e evidência sanitizada em P43. Até Vercel/Neon/E2E e Staging estarem configurados, não declarar esses gates concluídos.

Para mudanças compatíveis, adicionar o schema antes de implantar código que depende dele. Para rename, remoção, backfill ou outra alteração incompatível, dividir em fases `expand` → migração/backfill seguro → `contract`, mantendo compatibilidade entre versões durante a transição. Não tratar rollback de código como rollback do banco; preparar forward-fix ou recuperação apropriada ao risco. Avaliar locks e efeitos de cada SQL sobre tabelas com dados, sobretudo índices e backfills.

**Pesquisa de apoio:** [pesquisa do ponto 45 sobre o ciclo de vida de migrations](research-ponto-45-migration-lifecycle.md).

### Ponto 46 — restringir `db:push` a bancos locais descartáveis

**Estado:** aceito em 2026-09-25, com Q1–Q2 aprovadas.

**Proposta do relatório:** formalizar que `db:push` só pode alterar banco descartável/local autorizado; Staging e Production recebem migrations versionadas.

**Evidência no Polaris:** root, `apps/web` e `packages/db` expõem `db:push`. O wrapper atual exige `DATABASE_URL_DIRECT` PostgreSQL distinto de `DATABASE_URL`, mas não verifica host, projeto, branch ou persistência do alvo. `README.md` proíbe o comando em Production, enquanto `apps/web/src/db/README.md` o permite genericamente “em desenvolvimento” e o lista nos comandos úteis. O único `AGENTS.md` atual não possui regra específica de banco.

**Comparação com Hub:** o Hub também mantém o script disponível, mas suas instruções de database/release proíbem seu uso para releases e adotam migrations forward-only. O comando disponível não equivale à permissão de usá-lo em qualquer ambiente.

**Trade-off verificado:** a documentação Drizzle não apresenta uma proibição técnica universal: o FAQ recomenda `push` para banco local, enquanto a página específica descreve usos possíveis de schema sync inclusive em produção/blue-green. Para o Polaris, o histórico de SQL versionado, os invariantes de RLS e a necessidade de provar o mesmo upgrade em CI pesam mais que a conveniência de sincronizar schema remoto diretamente.

**Decisão aprovada:** restringir `db:push` a PostgreSQL local descartável. Em qualquer banco remoto — inclusive branches Neon temporárias por PR — usar `db:generate`, revisar/versionar SQL e aplicar com `db:migrate`; assim CI, homologação e produção percorrem a mesma trilha auditável. Não usar `db:push` em branch compartilhada de desenvolvimento, Preview, Staging ou Production.

Implementar uma proteção no comando suportado que recuse hosts fora de uma allowlist local explícita antes de chamar Drizzle, falhando de forma segura sem imprimir URL/credenciais e sem override genérico de ambiente. O wrapper deve cobrir os atalhos da raiz e de `apps/web`; invocar `drizzle-kit push` diretamente continua fora do fluxo suportado e deve ser proibido nas instruções. Criar `packages/db/AGENTS.md` com a regra operacional, acrescentar ponteiro curto nas instruções raiz conforme a árvore aprovada e corrigir `apps/web/src/db/README.md` para distinguir banco local descartável de ambientes remotos persistentes. Manter o aviso já existente no `README.md` e harmonizar referências em documentação.

**Pesquisa de apoio:** [pesquisa do ponto 46 sobre a política de `db:push`](research-ponto-46-db-push-policy.md).

### Ponto 47 — releases identificam SHA e deployments

**Estado:** aceito em 2026-09-25, com Q1–Q2 aprovadas.

**Proposta do relatório:** vincular o SHA validado às implantações reais de Web/Admin e ao conjunto de migrations, para a release representar uma versão verificável do sistema e não apenas o estado atual de uma branch.

**Evidência no Polaris:** ainda não há Vercel publicada nem workflow de deploy; a CI constrói Web e Admin, cada um com configuração Vercel própria. O runbook atual recomenda validar Preview e depois `vercel deploy --prod`, sem registrar a identidade do build produzido. Não existe registro que una SHA, deployments e estado aplicado do banco.

**Comparação com Hub:** o Hub vincula staging, CI, SHA candidato, deployment de produção, migrations, smoke e deployment anterior de rollback. Seu registro `release-state.md` é um snapshot operacional datado e não prova o estado remoto atual do Polaris.

**Decisão aprovada — registro:** usar SHA Git completo como identidade primária do código e registrar junto: execução/checks de CI; para cada projeto Vercel (`web` e `admin`), deployment ID/URL/target/estado e SHA reportado, que precisa corresponder ao candidato; conjunto ordenado/identificadores e estado aplicado das migrations; smokes e evidência sanitizada; e deployment/SHA anterior como referência de recuperação. Não exigir semver agora, nem usar branch, `latest` ou horário de build como identidade de release.

**Decisão aprovada — promoção:** preferir um staged deployment de Production criado a partir do SHA selecionado, sem atribuição automática do domínio; validar o deployment com smoke seguro e protegido e promover o deployment ID exato sem rebuild. Na Vercel, promover um Preview a Production aciona um novo build com variáveis de Production; não é promoção do mesmo artefato. Staged Production já é construído com variáveis e serviços de Production, mesmo sem tráfego do domínio, então não serve para homologação mutável: essa prova pertence ao Staging isolado de P4/P5. Se o fluxo futuro reconstruir, registrar o novo deployment como artefato distinto e confirmar que o SHA-fonte continua igual ao candidato. Configuração de proteção/CLI/Git integration fica para quando o projeto Vercel for provisionado; nenhum estado remoto foi inferido. [Vercel — promoção de Preview](https://vercel.com/docs/deployments/promote-preview-to-production), [Vercel — staged Production](https://vercel.com/docs/cli/deploying-from-cli#deploying-a-staged-production-build).

Web e Admin terão IDs de deployment próprios associados à mesma release. Não presumir que a promoção de dois projetos seja atômica; P48 definirá a coordenação, a ordem e o tratamento de releases que afetem apenas uma aplicação.

**Pesquisa de apoio:** [pesquisa do ponto 47 sobre identidade de release por SHA](research-ponto-47-release-sha.md).

### Ponto 48 — deploys separados, releases coordenadas por impacto

**Estado:** aceito em 2026-09-25, com Q1–Q2 aprovadas.

**Proposta do relatório:** manter Web e Admin como projetos/deployments distintos, reunindo os dois numa release coordenada para que código, banco e aplicações não avancem em combinações incompatíveis.

**Evidência no Polaris:** há builds e configurações Vercel separadas para Web e Admin, mas ainda não há projetos Vercel publicados nem workflow de deploy. Os apps compartilham `@polaris/auth`, `@polaris/db`, `@polaris/date`, `@polaris/e2e-support` e `@polaris/ui`; Admin ainda consome `@polaris/platform`. A CI atual constrói e verifica ambos. O runbook faz referência a ambos, mas seus comandos de deploy não selecionam explicitamente os dois projetos.

**Comparação com Hub:** o Hub tem um único app e deployment Vercel, então seu fluxo de SHA e promoção é referência para checks, não para coordenar múltiplos projetos.

**Decisão aprovada:** manter Web e Admin como projetos separados. Mudança comprovadamente local a uma aplicação pode publicar somente essa aplicação, registrando o deployment ID/SHA atual da outra como inalterado e justificando a compatibilidade. Mudanças em schema/RLS/migrations, autenticação, pacotes compartilhados, configuração global ou contratos usados por ambos exigem builds e validações dos apps afetados a partir do mesmo SHA, e a release só se completa quando todos os smokes passam.

Manter CI completa dos dois apps por enquanto, sem filtro por caminho ou otimização `--affected`. Depois que a Vercel for provisionada, conferir Root Directories e inclusão de workspaces externos; considerar o skip nativo de projetos não afetados somente após validar que o grafo de dependências reconhece todos os pacotes compartilhados.

**Promoção não atômica:** deixar todos os candidatos afetados construídos e validados antes da primeira promoção; promover os projetos em sequência e executar smoke por app. Se uma promoção ou smoke falhar, parar, registrar o estado parcial e seguir recuperação compatível com a release e o banco, sem afirmar que dois domínios foram atualizados numa transação única.

**Pesquisa de apoio:** [pesquisa do ponto 48 sobre deploys separados e releases coordenadas](research-ponto-48-coordinated-app-releases.md).

### Ponto 49 — proteger o perímetro do Admin na Vercel

**Estado:** aceito em 2026-09-25, com Q1–Q3 aprovadas.

**Proposta do relatório:** manter duas barreiras para o Admin: Vercel Authentication protege o perímetro do deployment; Better Auth e a autorização `platform_admin` protegem identidade e permissão dentro do Polaris.

**Evidência no Polaris:** `apps/admin` tem configuração Vercel própria e domínio dedicado previsto, mas ainda não foi publicado; configuração remota não pode ser inferida do repositório. `apps/admin/src/lib/platform-admin-auth.ts` exige sessão e `packages/platform-auth/src/admin-guard.ts` exige cadastro/grant ativo, não revogado e não expirado, com role mínima. Páginas e Server Actions atuais invocam esse guard. O layout `(dashboard)` atualmente renderiza `children` quando não encontra contexto; endurecer para falhar fechado e manter verificações próprias nas Server Actions/Route Handlers. O smoke do Admin trata HTTP 401/403 como proteção externa, mas não prova sozinho o escopo configurado na Vercel. Login real e sessão entre origens ainda não foram confirmados.

**Comparação com Hub:** Hub é um app/projeto único, sem Admin separado. Seus documentos desativavam Vercel Authentication por restrições/custos anteriores para proteger domínios; isso não é modelo transferível. Em 2026-09-09 a Vercel anunciou `All Deployments` com Vercel Authentication, incluindo produção, sem add-on em todos os planos.

**Decisão aprovada — perímetro:** configurar `Vercel Authentication` com escopo `All Deployments` somente no projeto Vercel do Admin, cobrindo Preview, URLs geradas e o domínio customizado de Production. `Standard Protection` exclui domínios de produção e, portanto, não basta para o Admin. Não aplicar `All Deployments` como default de time sem verificar o projeto Web: Preview/URLs geradas do Web ficam protegidas, mas seu domínio de Production será público quando o produto for lançado.

O acesso ao deployment do Admin fica limitado aos operadores internos que tenham conta Vercel e acesso ao projeto/time. A fundação assume um grupo pequeno de operadores autorizados na Vercel; quem não tem esse acesso não poderá iniciar o login do Polaris. Não usar shareable links, exceções de domínio ou bypass de automação para abrir o Admin Production. A configuração de acesso e quantidade de operadores será revalidada ao provisionar hosting.

**Decisão aprovada — autorização do produto:** manter Better Auth, grant ativo de `platform_admin` e verificação de role mínima como controles independentes da Vercel. Nenhum acesso Vercel concede privilégio do Polaris; nenhum bypass de perímetro remove a autorização interna. Fazer o layout do grupo `(dashboard)` falhar fechado quando sessão/contexto/grant não for válido e continuar validando Server Actions e Route Handlers de forma independente.

**Validação e evidência:** registrar em P43 o projeto alvo, `All Deployments`, domínio/ambientes, data UTC, operador e evidência sanitizada. Antes de Production, testar Preview/URLs geradas e domínio customizado do Admin; negar visitante sem acesso Vercel, negar membro Vercel sem grant `platform_admin`, permitir operador com grant/role válidos, e confirmar que o fluxo Better Auth/OAuth e os smokes funcionam com a barreira ativa. Quando Web for publicado, confirmar que seu domínio de Production continua público. Não inferir configuração remota por `vercel.json`, UI da aplicação ou um único status HTTP.

**Pesquisa de apoio:** [pesquisa do ponto 49 sobre perímetro do Admin](research-ponto-49-admin-perimeter.md).

### Ponto 50 — identificar o snapshot operacional de julho como histórico

**Estado:** aceito em 2026-09-25, mantendo o local aprovado em P14.

**Proposta do relatório:** manter o valor histórico de `production-closed-test.md`, mas impedir que operadores/agentes meses depois tratem seus IDs de serviços, configuração e comandos como estado operacional vigente.

**Evidência no Polaris:** `aidd_docs/production-closed-test.md` está marcado como atualizado em 2026-07-12 e contém IDs/hosts Vercel/Neon, envs, webhook e comandos de configuração/promoção. Isso contradiz a informação atual de que o Polaris ainda não foi publicado/conectado à Vercel. O snapshot também cita `R2_BUCKET_PUBLIC`, enquanto código e `.env.example` usam `R2_BUCKET_FINAL`. Não encontrei valores literais de secrets no arquivo. O `AGENTS.md` não carrega esse arquivo automaticamente: com o bloco de memória vazio, só orienta ler `aidd_docs/memory/`; o snapshot está fora dessa pasta e não é referenciado pelo `project-state.md` atual.

**Autoridade documental:** o P14 já aprovou preservar `aidd_docs/` no lugar, como histórico/contexto auxiliar sob demanda, sem migração em massa. O P12 definiu snapshots históricos como material com data/status próprios, não páginas canônicas com freshness. `docs/architecture/external-integrations.md` e `docs/operations/environments-and-deployment.md` são fontes atuais e dizem que configuração remota não se infere do repositório; o registro P43 será a autoridade operacional de status/evidências.

**Comparação com Hub:** o Hub separa revisões não canônicas no índice e rotula snapshots, mas sua pasta `docs/reviews` e seus status/frontmatters não são uniformes. Adotar a distinção histórica/canônica, não criar agora a mesma árvore de diretórios. Em Polaris, mover o snapshot contrariaria P14 e exigiria reparar referências sem mudar o fato de que o estado remoto é desconhecido.

**Decisão aprovada:** manter `aidd_docs/production-closed-test.md` no local atual e preservar seu conteúdo como registro histórico. Acrescentar no topo `status: historical`, a data do snapshot `2026-07-12`, aviso de que IDs/hosts/envs/comandos não descrevem o estado atual e não devem ser usados para configurar ou executar deploy, e ponteiro para P43 e runbooks vigentes. Não mover para `docs/reviews/`, não carregá-lo no bootstrap do agente e não copiar seus valores antigos para fontes canônicas. Reconciliar a memória `aidd_docs/memory/project-state.md` conforme P14, sem afirmar configuração remota não verificada.

**Pesquisa de apoio:** [pesquisa do ponto 50 sobre snapshot operacional](research-ponto-50-operational-snapshot.md).

### Ponto 51 — preservar e distinguir documentos históricos

**Estado:** aceito em 2026-09-25, com Q1–Q2 aprovadas.

**Proposta do relatório:** preservar relatórios e planos antigos, separando-os das fontes canônicas para que não sejam lidos como regras ou estado atual.

**Evidência no Polaris:** `docs/README.md` é o mapa canônico aprovado, mas ainda contém snapshots de cobertura antigos e não classifica com clareza contratos vigentes, evidência operacional, decisões e histórico. `AGENTS.md` ainda dá prioridade a `aidd_docs/` e carrega `aidd_docs/memory/project-state.md`, que contém afirmações remotas antigas. `docs/reports/` e `docs/superpowers/plans/` contêm estados e avisos mistos; planos podem conter comandos imperativos. P12–P15 já definem metadados seletivos, freshness não universal, `docs/README.md` como mapa e ponteiros curtos no `AGENTS.md`.

**Comparação com Hub:** o Hub mostra um mapa de autoridade e marca planos substituídos com `execution_status`, `superseded_by` e “Não executar”, mas seus status e `docs/reviews/` também são inconsistentes. Aproveitar os controles pontuais, sem copiar a taxonomia inteira nem criar pastas por simetria.

**Decisão aprovada — autoridade e lifecycle:** classificar em `docs/README.md` fontes canônicas vigentes, estado/evidências operacionais P43, decisões aceitas/ADRs e material histórico/planos. Em `AGENTS.md`, apontar ao mapa e declarar que snapshots/relatórios antigos são contexto da auditoria, não instruções nem prova de estado atual; antes de executar plano antigo, confirmar lifecycle e fonte canônica. Snapshots stale de risco recebem `status: historical`, data/SHA disponíveis e ponteiro atual; planos substituídos recebem `execution_status: superseded`, `superseded_by` e aviso “Não executar”; planos ativos/concluídos recebem lifecycle explícito. ADRs conservam o lifecycle P11. Fazer inventário/backfill dirigido por risco, sem migração ou metadados em massa, preservando conteúdo/local conforme P14/P50 e sem aplicar `owner`/`last_verified` de fonte vigente a históricos.

**Relação com P13:** validar status/links estruturalmente somente nas classes acordadas. Históricos não recebem freshness nem owner atual por padrão; status não é inferido pelo nome da pasta, e `accepted` não torna relatório uma fonte vigente. O `docs/README.md` é fonte viva, ainda que os dados de cobertura/commit nele sejam snapshot a atualizar conforme P12.

**Pesquisa de apoio:** [pesquisa do ponto 51 sobre autoridade e lifecycle histórico](research-ponto-51-historical-docs.md).

### Ponto 52 — atualizar a stack na fundação e congelar o SHA de homologação

**Estado:** aceito em 2026-09-25, mantendo P2 e aprovando o início condicional do freeze.

**Proposta do relatório:** fazer audit, atualizar patches/minors de baixo risco e verificar tudo antes de Production; evitar mudanças grandes na reta final.

**Reconciliação com P2:** P2 já autorizou atualizar as tecnologias escolhidas para releases estáveis recentes, inclusive majors estáveis, durante a fundação. Prereleases ficam fora; substituições de produto/framework/fornecedor exigem análise de trade-off positiva separada. P52 define a janela de freeze, não revoga esse escopo.

**Evidência no Polaris:** o repositório ainda está em fundação e não tem Staging/homologação persistente configurado; portanto, o freeze não começa agora. As versões declaradas/resolvidas são snapshots, e o Hub não é baseline de latest. No corte desta revisão, Next `16.2.10` está na faixa do advisory crítico de `next/og` Node `ImageResponse`, corrigida em `16.3.6`; a busca direta não encontrou `next/og`/`ImageResponse` em `apps/` ou `packages/`, então a condição concreta de exploração não foi confirmada. A política P2 continua a favor de atualizar a linha estável antes de Production, sem afirmar exposição não verificada.

**Decisão aprovada — upgrades:** durante a fundação, atualizar versões selecionadas para releases estáveis atuais, inclusive majors já autorizadas, em PRs/batches pequenos por superfície de risco. Revisar suporte, changelog, advisories, peer dependencies e guias de migração; executar os gates relevantes aprovados após cada etapa. Não fazer um único PR gigante. Atualização de Next/React/Drizzle/Better Auth/Tailwind é distinta de trocar framework/ORM/auth/fornecedor; substituições permanecem sujeitas a comparação própria. RC/beta/canary, incluindo Drizzle 1.0 RC, ficam fora da base estável.

**Freeze aprovado:** não congelar dependências durante a fundação. Iniciar freeze de mudanças rotineiras somente quando um SHA exato entrar na homologação final para Production. Durante esse período, manter o candidato estável até a promoção; P26 continua definindo a cadência/destino dos PRs Dependabot. Correções de segurança aplicáveis e blockers de release podem entrar durante o freeze; geram novo SHA candidato e exigem repetir verificações, smokes e evidências afetadas. Não colocar advisories em quarentena apenas por causa do freeze. Encerrar o freeze após Production estabilizada; a manutenção pós-lançamento será definida em P53.

**Comparação com Hub:** versões do Hub são de um checkout datado e não constituem lista de latest. Polaris pode estar à frente em algumas dependências e atrás em outras; escolher a versão alvo por fonte oficial/compatibilidade, não por paridade com Hub.

**Pesquisa de apoio:** [pesquisa do ponto 52 sobre janela de dependências](research-ponto-52-dependency-window.md); [advisory oficial Next.js](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j).

### Ponto 53 — cadência contínua de dependências

**Estado:** aceito em 2026-09-26, com Q1–Q2 aprovadas.

**Proposta do relatório:** processar alertas de segurança imediatamente, atualizações patch semanal/quinzenal, minor mensal e major em planejamento/ADR, evitando grandes limpezas anuais.

**Evidência no Polaris:** não há `.github/dependabot.yml` no repositório. Polaris usa Bun workspaces com `bun.lock` raiz; a CI instala com lockfile congelado e constrói/testa Web e Admin. P26 define Dependabot em PRs para `main`, merge manual depois dos checks e sem auto-merge enquanto a infraestrutura E2E/Staging ainda não estiver pronta. O Hub tem update checks semanais para Bun e GitHub Actions com target `staging`, groups de patch/minor e limite de PRs; seu branch/target não se transfere ao Polaris.

**Documentação atual:** GitHub suporta `package-ecosystem: bun` com Bun >=1.1.39; a agenda de version updates é configurada por ecosystem, com intervalos como weekly/monthly. Security updates são disparados por advisories e não esperam essa agenda/cooldown. Groups podem separar patch/minor de major, mas não aplicam frequências diferentes aos grupos.

**Decisão aprovada — version updates:** adotar checks semanais de Dependabot para o ecossistema Bun e GitHub Actions. Agrupar patches e minors separadamente para facilitar revisão, manter majors em PRs individuais e não ignorá-los em definitivo. PRs permanecem em `main`, passam pela CI e são mesclados manualmente conforme P26; sem auto-merge. Não usar `target-branch: staging` antes de reabrir P4 e provisionar seus gates.

**Decisão aprovada — segurança:** tratar updates de segurança fora do schedule, priorizar conforme P41 e corrigir sem quarentena conforme P22. Dependabot pode abrir PR automaticamente, mas ele ainda precisa dos checks e merge manual. Se não houver fix, registrar a mitigação, responsável e próximo passo; não transformar advisory em baseline indefinido.

**Majors pós-fundação:** durante a fundação, P2/P52 continuam autorizando releases estáveis, inclusive majors, em batches verificados. Após Production, atualizar majors por plano de migração/compatibilidade e validação específica, sem auto-merge. ADR é necessário quando a mudança altera uma decisão arquitetural ou substitui tecnologia/fornecedor, não para cada bump de versão.

**Cadência:** weekly é o ponto inicial para evitar drift e grandes limpezas. Reavaliar volume de PRs e tempo de triagem depois de operar o fluxo; reduzir frequência de version updates se o ruído superar o benefício, sem atrasar correções de segurança. P26 continua sendo autoridade para branches, staging e merge.

**Pesquisa de apoio:** [pesquisa do ponto 53 sobre cadência de dependências](research-ponto-53-dependency-cadence.md).

### Ponto 54 — alinhar o major PostgreSQL da CI ao alvo Neon

**Estado:** aceito em 2026-09-26, com Q1–Q2 aprovadas.

**Proposta do relatório:** conferir o major PostgreSQL do Production antes do lançamento e usar o mesmo major no serviço PostgreSQL da CI, pois o projeto testa RLS, grants, migrations, constraints e comportamento SQL.

**Evidência no Polaris:** `.github/workflows/ci.yml` usa `postgres:16` no job `postgres-behavior`, que reaplica migrations e verifica comportamento PostgreSQL/RLS. O repositório não prova o major de uma branch Neon real. As migrations usam `pg_trgm`; não foi encontrada extensão ou sintaxe que force permanecer no PG16. O Hub usa PG18 na CI, mas seu checkout é um snapshot e não prova versão atual do Neon de nenhum dos projetos.

**Fontes atuais:** PostgreSQL 18.6 é a major estável atual suportada; PostgreSQL 19 ainda está em Beta 4. A Neon informa que novos projetos usam PostgreSQL 18 por padrão. Um projeto Neon permanece fixado à major criada; upgrade posterior exige migração para novo projeto, e as ferramentas Labs de upgrade da Neon continuam experimentais/não recomendadas para produção.

**Decisão aprovada:** escolher PostgreSQL 18 como major alvo para um novo Neon Production no estágio atual e alinhar o serviço PostgreSQL da CI, E2E, Staging e Production ao mesmo major. Usar PG18 porque é a stable atual e o padrão Neon para projetos novos, não por paridade cega com o Hub. PG19 Beta fica fora da base de produção segundo P2.

Antes do go-live, verificar a major e as extensões do branch Neon real por fonte read-only autorizada e registrar a evidência em P43. Se já houver branch persistente em major diferente, decidir e executar a migração/alinhamento antes de gravar dados reais; não deixar CI, E2E e Production em majors divergentes sem exceção documentada. Revalidar a stable atual no momento do provisionamento e só mudar o target se uma nova major GA tiver compatibilidade confirmada. Os testes de migration/RLS/constraints deverão passar contra o major escolhido.

**Pesquisa de apoio:** [pesquisa do ponto 54 sobre a versão PostgreSQL](research-ponto-54-postgres-version.md).

**Execução em 2026-09-27:** `.github/workflows/ci.yml` mudou o serviço de `postgres:16` para `postgres:18.6`, mantendo banco, porta e health check existentes. O teste de contrato em `ci-workflow.test.ts` fixa a tag e o health check; passou em 18/18. `bun x lefthook run pre-push` também passou; testes PostgreSQL reais seguem separados e não foram executados localmente. As notas oficiais ainda listam 18.6 como release estável atual e a imagem oficial publica as tags `18.6` e `18`; preferimos o patch explícito pela reprodutibilidade ([PostgreSQL 18.6](https://www.postgresql.org/docs/release/18.6/), [tags oficiais da imagem](https://github.com/docker-library/official-images/blob/master/library/postgres)). A mudança de `PGDATA` nas imagens 18+ não afeta o serviço atual porque o job não monta volumes ([documentação da imagem PostgreSQL](https://github.com/docker-library/docs/blob/master/postgres/content.md)).

**Limite pendente:** o job `postgres-behavior` da CI ainda precisa executar as migrations, `pg_trgm`, RLS e constraints na imagem 18.6 após o workflow chegar ao GitHub. A mudança local e o teste estático não provam a inicialização real do container.

### Ponto 55 — preservar artefatos úteis de E2E

**Estado:** aceito em 2026-09-26, com Q1–Q2 aprovadas.

**Proposta do relatório:** quando E2E falhar, preservar Playwright report, resultados, trace, screenshot, vídeo quando útil e log de servidor para triagem sem reprodução imediata.

**Evidência no Polaris:** `.github/workflows/ci.yml` tem jobs E2E separados de Web e Admin com URLs de banco E2E próprias e OAuth dummy, mas não faz upload de artifacts. `apps/web/playwright.config.ts` e `apps/admin/playwright.config.ts` usam `trace: on-first-retry`, sem screenshot/video explícitos, reporter HTML/JSON ou outputDir personalizado. `.last-run.json` gerados estão rastreados no Git.

**Comparação com Hub:** Hub gera HTML/JSON, traces, resultados e log do Next; envia sempre os artifacts por 14 dias. É um exemplo útil de triagem, mas o trace/log pode conter conteúdo de rede/tela e dados. Polaris adotará retenção menor e upload condicionado à falha.

**Decisão aprovada:** em cada job E2E, configurar trace `retain-on-failure`, screenshot `only-on-failure` e reporter HTML/JSON explícito; manter vídeo desligado inicialmente porque trace já contém screencast e snapshots. Uploadar report/resultados/test-results somente quando o job E2E falhar, com artifacts separados para Web/Admin e identificados pelo run. Server log só pode entrar se for curado e sanitizado; não enviar workspace, `.env*`, secrets, dumps, arquivos `.next` ou logs indiscriminados. Retenção inicial dos artifacts: 7 dias; ajustar depois conforme necessidade de triagem e política GitHub.

**Privacidade e higiene:** usar somente bancos E2E não produtivos e dados sintéticos. Não confiar em masking de logs para limpar binários/traces; traces podem conter DOM, screencast, headers e corpos de requests/responses. Artifacts do GitHub são baixáveis por quem tem leitura do repositório e não devem ser compartilhados por URLs públicas. Remover os `.last-run.json` gerados já rastreados e ignorar outputs Playwright; manter artifacts fora do versionamento e do deployment.

**Pesquisa de apoio:** [pesquisa do ponto 55 sobre artifacts de E2E](research-ponto-55-e2e-artifacts.md).

### Ponto 56 — regressão visual pequena e seletiva

**Estado:** aceito em 2026-09-26, com Q1–Q2 aprovadas.

**Proposta do relatório:** não adicionar Chromatic nem outra plataforma inteira agora; adotar poucos screenshots visuais de superfícies críticas, evitando centenas de snapshots frágeis.

**Evidência no Polaris:** `@playwright/test` 1.61.1 já está no lockfile e os jobs E2E usam Chromium no Linux, mas não há `toHaveScreenshot`, baselines, Storybook, Chromatic ou Percy. Há jornadas E2E existentes para login/dashboard Web, catálogo/vendas e acesso ao Admin. O dashboard Web, o console Admin e billing mostram contagens, atividade ou estados derivados de dados; os testes também geram alguns IDs dinâmicos e o estado do banco E2E pode persistir entre runs. Não presumir que essas telas estejam prontas para golden screenshots sem fixtures repetíveis.

**Comparação com Hub e mercado:** Hub não mantém baselines visuais. Serve como referência de E2E, fixtures e runner explicitamente fixado em `ubuntu-24.04`, não como origem de imagens para Polaris. Playwright nativo cobre o volume inicial sem novo fornecedor. Chromatic/Percy oferecem diff e revisão em nuvem, mas adicionam credenciais, workflow de revisão e transferência de conteúdo visual; reavaliar se o volume, a revisão distribuída ou a matriz de browsers justificarem isso.

**Decisão aprovada — ferramenta e escopo:** adotar `expect(page).toHaveScreenshot()` nativo, sem Chromatic/Percy no início. Depois de reconciliar `DESIGN.md` conforme P35 e estabilizar as telas escolhidas, começar com poucas capturas de estados reprodutíveis: login Web, catálogo ou um estado representativo da venda e console Admin com fixture controlada. Incluir o shell/dashboard Web apenas quando seus dados forem determinísticos. Incluir billing somente se for crítico ao lançamento e houver estado sintético reproduzível. Não capturar todos os passos dos fluxos nem páginas com dados voláteis.

**Baselines e CI aprovados:** primeira matriz somente Chromium/Linux; fixar o runner visual em `ubuntu-24.04` e usar a versão Playwright correspondente ao lockfile. Definir viewport, locale, timezone, tema e fixtures. Não gerar ou atualizar baselines no Windows local. Armazenar baselines junto aos testes no Git; atualizar explicitamente apenas por mudança visual intencional e revisar cada diff no PR. Não atualizar automaticamente em CI nem elevar thresholds globais para mascarar instabilidade. Após aceitar o primeiro conjunto de baselines, a verificação visual da seleção aprovada é gate obrigatório de CI. Resolver instabilidade com dados/ambiente determinísticos, não quarentena.

**Privacidade e complementaridade:** usar apenas contas, conteúdo e transações sintéticas; não criar baselines a partir de Production. E2E failure artifacts seguem a política de P55. Regressão visual complementa, sem substituir, assertions funcionais e os critérios de acessibilidade aprovados em P36.

**Pesquisa de apoio:** [pesquisa do ponto 56 sobre regressão visual](research-ponto-56-visual-regression.md).

### Ponto 57 — evidências operacionais por integração

**Estado:** aceito em 2026-09-26, com Q1–Q2 aprovadas.

**Proposta do relatório:** validar Sentry, Inngest, Resend, R2, Upstash, health de Web/Admin, OAuth e webhooks de pagamento como parte da prontidão operacional.

**Evidência no Polaris:** o workflow `production-certification-checklist` e `scripts/check-production-certification.ts` validam campos e valores declarados, não consultam os provedores. Há smokes HTTP para Web/Admin, mas o OAuth Web só é seguido até o redirect inicial do Google; `401/403` do Admin protegido prova a barreira Vercel, não a saúde interna do runtime. `/api/internal/health/r2` verifica `HeadBucket` do bucket de staging e CORS; não prova PUT/GET de objeto. O endpoint web de health consulta DB. `docs/operations/observability.md` confirma que dashboards/alertas/retention de Sentry ainda dependem de evidência externa.

**Comparação com Hub:** os runbooks e checklists do Hub mostram operações controladas para Sentry e ciclo de vida de Resend, além de evidências associadas a ambiente/SHA. Os registros disponíveis são snapshots de 2026-09-03, não provam o estado remoto atual. Aproveitar a proveniência e a distinção entre aceitação, entrega e alerta; não copiar os providers, os gates nem os efeitos operacionais do Hub.

**Decisão aprovada — autoridade e escopo:** incorporar os requisitos P57 ao único registro de prontidão P43, sem checklist ou runbook paralelo. Gate obrigatório somente para uma capacidade incluída no lançamento avaliado; se estiver fora do escopo, registrar isso e o gatilho para reabrir. Autenticação e health dos apps exigidos pelo lançamento continuam gates. Ajustar o contrato futuro de certificação para aceitar itens explicitamente adiados/fora de escopo justificados, sem tratar a lista inteira de campos atuais como requisito universal.

**Evidência aprovada:** separar (1) contrato/código e configuração versionada, (2) configuração externa observada no provider e (3) resultado de validação executada contra ambiente/SHA identificados. HTTP 200, configuração presente, CI verde ou timestamp manual isolados não provam entrega nem execução externa. Smokes read-only e canários com efeitos devem ser identificados separadamente. Canário mutável usa dados/recursos sintéticos isolados e começa em Staging; uma operação em Production só ocorre se necessária para provar configuração exclusiva de Production, com escopo explícito e efeito controlado. Nunca enviar pagamento, evento financeiro ou e-mail para cliente apenas para fechar um gate. Registrar evidência sanitizada no modelo P43 e revalidar por gatilho, não a cada commit.

**Health e OAuth:** manter o smoke público de Web, mas tratar o redirect OAuth como início do fluxo, não como login comprovado; completar callback/sessão em Staging com identidade de teste para os clientes OAuth necessários ao lançamento. Para Admin, provar separadamente o perímetro Vercel e o runtime através de verificação autenticada; `401/403` sozinho não é health de aplicação.

**Woovi — bloqueio de prontidão:** documentação oficial consultada em 2026-09-26 define `x-webhook-signature` como assinatura RSA da Woovi; o HMAC usa o header distinto `X-OpenPix-Signature`. O ping de cadastro documentado traz `data_criacao` e `event`, mas o handler atual calcula HMAC no primeiro header e exige um ID ausente nesse ping. Não marcar Woovi como pronta nem habilitá-la no lançamento até reconciliar implementação e contrato e passar homologação sandbox. Se Woovi não fizer parte do lançamento, registrar fora de escopo e um gatilho para reabrir; não declarar que o gate passou. Asaas e Woovi devem ser avaliadas separadamente conforme os meios efetivamente oferecidos no lançamento. Não enviar webhooks financeiros de teste a Production.

**Segurança dos canários:** Sentry usa evento sintético sanitizado e confirmação de alerta/destino; Inngest confirma sync e usa somente função/evento sem efeito de negócio; Resend distingue `accepted` de delivery e usa endereço de teste ou inbox interno allowlisted; R2 usa objeto único no bucket de Staging com leitura e exclusão exata; Upstash usa chave/identificador isolado, sem consumir cota de usuários; pagamento/webhook usa sandbox e acompanha captura/reconciliação esperada. Não registrar secrets, PII, payloads, headers nem URLs com credenciais.

**Pesquisa de apoio:** [pesquisa do ponto 57 sobre observabilidade e gates de release](research-ponto-57-observability-release.md). A incompatibilidade Woovi deve ser corrigida e validada antes de considerar esse provider habilitado.

### Ponto 58 — semântica temporal e fuso de negócio

**Estado:** aceito em 2026-09-26, com Q1–Q3 aprovadas.

**Proposta do relatório:** centralizar timezone e documentar armazenamento, negócio, exibição, datas civis, limites de dia/mês e relatórios antes que cada feature crie sua própria semântica.

**Evidência no Polaris:** a regra canônica já existe em `TIME-001`/`DEC-BR-049`: `America/Sao_Paulo` é a zona global do lançamento. `@polaris/date` centraliza data de negócio, rótulos, avanço civil e limites mensais; o schema distingue vários campos `date` de `timestamptz`. Portanto o ponto está parcialmente implementado e deve completar/alinhar a política existente, sem criar uma segunda regra. A decisão atual não inclui uma coluna ou configuração de fuso por Organização.

**Comparação com Hub e mercado:** Hub também centraliza um fuso global São Paulo e oferece helpers explícitos, mas sua tela de auditoria mistura presets do navegador com casts sensíveis ao fuso de sessão; não copiar esse caminho. A oferta por loja do Shopify ilustra uma alternativa de fuso por negócio, não uma obrigação de mercado. O Brasil inclui zonas UTC−3, UTC−4 e UTC−5, então São Paulo global pode classificar datas civis diferentes do relógio local para negócios no oeste do país.

**Decisão aprovada — escopo:** manter `America/Sao_Paulo` como fuso global para o lançamento, preservando DEC-BR-049; não introduzir agora timezone por Organização nem inferir timezone pelo navegador/IP. Essa escolha dá um calendário operacional único. O efeito conhecido deve permanecer explícito: uma operação perto da meia-noite em UTC−4/UTC−5 pode pertencer ao dia seguinte no calendário São Paulo. Não apresentar as datas como fuso local da loja.

**Semântica aprovada:** data civil de negócio é `YYYY-MM-DD`/PostgreSQL `DATE`, sem horário ou conversão para instante. Um evento pontual é um instante persistido como `timestamptz`, normalizado em UTC pelo PostgreSQL; esse tipo não preserva a zona/offset original de entrada. A data de negócio derivada de um instante usa explicitamente `America/Sao_Paulo`; timezone da sessão PostgreSQL, servidor ou navegador não determina datas de venda, estoque, metas, quotas ou relatórios. Datas e timestamps devem ser formatados como tipos diferentes.

**Períodos e exibição aprovados:** agrupar instantes por dia/mês em `America/Sao_Paulo`; campos já persistidos como `DATE` permanecem datas civis. Consultas por período sobre timestamps usam intervalo semiaberto `[início local, início do próximo período)`, convertido para instantes na zona explícita; evitar `23:59:59.999` e somar sempre 24 horas a um início local. “Últimos N dias” significa dias de calendário do fuso São Paulo, salvo quando o rótulo disser claramente que é uma janela móvel. Exibir timestamps em `America/Sao_Paulo`; uma preferência de fuso por usuário pode ser considerada no futuro apenas para apresentação e nunca muda a data operacional ou o resultado do relatório.

**Mudança futura e histórico aprovados:** a zona global permanece fixa para o lançamento. Uma futura mudança da decisão exige registro/auditoria, data efetiva explícita e tratamento definido para relatórios derivados de timestamps. Datas civis já persistidas não podem ser recalculadas ou reclassificadas silenciosamente; uma futura migração para fuso por Organização também exigirá regra de efetividade e preservação do histórico antes de expor a configuração.

**Correções temporais identificadas para a implementação da fundação:** `apps/web/src/features/products/queries.ts` deriva a data do estorno por `date(cancelled_at)`, dependente do fuso da sessão, embora `sales.cancelled_on` já guarde a data civil; passar a usar o campo persistido. O filtro `from/to` de Admin Events é recebido na página, mas não chega a `getPlatformEventsOverviewForAdmin`; concluir a consulta com limites explícitos de São Paulo. Manter defaults SQL, wrapper de compatibilidade, helpers e formatadores alinhados à regra canônica, e explicitar/corrigir o intervalo de anos suportado por `@polaris/date` (`Date.UTC` remapeia anos de 0 a 99).

**Glossário e autoridade:** ao implementar P8, definir termos como `Instante` e `DataCivil/Data de Negócio` no glossário `CONTEXT.md`, sem copiar ali algoritmo, SQL ou configuração; TIME-001/DEC-BR-049 continuam autoridade da regra de negócio e a documentação técnica descreve o armazenamento e os limites.

**Pesquisa de apoio:** [pesquisa do ponto 58 sobre semântica temporal](research-ponto-58-timezone.md). Fontes primárias: [PostgreSQL Date/Time Types](https://www.postgresql.org/docs/18/datatype-datetime.html), [lei brasileira de fusos horários](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12876.htm), [Shopify — timezone da loja](https://help.shopify.com/en/manual/intro-to-shopify/initial-setup/setup-business-settings).

### Ponto 59 — apresentação visual de dados temporais

**Estado:** aceito em 2026-09-26, com Q1–Q3 aprovadas.

**Proposta do relatório:** complementar `DESIGN.md` com a apresentação de datas sem horário, timestamps, períodos de negócio e rótulos relativos.

**Evidência no Polaris:** `DESIGN.md` ainda não tem regra temporal. `packages/date` e `packages/ui` já definem helpers pt-BR e timestamp explícito em `America/Sao_Paulo`, mas `formatDate(value: Date | string)` mistura data civil e instante e usa timezone local de runtime ao receber `Date`. `apps/admin/src/app/(dashboard)/organizations/organizations-table.tsx` passa `createdAt` (`timestamptz`) a `formatDate`, divergindo de P58. O painel Admin também mantém formatter de timestamp próprio. O Web usa `formatDate` predominantemente para valores civis. Não encontrei formatter relativo atual nos dois projetos.

**Comparação com Hub e acessibilidade:** Hub confirma que locale pt-BR e fuso de negócio explícito são dimensões separadas; seu formatter genérico também mantém risco de misturar `DATE` e instante, então aproveitar a centralização, não a assinatura ambígua. W3C recomenda associar instruções compreensíveis ao formato exigido em campos de data. `<time datetime>` pode oferecer valor legível por máquina, mas não substitui texto exato disponível para pessoas ou tecnologia assistiva.

**Decisão aprovada — contrato visual:** incorporar uma seção curta de dados temporais em `DESIGN.md` como parte do P35. Data civil `YYYY-MM-DD` aparece como `dd/MM/yyyy` em pt-BR e não é convertida por timezone. Instantes aparecem como data e hora em `America/Sao_Paulo`, sem variar por fuso do navegador/usuário. Períodos já seguem a regra P58; `DESIGN.md` registra apenas como devem ser mostrados e aponta para TIME-001/DEC-BR-049, sem duplicar armazenamento ou lógica de SQL.

**Indicação de fuso aprovada:** em telas/relatórios densos em timestamps, incluindo auditoria, financeiro e operações, informar uma vez “Horários no fuso de São Paulo”; não repetir em cada célula nem depender de abreviações como `BRT`. Locale e timezone permanecem conceitos independentes.

**Precisão aprovada:** valores absolutos são primários em finanças, auditoria, vendas, estoque e operações. Rótulos relativos ficam fora da fundação; se adicionados futuramente a uma lista recente de atividade, são apenas complemento e o horário absoluto permanece visível e acessível sem hover. Usar `<time datetime>` quando útil como semântica legível por máquina, sem substituir a apresentação humana.

**Correções visuais para a implementação:** separar formatação de `DATE` e de instant em funções/contratos distintos; corrigir a data `createdAt` da tabela de Organizações para usar `America/Sao_Paulo`, e alinhar o formatter duplicado do dashboard Admin à mesma política. Manter instruções de formato acessíveis nos campos de data. Não iniciar auditoria visual, modificar telas ou abrir navegador neste ponto de planejamento.

**Pesquisa de apoio:** [pesquisa do ponto 59 sobre apresentação temporal](research-ponto-59-temporal-display.md). Fontes: [MDN `Intl.DateTimeFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat), [WHATWG `<time>`](https://html.spec.whatwg.org/dev/text-level-semantics.html#the-time-element), [W3C — instruções de formato](https://www.w3.org/WAI/tutorials/forms/instructions/), [Shopify Live View](https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/live-view).

### Ponto 60 — árvore-alvo como mapa reconciliado

**Estado:** aceito em 2026-09-26, com Q1 aprovada.

**Proposta do relatório:** ilustrar a estrutura final desejada, sem exigir que todas as pastas e workflows apareçam em um único commit.

**Evidência no Polaris:** a raiz já contém os documentos e aplicações principais, mas o desenho não é inventário completo: omite diretórios de negócio, banco, módulos, runbooks, `aidd_docs/`, `plans/` e pacotes ativos como `config`, `e2e-support` e `emails`. O repositório tem hoje somente `ci.yml`; várias pastas/arquivos desenhados não existem. O Hub tem outra arquitetura (monólito em `src/`) e workflows operacionais específicos da sua infraestrutura, portanto o desenho não deve ser copiado literalmente.

**Decisão aprovada:** usar P60 como mapa conceitual com quatro estados — existente, aprovado mas ainda ausente, condicional a uma decisão/configuração anterior e não aprovado — nunca como checklist automática de criação. Omissões no diagrama não apagam arquivos ou categorias atuais. Não criar pastas vazias nem mover conteúdo apenas para coincidir com o desenho; preservar a taxonomia corrente de `docs/` e `aidd_docs/` conforme P7/P14/P50/P51.

**Itens aprovados ausentes a refletir no mapa:** `CONTEXT.md` (P8), `docs/adr/` para decisões válidas (P11), `.github/pull_request_template.md` (P40), `docs/operations/production-readiness.md` (P43) e `.github/workflows/operations.yml` separado de `ci.yml`, com uma operação selecionada por dispatch (P23). `packages/db/AGENTS.md` é uma exceção específica aprovada por P46 para a regra executável de `db:push`; implementá-la junto dessa proteção, sem estender instruções aninhadas por simetria.

**Itens condicionais ou excluídos:** `deploy-staging` depende das escolhas/provisionamento de P4/P5; deploy, preparação de release, smoke, backup e restore seguem P23/P43–48 e inicialmente ficam como operações selecionáveis no único `operations.yml`, não como oito workflows paralelos. Não criar `apps/web/AGENTS.md`, `apps/admin/AGENTS.md` ou `packages/events/AGENTS.md` agora (P15–17); `docs/domain/`, `docs/integrations/`, `docs/reviews/` e `docs/archive/` não são aprovados e duplicariam/relocariam a taxonomia existente (P7/P14/P50/P51). Não incluir Dependency Review nem CodeQL sob o entitlement atual (P28/P29). `scripts/verify.ts` e `scripts/check-docs.ts` são nomes ilustrativos; implementar os contratos aprovados em P20/P13, escolhendo caminhos compatíveis com os scripts e comandos existentes.

**Pesquisa de apoio:** [crosswalk do ponto 60 entre a árvore proposta, o repositório e as decisões aprovadas](research-ponto-60-target-tree.md). P60 consolida decisões já pesquisadas em P4, P7–20, P23–29, P40, P43–51; não introduz uma nova plataforma ou padrão técnico que exija outra pesquisa externa.

### Ponto 61 — ordem de implementação da fundação

**Estado:** aceito em 2026-09-26, com Q1 aprovada e a ordem revisada conforme P3/P4/P20–23/P34/P52/P54/P60.

**Proposta do relatório:** primeiro proteger `main` e uma nova `staging`, exigir CI, bloquear push direto/force-push, corrigir o baseline, reparar o hook Codex e definir ambientes.

**Evidência no Polaris:** o job `verify` executa `audit:baseline` antes dos checks de código; o JSON versionado define `reviewBy: 2026-08-14`, então essa validação falha por expiração no próximo run independentemente do estado atual dos advisories. Isso não é evidência de uma execução remota nova. `.codex/hooks.json` chama `node .agents/skills/impeccable/scripts/hook.mjs`, mas `.agents/` é ignorado pelo Git e não existe neste checkout, portanto a referência não é clone-safe. O serviço PostgreSQL comportamental na CI ainda usa `postgres:16`, divergindo do PG18 aprovado em P54. P3 exige primeiro transferir o repositório para a conta Pro do irmão para proteger `main`; P4 explicitamente mantém a branch `staging` suspensa até escolher/configurar Vercel, banco, callbacks e E2E não produtivos. O mapa Local/CI/Staging/Production já está aprovado em P5, mas não prova provisioning.

**Decisão aprovada — sequência:** (1) remover a referência quebrada do hook enquanto a distribuição de Impeccable não for clone-safe; corrigir a baseline segundo P22, sem quarentena, e implementar `verify:quick`/`verify` em escopo do workspace conforme P20; (2) alinhar o serviço PostgreSQL da CI a PG18 conforme P54 e atualizar tecnologias para estáveis em batches pequenos conforme P2/P52, repetindo verificações afetadas; (3) manter validação push/PR em `ci.yml` e criar o workflow único `operations.yml` de P23 com seleção de uma operação, sem injetar secrets de Production antes de ref/Environment/infra configurados; (4) depois da transferência, o owner configura proteção de `main` para PR, bloqueio de push direto/force-push/deleção e os checks estáveis, sem aprovação humana, e verifica o controle com um PR; (5) habilitar pre-push somente depois de instalar o hook, confirmar Lefthook e medir `verify:quick` conforme P21; (6) só configurar ambiente persistente de Staging — e então decidir se uma branch Git persistente é necessária — após os alvos de P4/P5 estarem definidos e antes do go-live.

**Dependências e limites:** configurar a regra remota de `main` antes de a conta Pro e o baseline verde estarem prontos inverte as dependências de P3; exigir contexts ainda instáveis pode bloquear merge sem um gate válido. Criar/proteger `staging` agora contradiz P4 e não é aprovado. “Definir ambientes” nesta fase significa manter o contrato documental de P5; não significa cadastrar secrets, conectar Vercel/Neon ou alegar E2E/Provider verificado. P2/P52 permitem upgrades estáveis durante toda a fundação; o freeze inicia somente quando um SHA entra na homologação final.

**Pesquisa de apoio:** [crosswalk do ponto 61 sobre sequência e dependências](research-ponto-61-implementation-order.md). A ordem consolida decisões já aceitas; não executamos comandos de verificação nem consultamos estado remoto nesta revisão.

### Ponto 62 — sequência da Fase 1 do workflow

**Estado:** aceito em 2026-09-26, com Q1 aprovada e sequência ajustada aos pontos P20/P21/P23/P25–27/P40/P41.

**Proposta do relatório:** implementar `verify:quick`, `verify`, Lefthook, concurrency, permissões, SHA pinning, template de PR, nomes de branch e labels de risco.

**Evidência no Polaris:** `package.json` ainda não declara `verify:quick` nem `verify`; os scripts de check/test atuais são web-only, e as variantes admin/all não formam por si só perfis completos. `lefthook.yml` chama `check`/`test` antes de push. O único workflow mistura CI e dispatch de operações e não declara `concurrency` nem `permissions`; actions usam tags (`@v4`, `@v2`) em vez de SHA completo. Não há template versionado, regra local de nome de branch ou labels de risco confirmados no checkout; configuração remota não foi consultada.

**Dependências e sequência aprovada:** depois de restaurar baseline P22, implementar `verify:quick` e `verify` conforme P20 (workspace inteiro, sem `--affected`). Só depois apontar Lefthook para `verify:quick`, instalar/confirmar o hook e medir duração conforme P21. Separar `ci.yml` e `operations.yml` primeiro conforme P23; então adicionar concurrency somente à CI, sem cancelar jobs de operação e com cancelamento por workflow/PR/ref, confirmando isolamento de E2E antes de cancelar runs que poderiam compartilhar banco (P27). Definir permissões mínimas P25 e SHA pins P26 em todos os workflows antes de ligar production credentials. Atualizações de pins permanecem manuais/agrupadas segundo P53 e P26. Nenhuma dessas regras altera o gate de produção P43.

**PR e branches aprovados:** criar o template único `pull_request_template.md` de P40; registrar no corpo um nível de risco com justificativa segundo P41, sem labels obrigatórias ou gates baseados em label. Branches são curtas, descritivas e relacionadas a uma mudança/PR (P3/P19); não exigir prefixo de tipo, número de ticket nem validação de nome em CI. A convenção fica fora do caminho crítico; ferramentas podem adotar seus próprios prefixos sem torná-los requisito do repositório.

**O que foi ajustado no relatório:** concurrency antes da separação P23 não é a ordem aprovada; `permissions` e SHA pins são controles de workflow e devem preceder credentials; templates/nomes de branch são complementos de revisão, não parte do perfil de verificação; labels de risco contradizem P41.

**Pesquisa de apoio:** [crosswalk do ponto 62 sobre workflow determinístico](research-ponto-62-workflow-sequence.md). GitHub documenta regras de proteção por branch/pattern e templates de PR, mas não define um padrão universal de nomes; exemplos de contribuidores variam por integração/tamanho de equipe.

### Ponto 63 — sequência de consolidação documental

**Estado:** aceito em 2026-09-26, com Q1 aprovada e escopo reconciliado a P7–17/P35–36/P43/P50–51/P58–60.

**Proposta do relatório:** transformar a documentação em fontes previsíveis: índice, frontmatter, CONTEXT/PRODUCT/DESIGN, ADRs, históricos organizados e instruções do agente.

**Evidência no Polaris:** `docs/README.md`, `PRODUCT.md`, `DESIGN.md` e `AGENTS.md` já existem; `CONTEXT.md`, `docs/adr/` e `docs/operations/production-readiness.md` ainda não. Há 111 Markdown sob `docs/`, sem frontmatter YAML inicial no inventário auditado. O repo já possui taxonomia extensa em `docs/architecture`, `business-rules`, `database`, `modules`, `product`, `reports`, `runbooks`, `operations`, `security`, `testing`, `api` e `superpowers`; `aidd_docs/` tem memória e material histórico. Mover `aidd_docs/` quebraria pelo menos uma referência relativa e contraria P14/P50/P51.

**Comparação com Hub:** Hub tem `CONTEXT.md`, `docs/domain`, `docs/integrations`, `docs/reviews`, `docs/archive` e scripts próprios, mas é um monólito com outros limites e já foi constatado que seus índices/estados também têm deriva. Usar princípios de índice/autoridade e vocabulário, sem copiar a árvore ou migrar Polaris para as pastas do Hub.

**Decisão aprovada — ordem:** (1) reconciliar `docs/README.md` e README raiz como mapa de autoridade, incluindo P43; (2) criar o `CONTEXT.md` raiz com vocabulário de domínio validado, sem especificação ou detalhes de implementação; (3) reconciliar `PRODUCT.md` ao brief estratégico P9 e `DESIGN.md` às decisões P35/P36/P58/P59; (4) criar `docs/adr/` e backfill apenas dos três temas aprovados em P11, sem rationale inventado; (5) atualizar `AGENTS.md` com ponteiros concisos ao mapa/manutenção depois que os destinos existirem; (6) rotular fontes e históricos por risco conforme P12/P51; (7) finalizar a expansão de `docs:check` sobre as classes selecionadas, sem impor freshness universal a históricos ou planos; (8) adicionar a exceção única `packages/db/AGENTS.md` somente junto à proteção executável P46.

**Preservação e limites aprovados:** manter `aidd_docs/production-closed-test.md` no local atual com `status: historical` (P50) e preservar a taxonomia documental e os conteúdos existentes. Não mover AIDD para `docs/reviews`/`docs/archive`, não criar `docs/domain`/`docs/integrations` por simetria, não aplicar frontmatter/freshness/owner em massa e não fazer o `AGENTS.md` carregar todos os documentos canônicos a cada tarefa. Não criar `AGENTS.md` em Web/Admin/Events (P17); `packages/db` é a única exceção específica aprovada por P46.

**ADRs e metadados:** backfill limitado a RLS/autorização tenant-plataforma, outbox transacional e adaptadores de billing, usando rationale confirmado. Status/lifecycle e frontmatter aplicam-se apenas às páginas/classe de risco selecionadas; decisões de negócio continuam em DEC-BR, ADRs mantêm seu próprio lifecycle, históricos mantêm local e data de snapshot.

**Pesquisa de apoio:** [crosswalk do ponto 63 sobre sequência documental](research-ponto-63-docs-sequence.md). P63 é reconciliação de decisões já pesquisadas em P7–17, P35–36, P43, P50–51 e P58–60; não exige uma nova migração de taxonomia.

### Ponto 64 — CI e segurança após estabilizar o workflow

**Estado:** aceito em 2026-09-26, com Q1 aprovada e itens reordenados por suas dependências.

**Proposta do relatório:** separar operações, adicionar Dependency Review/CodeQL, artifacts Playwright, Turbo Remote Cache, `--affected`, rever env hashing e alinhar PostgreSQL CI/Production.

**Evidência no Polaris:** só há `.github/workflows/ci.yml`; E2E Web/Admin não fazem upload de reports/traces/screenshots. O workflow não declara Remote Cache ou `--affected`; `turbo.json` tem listas amplas de env pass-through e side effects que P32 precisa auditar. O job PostgreSQL ainda usa 16, embora P54 já tenha aprovado major 18. A baseline P22 deve ser restaurada antes do POC Semgrep P29.

**Decisão aprovada — tarefas anteriores:** a separação de `ci.yml` e `operations.yml`, os perfis de verificação, permissions, SHA pins e concurrency seguem a ordem P61/P62. Alterar e fixar Actions acontece antes de injetar credenciais operacionais; concurrency só cancela CI depois da separação P23. Alinhar o serviço PostgreSQL da CI a 18 é trabalho inicial P54, não item adiado desta fase.

**Decisão aprovada — artifacts e SAST:** implementar artifacts E2E failure-only segundo P55: Web/Admin separados, reports/test-results, trace `retain-on-failure`, screenshot `only-on-failure`, vídeo off inicialmente e retenção de 7 dias, com conteúdo sintético e sem secrets/dumps. Após baseline P22 verde, executar o POC Semgrep Free Edition autogerido aprovado em P29; avaliar cobertura, falsos positivos, duração, termos e dados antes de decidir se o check será obrigatório. Não adicionar Dependency Review nem CodeQL sob as decisões P28/P29 atuais.

**Decisão aprovada — Turbo:** manter `verify:quick` cobrindo o workspace inteiro, sem `--affected`. Reconsiderar somente após medir duração e validar base Git, mudanças locais, dependentes e gates externos (P20/P31). Antes de ativar Vercel Remote Cache P31, completar a auditoria P32 de `env`/`passThroughEnv`, hashes, inputs/outputs, logs, uploads Sentry e side effects; depois configurar owner/team/scope e credenciais CI limitadas. Se os controles não forem adequados, manter cache local e adiar Remote Cache.

**Medição antes de otimizar a infraestrutura de CI:** após CI verde e jobs separados, registrar para alguns PRs representativos duração total, tempo em fila, duração por job (instalação, checks, builds, Playwright/PostgreSQL), consumo mensal de minutos e taxas de cache disponíveis. Esse baseline fundamenta P20/P31/P32 e a eventual comparação de runners do adendo; promessa comercial de velocidade não é medida do Polaris. O GitHub Pro pessoal inclui minutos de Actions, e a cobrança recai sobre o owner do repositório; o orçamento deve ser observado com ele. [GitHub — billing de Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions).

**Fora desta fase:** não tratar P54 como pendente; não comprar GitHub Code Security nem adicionar Dependency Review/CodeQL; não habilitar Remote Cache antes de P32; não introduzir `--affected` por conveniência; e não compartilhar artifacts E2E de sucesso ou dados de Production.

**Pesquisa de apoio:** [crosswalk do ponto 64 entre CI/segurança e decisões aprovadas](research-ponto-64-ci-security-phase.md). As fontes e avaliações primárias específicas permanecem nos estudos P20–32 e P54–55; P64 é uma consolidação de ordem/dependências.

### Ponto 65 — gate de Production Operations

**Estado:** aceito em 2026-09-26, com Q1 aprovada e escopo condicionado ao lançamento.

**Proposta do relatório:** antes do go-live, provar Vercel Web/Admin, Neon protegido, runtime role/RLS, Staging, OAuth, R2, Upstash, Inngest, Sentry/alerta, Resend, pagamentos, backup/restore, smoke e rollback.

**Evidência no Polaris:** há código de preflight e smokes parciais, mas nenhum deploy Vercel confirmado. O checker de certificação aceita valores declarados e timestamps, não chama os providers; hoje ainda exige campos Asaas/Woovi/R2/Upstash/Sentry mesmo quando um recurso é fora de escopo. O health do Web prova DB reachability, o smoke Google apenas o redirect inicial e Admin `401/403` apenas a proteção externa. R2 health verifica bucket/CORS, não PUT/GET. Backup/restore real ainda não foi implementado; o script de restore drill valida formulário/evidência declarada, não restaura dados.

**Decisão aprovada — autoridade e escopo:** `docs/operations/production-readiness.md` de P43 será o único registro de gates e evidências. Gates-base aplicáveis ao produto — homologação persistente, banco PG18/RLS/runtime role, migrations versionadas, recuperação P44 antes de dados reais, release por SHA e smokes — precisam estar validados. Gates de providers são obrigatórios apenas quando aquela capacidade estiver no lançamento avaliado; caso contrário, P43 registra `fora do escopo/adiado`, motivo e gatilho para reabrir. Corrigir o checker atual para aceitar esse escopo em vez de exigir todos os providers universalmente.

**Sequência aprovada:** (1) definir as capacidades do lançamento e os gates P43; (2) provisionar e completar Staging persistente, com dados sintéticos e serviços sandbox/fake adequados; (3) provar PG18 parity, migrations, runtime role/RLS, OAuth e canários somente para as capacidades aplicáveis; (4) completar PITR/backup cifrado e restore drill em alvo descartável, medir objetivos RPO/RTO e validar recuperação de imagens antes de dados reais; (5) selecionar SHA candidato, executar CI/replay, revisar SQL/compatibilidade e preparar deployments Production staged dos apps afetados; (6) validar o alvo e a prontidão de recuperação, executar a migration de Production como operação separada; (7) validar e promover o deployment ID exato sem rebuild, Web/Admin sequencialmente após todos os candidatos estarem prontos; (8) rodar smoke por app, registrar SHA, migrations, deployments, resultados e deployment anterior no P43. Se a promoção/smoke do segundo app falhar, parar, registrar o estado parcial e recuperar com caminho compatível; rollback do app não reverte migration ou dados.

**Canários e providers:** operações com efeito começam em Staging, com recursos sintéticos isolados. Não gerar pagamentos nem e-mails para clientes para satisfazer checklist. Em Production, somente canário explicitamente necessário, seguro, com escopo e confirmação próprios. Asaas e Woovi são gates separados conforme o meio de pagamento oferecido. Se Woovi estiver no escopo, permanece bloqueada até reconciliar o contrato de assinatura/ping e passar sandbox; se excluída, marcar isso em P43. Para Admin em lançamento, provar separadamente Vercel Authentication P49 e sessão/grant `platform_admin` no app; o health/perímetro não se substituem.

**Pesquisa de apoio:** [crosswalk do ponto 65 sobre readiness de produção](research-ponto-65-production-operations.md). Evidência externa, status e limites dos smokes estão detalhados em P43–P57; nenhum status remoto foi inferido nesta revisão.

### Ponto 66 — fluxo diário e promoção de release

**Estado:** aceito em 2026-09-26, com Q1–Q2 aprovadas.

**Proposta do relatório:** após a fundação, usar branch/worktree de tarefa, teste focal, `verify:quick`, PR para Staging, CI/revisão, merge, deployment/homologação em Staging e release para `main`/Production.

**Evidência no Polaris:** CI triggers currently target push/PR to `main`; no `staging` branch or deploy workflows exist. `verify:quick` is approved in P20 but not implemented; Lefthook remains web-filtered and P21 makes its activation conditional on the verified profile and measured duration. Staging and Vercel/Neon/E2E setup remain conditional on P4/P5. P47/P48 define SHA/deployment identity and non-atomic Web/Admin promotions; they do not approve the report’s branch flow.

**Fluxo diário aprovado:** after P61/P62 prerequisites, `origin/main` → a short task branch → targeted verification → `bun run verify:quick` once implemented (whole workspace, no `--affected`) → PR to `main` → required CI checks → author self-review of diff/evidence → merge. No mandatory human approval; AI review stays optional. Use a worktree only for independent parallel code-writing tasks (P19); sequential tasks use the current task branch and read-only research needs no worktree. Do not require a `staging` branch or automatic staging deployment for every PR.

**Release flow approved:** persistent Staging is an environment required before go-live, but the Git branch/deployment arrangement remains undecided until Vercel, DB, callbacks, and non-production E2E targets are provisioned (P4/P5). Once selected, homologate the release candidate SHA in Staging. If a future `staging` branch is adopted, a merge/rebase/squash into `main` may produce a different SHA; the final SHA on protected `main` must then be re-homologated and must match the SHA deployed/promoted under P47. Follow the P43 readiness register and P45 migration sequence; create/validate staged Production deployments from the selected SHA, promote exact deployment IDs without rebuild when supported, prepare all impacted Web/Admin candidates before the first promotion, and smoke each sequential promotion. If a later app fails, stop, record the partial state and recover compatibly (P48/P65). A Git branch, PR preview, Staging deployment, and Production deployment are distinct states.

**Pesquisa de apoio:** [crosswalk do ponto 66 sobre fluxo diário e release](research-ponto-66-daily-release-flow.md). P66 reaproveita as decisões P3/P4/P5/P19–23/P43/P45/P47–48/P61–62; o fluxo Hub de `staging` é uma referência, não o padrão Polaris atual.

### Ponto 67 — conceitos do Hub a reutilizar

**Estado:** aceito em 2026-09-26, com Q1 aprovada.

**Proposta do relatório:** reaproveitar os conceitos de organização do Hub, sem copiar seus arquivos, porque produto e maturidade operacional são diferentes.

**Evidência/comparação:** a lista P67 agrega decisões já examinadas em P1–P66. Hub usa um monólito com árvore documental, workflows, 17 ADRs e fluxo `staging` próprios; são exemplos locais, não um padrão a transplantar. Parte dos conceitos úteis já está aprovada no Polaris e ainda aguarda implementação.

**Decisão aprovada — classificação:** registrar P67 como mapa dos conceitos e decisões existentes, sem criar uma fase ou tarefas paralelas. Índice/canônicos, `CONTEXT.md`, `PRODUCT.md`, `DESIGN.md`, ADRs seletivos, profiles de verificação, proteção de `main`, workflows CI/operations, migrations separadas, backup/restore, evidência de Production e lifecycle histórico seguem os pontos específicos aprovados. Staging é ambiente obrigatório antes do go-live; branch Git persistente continua condicional a P4/P5. CodeRabbit permanece assistivo; regras na CI significam apenas checks determinísticos aprovados, não codificar toda regra de domínio em YAML.

**Não copiar:** layout Hub de `docs/domain/integrations/reviews/archive`, 17 ADRs, seus onze workflows, `staging` como branch imediata, frontmatter/freshness universal, regras de limpeza de worktrees/branches próprias do Hub, cadência/nome/configuração de backups, regras de LMS, reviewers obrigatórios ou histórico de rollout/hotfix. Cada caminho/controle deve seguir a classificação P60 e as decisões P7–66; nenhum arquivo ou provedor remoto do Hub prova estado do Polaris.

**Pesquisa de apoio:** [crosswalk do ponto 67 entre conceitos do Hub e decisões Polaris](research-ponto-67-hub-transfer.md). O ponto reaproveita auditorias internas do Hub e as decisões P1–66; não traz requisito técnico novo.

### Ponto 68 — limites explícitos para copiar do Hub

**Estado:** aceito em 2026-09-26, com Q1 aprovada.

**Proposta do relatório:** declarar o que não deve ser transplantado do Hub para evitar substituir pouca formalização por burocracia incompatível com o Polaris.

**Decisão aprovada:** usar a relação de P68 como limite negativo do crosswalk P67, não como proibição eterna nem nova fase. Não copiar a quantidade de workflows/documentos/ADRs, diretórios do Hub, conjunto completo de regras AGENTS, cron schedules, topologia Neon, cadência/nome de backup, processo integral de hotfix/reconciliação nem regras do domínio LMS. Aplicar somente a versão Polaris já aprovada: um `operations.yml` inicial e gates seletivos (P23); taxonomia documental atual e metadata/lifecycle por risco (P7/P12/P51/P63); AGENTS raiz e exceção `packages/db` P46 (P17); backup e recovery medidos para P44; Neon/branches definidos por P4/P5/P54; ADRs seletivos P11; release e evidências P43/P45/P47/P48/P65/P66.

**Revisão futura:** qualquer item fora do escopo pode ser reavaliado se surgir uma necessidade concreta, capacidade de plataforma ou risco novo, registrando trade-off e atualizando a decisão aplicável. “Não copiar agora” não apaga os requisitos de segurança, recuperação, prontidão e rastreabilidade que já foram aprovados para o lançamento.

**Pesquisa de apoio:** [crosswalk do ponto 68 sobre itens específicos do Hub não transferidos](research-ponto-68-hub-nontransfer.md). P68 reitera decisões de P4/P7/P11–17/P23–29/P43–51/P57/P60–67; nenhuma estrutura ou configuração remota do Hub foi copiada.

### Ponto 69 — priorização final por dependências

**Estado:** aceito em 2026-09-26, com Q1 aprovada.

**Proposta do relatório:** reduzir as 70 recomendações a dez mudanças de maior retorno, classificadas como P0/P1, antes de voltar a features grandes.

**Evidência e correções:** a tabela P0/P1 mistura blockers de baseline, decisões remotas que dependem da transferência, documentação, gates de Production e otimizações condicionais. “Criar/proteger `staging`” conflita com P4; exigir proteção de `main` antes da transferência e CI verde inverte P3/P22; tirar `aidd_docs/memory` de sua posição de autoridade não significa apagar/mover `aidd_docs` (P14/P50/P51); CodeQL e Dependency Review foram recusados (P28/P29); nested AGENTS são restritos por P17/P46.

**Priorização aprovada — bloqueadores da fundação antes de acelerar features:** corrigir o hook Codex quebrado até que a distribuição Impeccable seja clone-safe; restaurar o baseline P22 sem quarentena; implementar `verify:quick`/`verify` em workspace completo e pre-push conforme P20/P21; alinhar CI a PostgreSQL 18 e concluir upgrades estáveis em batches conforme P2/P52/P54; separar CI/operações e aplicar permissions, SHA pins e concurrency conforme P23–27/P61–64. Após transferência ao irmão e checks verdes, o owner protege `main` conforme P3.

**Governança/documentação paralela à fundação:** reconciliar docs index e autoridade sem mover diretórios; criar o CONTEXT delimitado; fechar PRODUCT/DESIGN; backfill somente ADRs autorizadas e melhorar rastreabilidade de regras; implementar PR template/DoD e `docs:check` seletivo conforme P7–17/P35–42/P50–63. `aidd_docs/` permanece e a leitura de memória/histórico fica seletiva.

**Contratos de ambiente e correções transversais ainda na fundação:** cumprir P5 no contrato local e no `.env.example`: exemplos de Asaas/Woovi devem apontar a sandbox ou exigir escolha explícita de endpoint, e `E2E_DATABASE_URL` deve aparecer como obrigatório para E2E, sem confundir build/CI estático com os jobs que usam DB. Preservar mudanças locais já existentes nesse arquivo ao implementar. Reconciliar a memória arquitetural stale sobre `@polaris/ui` (P37); fechar os aliases que contornam seus exports e ampliar a matriz executável de imports entre apps/packages (P37/P39). Corrigir as divergências temporais concretas de P58/P59 — data civil de estorno, filtro de eventos Admin e formatação de `createdAt` — contra a regra TIME-001 já aprovada. São mudanças de contrato e comportamento verificáveis, não uma nova arquitetura abstrata.

**Gates antes de dados reais e Production:** configurar Staging persistente após P4/P5 e antes do go-live; provar prontidão P43, backup/restore/RPO/RTO P44, migrations P45/P46, PG18 e release SHA/deploy/smoke P47/P48/P54/P65/P66. Gates de provider permanecem limitados às capacidades do lançamento conforme P57; Admin segue P49 quando lançado. Branch Git `staging` não é pré-requisito e só será reavaliada após configuração da infraestrutura.

**Melhorias condicionais, não blockers universais:** artifacts E2E failure-only P55 integram a configuração dos jobs; visual snapshots P56 entram depois do DESIGN P35 e de fixtures determinísticas; o POC Semgrep P29 começa depois de baseline verde e só vira gate se os resultados justificarem; Remote Cache P31 só após auditoria P32 e credenciais/scope limitados; `--affected` só após medir e validar dependentes/gates P20/P31. Não adicionar CodeQL, Dependency Review, labels obrigatórias ou AGENTS por simetria.

**Evidência para encerrar cada frente:** baseline/stack exigem comandos e CI verdes no SHA candidato, com versões estáveis e divergências registradas; workflow/governança exigem PR real com checks requeridos e tentativa controlada de push direto bloqueada depois da transferência; contrato de ambiente exige revisão do exemplo e teste focal dos alvos E2E; arquitetura/tempo exigem testes focais dos invariantes afetados e checks de fronteira; docs exigem leitura de consistência, links e fontes sem duplicação; Production exige as provas externas e o registro P43. As ações externas pertencem ao owner/provedor apropriado e ficam com estado `desconhecido` ou `não provisionado` até confirmação.

**Pesquisa de apoio:** [priorização revisada do ponto 69](research-ponto-69-priorities.md). P69 é a ordem executiva dos pontos P1–68, não uma nova autorização para itens rejeitados nem um ranking de impacto independente de dependências.

### Ponto 70 — critérios de conclusão em dois gates

**Estado:** aceito em 2026-09-26, com Q1 aprovada.

**Proposta do relatório:** declarar o que significa estar organizado para voltar a acelerar desenvolvimento com IA, incluindo proteção de branch, CI, docs, migrations, operações, backup/restore, rollback e SHA rastreável.

**Decisão aprovada — Gate A: pronto para retomar features amplas:** baseline corrigida sem quarentena; `verify:quick`/`verify` do workspace definidos e estáveis; PostgreSQL CI alinhado a PG18; upgrades estáveis autorizados aplicados em batches; CI separado de operações e protegido por permissions/SHA/concurrency aprovadas; PR para `main` e regras remotas configuradas pelo owner após transferência e checks verdes; migrations versionadas/replay em CI e `db:push` restrito ao local; contrato Local/CI e `.env.example` de P5 reconciliados; fronteiras de UI/apps/packages de P37/P39 verificadas; divergências temporais concretas de P58/P59 corrigidas; mapa documental, CONTEXT/PRODUCT/DESIGN, ADRs seletivas, AGENTS e `docs:check` reconciliados conforme P63. Evidência: SHA com gates de CI verdes, verificação focal dos contratos corrigidos, PR que demonstra a regra de `main` e revisão documental consistente. Isso não significa que Staging, Vercel, providers ou restore de Production estejam certificados.

**Decisão aprovada — Gate B: pronto para go-live e dados reais:** persistent Staging provisionado/homologado; P43 com todos os gates aplicáveis validados e os demais explicitamente adiados/fora de escopo com motivo/gatilho; PostgreSQL 18 parity, branch/role/runtime RLS e autenticação real provados; operações de migration Production separadas e target-validated conforme P45/P46; P44 PITR + backup cifrado + restore drill real em alvo descartável com RPO/RTO medidos antes de dados reais; SHA candidato, migrations, deployment IDs/URLs/targets, smoke/evidência sanitizada e deployment anterior registrados conforme P47; candidatos Web/Admin prontos antes da primeira promoção, promoções sequenciais sem rebuild quando suportado e smoke por app conforme P48; perimeter Vercel e autorização in-app Admin validados conforme P49; rollback do app e recuperação de banco descritos/testados sem presumir que rollback de deployment reverta schema/dados. Canários e providers seguem P57, condicionados ao lançamento e sem pagamento/e-mail real de teste.

**Infra e ressalvas:** Staging é um ambiente e deve existir antes do go-live; a branch Git `staging` continua condicional a P4/P5. A Vercel oferece Preview branch e Custom Environment como estratégias distintas, e uma Custom Environment persistente exige plano compatível. A documentação atual também alerta que o primeiro deployment de um projeto é Production e que staged Production usa variáveis/serviços de Production; portanto configurar proteção/domínios/vars antes do primeiro deploy e usar Staging para mutações/canários é parte do Gate B. Não tratar Preview, Staging e staged Production como sinônimos.

**Próximo uso do plano:** este documento conclui a revisão sequencial dos 70 pontos e registra os gates; não os implementa nem verifica estado remoto. A execução pode começar pela ordem P69/P61, com evidências por tarefa e sem declarar Gate B aprovado antes das provas externas P43.

**Pesquisa de apoio:** [crosswalk do ponto 70 entre prontidão de desenvolvimento e go-live](research-ponto-70-readiness-gates.md). Fontes atuais: [Vercel — Environments](https://vercel.com/docs/deployments/environments), [GitHub — Rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets).

## Adendo da revisão integral: ferramentas propostas depois dos 70 pontos

Este adendo avalia Graphify e Blacksmith sem renumerar o relatório original nem alterar decisões aceitas por analogia. A pesquisa local e os limites de cada fonte estão registrados em [auditoria integral](research-revisao-integral.md), [crosscheck externo](research-revisao-crosscheck-externo.md), [Graphify](research-revisao-graphify.md) e [Blacksmith](research-revisao-blacksmith.md).

### Graphify: piloto local de descoberta, sem gate novo

**Decisão de plano:** vale um piloto pequeno depois de estabilizar a fundação documental e as fronteiras P8/P18/P37/P39. Graphify não entra no Gate A/B, na CI nem como fonte canônica agora. Sua saída é um índice derivado para localizar relações, sujeito a confirmação no código, no schema, nos testes e nos documentos canônicos.

**Por quê:** o projeto declara parsing local por AST de TS/TSX, JS, SQL e documentos, grafo consultável por CLI e integração com Codex; essa capacidade pode ajudar no monorepo Web/Admin/packages. É um benefício plausível, ainda não medido no Polaris. A distribuição oficial é o pacote Python `graphifyy`, com comando `graphify`, e adiciona runtime/ferramenta fora da stack Bun. Há issues públicos sobre atualização incremental desincronizada e relações falsas; arestas `INFERRED` não podem ser tratadas como fatos de runtime. O benchmark divulgado é do próprio projeto e não demonstra ganho neste repo. [Graphify — README](https://github.com/Graphify-Labs/graphify), [issue de atualização](https://github.com/Graphify-Labs/graphify/issues/2053), [issue de relações](https://github.com/Graphify-Labs/graphify/issues/2137).

**Piloto verificável:** em checkout isolado, fixar a versão da ferramenta e limitar o corpus a código/documentos não sensíveis; excluir `.env*`, dumps, logs, backups, resultados E2E e outputs gerados. Começar pelo parsing estrutural local, sem backend semântico de docs/mídia ou envio externo. Comparar 8–12 consultas reais sobre auth, tenant/RLS, schema, events/outbox e fronteiras de UI com leitura direta das fontes; registrar falsos positivos/negativos, tempo de construção/consulta e manutenção. Repetir após um rebuild e um update incremental controlado, verificando equivalência das relações relevantes. Se houver ganho líquido e fidelidade suficiente, decidir então instalação da skill Codex no projeto, política de atualização e se algum artefato derivado deve ser versionado; `.agents/` está ignorado no checkout atual, portanto qualquer instalação de projeto precisa ser distribuível e clone-safe conforme P34. Não fazer o agente consultar o grafo por obrigação antes de cada leitura nem distribuir um snapshot que possa envelhecer silenciosamente. Respeitar a proibição local de abrir URL de visualização; avaliar pelos comandos/arquivos textuais.

### Blacksmith: não adotar na topologia GitHub aprovada

**Decisão de plano:** manter runners GitHub-hosted. O [quickstart oficial](https://docs.blacksmith.sh/introduction/quickstart) diz que Blacksmith atende organizações GitHub e não repositórios pessoais. P3 aprovou transferir Polaris para a conta **pessoal** GitHub Pro do irmão; portanto, Blacksmith não é instalável nesse destino. Não mudar a propriedade ou a governança do repo apenas para experimentar runner.

**Trade-off documentado:** Blacksmith anuncia 3.000 minutos gratuitos mensais e Linux x64 a US$ 0,004/min; GitHub Pro inclui 3.000 minutos de Actions e a tarifa publicada de Linux x64 2-core é US$ 0,006/min além da franquia. A alegação de execução 2× mais rápida é do fornecedor e não foi medida no Polaris. O custo em dinheiro pode ser zero com a franquia GitHub; velocidade e orçamento só podem ser julgados após o baseline de duração/uso de P64. A integração Blacksmith também solicita permissões do GitHub App e executaria jobs que hoje incluem operações com secrets; seus [incidentes publicados](https://status.blacksmith.sh/) mostram uma dependência operacional adicional. [Blacksmith — pricing](https://www.blacksmith.sh/pricing), [GitHub — billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions), [Blacksmith — segurança](https://www.blacksmith.sh/security).

**Gatilho de reavaliação:** somente se o repo já migrar para uma organização por motivo independente **e** a medição de P64 mostrar espera/custo relevante. Nesse caso, comparar algumas execuções equivalentes em Ubuntu fixo, primeiro num job de CI sem secrets de produção; conferir cobrança real, tempos frios/quentes, cache, service containers, permissões do app, tratamento de dados e retorno imediato a runner GitHub. Operações com credenciais permanecem no runner atual até revisão separada. Nenhum workflow, secret ou conta será alterado por este adendo.
