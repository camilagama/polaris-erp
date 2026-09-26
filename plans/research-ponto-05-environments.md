# Pesquisa do ponto 5 — contrato dos ambientes

**Revisado em:** 2026-09-24  
**Escopo:** local, CI, Preview por PR, homologação persistente e produção para Polaris, com dois apps Next.js, PostgreSQL/Neon com RLS e integrações externas.

## Veredito

Os cinco contratos do relatório são uma boa estrutura conceitual. A tabela precisa separar **ambiente** de **branch Git**: um ambiente persistente de homologação não exige uma branch Git permanente chamada `staging`. Essa distinção acompanha a decisão do usuário de começar com PRs curtos para `main`, sem branch `staging`, mas configurar uma homologação persistente antes do go-live. O provedor de hospedagem e seu plano continuam em aberto.

**Decisão do usuário após esta pesquisa:** adotar quatro ambientes canônicos — Local, CI, Staging e Produção. Tratar Preview de PR como modalidade de deploy efêmero do fluxo não produtivo, não como quinto ambiente. Manter as URLs E2E dedicadas e não produtivas atuais; criar Neon branches descartáveis por PR quando Preview for configurado.

O relatório também descreve um estado desejado, não o estado remoto atual. O usuário informou que Polaris ainda não foi conectado à Vercel.

## O que o repositório já comprova

- [`.env.example`](../.env.example) já classifica variáveis locais, de produção, opcionais e geradas, e separa origens, URLs/roles de banco, OAuth, billing, webhooks, observabilidade e serviços externos. Não li valores de `.env.local`.
- [`docs/architecture/database-environments.md`](../docs/architecture/database-environments.md) define papéis de banco para produção, migrations, preview/dev e E2E, enfatiza a role de runtime sem `BYPASSRLS` e proíbe usar produção em E2E.
- O job `postgres-behavior` em [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) sobe PostgreSQL 16 efêmero, aplica migrations do zero e verifica comportamento de RLS/constraints. Isso confirma o banco efêmero para testes comportamentais de CI.
- Os jobs E2E do mesmo workflow recebem `E2E_DATABASE_URL` e `ADMIN_E2E_DATABASE_URL` como secrets. Logo, “CI usa só PostgreSQL efêmero e fakes” não descreve todo o fluxo versionado atual. Se esses secrets estão configurados e para quais branches Neon apontam é estado remoto não verificado nesta pesquisa.
- [`vercel.json`](../vercel.json) contém configuração de build para o app web. Isso, sozinho, não prova vínculo a um projeto Vercel, deploy ativo nem existência de ambientes remotos.

**Ressalva de segurança de configuração local:** a auditoria do checkout observou que `.env.example` aponta os endpoints de Asaas e Woovi para domínios de produção por padrão, apesar de a tabela-alvo propor sandbox/dev em Local. As credenciais de exemplo estão vazias, e não foram lidos `.env.local` nem valores secretos; mesmo assim, o contrato “Local = sandbox” não está garantido pelo hostname de exemplo. Alinhar essa configuração será item de fundação antes de usar credenciais locais. `.env.example` já tinha modificação do usuário e foi preservado.

## Contrato recomendado

| Ambiente | Código/ref | Banco e dados | Providers e propósito |
| --- | --- | --- | --- |
| **Local** | Working tree ou branch curta | PostgreSQL local descartável, se suficiente; caso precise de Neon, branch individual de desenvolvimento. Dados sintéticos. Nunca produção. | OAuth de desenvolvimento e sandbox. Túnel local só para fluxos que realmente precisam receber webhooks. Permite desenvolver sem depender de credenciais live. |
| **CI** | SHA do PR | PostgreSQL efêmero para migrations, RLS e constraints, como já existe. Para E2E que necessite de serviço real, banco isolado e descartável por execução/PR; nunca branch compartilhada ou produção. | Fakes/stubs para a maioria dos testes; sem credenciais live. Jobs privilegiados devem ter permissões mínimas e não executar código de PR não confiável com secrets. |
| **Preview por PR** | Commit exato do PR; ativar quando a hospedagem for escolhida | Neon branch isolada por PR somente quando o preview precisa de escrita/dados reais de Postgres. Usar dados sintéticos ou schema-only/mascaramento. Excluir ao fechar o PR e manter expiração como proteção contra órfãos. | URLs únicas para inspeção, sandbox e credenciais sem privilégios. Tratar callbacks de OAuth e destinos de webhook como limitação do provider; nem toda integração suporta callbacks dinâmicos por PR. Opcional nesta fase, não bloqueia o início. |
| **Homologação persistente** | Commit candidato a release. A origem Git e estratégia de promoção ficam para o desenho do deploy; não precisam de branch `staging`. | Banco Neon dedicado e persistente, role de runtime sem `BYPASSRLS`, role de migration separada; dados sintéticos/mascarados. Não compartilhar DB mutável com PRs. | URL estável para teste integrado de web/admin, OAuth, webhooks e billing. Usar sandbox e buckets/namespaces de teste. Homologar fluxos assíncronos e callbacks antes do go-live. |
| **Produção** | Release/deploy explicitamente elegível; branch/ref exata depende do fluxo final aprovado | Branch Neon de produção protegida, backups/PITR validados, role de runtime sem `BYPASSRLS` e credencial administrativa separada para migration. Dados reais sujeitos a acesso restrito. | Credenciais e webhooks live, domínio/callbacks oficiais, alertas e smoke/preflight de produção. Nunca importar secrets desta camada para Local, CI ou Preview. |

### Por que separar Preview e homologação

Preview é temporário e orientado à revisão de uma mudança. Homologação é uma URL duradoura para testar a integração completa e uma versão candidata ao go-live. Vercel documenta Preview por branch/PR como ambiente padrão e Custom Environments, com branch tracking/domínio próprios, como opção Pro/Enterprise. Uma branch Git `staging` é uma alternativa para manter URL Preview persistente, não uma exigência conceitual de homologação. Assim, a hospedagem escolhida afeta custo e implementação, mas não obriga alterar agora a decisão de branches. [Vercel: environments](https://vercel.com/docs/deployments/environments), [Vercel: deploys a partir do Git](https://vercel.com/docs/git)

Neon documenta branches isoladas para Preview e testes e um fluxo automatizado que cria uma branch por PR, aplica migrations e remove a branch ao fechar o PR. Branches podem herdar schema e dados de uma origem; para dados sensíveis, Neon oferece branch somente de schema e recomenda mascaramento quando é preciso copiar dados. Isso torna plausível a preocupação do relatório sobre migrations de PR interferirem entre si, mas não justifica compartilhar uma branch de DB mutável. O cleanup deve ser parte do fluxo, com expiração como defesa adicional. [Neon: workflow de branching](https://neon.com/docs/get-started-with-neon/workflow-primer), [Neon: preview environments com branches](https://neon.com/blog/branching-with-preview-environments)

## Secrets e integrações

GitHub Actions oferece secrets no escopo de repositório, organização ou environment; secrets de environment ficam disponíveis apenas para jobs que referenciam esse environment e passam suas regras de proteção. Secrets não são enviados a workflows disparados por PRs de forks. O contrato deve manter permissões mínimas, separar credenciais por ambiente e evitar `pull_request_target` executando código do PR com secrets. [GitHub: environments de deployment](https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments), [GitHub: secrets](https://docs.github.com/en/code-security/reference/secret-security/secret-types), [GitHub: uso seguro de `pull_request_target`](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target)

Para OAuth, Google permite URIs localhost para desenvolvimento, enquanto origens/deploys públicos precisam de redirect URIs autorizadas; isso favorece credenciais e callbacks distintos por app/ambiente. Para cobrança, o Sandbox do Asaas é separado da produção, usa conta/chave própria e permite simular pagamentos e webhooks; o provider também alerta que nem todos os comportamentos de produção têm cobertura igual no sandbox. Portanto, “sandbox” reduz risco, mas não substitui uma lista de fluxos e diferenças a validar. [Google OAuth para aplicações web](https://developers.google.com/identity/protocols/oauth2/web-server), [Asaas: sandbox](https://docs.asaas.com/docs/sandbox)

## Observações de implementação para o plano final

1. Preservar cinco categorias, mas documentar o contrato uma vez e alinhar `.env.example`, `database-environments.md`, `environments-and-deployment.md` e os runbooks; hoje existem descrições parcialmente sobrepostas.
2. Manter CI rápido/determinístico sem credenciais externas para unit, build e testes de migrations/RLS. Decidir se E2E continuará usando secrets apontados a uma branch Neon dedicada ou evoluirá para branch efêmera por execução/PR; verificar secrets remotos antes de afirmar configuração.
3. Tratar Preview por PR como incremento opcional. Se automatizado, restringir criação de branches e secrets, aplicar migrations isoladamente e limpar branches após o PR.
4. Antes da produção, tornar obrigatória uma homologação integrada persistente com URL estável, dados não reais, callbacks/webhooks testáveis e evidência de migrations, RLS, billing e recuperação.
5. Ao escolher hosting, revisar custo/limites atuais. Em Vercel, Preview padrão e Custom Environment persistente têm disponibilidade/plano diferentes; configurar dois apps, domínios, variáveis e callbacks ainda exige projeto e plano concretos.

## Prática comunitária (anedótica)

Uma discussão da comunidade GitHub sobre GitHub Flow argumenta que ambientes podem ser dirigidos pelo pipeline sem espelhar branches Git permanentes. É uma opinião de participantes, não regra oficial; serve como exemplo compatível com a decisão do Polaris. Relatos de practitioners também apontam cleanup e custo de ambientes efêmeros como pontos operacionais a acompanhar, reforçando TTL e remoção automática, mas são relatos individuais. [Discussão GitHub Community](https://github.com/orgs/community/discussions/196024), [relato em r/devops sobre ambientes efêmeros](https://www.reddit.com/r/devops/comments/1tgsjel/ephemeral_environment/)
