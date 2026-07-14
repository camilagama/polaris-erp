# Plano de documentação do Polaris

> **Para agentes:** execute este plano por grupos documentais, com revisão após cada grupo. Marque apenas itens realmente concluídos.

**Objetivo:** produzir documentação técnica, funcional e operacional fiel ao commit `886eda01ef126139ddce62545971e48f7d3d15f3` do monorepo Polaris.

**Arquitetura documental:** o `README.md` será a porta de entrada; `docs/README.md` será o índice; os documentos especializados preservarão nomes técnicos do código e citarão arquivos e símbolos como evidência. Afirmações externas sem prova local serão marcadas como não confirmadas.

**Fontes de verdade:** código executável, schema e migrations versionadas, metadados read-only do Neon no branch `dev`, testes, configurações e documentação existente, nessa ordem. O branch Neon `dev` não representa prova de produção.

## Restrições globais

- Alterar somente `README.md` e arquivos em `docs/`.
- Não alterar código, schema, dados, secrets, dependências, infraestrutura ou deployments.
- Não executar migrations, DDL ou DML; Neon somente para metadados em leitura.
- Não incluir credenciais, URLs internas sensíveis, dados pessoais, IDs de clientes ou valores de variáveis secretas.
- Escrever em português; manter identificadores técnicos no idioma do código.
- Registrar comportamento não confirmado, contradições, riscos e lacunas; nunca transformar inferência em fato.
- Não abrir URLs ou relatórios locais; diagramas Mermaid permanecem em Markdown.

## Inventário de fontes obrigatório

- `README.md`, `package.json`, `turbo.json`, `.github/workflows/ci.yml`, `vercel.json`, `apps/admin/vercel.json`.
- `apps/web/src/app/**`, `apps/admin/src/app/**`, `apps/web/src/features/**`, `apps/web/src/integrations/**`, `apps/web/src/lib/**`.
- `packages/{auth,billing,db,events,platform,platform-auth}/src/**` e `packages/db/src/migrations/**`.
- Testes correspondentes e documentos existentes em `docs/architecture/`, `docs/runbooks/`, `docs/security/`.

## Árvore documental alvo

```text
docs/
  README.md
  documentation-plan.md
  documentation-audit-report.md
  documentation-coverage.md
  glossary.md
  maintenance.md
  architecture/
    overview.md
    repository-structure.md
    request-lifecycle.md
    authorization-model.md
    external-integrations.md
    rls-tenant-isolation.md
  database/
    schema-reference.md
    relationships-and-constraints.md
    rls-and-tenant-context.md
    migrations.md
  modules/
    authentication.md
    organizations-and-tenancy.md
    platform-admin.md
    catalog-products-inventory.md
    sales.md
    goals.md
    subscriptions-and-billing.md
    uploads-and-images.md
  api/
    route-handlers.md
    server-actions.md
    webhooks.md
  operations/
    jobs-and-workflows.md
    observability.md
    environments-and-deployment.md
  security/
    application-security.md
  testing/
    strategy.md
    end-to-end.md
```

## Modelo para documentos de módulo

Quando aplicável, cada módulo deve cobrir: visão geral, objetivo, escopo, fora de escopo, atores, permissões, arquivos principais, dependências, modelo de dados, estados, fluxos principais e alternativos, falhas, casos de borda, validações, regras, segurança, multi-tenancy, efeitos colaterais, integrações, eventos/jobs, idempotência, concorrência, auditoria, logs/métricas, testes, limitações, comportamentos não confirmados, perguntas em aberto e referências.

## Tarefas

### 1. Fundação e mapa de navegação

**Arquivos:** `README.md`, `docs/README.md`, `docs/architecture/{overview,repository-structure,request-lifecycle,external-integrations}.md`, `docs/glossary.md`.

- [x] Confirmar apps, packages, scripts, rotas, ambiente e integrações nas fontes do inventário.
- [x] Atualizar `README.md` como entrada concisa: produto, stack confirmada, setup, categorias de ambiente, comandos, banco, testes, limitações e links documentais.
- [x] Criar índice com público, ordem de leitura, status, commit analisado, lacunas e perguntas abertas.
- [x] Criar mapa arquitetural, estrutura do monorepo, ciclo de request e integrações com diagramas Mermaid apenas quando melhorarem clareza.
- [x] Verificar links relativos com `bun run docs:check`.

### 2. Identidade, autorização e administração interna

**Arquivos:** `docs/modules/{authentication,organizations-and-tenancy,platform-admin}.md`, `docs/architecture/authorization-model.md`, `docs/security/application-security.md`.

- [x] Documentar Better Auth, Google, callbacks, redirects, sessão, logout, account linking e proteção contra enumeração apenas conforme o código.
- [x] Registrar explicitamente cenários não implementados ou não confirmados: ban, email verification, reset, revogação global e sessão admin cross-origin.
- [x] Criar matriz de papéis web e plataforma, incluindo resultado negado e evidência.
- [x] Documentar organização ativa, membership, isolamento, RLS transacional e limitações de múltiplas memberships/suspensão.
- [x] Documentar admin interno, grants, auditoria, rate limit, PII, ações perigosas e dependências de Vercel Authentication não confirmadas.

### 3. Banco de dados e módulos de negócio

**Arquivos:** `docs/database/{schema-reference,relationships-and-constraints,rls-and-tenant-context,migrations}.md`, `docs/modules/{catalog-products-inventory,sales,goals,subscriptions-and-billing,uploads-and-images}.md`, atualização de `docs/architecture/rls-tenant-isolation.md`.

- [x] Mapear tabelas, enums, chaves, constraints, índices, tenant keys e grupos de dados a partir de Drizzle, migrations e metadados Neon read-only.
- [x] Criar matriz RLS distinguindo política versionada, dados globais e isolamento exclusivo da aplicação; não tratar filtro de aplicação como RLS.
- [x] Documentar catálogo/produtos/estoque, vendas, metas, billing manual e R2 por fluxo, regras, transações, concorrência e testes.
- [x] Atualizar documento RLS existente para remover afirmações operacionais obsoletas e preservar limitações externas.
- [x] Declarar ausência de checkout, grace period e fluxos de billing não encontrados.

### 4. Interfaces, eventos e operação

**Arquivos:** `docs/api/{route-handlers,server-actions,webhooks}.md`, `docs/operations/{jobs-and-workflows,observability,environments-and-deployment}.md`, `docs/testing/{strategy,end-to-end}.md`.

- [x] Inventariar handlers, actions e webhooks com consumidor, guard, validação, efeito, tabelas, erros, idempotência e fonte.
- [x] Separar captura de webhook (`observed`) do processamento de outbox com retry/lease.
- [x] Documentar Inngest, reconciliação R2, healthchecks, logs/Sentry, rate limit e ambientes sem publicar configurações sensíveis.
- [x] Documentar CI/CD, preflight, deploy, smoke, backup/restore/rollback conforme runbooks e scripts existentes.
- [x] Documentar ferramentas e cobertura de teste, bancos isolados E2E e lacunas verificáveis.

### 5. Rastreabilidade, cobertura e validação

**Arquivos:** `docs/documentation-audit-report.md`, `docs/documentation-coverage.md`, `docs/maintenance.md`, `docs/documentation-plan.md`.

- [x] Registrar branch/commit, fontes analisadas, documentos criados/atualizados, confirmações, inferências, contradições, gaps de teste/observabilidade e riscos.
- [x] Criar matriz de cobertura por área com código, banco, testes, documento, confiança e lacunas.
- [x] Definir manutenção em PRs, atualização de diagramas, referências e commit verificado.
- [x] Marcar itens concluídos somente após revisar conteúdo, referências e links.
- [x] Executar `bun run docs:check`, procurar arquivos vazios, links quebrados, referências inexistentes, termos inconsistentes, secrets e PII.

## Critérios de aceite

- [x] README atualizado e índice documental navegável.
- [x] Todas as áreas substanciais inventariadas acima têm documento ou limitação explícita.
- [x] Auth, tenancy, billing, admin, uploads, banco, RLS, APIs, jobs, segurança, testes e operação estão cobertos com fontes.
- [x] Matrizes de acesso e RLS foram confrontadas com guards, schema e migrations.
- [x] Cobertura, auditoria, glossário e manutenção registram lacunas e contradições.
- [x] Links relativos foram validados e a documentação não contém secrets ou PII.
