# Pesquisa do ponto 29 — CodeQL/SAST no Polaris

**Revisado em:** 2026-09-25  
**Pergunta:** CodeQL cobre JavaScript/TypeScript e Next.js no monorepo, qual é a elegibilidade privada, como resultados viram gate e que alternativa existe sem GitHub Code Security?

## Síntese

CodeQL é tecnicamente adequado ao código JavaScript/TypeScript do Polaris, incluindo Next.js. A análise de JS/TS é interpretada e não exige executar o build do Next; a biblioteca oficial do CodeQL contém modelos para Next.js. Uma análise pode cobrir o repo monorepo inteiro, com setup padrão, ou separar fatias em configuração avançada.

O bloqueio atual é de plano: P3 prevê manter o repo privado sob conta pessoal GitHub Pro, que não habilita code scanning privado. CodeQL/Code Security em privado exige GitHub Team ou Enterprise com GitHub Code Security habilitado. CodeQL Action/CLI consegue gerar e subir resultados, mas o upload em repositório privado também exige essa elegibilidade.

Sem Code Security, CodeQL não pode publicar code-scanning alerts para o repo privado pessoal Pro. Uma alternativa possível sem licença GitHub é avaliar Semgrep Free Edition em CI autogerida: a oferta atual inclui Code/SAST até dez repositórios privados e dez contribuidores, mas adiciona um fornecedor e envia metadados de scan. Não confundir esse plano com Semgrep Community Edition e suas regras com licença restrita. Recomendação: não adicionar CodeQL agora; decidir se um POC Semgrep Free vale o novo fornecedor ou se a SAST deve ficar adiada até mudar o plano.

## Fatos documentados

### Cobertura JS/TS, Next.js e monorepo

- CodeQL suporta JavaScript e TypeScript sob o identificador `javascript-typescript`; a documentação recomenda esse valor para analisar as duas linguagens. JS/TS são linguagens interpretadas: a geração da base não pede um build do Next.js. Para TypeScript, o CodeQL CLI exige Node.js 14 ou superior disponível. ([Code scanning com CodeQL](https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-code-scanning), [preparar código para análise](https://docs.github.com/en/code-security/tutorials/customize-code-scanning/prepare-code-for-analysis))
- A biblioteca oficial do CodeQL contém o módulo `NextJS`, com modelos para handlers de Pages Router e App Router, `NextRequest` e outros padrões do framework. Isso ajuda consultas de fluxo de dados em Next.js; não substitui as verificações próprias de tipos, builds ou testes do app. ([Modelos Next.js na biblioteca CodeQL](https://codeql.github.com/codeql-standard-libraries/javascript/semmle/javascript/frameworks/Next.qll/module.Next%24NextJS.html))
- Default setup escolhe automaticamente linguagens, query suite e eventos a partir do repositório. Ele analisa as linguagens suportadas em push para a branch default/protegida, PRs contra essas branches e, semanalmente; PRs de forks são excluídos. Em configuração avançada, pode-se escolher `javascript-typescript`, eventos, query suite e slices por aplicação.
- Se dividir monorepo em múltiplas análises/workflows, o GitHub recomenda manter ao menos uma análise agendada que percorra todo o código: fluxos de dados entre componentes podem depender de uma visão completa. Resultados de várias fatias devem receber categorias distintas para não se sobrescreverem. ([Tipos de setup](https://docs.github.com/en/code-security/concepts/code-scanning/setup-types), [alertas demorados/escopo](https://docs.github.com/en/code-security/reference/code-scanning/troubleshoot-analysis-errors/analysis-takes-too-long), [SARIF em monorepos](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file))
- O query suite `default` prioriza precisão; `security-extended` inclui queries adicionais de menor precisão, portanto pode produzir mais findings para triagem. ([Query suites](https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-query-suites))

### Elegibilidade e custo de CodeQL privado

- Code scanning com CodeQL está disponível em repositórios públicos de GitHub.com. Para privados/internos, é necessário GitHub Code Security/Advanced Security habilitado. Code Security é um produto adicional para contas GitHub Team ou Enterprise; GitHub Free/Pro pessoal limita code scanning a repositórios públicos. ([CodeQL privado](https://docs.github.com/en/code-security/reference/code-scanning/troubleshoot-analysis-errors/private-repository-enablement), [GitHub Advanced Security](https://docs.github.com/en/get-started/learning-about-github/about-github-advanced-security))
- CodeQL default/advanced setup roda em GitHub Actions e consome minutos de Actions. Sem o entitlement privado, a Action não consegue enviar os resultados ao code scanning do repo. CodeQL CLI em CI externa também precisa do entitlement para upload de resultados privados. ([Advanced setup](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/configure-code-scanning/configuring-advanced-setup-for-code-scanning), [upload SARIF](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file))

### Upload e bloqueio do merge

- O CodeQL Action envia SARIF automaticamente ao concluir a análise; os resultados são exibidos como code scanning alerts. Um workflow completado não é, sozinho, uma política por severidade. ([Upload SARIF](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file))
- Para bloquear PR com findings, um ruleset pode habilitar `Require code scanning results`, exigir uma ferramenta como CodeQL e escolher limiares de alertas/severidade. A regra também bloqueia se a análise requerida estiver em andamento ou a ferramenta não estiver configurada. Ela exige Code Security e, portanto, não está disponível no plano privado pessoal Pro do P3. ([Merge protection de code scanning](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/manage-your-configuration/set-merge-protection), [rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets))
- Código de workflow também pode ser selecionado como status check obrigatório pela branch protection; isso garante que o workflow rode e passe, mas deve-se distinguir esse status de uma regra por severidade sobre alertas. Para branch protegida, configurar o check que realmente representa o gate desejado. ([Status checks e rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets))

## Evidência local

### Polaris

- Snapshot local `main`, commit `5f3f91a4ca47d7105a2cfc84ae63d12f3eb1912e`; o repo é privado e a rota aprovada em P3 é a conta pessoal GitHub Pro do irmão. Esse plano privado não inclui Code Security para code scanning. P3 confirma o owner/transferência pretendidos; as Settings remotas não foram consultadas.
- O workspace tem `apps/web`, `apps/admin` e `packages/*`, com lockfile Bun. `.github/workflows/ci.yml` é o único workflow; não encontrei CodeQL, SARIF upload, Semgrep ou outra etapa SAST. A CI cobre lint/format, TypeScript, testes, builds e uma verificação de advisories de dependências, não uma análise estática de fluxo de dados de vulnerabilidades.

### Hub

- Snapshot auditado `origin/main` em `bea618fe759feb16fa77269340bf3c50a283e8b0`. O inventário de `.github/workflows` não encontrou `codeql`, `code-scanning`, `security-events` ou upload SARIF. A CI do Hub tem verificações estáticas e `bun audit --production`, mas nenhum workflow CodeQL versionado.
- A API read-only do GitHub consultada em 2026-09-25 listou um workflow dinâmico `CodeQL` ativo, criado em 2026-08-29, com 37 runs históricos; o mais recente retornado foi sucesso em 2026-09-11 no SHA `ea60cde…`. Não encontrei check CodeQL nos SHAs atuais de `main`/`staging`, e os rulesets ativos exigem apenas `CI`. A leitura do default setup retornou 403 por falta de `admin:repo_hook`; não foi possível verificar idiomas/query suite nem a licença Code Security da organização. Portanto, o Hub prova uso remoto histórico, não cobertura atual nem gate CodeQL em merges.

## Alternativa sob o plano atual

- **Semgrep Free Edition:** a página atual anuncia o produto Code/SAST por US$ 0 por committer, com até dez repositórios privados e dez contribuidores; inclui Pro Rules e integração de CI/PR. A execução em CI autogerida mantém o código no runner e envia metadados dos scans; Managed Scans podem clonar o repositório para a infraestrutura Semgrep. Com poucos colaboradores, pode ser uma alternativa prática sem comprar GitHub Code Security, mas adiciona um fornecedor, uma conta/token e armazenamento externo de findings/metadata. Validar limites/termos e configurar execução em CI, sem Managed Scans, antes de incluir código privado. ([Preços e limites atuais](https://semgrep.dev/pricing/))
- **Semgrep Community Edition:** scanner local/CI gratuito, sem login e com regras da comunidade, mas a licença das regras mantidas pela Semgrep restringe seu uso a contextos internos, não concorrentes e não-SaaS. Como Polaris é um produto SaaS, não tratar `semgrep scan --config auto` com essas regras como substituto automaticamente liberado sem revisar os termos; não confundir Community Edition com o plano Semgrep Free da plataforma. ([Semgrep CE](https://semgrep.dev/products/community-edition/), [licença das regras CE](https://semgrep.dev/blog/2024/important-updates-to-semgrep-oss/))
- Semgrep pode emitir status CI e comentários/integrações de PR, mas não gera CodeQL alerts no GitHub Security tab sem o upload SARIF privado elegível pelo Code Security. Para o Polaris, um POC deve confirmar as regras JS/TS úteis, ruído, efeito no tempo de CI, gatilhos e política de falha antes de tornar o status obrigatório. ([Exemplos CI do Semgrep](https://docs.semgrep.dev/semgrep-ci/sample-ci-configs), [CodeQL/SARIF em repo privado](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file))

**Trade-off:** CodeQL oferece integração nativa, modelos para Next.js, alerts persistentes e merge protection por severidade, mas depende de Code Security para private. Semgrep Free Edition é uma alternativa SaaS gratuita no limite documentado, com execução em CI e dados de findings fora do GitHub; exige avaliar e aceitar um novo fornecedor. Semgrep CE evita conta, mas sua licença de regras tem restrição contextual relevante a Polaris. `bun audit`/baseline existente continua sendo SCA de dependências e não substitui SAST.

## Perspectiva de praticantes

Em uma discussão recente do GitHub Community sobre avaliar um repositório antes de adotá-lo, participantes recomendaram combinar auditoria do lockfile, code scanning e revisão manual, sem tratar Dependabot ou um scanner isolado como avaliação completa. É uma experiência anedótica, não regra de engenharia nem validação específica de CodeQL/Polaris; reforça apenas o uso em camadas. ([GitHub Community #204302](https://github.com/orgs/community/discussions/204302))

## Recomendação para o Polaris

1. No cenário P3 atual, não iniciar CodeQL privado nem torná-lo required: o repo seguirá privado sob GitHub Pro pessoal e Code Security não está habilitado.
2. Como alternativa de custo zero, avaliar Semgrep Free Edition num POC em CI autogerida, sem Managed Scans; confirmar termos, privacidade, regras JS/TS, ruído e tempo. Só depois decidir se o check será obrigatório. Se não quiser novo fornecedor, manter os controles atuais e reavaliar CodeQL quando o plano mudar.
3. Reavaliar CodeQL se o repo for público ou se migrar para uma organização GitHub Team/Enterprise com Code Security. Nesse caso, começar pelo default setup para `javascript-typescript` e todo o monorepo; revisar a cobertura do status page, configurar merge protection por severidade e só então decidir se uma análise por slices/`apps/web`/`apps/admin` agrega valor.
4. Se o scan for dividido, preservar uma análise completa agendada; não usar job status isolado como bloqueio de findings. O gate por resultados exige ruleset `Require code scanning results`.

## Limites

- Não consultei a titularidade/plano remoto do GitHub, Code Security, branch protection, runners, minutos de Actions ou configuração de CodeQL/Semgrep no Hub. A conclusão sobre plano usa a decisão P3 registrada e documentação atual.
- Não executei workflows/testes e não alterei configuração. Nenhum secret foi lido. A documentação de produto e disponibilidades foi consultada em 2026-09-25.
