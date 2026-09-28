# Pesquisa do ponto 31 — Aproveitar melhor o Turborepo

**Data da revisão:** 2026-09-25  
**Estado:** decisão aprovada em 2026-09-25.  
**Ponto do relatório:** avaliar Remote Cache e `--affected` para acelerar verificações.

## Resultado preliminar

O Polaris já aproveita o Turborepo para modelar dependências, execução paralela e cache local. A lacuna real é compartilhar resultados do cache entre dev/CI. Remote Cache parece uma otimização de baixo custo potencial, mas deve ser ativado somente após revisar a semântica dos inputs, envs, outputs e logs no P32. Vercel Remote Cache pode ser usado mesmo sem hospedar o app na Vercel, mas exige decidir quem controla o team/scope e configurar credenciais de CI.

O uso de `--affected` não deve ser adotado agora: o usuário aprovou no P20 que `verify:quick` começa cobrindo todo o workspace e que essa otimização só deve ser reconsiderada depois de medir e validar comportamento. A validação completa de release continua sem filtros.

## Estado observado no Polaris

- É monorepo Bun com `apps/*` e `packages/*`, dois apps e pacotes compartilhados. O root declara Turborepo `^2.9.6`; `bun.lock` resolve `turbo@2.10.4`.
- `turbo.json` já define dependências de tarefas com `^build`, `^test`, `^check`, `^typecheck` e `^knip`; o build declara `.next/**` e exclui `.next/cache/**` e `.next/dev/**`.
- `dev`, `start`, `fix`, E2E, testes PostgreSQL, migrações, preflight, smoke e tarefas operacionais não são cacheados ou são persistentes, conforme seu efeito.
- Não há Remote Cache configurado em `.github/workflows/ci.yml`: não há `TURBO_TOKEN`/`TURBO_TEAM` nem checkout com configuração de base para `--affected`. CI executa verificações e builds por scripts raiz, reinstalando dependências em cada job.
- `.turbo` é ignorado no Git, então o cache local não é compartilhado entre máquinas ou CI.
- Há tarefas com escopos que precisam ser entendidos antes de otimizar: `check` por app executa Ultracite na raiz, e `knip` chamado via app também examina o workspace. Scripts fora do Turbo (auditoria de dependências/limites, documentação e contrato de env) não seriam cobertos por um filtro do Turbo.
- O `turbo.json` tem `globalEnv` e um conjunto amplo de `globalPassThroughEnv`. A análise detalhada por variável pertence ao P32 e é pré-requisito de cache remoto.

## Comparação com o Hub

O Hub não usa Turborepo: não tem dependência, workspace `apps`/`packages` nem configuração Turbo. Portanto, não há Remote Cache nem grafo de tarefas para copiar. O padrão útil a reaproveitar é a separação explícita entre verificação rápida/completa e o princípio já aprovado no P20 de manter o gate completo.

## Documentação atual, opções e trade-offs

- A documentação de Vercel confirma que Remote Cache pode ser conectado de uma máquina local e usado com CI mesmo sem hospedar o app na Vercel. O serviço é gratuito nos planos, sujeito a fair use; os limites listados são 100 GB de uploads por mês e 100 requests/min no Hobby. Artefatos expiram depois de sete dias. [Vercel — Remote Caching](https://vercel.com/docs/monorepos/remote-caching), [Vercel — Deploying Turborepo](https://vercel.com/docs/monorepos/turborepo)
- Remote Cache compartilha outputs de tarefas e logs entre membros da team/CI. A documentação alerta para validar hashing de envs e que logs também são artefatos; um cache pode reutilizar ou distribuir resultados incorretos se variáveis que mudam output não fizerem parte do hash, ou expor conteúdo confidencial se secrets forem impressos/gerados nos artefatos. O P32 deve revisar isso antes de ativar o serviço. [Vercel — Remote Caching](https://vercel.com/docs/monorepos/remote-caching), [Turborepo — environment variables](https://turborepo.com/docs/crafting-your-repository/using-environment-variables)
- Para CI externo, Vercel permite autenticação por OIDC ou Personal Access Token. Tokens e team scope exigem decisão do owner e escopo restrito aos jobs que executam tarefas Turbo. [Vercel — External CI/CD](https://vercel.com/docs/monorepos/remote-caching#use-remote-caching-from-external-ci-cd)
- `--affected` seleciona tarefas dos pacotes alterados e dos dependentes, mas precisa de uma base Git resolvível. O checkout atual usa `actions/checkout` sem configuração de histórico/base. Implementar no futuro exige definir corretamente base/ref em PR e push, validar histórico disponível, tasks afetadas e verificações fora do Turbo. Não é equivalente a filtrar todos os gates de `verify:quick` automaticamente. [Turborepo — run reference](https://turborepo.com/docs/reference/run), [GitHub Actions checkout](https://github.com/actions/checkout)
- Remote Cache é reversível e não vira fonte da verdade do build; cache miss/falha de serviço deve executar localmente. O trade-off é configurar conta/team/token, enviar artefatos/logs a um fornecedor e cuidar do isolamento entre writers/leitores.

## Decisão aprovada em 2026-09-25

1. Manter Turborepo: ele já tem valor no grafo e execução/caching local do monorepo.
2. Aprovar em princípio um Remote Cache compartilhado, com Vercel Remote Cache como primeiro candidato por ser gratuito sob fair use e independente da hospedagem do app. Só ativar após o P32 revisar keys/env/outputs/logs e após definir owner, team/scope e token/OIDC de CI.
3. Não adicionar `--affected` a `verify:quick` agora; preservar a decisão aprovada no P20. Considerar apenas depois de medir duração, validar base Git para push/PR, provar cobertura dos dependentes e tratar os scripts fora do Turbo. A validação de release continua completa.
4. Não introduzir uma ferramenta experimental de package boundaries neste ponto: o P31 não exige isso e Polaris já tem workspace e `audit:boundaries` específicos.

**Q1 aprovada:** manter Turbo; considerar Vercel Remote Cache a primeira opção, habilitado somente depois da auditoria P32 de hashes/inputs/envs/outputs/logs e da definição de owner, team/scope e credenciais CI limitadas. O app não precisa estar hospedado na Vercel. Manter `verify:quick` full-workspace conforme P20 e adiar `--affected` até medir e validar base Git, dependências e gates fora do Turbo; release permanece completo.

## Fontes oficiais consultadas

- [Turborepo — Remote Caching](https://turborepo.com/docs/crafting-your-repository/caching)
- [Turborepo — run reference](https://turborepo.com/docs/reference/run)
- [Turborepo — Environment Variables](https://turborepo.com/docs/crafting-your-repository/using-environment-variables)
- [Vercel — Remote Caching](https://vercel.com/docs/monorepos/remote-caching)
- [Vercel — Deploying Turborepo](https://vercel.com/docs/monorepos/turborepo)
- [GitHub — actions/checkout](https://github.com/actions/checkout)

## Revalidação — 2026-09-27

### Remote Cache: preço, acesso e retenção atuais

A documentação oficial da Vercel, atualizada em 2026-08-13, ainda informa Remote Cache gratuito em todos os planos, sujeito a fair use. Os limites publicados são Hobby: 100 GB de uploads/mês e 100 requests de artefatos/minuto; Pro: 1 TB/mês e 10.000 requests/minuto; Enterprise: 4 TB/mês e 10.000 requests/minuto. A página não lista cobrança por artefato, mas classifica uploads e tamanho como limites de fair use; confirmar os termos do plano antes de depender de um volume acima disso. Artefatos expiram automaticamente em sete dias e Owners podem limpar o cache do time manualmente. O fato de o cache ser gratuito não elimina a decisão de governança: artefatos são compartilhados com membros do time Vercel e enviados à infraestrutura da Vercel. O app não precisa estar hospedado lá. [Vercel — Remote Caching](https://vercel.com/docs/monorepos/remote-caching)

### Salvaguardas para monorepo privado

- Usar um team/scope dedicado ou explicitamente aprovado pelo Owner; o scope determina quem compartilha o cache. A opção de Remote Cache deve ser habilitada/controlada pelo Owner. Manter `.turbo` fora do Git e não gravar tokens ou configuração local autenticada no repositório.
- Para CI externo, preferir OIDC quando o provedor suportar a configuração documentada. Alternativamente, usar `TURBO_TOKEN` e `TURBO_TEAM` como segredos do job, com acesso mínimo, escopo no team escolhido e rotação/revogação operacional. Evitar tokens em workflow YAML, logs e jobs sem necessidade de Turbo; limitar os jobs que recebem credenciais. A Vercel documenta OIDC e Personal Access Token como opções. [Vercel — External CI/CD](https://vercel.com/docs/monorepos/remote-caching#use-remote-caching-from-external-ci-cd)
- Separar confiança de writers: pull requests de forks/não confiáveis não devem receber credenciais que permitam gravar no cache compartilhado. Se um fluxo só precisar consumir artefatos aprovados, configurar leitura remota somente (`TURBO_REMOTE_CACHE_READ_ONLY=true` ou `--cache=local:rw,remote:r`); testar a política no CI antes de adotá-la. A CLI também documenta leitura/escrita por origem de cache. [Turborepo — system environment variables](https://turborepo.dev/docs/reference/system-environment-variables), [Turborepo — `run`](https://turborepo.dev/docs/reference/run)
- Habilitar verificação de autenticidade/integridade dos artefatos (`remoteCache.signature: true`) e fornecer `TURBO_REMOTE_CACHE_SIGNATURE_KEY` como segredo forte compartilhado apenas pelos produtores/consumidores autorizados. A documentação atual descreve assinatura HMAC-SHA256; habilitar `futureFlags.longerSignatureKey` impõe mínimo de 32 bytes. Isso reduz risco de aceitar artefatos adulterados, mas não substitui o controle de acesso nem evita vazamento de dados nos próprios outputs/logs. [Turborepo — Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching), [Turborepo — configuration](https://turborepo.dev/docs/reference/configuration)
- Tratar outputs e stdout/stderr como dados que serão transferidos: revisar `.env`, bundles, relatórios, snapshots e logs para que secrets, dados de clientes e credenciais não sejam incluídos. Turbo armazena os outputs declarados e sempre captura logs; variáveis que mudam a saída precisam entrar no hash (`env`/`globalEnv` em strict mode). `loose` expõe todas as variáveis ao processo e aumenta risco de cache incorreto se valores relevantes não forem hashed. [Turborepo — caching](https://turborepo.dev/docs/crafting-your-repository/caching), [Turborepo — environment variables](https://turborepo.dev/docs/crafting-your-repository/using-environment-variables)
- Validar cache miss, hit remoto e assinatura em um job confiável; manter caminho de execução sem Remote Cache disponível. Owner pode purgar todos os artefatos em caso de suspeita de poisoning. [Vercel — Remote Caching](https://vercel.com/docs/monorepos/remote-caching), [Turborepo — Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching)

### `--affected`: comportamento e riscos revalidados

Na documentação atual do comando, `turbo run ... --affected` equivale por padrão a `--filter=...[main...HEAD]`: seleciona pacotes alterados e seus dependentes segundo o grafo e o intervalo Git. Pode-se definir base/head por `TURBO_SCM_BASE` e `TURBO_SCM_HEAD`. O intervalo precisa estar disponível no checkout; histórico shallow insuficiente faz Turbo tratar todos os pacotes como alterados (fallback seguro para performance, mas sem ganho). CI precisa buscar a ref/base correta em PR e push e conferir a seleção resultante; não assumir que o nome `main` corresponde à branch base em todos os eventos. [Turborepo — `run`](https://turborepo.dev/docs/reference/run), [Turborepo — Constructing CI](https://turborepo.dev/docs/crafting-your-repository/constructing-ci)

`--affected` é uma seleção de pacotes/tarefas Turbo, não uma prova de cobertura de todos os gates do repositório. Scripts executados diretamente pelo root, arquivos globais cuja influência não esteja modelada no grafo/hashes, verificações que inspecionem todo o workspace (como `check`/`knip` identificados nesta pesquisa) e contratos de CI externos podem continuar exigindo execução completa. Mudanças em configuração compartilhada devem provocar os pacotes/tarefas certos; validar alterações em `turbo.json`, lockfile, configs e scripts root antes de filtrar. Reafirma-se a decisão vigente: `verify:quick` mantém escopo full-workspace e release permanece completo; `--affected` é candidato somente a um gate adicional/medido depois de confirmar refs Git, cobertura do grafo, scripts fora do Turbo e comportamento para mudanças globais.

### Perspectiva de praticantes

Em uma discussão de design no repositório do Turborepo, mantenedores descrevem o valor do Remote Cache como o tempo de execução evitado menos o tempo de upload/download, e continuam tratando o cache local como essencial para o trabalho diário. É uma discussão técnica de 2022, não uma medição independente nem evidência dos ganhos no Polaris; reforça medir resultados em vez de presumir que todo cache hit compensa. [Turborepo — RFC: Local Cache Location, Discussion #1023](https://github.com/vercel/turborepo/discussions/1023)

### Conclusão revalidada

A feature de Remote Cache não tem preço separado, mas compartilhar um cache entre dois desenvolvedores de um produto comercial não é necessariamente grátis: Vercel Hobby é pessoal/não comercial e não oferece colaboração privada; a rota Pro soma US$ 20/mês de plataforma com uma seat e US$ 20/mês pela segunda seat Owner/Member. Portanto, não ativar só com base no rótulo “Remote Cache grátis”. Reabrir se Pro for escolhido independentemente para hospedar o produto ou se medições demonstrarem que o ganho justifica essa despesa. De todo modo, P32 e a integração opt-in e segura de `verify:quick`/CI são pré-requisitos. Manter cache local e `verify:quick` sem `--affected` até haver motivo medido para mudar.

### Fontes oficiais reconsultadas

- [Vercel — Remote Caching](https://vercel.com/docs/monorepos/remote-caching)
- [Vercel — External CI/CD](https://vercel.com/docs/monorepos/remote-caching#use-remote-caching-from-external-ci-cd)
- [Turborepo — `run` reference](https://turborepo.dev/docs/reference/run)
- [Turborepo — Constructing CI](https://turborepo.dev/docs/crafting-your-repository/constructing-ci)
- [Turborepo — Caching](https://turborepo.dev/docs/crafting-your-repository/caching)
- [Turborepo — Environment Variables](https://turborepo.dev/docs/crafting-your-repository/using-environment-variables)
- [Turborepo — Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching)
- [Turborepo — System Environment Variables](https://turborepo.dev/docs/reference/system-environment-variables)
- [Turborepo — Configuration](https://turborepo.dev/docs/reference/configuration)

### Adendo — requisito comercial e integração com `verify:quick` (2026-09-28)

A conclusão comercial precisa distinguir cache pessoal de team scope. O usuário esclareceu em 2026-09-28 que usará uma única conta Vercel, não duas identidades como no GitHub. Isso corrige a estimativa-base anterior de duas seats: um Pro team custa US$ 20/mês e inclui uma seat Owner/Member e US$ 20 em créditos de uso; uma seat adicional Owner/Member custa US$ 20/mês somente se outra pessoa precisar de acesso de desenvolvimento/admin próprio ao team. A mesma conta/team pode conter os projetos Web e Admin; CI pode autenticar-se separadamente por OIDC ou token escopado, sem exigir uma segunda conta humana. Não compartilhar credenciais de login entre pessoas. O Remote Cache não tem preço separado e continua sujeito a fair use. Hobby continua inadequado para Polaris comercial: é voltado a uso pessoal/não comercial e não oferece colaboração em repositório privado. As páginas oficiais não documentam colaboração multiusuário em cache por personal scope Hobby; não assumir esse caminho. O custo real e a elegibilidade dependem de qual plano Vercel único será escolhido e de quem precisa de acesso próprio. [Vercel — Hobby Plan](https://vercel.com/docs/plans/hobby), [Vercel — Pro Plan](https://vercel.com/docs/plans/pro-plan), [Vercel — Remote Caching](https://vercel.com/docs/monorepos/remote-caching), [Vercel — Troubleshoot project collaboration](https://vercel.com/docs/deployments/troubleshoot-project-collaboration)

Há ainda um bloqueio de integração local confirmado no worktree: `scripts/verify.ts` inclui `TURBO_TEAM: ""` e `TURBO_TOKEN: ""` em `SAFE_VERIFY_ENV`, aplicados a cada subprocesso de verificação. Assim, credenciais herdadas do ambiente CI/local são deliberadamente neutralizadas por `verify:quick`. Para usar Remote Cache nesse fluxo, será necessária uma integração explícita e restrita ao CI, desenhada após P32 (por exemplo, permitir credenciais apenas em um caminho confiável e controlado, sem expô-las em PRs não confiáveis). Não remover esse isolamento como efeito colateral de ativar Remote Cache. Esta revalidação não altera o script.

O worktree executa Turborepo `2.11.4`; a versão estável mais recente consultada no registro e na página de releases oficial é `2.11.5`. Tratar esse patch como parte da cadência de upgrades estáveis P2/P52 e atualizá-lo antes de um teste remoto; não misturar a atualização ao setup de cache nem usar a versão antiga como referência para validar a assinatura de artefatos. [Turborepo v2.11.5 — release oficial](https://github.com/vercel/turborepo/releases/tag/v2.11.5)

Fontes comerciais oficiais consultadas:

- [Vercel — Hobby Plan](https://vercel.com/docs/plans/hobby)
- [Vercel — Pro Plan](https://vercel.com/docs/plans/pro-plan)
- [Vercel — Account Management](https://vercel.com/docs/accounts)
- [Vercel — Troubleshoot project collaboration](https://vercel.com/docs/deployments/troubleshoot-project-collaboration)
- [Vercel — Remote Caching](https://vercel.com/docs/monorepos/remote-caching)
