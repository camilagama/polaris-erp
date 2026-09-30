---
status: accepted
research_status: repository-and-decision-crosswalk-completed
decision_status: approved
reviewed_on: 2026-09-26
approved_on: 2026-09-26
---

# P64 — crosswalk da Fase 3 de CI e segurança

## Resultado

P64 não é uma lista nova de tecnologias a adotar. Cada linha já tem uma decisão anterior, e a ordem literal do relatório precisa respeitar dependências. A fase corrigida preserva a ordem P61/P62 e apenas acrescenta artifacts, Semgrep POC e Turbo Cache condicional.

## Matriz de decisões

| Item do relatório | Estado reconciliado |
|---|---|
| Separar workflows operacionais | Aprovado em P23; primeiro `operations.yml` com uma operação selecionada. P62 exige essa separação antes de concurrency. |
| Dependency Review | Não adicionar neste plano sob o repo privado pessoal GitHub Pro e `bun.lock`; P28 não encontrou entitlement/cobertura adequada documentada. |
| CodeQL | Não adicionar sob o entitlement atual; P29 aprovou POC Semgrep Free Edition autogerido depois de P22, sem gate obrigatório antes da avaliação. |
| Artifacts Playwright | Aprovado P55: uploads apenas em falha, por app, reports/results/trace/screenshot, vídeo inicialmente off, 7 dias, somente dado sintético. |
| Turbo Remote Cache | Aprovado condicionalmente em P31; bloqueado até a auditoria P32 de variáveis, hashes, outputs/logs, secrets e Sentry upload, além de owner/team/scope e credencial limitada. |
| `--affected` | Não usar no início. P20/P31 determinam workspace completo; reavaliar depois de medir e validar base Git, alterações locais, dependentes e tarefas fora do Turbo. |
| Turbo env hashing | P32 é pré-requisito do Remote Cache, não revisão opcional depois de ativá-lo. |
| PostgreSQL CI/Production | P54 já escolheu PG18 e P61 moveu o serviço CI para a fase inicial; depois alinhar E2E/Staging/Production ao mesmo major ao provisionar. |

## Estado local auditado

No checkout auditado, `.github/workflows/` contém apenas `ci.yml`; jobs E2E não enviam artifacts; Turbo não tem Remote Cache habilitado nem opção `--affected`; `turbo.json` tem um conjunto amplo de env pass-through ainda sujeito à auditoria P32; PostgreSQL CI está em `postgres:16`. Isso descreve arquivos locais, não confirma Settings, secrets, cache remoto, E2E URLs ou configurações de providers.

## Sequência aprovada

1. Resolver P22, criar perfis P20 e cumprir P61/P62: separar operações; fixar Actions/permissões; aplicar concurrency somente à CI.
2. Alinhar PostgreSQL CI a 18 conforme P54.
3. Configurar artifacts E2E failure-only conforme P55.
4. Executar o POC Semgrep aprovado em P29 depois da baseline verde; decidir o gate só após revisar resultados.
5. Auditar env/hash/outputs/logs/side effects conforme P32.
6. Se a auditoria e a configuração Vercel/team/scope forem aceitáveis, ativar Remote Cache P31 com credenciais mínimas.
7. Manter `--affected` fora do perfil inicial até que medição e validação sustentem essa mudança.

## Pesquisa reutilizada

P64 reutiliza as pesquisas primárias já concluídas em `research-ponto-20-verification-commands.md`, `research-ponto-21-pre-push.md`, `research-ponto-22-baseline.md`, `research-ponto-23-ci-operations.md`, `research-ponto-25-token-permissions.md`, `research-ponto-26-action-sha.md`, `research-ponto-27-concurrency.md`, `research-ponto-28-dependency-review.md`, `research-ponto-29-codeql.md`, `research-ponto-31-turborepo.md`, `research-ponto-32-turbo-env.md`, `research-ponto-54-postgres-version.md` e `research-ponto-55-e2e-artifacts.md`. Não há uma nova questão de API/tecnologia nesta síntese.

Nenhum código, workflow ou teste foi alterado/executado nesta revisão.
