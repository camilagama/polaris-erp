# Reauditoria de práticas da fundação Polaris ERP

- **Consultado em:** 2026-10-01 (America/Sao_Paulo)
- **Escopo:** decisões de CI/workflows/segurança, Vercel Hobby e ambientes, Neon/migrations/recovery, documentação/ADRs, E2E/visual snapshots, cache, SAST e Dependabot no [plano de fundação](fundacao-polaris-erp.md).
- **Natureza:** auditoria externa dos princípios e da sua proporcionalidade. Não revalida o checkout, configurações remotas ou estado de provedores descritos no plano.

## Método e limites

Usei documentação oficial de GitHub, Vercel, Neon, Playwright e guias oficiais de arquitetura/documentação; complementei com um conjunto pequeno de práticas de projetos e relatos públicos. O plano é a fonte para relacionar cada recomendação ao Polaris: citei os pontos aplicáveis e preservei os estados declarados (aceito, condicional, recusado ou pendente). Fontes de produto definem capacidades e limitações, mas não provam disponibilidade ou configuração na conta do Polaris. Benchmarks e recomendações de fornecedores não foram tratados como resultados locais.

Context7 foi consultado para Vercel e Neon. `npx ctx7@latest library Vercel "Hobby plan environments preview deployments environment variables Git"` resolveu `/vercel/vercel`, e a consulta de docs em `/llmstxt/vercel_llms_txt` retornou a alternativa de branch e variáveis de Preview para usuários sem Custom Environments. Para Neon, `library` resolveu `/neondatabase/website`; `docs` retornou fontes de branching/restore e exemplos. Não houve erro de CLI nesta reauditoria. A busca web foi usada para confirmar documentação primária e obter páginas específicas; não usei a resposta agregada como evidência isolada.

## Síntese

O plano está, em geral, mais cuidadoso que uma lista genérica de “boas práticas”: amarra segurança e operação a evidência do repo, mantém os gates de produção separados da prontidão para features e condiciona controles caros/voláteis a medição. A principal oportunidade de simplificação é evitar que Gate A vire um pacote indivisível de política e que cada prática adequada em princípio seja tratada como blocker antes de demonstrar necessidade. As ressalvas mais importantes são: verificar cota/termos do Hobby no momento de provisionamento; separar PITR/branching de backup independente; e distinguir artefato de diagnóstico de teste visual determinístico.

## Avaliação por tema

### CI, workflows e segurança — P23–27, P61–64, P70

**Decisão concreta:** separar CI e operações (P23), não expor secrets de produção nos checks de PR (P24), declarar permissões mínimas (P25), fixar actions por SHA (P26), e adicionar cancelamento de runs somente após separar operações (P27). P61/P62/P64 ordenam essas mudanças antes de otimizações, e P70 as exige no Gate A.

**Avaliação:** direção correta e proporcional ao workflow descrito pelo plano: um arquivo mistura checks com seis operações manuais, algumas com credenciais e efeitos externos. O princípio de menor privilégio e SHA pinning é sustentado pelo GitHub: declarações explícitas de `permissions` limitam o token e SHA completo garante que o código executado corresponde ao revisado. `concurrency` com cancelamento também é útil para CI obsoleta, porém cancelar um grupo compartilhado pode interromper operações; a ordem P23 antes de P27 é uma dependência real, não burocracia. O P24 é o limite mais importante: permissões do `GITHUB_TOKEN` não substituem isolamento dos secrets externos.

**Ajuste:** manter os quatro controles, mas verificar se ações de baixo risco podem ser aplicadas por workflow/job com políticas legíveis, sem multiplicar jobs artificiais. Após separar o workflow, selecionar chave de concorrência que cancele somente PR/CI equivalente; operações manuais devem ter grupo sem cancelamento ou sem colisão. Aplicar `contents: read` como baseline e elevar só quando um passo provar necessidade. SHA pins são manutenção: documentar versão humana junto ao hash e estabelecer processo de atualização; sem atualização, pinning pode cristalizar dependências vulneráveis.

**Conclusão:** aprovado. O plano evita corretamente a ordem insegura de ativar cancelamento global antes da separação. Risco remanescente: o Gate A inclui mudanças de governança remota condicionadas à transferência e à conta do owner (P3); registrar isso como dependência externa verificável, não como trabalho que o CI local consegue fechar.

### Deploy e ambientes Vercel Hobby — P4–5, P43–49, P65–70

**Decisão concreta:** não criar `staging` Git como requisito inicial; usar PRs/Preview enquanto a necessidade de URL persistente não existir (P4), escolher ambientes após definir contrato e infraestrutura (P5), manter Staging persistente antes do go-live e concluir gates operacionais antes de dados reais (P43–49/P65/P70).

**Avaliação:** abordagem adequada ao estado informado no plano: Vercel não conectada e sem deploy a preservar. A documentação Vercel descreve Preview para branches que não são Production e permite variáveis de Preview por branch; isso permite um caminho de homologação associado a branch no Hobby. A documentação recomenda domínio atribuído a uma branch persistente para staging; Custom Environments são alternativa de plano Pro. Logo, plano não precisa confundir staging (ambiente/contrato) com uma branch imutável; branch duradoura é um mecanismo possível para URL persistente. Variáveis aplicam-se a novos deployments, fato que reforça a necessidade de deploy depois de alteração e de provar qual banco/endpoints cada branch usa.

**Ressalvas e ajuste:** “Hobby” é um plano de uso pessoal/desenvolvedor, e capacidades e limites comerciais podem mudar. P4 deve ser revalidado no provisionamento, incluindo elegibilidade de uso do produto, proteção de Preview, limites, domínios, build/concurrency e política atual do plano; não inferir da existência da documentação que um ambiente de homologação adequado já está disponível. Não usar Production/staged Production para experimentar integrações: manter staging em Preview branch com credenciais e dados não produtivos até haver motivo e plano compatível para custom environment. Gate B pede corretamente prova real de domínio, callbacks e isolamento.

**Conclusão:** aprovado, com verificação de plano e limites como pré-condição operacional explícita quando Vercel for criada. Se uma URL persistente for requisito de OAuth/webhook, a recomendação passa a branch persistente + variáveis por branch no Hobby ou migração deliberada de plano, não “Preview aleatório” por PR.

### Neon, migrations e recovery — P43–48, P54, P65, P70

**Decisão concreta:** migrations versionadas/replay em CI e `db:push` apenas local; separar role de runtime e operação de migration; alinhar versão Postgres; provar PITR, backup/restore e RPO/RTO antes de produção; deploy identificado por SHA, migration e deployment ID (P43–48/P54/P65/P70).

**Avaliação:** os limites entre ambientes e a exigência de restaurar de verdade são sólidos. Neon oferece branches para criar cópias de banco e restore para um timestamp; isso serve para previews, ensaios e recuperar estado conforme a retenção do projeto. Isso não faz branching equivalente a backup independente nem elimina a necessidade de exportação/retention fora do mesmo domínio de falha. O plano acerta ao pedir backup cifrado e restore drill além de PITR (P44). A documentação Neon inclui padrões de branch por PR, mas exemplos de blog podem usar permissões amplas e Actions antigas: são demonstrações de capacidade, não modelos a copiar.

**Ajuste:** tratar branch Neon como isolamento de ambiente e ferramenta de recuperação rápida, não prova suficiente de backup. No drill, capturar timestamp/branch origem, destino descartável, duração, perda observada e confirmação funcional da app; validar export independente/armazenamento e retenção acordados. Para migrations, continuar com migration tool e replay em CI; nunca executar migrations destrutivas sem estratégia expand/contract ou compatibilidade da versão antiga durante promoção. O plano não deve exigir restore de produção antes de qualquer feature; Gate B antes de dados reais é proporcional.

**Conclusão:** aprovado. A distinção entre rollback de app, migration reversível e recuperação de dados deve continuar explícita no release (P47/P70); PITR não é “undo migration” sem consequências.

### Documentação e ADRs — P7–17, P35–42, P50–51, P60, P63

**Decisão concreta:** reconciliar mapa e autoridade, manter `aidd_docs/`, criar contexto/PRODUCT/DESIGN e ADRs seletivas com evidência, não impor frontmatter/freshness global, e ampliar `docs:check` somente para classes definidas (P14/P50/P51/P63).

**Avaliação:** o modelo leve é apropriado para monorepo com documentação existente e histórico relevante. Guias oficiais do Google e Azure descrevem ADR como registro de decisão significativa, com contexto, opções, decisão e consequências, armazenado perto do projeto; não prescrevem uma taxonomia única ou ADR para cada mudança. A comparação local citada no plano (Hub) é útil como caso prático, mas o próprio plano relata deriva documental nele; usar princípios e não copiar a árvore é a escolha correta.

**Risco de excesso:** o plano mestre registra 70 pontos, vários com justificativas extensas. Isso pode se tornar duplicação se depois houver backfill de ADRs copiando texto, ou um AGENTS que carrega tudo. P63 mitiga isso ao limitar ADRs autorizadas e manter ponteiros concisos. Para reduzir custo, ADR deve resumir decisão durável e linkar evidência/plano; decisões operacionais temporárias podem permanecer em runbook/issue/PR. `docs:check` deve detectar referências/estrutura que se pode verificar mecanicamente, não exigir atualização universal de históricos ou datas.

**Conclusão:** aprovado, com ênfase em fonte única e seleção por significância/vida útil. A revisão do plano não valida conteúdo/correção semântica dos documentos já existentes.

### E2E, artifacts e visual snapshots — P55–56, P64, P70

**Decisão concreta:** artifacts de Playwright só em falha, com retenção curta e conteúdo sintético (P55); snapshots visuais entram depois de DESIGN e fixtures determinísticas, com matriz Chromium/Linux fixa e aprovação explícita de alterações (P56); P64 evita gravação contínua de mídia e decide sobre reports/traces por custo/diagnóstico.

**Avaliação:** boa proporcionalidade. Playwright recomenda usar trace viewer para falhas de CI e alerta que screenshots variam com SO, browser, fonte e hardware; snapshots visuais precisam ambiente de geração e comparação consistente. Isso sustenta fixar runner/browser/viewport/locale/timezone e não atualizar golden automaticamente. Também justifica failure-only artifacts, sobretudo diante de E2E com dados persistentes/dinâmicos descritos pelo plano.

**Ajuste:** antes de tornar snapshot visual gate obrigatório, medir ruído e manutenção num pequeno conjunto de journeys representativos. Começar por páginas estáveis com fixture sintética/resetável; selecionar componentes/telas de maior risco visual. Uma falha em screenshot deve levar à inspeção do diff e da fixture, não a aumentar tolerância global. O plano já diz “após aceitar o primeiro conjunto”; explicitar que piloto pode terminar sem adoção obrigatória se o sinal/ruído não compensar. Artifacts nunca devem capturar dados reais, tokens em URL, dumps ou headers.

**Conclusão:** artifacts de falha são apropriados; visual regression é candidata condicional, não requisito amplo para cada fluxo. Há um pequeno excesso se a expressão “gate obrigatório” for interpretada sem saída após piloto.

### Cache e `--affected` — P31–32, P64

**Decisão concreta:** auditoria de inputs/outputs/env/side effects antes de Turbo Remote Cache; `--affected` adiado até medir e validar dependentes, mudança local e gates; manter verificação completa para release (P31/P32/P64).

**Avaliação:** decisão prudente para monorepo com muitos envs e tarefas que incluem E2E, DB e efeitos externos. Cache compartilhado pode vazar artefato derivado de segredo se hashing/outputs estiverem mal modelados; uma chave de cache correta e acesso restrito são pré-requisitos. `--affected` economiza tempo, mas só é confiável se grafo, base Git e relação entre tarefas estiverem corretos. O plano não inventa ganho de performance sem baseline.

**Ajuste:** não transformar Remote Cache em gate de fundação nem obrigação para “agentes”; executar piloto reversível depois de baseline verde, começando por builds/checks sem segredo e comparando hit rate, duração fria/quente, cache misses e conteúdo. Cache local atende enquanto o ganho líquido não justificar credencial, observabilidade e manutenção. `verify:quick` workspace-wide é escolha defensável no estágio atual; reavaliar com números, não apenas com aumento do monorepo.

**Conclusão:** aprovado e corretamente condicional. O P32 é controle de segurança indispensável somente se o Remote Cache vier a ser ligado.

### SAST, Dependency Review e Dependabot — P22, P28–29, P64

**Decisão concreta:** restaurar primeiro o gate `bun audit:baseline`; não adicionar Dependency Review nem CodeQL na conta privada pessoal GitHub Pro atual; testar Semgrep Free autogerido após baseline, e torná-lo gate somente se cobertura, ruído, termos e fluxo de dados forem aceitáveis (P22/P28/P29/P64).

**Avaliação:** a separação SCA/SAST é correta. As ações do GitHub têm dependências de plano e grafo; a adequação precisa ser confirmada para o lockfile Bun e para entitlement exato da conta antes de adicionar. O plano não confia em presumir cobertura de `bun.lock`. CodeQL e Dependency Review não devem ser instalados por paridade com outro repo se o plano/feature não estiver disponível. Semgrep é escolha de fornecedor, não substituto sem custo: enviar metadados e a licença precisam ser avaliados conforme a modalidade e versão atuais.

**Dependabot:** o ponto específico do plano é ausência de configuração (P28), mas “não ter Dependabot” não é por si só lacuna se `bun audit:baseline` e atualizações manuais já são operados. O plano deve decidir separadamente se quer usar Dependabot para atualizações de GitHub Actions, Bun ou ambos, confirmar suporte atual a `bun.lock`, validar PRs geradas e evitar duplicação com ferramenta já usada. Actions pinadas por SHA exigem política de update consistente, via Dependabot/Renovate ou atualização manual registrada; pinning abandonado é um modo de falha. Não fazer o bot requisito de Gate A sem comprovar benefício e compatibilidade.

**Conclusão:** recusas de CodeQL/Dependency Review são razoáveis sob os limites declarados, mas esses limites são temporais e devem ser checados novamente na implementação. Prioridade atual é corrigir baseline expirada e resolver advisories, não somar scanners. POC Semgrep permanece experimento com decisão posterior.

## Recomendação consolidada

1. Implementar primeiro o que corrige risco concreto no estado documentado: separar operações de CI, secrets isolados, permissões mínimas, SHA pins atualizáveis, baseline SCA verde, migrations replayáveis e prova de ambiente/alvo.
2. Preservar gates separados: Gate A para retomar desenvolvimento e Gate B para dados reais/deploy operacional. Não marcar itens que dependem de Vercel/Neon/GitHub como concluídos com base em YAML ou documentação.
3. Revalidar planos/entitlements Vercel e GitHub no provisioning; os limites de produto e licenças são mutáveis e esta pesquisa não acessa a conta.
4. Tratar visual snapshots, Semgrep obrigatório, Remote Cache e `--affected` como adoção sujeita a piloto, métricas e saída explícita. A aprovação de design não deve ser entendida como compromisso de gate se o piloto for ruidoso.
5. Manter documentos enxutos e rastreáveis: decisão em ADR só para escolha durável/significativa; detalhes operacionais em runbook; regra automatizada em check somente quando o teste for objetivo e de baixo custo.

## Fontes

### Fontes primárias oficiais

- [GitHub Docs — Hardening security for GitHub Actions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions) — permissões e pinning por SHA.
- [GitHub Docs — Workflow syntax: permissions](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions#permissions) e [concurrency](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions#concurrency) — permissões e cancelamento.
- [GitHub Docs — Manage Actions settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository) — política de SHA completo e retenção de artifacts/logs.
- [Vercel Docs — Environments](https://vercel.com/docs/deployments/environments), [Deploying Git Repositories](https://vercel.com/docs/git), [Environment Variables](https://vercel.com/docs/environment-variables), [Hobby Plan](https://vercel.com/docs/plans/hobby) — Preview, branch persistente, Custom Environments e variáveis.
- [Neon Docs — Branching](https://neon.com/docs/introduction/branching), [Restore](https://neon.com/docs/introduction/branch-restore), [Backups](https://neon.com/docs/manage/backups) e [Schema migrations](https://neon.com/docs/guides/schema-migrations) — branching, restauração e migrações. Branching e PITR não substituem, por si só, estratégia de backup independente.
- [Playwright — Visual comparisons](https://playwright.dev/docs/test-snapshots) e [Best Practices](https://playwright.dev/docs/best-practices) — variabilidade de renderização e diagnóstico de falha.
- [Google Cloud Architecture Center — ADR overview](https://docs.cloud.google.com/architecture/architecture-decision-records) e [Microsoft Azure Well-Architected — ADR](https://learn.microsoft.com/en-us/azure/well-architected/architect-role/architecture-decision-record) — escopo e conteúdo útil de ADR.
- [GitHub Docs — Dependabot supported ecosystems](https://docs.github.com/en/code-security/dependabot/ecosystems-supported-by-dependabot) e [Dependency Review](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/about-dependency-review) — conferir lockfile/entitlement no momento da adoção.
- [Semgrep Docs — GitHub Actions](https://semgrep.dev/docs/semgrep-ci/sample-ci-configs/#github-actions) — integração autogerida; não estabelece cobertura ou custo/benefício específicos para Polaris.

### Projetos e prática pública consultada

- [Neon — branching with preview environments](https://github.com/neondatabase/website/blob/main/content/blog/posts/branching-with-preview-environments.md) — exemplo de branches por PR; workflow publicado não é modelo de segurança atualizado em todos os detalhes.
- [Playwright — trace viewer / CI](https://playwright.dev/docs/best-practices#debugging-on-ci) — experiência operacional documentada pelo projeto.
- [GitHub ADR examples project](https://github.com/architecture-decision-record/architecture-decision-record) — exemplos variados, inclusive ressalvas sobre decisões pequenas/temporárias.
- [Discussão de praticantes sobre ADRs em projetos](https://www.reddit.com/r/softwarearchitecture/comments/1ktv6nb/how_do_you_manage_software_decision_records/) — evidência anedótica de custo de espalhamento/obsolescência; não generalizar para Polaris.

As páginas foram consultadas em 2026-10-01. Conteúdo de planos, limites, entitlement, ações de terceiros e licenças pode mudar; reconfirmar antes da implementação.

## Atualização de fontes e riscos de plataforma — 2026-10-01

Esta atualização complementa, e prevalece sobre, qualquer disponibilidade de plano descrita acima a partir de fontes anteriores a setembro de 2026.

### Vercel Hobby e ambientes

- Em 2026-09-09, Vercel anunciou que `All Deployments` com Vercel Authentication passou a ser oferecido sem custo adicional em todos os planos. A documentação geral de proteção, revisada antes do anúncio, ainda contém texto dizendo que proteger Production com `All Deployments` requer plano Pro/Enterprise; usar o changelog mais recente como sinal de mudança e confirmar a opção no painel quando provisionar. [Changelog de 9 de setembro](https://vercel.com/changelog/protect-production-deployments-for-free-on-every-plan) · [documentação com texto anterior](https://vercel.com/docs/deployment-protection)
- A documentação atual de environments diz que uma Preview branch persistente com domínio e variáveis de branch está disponível em todos os planos, inclusive Hobby. Custom Environments continuam Pro/Enterprise. Staged Production é uma terceira opção e usa a configuração de Production; não serve como Staging para operações mutáveis com dados sintéticos. O primeiro deployment de projeto novo é Production, então proteger domínio/branch/configuração antes do primeiro deploy segue essencial. [Vercel Environments](https://vercel.com/docs/deployments/environments)
- Os Termos de Serviço vigentes limitam Hobby a uso pessoal ou não comercial. Como Polaris é um ERP com finalidade comercial, não presumir que Preview/QA de um produto destinado a gerar receita seja permitido; o owner deve obter confirmação de elegibilidade ou usar plano compatível antes da etapa de implantação correspondente. Isso é um ponto contratual a confirmar, não uma conclusão jurídica desta auditoria. [Terms of Service](https://vercel.com/legal/terms) · [Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines)
- Em 2026-09-16, Vercel anunciou 10 GB de deployment storage para Hobby e retenção menor: os previews antigos podem perder proteção e deployments excedentes podem ser removidos. O plano de rollback precisa comportar redeploy a partir de SHA conhecido; guardar um ID antigo sozinho não garante que o deployment continuará disponível. [Changelog de retenção](https://vercel.com/changelog/hobby-projects-now-retain-fewer-deployments-to-free-up-storage)
- A atualização de termos de março informa que Hobby começa opt-in para treinamento de modelos usando código e telemetria de build/deployment, com opção de opt-out em Data Preferences; opt-out impede compartilhamentos futuros, não reverte compartilhamentos anteriores. Antes de conectar o repositório privado, revisar a preferência e o escopo dos dados. [Atualização de AI/Data Preferences](https://vercel.com/changelog/updates-to-terms-of-service-march-2026)
- Para repositório GitHub pessoal, Vercel documenta que somente o owner do repositório pode importar/conectar projetos; verificar se a única conta Vercel será operada pelo owner GitHub `camilagama` ou se esse owner deve fazer a conexão. O Hobby também limita a um usuário externo por conta em Deployment Protection. [Vercel para projetos GitHub](https://vercel.com/docs/git/vercel-for-github) · [Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication)

### GitHub: status checks e Environment bypass

- A regra atual de `main` pede os checks sem exigir base atualizada (`strict_required_status_checks_policy: false`). GitHub descreve os modos estrito e loose como trade-off entre reexecutar checks após avanço da base e permitir merge de PR que não foi testado contra a base atual. Para Polaris, quatro checks pequenos e merge unitário favorecem considerar modo estrito antes de aumentar o ritmo; custos reais de rerun ainda devem ser medidos. [Protected branches — strict/loose](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- GitHub mantém bypass administrativo ligado por padrão em Environments; refs/branch rules e status checks continuam essenciais, mas o bypass é uma autoridade distinta. O P43 atual confirma `can_admins_bypass: true` e nenhuma credencial nesse Environment. Antes de inserir secrets, verificar a possibilidade de desativar bypass na conta privada Pro; se não for viável, documentar confiança no owner e testar as guardas de workflow/alvo. A conta Free/Pro/Team em repo privado não oferece required reviewers/wait timer conforme as páginas atuais; não transformar aprovação humana, já recusada pelo usuário, em pressuposto. [Deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments) · [reviewing deployments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/review-deployments)
- GitHub documenta suporte atual ao `bun.lock` textual para Dependabot (Bun 1.1.39+). Isso remove a hipótese de incompatibilidade do lockfile; não prova que PRs geradas serão úteis ou seguras sem validação do workflow. [Ecosystems and repositories](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories)

### Neon Free e recuperação

A documentação de planos atualmente lista Free com janela PITR de 6 horas limitada a 1 GB de mudanças, uma snapshot manual e sem backup agendado. Launch permite até 7 dias e snapshots agendados; Scale até 30 dias. O plano/retention real do Polaris é desconhecido. Se Neon Free for selecionado para qualquer alvo que guarda dados importantes, a cópia independente cifrada e restore drill de P44 continuam necessários; branching/E2E não substituem backup. [Planos Neon](https://github.com/neondatabase/website/blob/main/content/docs/introduction/plans.md) · [restore](https://github.com/neondatabase/website/blob/main/content/docs/postgres/backup-restore/branch-restore.md)

### Endpoints e contrato Asaas/Woovi

- Asaas separa explicitamente Sandbox `https://api-sandbox.asaas.com/v3` de Production `https://api.asaas.com/v3`; exemplos locais devem usar o sandbox. [Asaas Authentication](https://docs.asaas.com/docs/authentication)
- A documentação Woovi define `x-webhook-signature` como assinatura `base64(RSA-SHA256)` sobre o corpo bruto, verificada com as chaves públicas publicadas e passíveis de rotação. `x-openpix-signature` é HMAC-SHA1 separado da configuração do webhook. API sandbox usa `https://api.woovi-sandbox.com`. Isso torna um teste HMAC aplicado ao primeiro header incompatível com o contrato oficial e justifica manter Woovi bloqueada se estiver no escopo de lançamento. [Validação RSA recomendada](https://developers.woovi.com/en/docs/webhook/seguranca/webhook-signature-validation) · [chaves públicas e rotação](https://developers.woovi.com/docs/webhook/seguranca/webhook-public-keys) · [API de teste](https://developers.woovi.com/api-redoc)
