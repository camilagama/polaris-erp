# Pesquisa do ponto 21 — verificação local no pre-push

**Data:** 2026-09-24  
**Pergunta:** o pre-push do Polaris deve rodar `verify:quick` ou deixar a verificação para a CI?

## Síntese

O hook local serve para feedback antes de enviar commits; não é um gate confiável de integração. Git chama `pre-push` antes do envio, passa no `stdin` as referências que serão atualizadas e aborta o push se o hook retornar erro. O próprio `git push --no-verify` desativa o hook. A CI valida o commit recebido; para ser também requisito de merge, seus checks precisam estar configurados como obrigatórios no repositório. A auditoria do P20 não confirmou essa configuração de proteção de `main`. ([Git — hooks `pre-push`](https://git-scm.com/docs/githooks), [Git — `git push --no-verify`](https://git-scm.com/docs/git-push), [pesquisa do P20](research-ponto-20-verification-commands.md))

**Recomendação:** manter CI como enforcement e tratar Lefthook como conveniência local. Depois de criar `verify:quick`, conectá-lo ao pre-push é coerente se a medição mostrar latência aceitável. O alias aprovado cobre `docs:check`, uma varredura global do Ultracite, `typecheck:all` e `test:all`; isso dá ao hook um escopo claro de workspace, incluindo admin e pacotes. Ainda não há duração medida, então “quick” não deve ser interpretado como uma garantia de rapidez. Se a espera for alta ou levar a bypass frequente, deixar `verify:quick` como comando manual e manter no hook apenas verificações mais curtas. Se o alias for usado no hook, substituir os comandos atuais em vez de executá-los em duplicidade.

## Escopo, push parcial e latência

- Hoje o `pre-push` de Lefthook executa `bun run check` e `bun run test`. Os dois scripts são filtrados para `@polaris/web`; `verify:quick` ampliaria a cobertura para o workspace inteiro. O estado atual e a composição aprovada do alias estão descritos no P20.
- Lefthook aceita comandos em `pre-push` e também oferece `{push_files}` para ferramentas que precisam receber arquivos comprometidos ainda não enviados. `glob` e seleção por arquivos podem fazer um job ser ignorado quando não há arquivos correspondentes. Um comando `bun run verify:quick` sem esses filtros roda o conjunto completo a cada push, inclusive em pushes parciais ou com alterações restritas a uma área; isso evita depender de filtros web-only, mas pode aumentar a espera. ([Lefthook — templates de execução e `push_files`](https://github.com/evilmartians/lefthook/blob/master/docs/configuration/run.md), [Lefthook — seleção de arquivos](https://github.com/evilmartians/lefthook/blob/master/docs/configuration/files.md))
- O comando amplo examina o checkout de trabalho atual, que pode conter alterações locais além dos commits e refs enviados. O Git fornece as refs do push ao hook, mas um alias comum de workspace não valida automaticamente cada refspec nem o snapshot exato de um push parcial. A CI, ao rodar no commit recebido, é a referência para esse estado. Filtros por `push_files` ou `--affected` só devem ser adotados após validar seleção de admin/pacotes, pushes de múltiplas refs e a base de comparação; o primeiro é seleção por arquivos do hook, o segundo é seleção por grafo de tarefas e comparação Git.
- O tempo do pre-push bloqueia a continuação do `git push`. Repetir a suíte local em todo envio pode dar feedback mais cedo e evitar esperar a CI para erros básicos, mas também duplica trabalho e incentiva `--no-verify` quando o custo incomoda. Antes de chamar o perfil “rápido”, medir sua duração em uso representativo; o P20 ainda não mediu execuções.

## Evidência de uso

Na discussão do Lefthook, um usuário encontrou um job `pre-push` com `glob` sendo ignorado quando nenhum arquivo enviado correspondia ao filtro. Um mantenedor recomendou retirar o `glob` para rodar sempre ou separar um grupo reutilizável para execução manual e deixar o hook aplicar a seleção de push. É um caso operacional, não uma regra universal; ilustra que a filtragem ajuda a reduzir trabalho, mas altera quais pushes recebem a verificação. ([Discussão do Lefthook #504](https://github.com/evilmartians/lefthook/discussions/504))

## Limites e decisão pendente

Não foram executados testes nem hooks, conforme o escopo desta pesquisa. Não há medida de latência de `verify:quick`, e a configuração remota de checks obrigatórios não foi confirmada. Portanto, a decisão operacional de ligar o alias ao hook deve aguardar sua implementação e uma medição representativa; isso não muda a decisão de manter os gates da CI como validação do commit enviado.
