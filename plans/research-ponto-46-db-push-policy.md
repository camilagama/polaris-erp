# Pesquisa do ponto 46 — política para `db:push`

**Data:** 2026-09-25  
**Estado:** decisão aceita em 2026-09-25. `db:push` restrito a PostgreSQL local descartável, com proteção executável de host e regra específica em `packages/db/AGENTS.md`.  
**Pergunta:** restringir `db:push` a bancos locais/descartáveis e usar migrations versionadas em ambientes persistentes.

## Evidência no Polaris

- `packages/db/package.json` expõe `db:push` como `require-database-url-direct.ts && drizzle-kit push`; a raiz e `apps/web` também expõem atalhos. O wrapper atual confirma que `DATABASE_URL_DIRECT` existe, é PostgreSQL válido e difere da URL runtime, mas não valida host, projeto, branch ou se o banco é descartável.
- `README.md` proíbe `db:push` em produção, porém `apps/web/src/db/README.md` diz que ele pode ser usado em desenvolvimento e o lista entre os comandos úteis. Não encontrei escopo explícito sobre branches de desenvolvimento compartilhadas, Preview ou Staging.
- O único `AGENTS.md` versionado é o da raiz e não contém regra operacional sobre `db:push`; não há orientação local em `packages/db`.
- CI não depende de `db:push`: o job PostgreSQL efêmero reaplica o histórico versionado de migrations e executa checks de comportamento/RLS.

A proteção atual contra usar a URL runtime é útil, mas não impede que um operador copie para `DATABASE_URL_DIRECT` a URL de qualquer branch persistente e sincronize seu schema diretamente.

## Comparação com Hub

O Hub mantém o comando `db:push` no `package.json`, portanto sua existência não indica que ele seja recomendado para releases. A política operacional explícita proíbe `db:push` para acelerar release e descreve migrations forward-only em `docs/operations/database-and-migrations.md` e `docs/operations/shared-development-and-release-guide.md`. Isso é uma referência mais transferível que copiar scripts ou caminhos específicos do Hub.

## Documentação oficial e trade-off

Drizzle documenta dois modelos. `generate` cria arquivos SQL versionados e `migrate` aplica os pendentes; `push` introspecta o schema e o banco, calcula DDL e aplica sem gravar um SQL revisável no histórico do projeto. O FAQ atual recomenda `push` apenas para desenvolvimento local, enquanto a página específica do comando também descreve usos em produção, inclusive blue/green e bancos serverless. Portanto, `push` não é tecnicamente proibido pela ferramenta: é uma escolha de governança e risco. Fontes: [Drizzle migrations](https://orm.drizzle.team/docs/migrations), [Drizzle FAQ](https://orm.drizzle.team/docs/faq), [`drizzle-kit push`](https://orm.drizzle.team/docs/drizzle-kit-push).

Para o Polaris, 42 migrations SQL já versionadas, regras de RLS e dados de um ERP favorecem a mesma trilha auditável em qualquer banco remoto. O benefício de `push` — prototipagem direta e rápida — continua em um PostgreSQL descartável local. O custo de permitir `push` em Preview/Staging é reduzir a confiança de que a migration versionada testada na CI seja o que efetivamente produziu o schema remoto.

Discussões de comunidade sobre Drizzle e Vercel mostram ambos os usos, mas variam por tamanho, ambiente e controles disponíveis; não demonstram que um banco do Polaris seja seguro para schema sync. A discussão citada no ponto 45 é anedótica e não deve sobrepor o guidance operacional do projeto.

## Recomendação provisória

1. Permitir `db:push` somente em PostgreSQL local descartável. Para todo alvo remoto — inclusive branches Neon por PR, branches de desenvolvimento compartilhadas, Preview, Staging e Production — usar SQL versionado e `db:migrate`. Isso mantém o caminho testado em CI igual ao caminho remoto.
2. Acrescentar a regra em instruções escopadas ao banco, preferencialmente `packages/db/AGENTS.md`, com ponteiro curto na raiz se necessário. Corrigir `apps/web/src/db/README.md` para definir local descartável de forma inequívoca; manter o aviso de produção no `README.md`.
3. Reforçar o script suportado de `db:push` com uma validação de host local permitida antes de iniciar Drizzle. A checagem de `DATABASE_URL_DIRECT` atual, sozinha, não é proteção contra um alvo persistente remoto. Não adicionar um override genérico que torne fácil liberar acidentalmente Neon; se surgir necessidade excepcional de sync remoto, preferir migrations ou criar um procedimento descartável explícito que não possa atingir ambientes compartilhados.

## Limites

Não há configuração remota atual de Neon examinada nesta revisão. Nenhum `db:push`, migration ou comando de banco foi executado. A decisão é de política; automação da validação pertence à implementação posterior do plano.
