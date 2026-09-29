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

## Classificação de risco e evidência proporcional

Classifique a mudança pelo efeito plausível, alcance, reversibilidade e incerteza. Não use caminho, extensão ou tamanho do diff como substitutos do risco. Aplique o nível mais alto que corresponda a um modo de falha plausível; uma combinação só eleva o nível quando cria outro modo de falha ou amplia o alcance. Se houver dúvida material entre dois níveis, use o superior até delimitar o efeito.

| Nível | Quando usar | Evidência adicional ao CI obrigatório |
| --- | --- | --- |
| **Low** | Apresentação, texto ou refatoração localizada sem mudança relevante em regra, dados, permissões, integração ou operação/deploy. | Nenhuma camada fixa adicional. Se a mudança altera comportamento, inclua teste focal desse comportamento. |
| **Medium** | Comportamento de negócio, endpoint ou integração com alcance e recuperação limitados, sem atravessar fronteiras críticas de identidade, organização/tenant, finanças, schema/dados ou produção. | Evidência focada no caminho e invariante alterados, usando teste unitário, de integração ou E2E conforme necessário. |
| **High** | Autenticação ou autorização privilegiada; isolamento entre organizações/RLS; billing, estados financeiros ou webhooks; migrations, backfills ou deleções difíceis de reverter; secrets/workflows de produção; ou efeitos externos amplos/difíceis de reverter. | Testes especializados do invariante afetado, verificação de compatibilidade e plano de recuperação, rollback ou forward-fix quando relevante. |

Todos os níveis mantêm os mesmos gates obrigatórios do CI; a classificação não permite bypass nem substitui os checks. O teste deve demonstrar o comportamento ou invariante alterado: typecheck e build, isoladamente, não provam isso. Atualize a documentação correspondente quando o contrato mudar, qualquer que seja o nível. Uma mudança visual em um fluxo sensível não é Low apenas por ser visual; um provider simulado pode ser Medium, enquanto uma cobrança real ou outro efeito financeiro é High. Quando Staging estiver configurado, faça smoke do caminho de alto risco antes da produção. Até lá, use CI e ambientes locais não produtivos e não declare que houve teste em produção.

## Isolamento e lacunas

O ambiente PostgreSQL efêmero cobre comportamento de banco. E2E usa configuração própria e bootstrap de desenvolvimento controlado para criar contexto de teste, mas o isolamento efetivo depende das variáveis e bancos apontados na execução.

Testes de Asaas, Woovi e Resend encontrados são unitários/de fonte ou usam doubles. Não são prova de chamadas remotas, assinatura real ou reconciliação em sandbox. Também não há, no repositório, prova automatizada de backup/restore de produção, alertas ou retenção de observabilidade.

Fontes: `package.json:scripts.test`, `package.json:scripts.test:admin`, `.github/workflows/ci.yml:verify`, `.github/workflows/ci.yml:postgres-behavior`, `apps/web/vitest.config.ts:default`, `apps/admin/vitest.config.ts:default`, `apps/web/playwright.config.ts:default`, `apps/admin/playwright.config.ts:default`.
