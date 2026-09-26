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
