# Estratégia de testes

A estratégia versionada combina testes unitários/integração em Vitest, E2E em Playwright, verificações de fronteira e um job PostgreSQL efêmero para comportamento de banco. Ela não demonstra cobertura completa de produção nem testes remotos de provedores.

## Camadas executadas no CI

| Camada | Evidência | Objetivo |
| --- | --- | --- |
| Checks estáticos | Ultracite/Biome, typecheck, Knip, boundaries e auditoria baseline | Tipos, estilo, imports e higiene de dependências. |
| Vitest por aplicação | `bun run test` e `bun run test:admin` | Lógica de domínio, handlers e componentes cobertos por suites locais. |
| PostgreSQL comportamental | `bun run test:postgres` em serviço efêmero | Migrações, grants e comportamento do banco em PostgreSQL. |
| E2E web/admin | Playwright em aplicações buildadas | Fluxos de shell, acesso administrativo, operações e API de imagens. |
| Documentação e ambiente | `docs:check` e `env:check` | Links/estrutura de docs e configuração esperada. |

Vitest usa ambiente Node e timeout de 10 segundos no web; o admin mantém configuração Node equivalente. Playwright sobe servidores locais buildados: web na porta 3001 e admin na 3002. No CI, as suites admitem duas tentativas e coletam trace na primeira repetição; web limita workers a um, reduzindo disputa por estado compartilhado.

## Isolamento e lacunas

O ambiente PostgreSQL efêmero cobre comportamento de banco. E2E usa configuração própria e bootstrap de desenvolvimento controlado para criar contexto de teste, mas o isolamento efetivo depende das variáveis e bancos apontados na execução.

Testes de Asaas, Woovi e Resend encontrados são unitários/de fonte ou usam doubles. Não são prova de chamadas remotas, assinatura real ou reconciliação em sandbox. Também não há, no repositório, prova automatizada de backup/restore de produção, alertas ou retenção de observabilidade.

Fontes: `package.json:scripts.test`, `package.json:scripts.test:admin`, `.github/workflows/ci.yml:verify`, `.github/workflows/ci.yml:postgres-behavior`, `apps/web/vitest.config.ts:default`, `apps/admin/vitest.config.ts:default`, `apps/web/playwright.config.ts:default`, `apps/admin/playwright.config.ts:default`.
