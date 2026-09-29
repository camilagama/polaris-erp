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

## Limites da revisão original (2026-09-25)

Não há configuração remota atual de Neon examinada nesta revisão. Nenhum `db:push`, migration ou comando de banco foi executado. A decisão é de política; automação da validação pertence à implementação posterior do plano.

## Revalidação antes da implementação — 2026-09-29

- A [FAQ atual do Drizzle](https://orm.drizzle.team/docs/faq) recomenda `push` somente para desenvolvimento e bancos locais. A [página de `drizzle-kit push`](https://orm.drizzle.team/docs/drizzle-kit-push) também descreve uso em produção com estratégias próprias, como blue/green e bancos com branching. Isso torna o comando uma opção legítima sob outro modelo operacional, mas não muda a decisão Polaris: o schema remoto deve continuar reproduzível pelo SQL versionado testado na CI.
- A [documentação atual do Prisma `db push`](https://docs.prisma.io/docs/cli/v7/db/push) também o descreve para prototipagem/desenvolvimento; os [workflows de produção do Prisma](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/development-and-production) usam migrations versionadas. A semelhança é uma referência de governança entre ferramentas, não uma equivalência de implementação.
- A [discussão Drizzle #1604](https://github.com/drizzle-team/drizzle-orm/discussions/1604) relata o problema de gerar/aplicar migrations depois que `push` já alterou o banco local. É experiência comunitária, não garantia de comportamento universal; reforça descartar/recriar o banco scratch antes de validar o SQL versionado.
- Revalidação do checkout confirmou: root e Web encaminham `db:push` para `@polaris/db`; o guard anterior só validava presença/formato PostgreSQL e diferença da URL runtime. `.env.example` orienta `DATABASE_URL_DIRECT` para connection direta de migrations, e `apps/web/src/db/README.md` autorizava `db:push` genericamente em desenvolvimento. Este worktree isolado não contém `.env.local` nem configuração Compose; `docs/architecture/database-environments.md` já descreve PostgreSQL loopback descartável para testes comportamentais.

### Refinamento adotado para implementar P46

O comando suportado usará `DATABASE_URL_PUSH_LOCAL` em um config Drizzle separado, em vez de reaproveitar `DATABASE_URL_DIRECT`. O guard exige endpoint PostgreSQL em `localhost`, `127.0.0.1` ou `::1`, o nome reservado `polaris_push_scratch` e um alvo distinto de `DATABASE_URL`/`DATABASE_URL_DIRECT`; falha sem imprimir URL/credenciais. O valor continua opcional e vazio no template. O guard prova loopback/nome/identidade do alvo, não que o servidor local tenha ciclo de vida efêmero; as instruções devem exigir instância realmente descartável e declarar esse limite. Nenhum endpoint remoto ou database real será consultado durante validação.

### Implementação candidata na worktree — 2026-09-29

O manifest de `@polaris/db` agora chama o guard antes de `drizzle-kit push` e fornece um config separado que carrega a URL local dedicada e reaplica o guard durante o carregamento. O root e Web continuam delegando ao script do package. Root/child `AGENTS.md`, `.env.example`, README Web, README root e a documentação de ambientes/migrations foram alinhados. Testes cobrem URLs loopback, IPv6, colisões de alvo, nome reservado, host remoto e redaction. Uma chamada integrada com host sintético `.invalid` foi rejeitada pelo guard antes da conexão; nenhum banco foi acessado. A instância local continua sem configuração confirmada e o estado do plano aguarda revisão do usuário.

### Implementação candidata em 2026-09-29

- `packages/db` agora valida `DATABASE_URL_PUSH_LOCAL` antes do CLI e usa `drizzle.push.config.ts`, que também executa o mesmo guard ao ser carregado. Root e Web continuam delegando para o script guardado do package.
- O guard normaliza os aliases de loopback, exige o nome `polaris_push_scratch`, recusa destinos iguais ao endpoint de runtime/migration e não expõe URL/credenciais. A proteção cobre host e identidade do banco, não a vida útil real do processo PostgreSQL.
- Foram adicionados testes para loopback, IPv6, rejeição remota, colisão com URLs existentes, nome de scratch e ausência de credenciais em mensagens. Uma prova de comando com domínio reservado `.invalid` foi rejeitada no guard antes de chamar o CLI; nenhum serviço PostgreSQL foi conectado.
- Não há `.env.local` nem Compose neste worktree, portanto o teste não comprova uma instância local descartável disponível. O operador precisa provisionar uma instância de scratch antes de usar o comando; o PR não cria ou conecta banco.
