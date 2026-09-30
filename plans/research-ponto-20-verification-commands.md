# Pesquisa do ponto 20 — comandos canônicos de verificação

**Data:** 2026-09-24  
**Pergunta:** dois aliases `verify:quick` e `verify` melhoram o fluxo do Polaris, e como defini-los sem ocultar cobertura ausente?

## Síntese

A proposta de ter nomes canônicos é boa, mas os aliases devem declarar escopos claros e cobrir web, admin e pacotes. Os scripts atuais `check`, `typecheck` e `test` são web-only; `:all` executa uma classe de tarefa no monorepo, não uma suíte de verificação completa. O `check:all` também pode repetir a mesma varredura global do Ultracite nas tarefas web e admin.

`--affected` é um recurso real e recomendado pelo Turborepo para CI de monorepo, mas exige uma comparação Git válida. Na documentação atual, o padrão é `main...HEAD`; em GitHub Actions a base pode vir da PR/push; a opção intersectada com `--filter` reduz ainda mais o escopo; histórico raso pode fazer Turbo selecionar tudo. Alterações em `package.json` raiz, `turbo.json`, lockfile e `globalDependencies` também selecionam todas as tarefas. A comparação documentada é entre referências, então um quick local não deve depender desse modo como única prova de código ainda não commitado. ([Turborepo — `--affected`](https://github.com/vercel/turborepo/blob/main/apps/docs/content/docs/reference/run.mdx), [Turborepo — base e afetados](https://github.com/vercel/turborepo/blob/main/skills/turborepo/references/filtering/RULE.md))

## O que dizem os projetos e ferramentas

- **Turborepo:** `--affected` seleciona pacotes alterados e seus dependentes, mas depende de base/histórico corretos. Para o Polaris, mudanças em tarefas root como `docs:check`, `env:check`, auditorias ou workflow precisam de gates explícitos; não são inferidas só pelo grafo de pacotes. O CI do GitHub pode detectar automaticamente a base de PR, mas o uso local precisa de uma convenção igualmente clara.
- **Nx:** seu guia oficial também exige checkout com histórico completo e uma base/head definidos; o exemplo de GitHub Actions usa `fetch-depth: 0` e uma ação para definir SHAs antes de `nx affected`. Isso mostra que otimização por impacto depende de acertar a origem da comparação, não apenas adicionar uma flag. ([Nx — GitHub Actions](https://nx.dev/docs/features/ci-features/github-integration), [Nx — affected projects](https://nx.dev/docs/features/ci-features/affected))
- **Hub:** tem aliases Quick/Full em `scripts/verify.ts`, executados sequencialmente e com fail-fast. Quick roda migrations-check, typecheck, Ultracite e Vitest; full acrescenta docs, build e Knip. O runner do Hub não usa Turborepo nem interpreta `--affected`. O CI do Hub ainda executa gates adicionais, incluindo PostgreSQL e Playwright. Os nomes são úteis; os conjuntos não são um espelho completo da CI.
- **Discussão de mantenedores:** no GitHub Discussion sobre `--affected`, uma dúvida prática foi se alterações não commitadas entram na seleção; a resposta do mantenedor apontou para a comparação documentada entre base e `HEAD`. A conversa não substitui a documentação atual, mas ilustra por que um alias local precisa explicar o que `affected` compara. ([Turborepo Discussion #9075](https://github.com/vercel/turborepo/discussions/9075))

## Auditoria do Polaris

- Não existem `verify:quick` nem `verify` em `package.json`, e não há `scripts/verify`.
- `check`, `typecheck` e `test` têm `--filter=@polaris/web`; admin tem `check:admin`, `typecheck:admin` e `test:admin`. `typecheck:all` e `test:all` abrangem as tarefas existentes nos workspaces. `test:all` não inclui `test:postgres` nem Playwright.
- `check` e `check:admin` invocam ambos `bun x ultracite check` na raiz. `check:all` pode executar duas vezes uma análise que já percorre o repositório inteiro. Uma única verificação global do Ultracite evita duplicação.
- `build:all` cobre os builds web/admin disponíveis. `knip` é executado como tarefa do workspace web, embora sua configuração examine a estrutura de apps/pacotes.
- O job principal de CI já roda baseline de advisories, boundary audit, lint, typecheck, unit, Knip, docs, contrato de env e builds web/admin. Jobs adicionais do workflow em PR rodam web E2E, PostgreSQL comportamental e admin E2E; exigem banco, variáveis e Playwright. Isso não confirma que esses contexts já estejam selecionados como checks obrigatórios na proteção remota de `main`. RLS smoke, preflight e deployment smokes são manuais.
- O pre-push atual só roda `check` e `test` filtrados para web. A decisão de alterá-lo é o P21; o alias quick deve ser definido antes de conectá-lo ao hook.

## Recomendação para Polaris

Criar dois aliases com contrato curto e rastreável, sem copiar literalmente os gates do Hub:

1. **`verify:quick`:** `docs:check`, uma única varredura global do Ultracite, `typecheck:all` e `test:all`. No início, usar cobertura completa das tarefas de typecheck/unit do workspace, sem `--affected` como garantia única. É mais seguro para código não commitado e evita que um filtro web deixe admin de fora. Se o tempo virar problema, medir a duração e validar seleção/base/history do Turbo antes de adotar `--affected`; não combinar com filtros atuais web-only.
2. **`verify`:** executar o perfil quick e acrescentar baseline/boundaries, contrato de env, build de todos os apps, Knip e teste PostgreSQL comportamental em banco local dedicado e não produtivo. E2E web/admin continuam como gates CI separados por dependerem de ambiente/browser. Documentar explicitamente que `verify` é o gate local completo definido pelo Polaris, mas não substitui o conjunto dos checks obrigatórios da CI.

Na consolidação, preferir uma única lista/fonte de gates reutilizada pelo runner e pelo job estático da CI quando isso não duplicar os jobs de PostgreSQL/E2E que rodam em paralelo. Confirmar os nomes/versões dos comandos depois da migração de stack do P2; o lock atual fixa Turborepo 2.10.4 e esse ponto deve ser revalidado na implementação.

## Limites

Não foram medidos tempos de execução, e nenhum teste foi executado nesta auditoria. Logo, a classificação “quick” descreve a separação de gates ambientais/pesados, não uma promessa de duração. As fontes oficiais definem comportamento da ferramenta; o comentário do mantenedor e relatos de monorepo são evidência operacional, não garantia de cobertura no Polaris.
