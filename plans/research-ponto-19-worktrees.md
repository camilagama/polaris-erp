# Pesquisa do ponto 19 — branches e worktrees para coding agents

**Data:** 2026-09-24  
**Pergunta:** “1 task = 1 branch = 1 worktree” é uma boa regra universal para uma pessoa usando coding agents?

## Síntese

Não como regra universal. Essa equivalência mistura três coisas diferentes: pedido, fluxo de trabalho e unidade de integração. Para trabalho sequencial e uma única escrita ativa, o checkout atual pode bastar. Para trabalho realmente independente em paralelo, use um worktree por fluxo de escrita concorrente e uma branch para cada mudança que será integrada separadamente. Etapas sequenciais do mesmo resultado podem compartilhar branch e worktree.

**Regra candidata para o futuro `AGENTS.md`:** use o checkout atual em trabalho sequencial quando branch e alterações locais estiverem compreendidas; crie worktree/branch para uma linha de escrita independente que precisa avançar em paralelo ou preservar o checkout ativo. Antes de paralelizar, isole também portas, banco e outros estados mutáveis, ou serialize as tarefas. Não imponha uma contagem fixa de worktrees.

## O que worktrees isolam

Git dá a cada worktree arquivos, `HEAD` e índice próprios, mas mantém worktrees ligados ao mesmo repositório e compartilha a maior parte dos metadados. Isso permite trabalhar em branches distintas em paralelo; a mesma branch não pode estar checked out em dois worktrees simultaneamente. Worktrees evitam que dois processos sobrescrevam diretamente os mesmos arquivos locais, mas mudanças sobrepostas ainda podem conflitar na integração. ([Git — `git-worktree`](https://git-scm.com/docs/git-worktree))

Codex descreve seus worktrees como checkouts separados para chats paralelos, com metadados Git compartilhados. No fluxo gerenciado do app, cada chat normalmente recebe um worktree descartável e começa em `detached HEAD`; a branch pode ser criada depois. O próprio Codex também oferece worktrees permanentes que podem receber vários chats. Logo, “um chat = uma branch” não é requisito do produto. A documentação recomenda escolher entre checkout atual e worktree conforme a tarefa e permite setup do ambiente associado. ([Codex — Worktrees](https://developers.openai.com/codex/environments/git-worktrees/), [Codex Remote — escolher checkout ou worktree](https://developers.openai.com/blog/mastering-codex-remote-for-engineering))

O transporte de alterações locais depende do fluxo. A documentação do app diz que seu worktree gerenciado pode aplicar alterações não commitadas da branch escolhida e permite incluir arquivos ignorados por `.worktreeinclude`; a ferramenta `create_worktree` disponível nesta sessão declara que não copia alterações não commitadas, e worktrees manuais começam pelo commit selecionado. Portanto, conferir o comportamento da ferramenta concreta e nunca presumir que as alterações serão transportadas. `.worktreeinclude` só se aplica ao fluxo gerenciado local do app; arquivos ignorados incluídos ali precisam de avaliação de segurança, especialmente credenciais. Worktrees também não isolam serviços externos, processos, bancos de dados ou portas; são isolamento de checkout, não uma sandbox completa. ([Codex — detalhes de alterações locais e arquivos ignorados](https://developers.openai.com/codex/environments/git-worktrees/), [Git — `git-worktree`](https://git-scm.com/docs/git-worktree))

## Evidência de operadores

Dois relatos de operadores ilustram custos que a documentação Git não cobre; são experiências individuais, não comparações controladas:

- Um consultor relata que copiar `.env` por scripts frágeis e iniciar uma segunda tarefa trouxe colisões de portas, estado de banco e contexto de terminal. O arranjo que funcionou manteve serviços de infraestrutura compartilhados, mas separou portas e namespaces de dados por worktree. ([Gert Jansen van Rensburg — execução paralela com configuração isolada](https://blog.gertjvr.com/articles/2026/parallel-agent-workflow/))
- Um desenvolvedor solo relata que criar um worktree novo por tarefa repetia instalação de dependências, seed e inicialização; worktrees permanentes reduziram esse custo no uso frequente. Ele também observa que, para um agente por vez, esse aparato não é necessário, e que compartilhar `.env` só era aceitável porque continha credenciais de desenvolvimento/staging, não de produção. ([Clay Coffman — worktrees permanentes](https://about-clay.com/writing/evergreen-worktrees))

Esses casos sustentam a avaliação condicional: worktrees trazem valor quando evitam interferência ou permitem paralelismo real; podem acrescentar setup, armazenamento e operação quando cada tarefa é curta ou serial.

## Política condicional recomendada para Polaris

1. **Serial e pequeno:** mantenha a tarefa no checkout atual se não houver outro escritor, o estado da branch estiver claro e não for preciso preservar um checkout diferente. Leitura, pesquisa e revisões sem comandos mutáveis não pedem um worktree por padrão.
2. **Paralelo e independente:** crie uma branch/worktree para cada fluxo de escrita simultâneo, partindo da base pretendida. Reutilize esse ambiente para etapas sequenciais da mesma mudança. Se agentes precisam tocar a mesma interface, migration, configuração ou arquivos centrais, execute-os em sequência ou defina propriedade e ordem explícitas; worktrees não removem conflito de integração.
3. **Setup e estado local:** faça bootstrap das dependências e identifique quais arquivos ignorados são necessários antes de validar no worktree. Não copie nem sincronize credenciais de produção. Para testes que migram, limpam ou semeiam dados, use banco/branch/schema não produtivo separado por fluxo; sem isolamento confiável, execute esses testes em sequência. Polaris tem migrations, banco, auth e webhooks; duplicar o checkout não separa esses efeitos externos.
4. **Concorrência proporcional:** Git e Codex não determinam um máximo universal. Para uma pessoa, comece com dois fluxos de escrita simultâneos somente quando o escopo e os recursos forem separáveis; aumente apenas se revisão, verificação e integração continuarem acompanhando o trabalho. Se essas tarefas compartilharem estado ou sobrecarregarem a revisão, reduza a concorrência.
5. **Ciclo de vida:** ao entrar em worktree, conferir diff e destino dos commits antes da integração; remover worktrees concluídos pelo comando Git apropriado, preservando os que ainda contêm trabalho. Worktrees próprios podem repetir instalação/cache e consumir disco. ([Git — remoção e limpeza de worktrees](https://git-scm.com/docs/git-worktree), [Codex — custo e retenção de worktrees gerenciados](https://developers.openai.com/codex/environments/git-worktrees/))

## Limites

As fontes oficiais descrevem o mecanismo e os fluxos do produto, não provam que uma quantidade específica de worktrees aumenta a produtividade. Os relatos operacionais mostram modos de falha e soluções possíveis, mas não estabelecem um padrão para todo repositório. A recomendação acima é uma política proporcional para um desenvolvedor solo no monorepo Polaris; não é uma exigência de Git nem uma decisão de configuração de ambiente.
