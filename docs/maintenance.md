# Manutenção da documentação

## Regra de atualização

Atualize a documentação no mesmo PR quando uma mudança afetar comportamento, contrato, dado, autorização, operação ou risco. Não atualize apenas para repetir detalhes de implementação sem impacto de uso ou operação.

| Mudança no PR | Documentos a revisar |
| --- | --- |
| Rota, Server Action, payload, erro ou autenticação HTTP | `api/route-handlers.md`, `api/server-actions.md`, `api/webhooks.md` e o módulo afetado. |
| Papel, capability, guard, organização, RLS ou contexto de banco | `architecture/authorization-model.md`, `database/rls-and-tenant-context.md`, `architecture/rls-tenant-isolation.md` e módulo afetado. |
| Schema, enum, migration, constraint ou índice | `database/schema-reference.md`, `database/relationships-and-constraints.md`, `database/migrations.md` e módulo afetado. |
| Billing, evento, webhook, job, retry ou provedor | `modules/subscriptions-and-billing.md`, `api/webhooks.md`, `operations/jobs-and-workflows.md` e `architecture/external-integrations.md`. |
| Imagem, R2, armazenamento ou reconciliação | `modules/uploads-and-images.md`, `modules/catalog-products-inventory.md`, `operations/jobs-and-workflows.md` e `api/route-handlers.md`. |
| CI, deploy, ambiente, segredo, observabilidade ou runbook | `operations/{environments-and-deployment,observability}.md`, `testing/{strategy,end-to-end}.md`, `security/application-security.md` e runbook correspondente. |
| Termo de domínio ou página documental nova | `CONTEXT.md`, `docs/README.md` e a fonte canônica do assunto. Revise `documentation-coverage.md` somente se a cobertura mapeada mudar e `documentation-audit-report.md` se uma lacuna, contradição ou risco for resolvido. |

## Checklist de PR

1. Compare a mudança com o commit de base e determine quais linhas da tabela acima se aplicam.
2. Atualize afirmações de comportamento junto com as fontes concretas: arquivo e símbolo, migration ou teste.
3. Classifique afirmações externas como não confirmadas até haver evidência do ambiente alvo; não promova inferência a fato.
4. Atualize diagramas Mermaid quando atores, estados, ownership ou fluxo mudarem. Prefira editar o diagrama existente a criar uma visualização paralela.
5. Execute `bun run docs:check` e revise o diff para links, nomes de arquivos, termos e referências.
6. Se o PR mudar conteúdo coberto pela matriz, atualize [documentation-coverage.md](documentation-coverage.md). Se alterar uma lacuna, contradição ou risco, atualize [documentation-audit-report.md](documentation-audit-report.md).

## Validação local

`bun run docs:check` é offline e bloqueador para erros estruturais determinísticos. Ele verifica os documentos canônicos da raiz e `docs/`: caminhos locais em links e imagens; âncoras GitHub nos contratos da raiz e nos documentos vigentes apontados pelas seções canônicas/operacionais de `docs/README.md`; YAML e lifecycle nos arquivos que já declaram frontmatter; e unicidade/cobertura de IDs e referências nas matrizes normativas adotadas.

O checker não exige metadados ou freshness em todo Markdown, não valida âncoras de arquivos listados somente na seção de material histórico/planos e não consulta liveness de links externos. Mudanças nessas regras também exigem atualizar e testar `scripts/check-docs.ts`.

Use as verificações abaixo antes de solicitar revisão documental:

```powershell
bun run docs:check
git diff --check
Get-ChildItem docs -Recurse -File -Filter *.md | Where-Object Length -eq 0
Get-ChildItem docs -Recurse -File -Filter *.md | Select-String -Pattern 'AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,}'
```

O último comando é uma triagem, não uma garantia. Nunca inclua valores de variáveis, URLs internas sensíveis, tokens, corpos de webhook, dados de cliente ou PII. Documente nomes de configuração apenas quando necessários ao contrato e sem valor associado.

## Diagramas e referências

- Mermaid deve representar apenas relações que o texto não torna claro. Mantenha rótulos no mesmo vocabulário do código e atualize nós removidos.
- Links internos devem ser relativos e apontar a arquivos versionados. Referências a código devem indicar caminho e símbolo, sem depender de URL local.
- Ao atualizar o commit auditado, revise [documentation-audit-report.md](documentation-audit-report.md), [documentation-coverage.md](documentation-coverage.md), [documentation-plan.md](documentation-plan.md) e campos de status que citam o hash.
- Não declare produção, certificação de provedor ou execução de backup com base apenas em código, CI ou configuração. Registre a fonte externa, data e ambiente em documento separado quando houver autorização para consultá-los.

## Responsabilidade e cadência

O autor do PR é responsável por atualizar a documentação afetada e apresentar as verificações. O revisor confirma que as fontes citadas ainda existem e que riscos/lacunas não foram apagados sem evidência. Uma revisão periódica deve ocorrer antes de release ou alteração de ambiente, e sempre que o commit ou a configuração promovida diferir do commit auditado.
