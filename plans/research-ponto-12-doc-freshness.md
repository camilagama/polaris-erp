# Pesquisa — freshness de documentação docs-as-code

**Ponto avaliado:** o relatório observa que o índice/matriz documental do Polaris registrava cobertura no SHA `886eda0`, enquanto a auditoria local confirma que `HEAD` está 39 commits adiante. Isso prova que o registro da cobertura tem um ponto de referência antigo; o número de commits, sozinho, não prova que todo o conteúdo esteja incorreto. O controle proposto deve detectar mudanças relevantes e deixar claro o que foi efetivamente revisto.

## Síntese

As práticas atuais mais sustentáveis ligam a documentação ao fluxo normal de mudança: atualizar a página afetada no mesmo PR, atribuir responsabilidade por áreas e testar afirmações que podem ser verificadas automaticamente. Datas de revisão e owners são úteis onde respondem “quem revisa isto?” e “quando foi verificado?”, mas metadados em todos os arquivos não garantem veracidade e podem virar preenchimento mecânico.

Um SHA global é apropriado como **identificador da revisão de uma auditoria de cobertura**. Não é, por si só, um sinal confiável de freshness de cada documento. Para Polaris, o melhor ponto de partida é um mapa pequeno entre páginas de alta importância e seus arquivos/fontes de mudança, com revisão direcionada quando esses arquivos mudarem. O restante da documentação pode seguir atualização no mesmo PR e revisão gradual.

## Práticas em fontes primárias e repositórios

- **Google, docs-as-code:** o guia de documentação do Google recomenda manter documentação mínima, fresca e precisa, atualizá-la no mesmo changelist do código, remover conteúdo morto e melhorar em passos pequenos; também diz que documentação de comportamento pode ser apoiada por testes quando viável. Isso conecta freshness a mudanças relevantes, em vez de apenas a datas. [Google: Documentation Best Practices](https://google.github.io/styleguide/docguide/best_practices.html), [Google: Markdown Style Guide](https://google.github.io/styleguide/docguide/style.html)
- **Google, metadados e lembretes:** o livro *Software Engineering at Google* descreve uma alternativa para conjuntos grandes: metadados de `owner` e `reviewed`, lembretes quando um documento passa determinado período sem revisão (o exemplo usa três meses) e acompanhamento dos documentos como bugs. É relato de prática em grande escala, não um prazo que Polaris precise copiar. A própria orientação enfatiza ownership porque a data é útil quando há alguém responsável por agir. [SWE Book, seção sobre documentation freshness](https://raw.githubusercontent.com/abseil/abseil.github.io/cd13b21daa6ec74155548241241693198c1b1264/resources/swe_at_google.2.pdf), [página do livro](https://abseil.io/resources/swe-book)
- **Microsoft Learn:** o frontmatter inclui `ms.author` como owner do conteúdo e `ms.date` como data da última edição substancial ou da última garantia de freshness. A instrução editorial pede atualizar essa data quando houver revisão de freshness, não para cada correção pequena. É uma solução para um grande sistema de documentação, com pipeline e responsabilidades próprios. [Microsoft Learn: metadata](https://learn.microsoft.com/en-us/contribute/content/metadata), [Microsoft Learn: major edits e freshness](https://learn.microsoft.com/en-us/contribute/content/how-to-write-major-edits)
- **GitHub e code owners:** `CODEOWNERS` pode solicitar revisão de quem é responsável por arquivos modificados no PR. Isso ajuda a validar uma página quando ela muda; não identifica automaticamente que uma alteração em código tornou uma página diferente obsoleta. Deve ser combinado com ownership por diretório/área ou com um mapa explícito entre código e documentação. [GitHub: about code owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners), [GitHub: reviews e owners](https://docs.github.com/en/pull-requests/reference/pull-request-reviews)
- **Verificadores de links:** lychee declara que extrai links de Markdown/HTML e confere se URLs e fragmentos estão acessíveis; sua GitHub Action agenda verificações e informa links problemáticos. Isso encontra links quebrados, não valida se o texto continua descrevendo o comportamento real. [lychee: link checker](https://github.com/lycheeverse/lychee), [lychee-action](https://github.com/lycheeverse/lychee-action), [lychee: anchor checking](https://lychee.cli.rs/recipes/anchors/)

## O que um SHA global diz — e o que não diz

Um SHA dá uma referência reproduzível: “esta revisão de cobertura foi feita contra este estado de código”. É adequado para um inventário/auditoria pontual que lista escopo, data, SHA, páginas examinadas e achados. Permite revisar o delta entre o código examinado e `HEAD`.

Não demonstra que cada afirmação está correta, não identifica quais arquivos de código sustentam cada seção e fica desatualizado após qualquer commit, mesmo quando o commit não tem impacto documental. Atualizar o SHA sem refazer a revisão produz uma aparência enganosa de cobertura recente. Um delta de 39 commits sinaliza que vale inspecionar mudanças posteriores; não substitui a análise do que esses commits mudaram.

**Recomendação:** manter SHA em relatório de auditoria/cobertura, com data e escopo. Não exigir que toda página evergreen carregue o mesmo SHA nem atualizá-lo em todo commit. Se parte da documentação descreve uma versão específica, identificar a versão/release é mais preciso do que fixar a página a um SHA aleatório.

## Frontmatter por arquivo: quando ajuda

Frontmatter `owner` + `last_verified` pode ser apropriado para páginas de maior risco de induzir erro quando estão desatualizadas, por exemplo setup local, migrations, release/deploy, isolamento de tenant, callbacks/integrações e procedimentos de operação. O campo de owner permite encaminhar uma pergunta ou revisão; a data pode ajudar um job a abrir lembrete ou issue.

Não há evidência de que obrigar esses campos em todo Markdown seja necessário. Uma data isolada registra um ato, não a qualidade do ato; mudanças de data sem revisão real rebaixam sua credibilidade. Páginas de histórico (ADRs, decisões aceitas, relatórios fechados) não devem receber uma data de “freshness atual” que sugira que o conteúdo histórico muda com o código. Elas podem ter data original e status, e uma decisão substituída deve apontar para sua sucessora.

Uma opção proporcional é manter ownership em `CODEOWNERS`/responsáveis por diretório e um registro central enxuto apenas para documentos de referência operacional ou arquitetural. No registro, associar caminho da página, owner, fontes/caminhos de código relevantes e, se houver revisão periódica real, `last_verified`. Aplicar frontmatter local somente quando leitores ou automações precisam desses metadados na própria página.

## Detectar drift com pouco ruído

1. **Atualização no PR:** para uma mudança observável de arquitetura, interface, processo ou configuração, alterar a documentação que descreve esse comportamento na mesma mudança. Se nenhuma página for afetada, marcar isso no PR com uma razão curta. Isso aproveita o contexto do autor e do revisor enquanto a mudança está fresca.
2. **Mapa seletivo de fontes:** para páginas críticas, registrar os diretórios/arquivos que sustentam cada seção. Quando o PR altera uma dessas fontes, pedir revisão da página relacionada ou uma declaração explícita de “sem impacto”. O mapa deve ser preciso e pequeno; associar uma página inteira a todo o monorepo cria falsos positivos.
3. **Testes executáveis e geração:** automatizar snippets, comandos, schemas e referências que podem ser executados ou gerados da fonte canônica. Não duplicar manualmente um schema/API que já pode ser publicada a partir do contrato real.
4. **Revisão com prazo só para conteúdo sensível:** para operação/segurança/onboarding crítico, um job leve pode abrir lembrete quando a data de revisão expira. Prefira alerta/issue à falha universal de CI para datas vencidas; bloqueio só se houver risco concreto e owner capaz de resolver.
5. **Descarte de conteúdo sem owner/uso:** marcar para revisão ou remover páginas duplicadas e abandonadas. O guia do Google recomenda limpeza incremental, em vez de uma migração documental total de uma vez.

## Link checker versus freshness real

| Controle | Detecta | Não detecta |
| --- | --- | --- |
| Link checker (local/externo/âncoras) | Arquivo, URL ou fragmento que não resolve/responde no momento da checagem | Explicação arquitetural obsoleta, comportamento alterado, recomendação que deixou de valer |
| Lint de Markdown/frontmatter | Formato inválido, campos ausentes ou regras editoriais mecânicas | Verdade do conteúdo |
| Teste de snippet/schema gerado | Comando, exemplo ou contrato que não compila/valida contra sua fonte executável | Se o texto ao redor ainda explica corretamente o motivo ou os limites |
| Mapa código → docs + revisão do delta | Mudanças no conjunto conhecido de fontes da página e necessidade de revisão dirigida | Mudanças não mapeadas ou a suficiência da revisão; o mapa também exige manutenção |
| Owner + `last_verified` | Quem foi designado e quando houve uma revisão declarada; pode acionar lembretes | Se a revisão ocorreu com rigor ou se a página mudou logo depois |

Links externos podem falhar temporariamente por rede, rate limiting, login ou bloqueio de crawlers; mantenha exceções explícitas e revise-as ocasionalmente, sem confundir falha do endpoint com conteúdo incorreto.

## Experiências de praticantes

Em discussões de desenvolvedores, aparecem dois problemas complementares: documentação sem owner perde credibilidade quando ninguém se responsabiliza; verificações automáticas que exigem alteração de docs sempre que qualquer código muda podem criar falsos positivos e trabalho sem valor. São relatos individuais, não estatística. Eles apoiam ownership, mudança documental revisada junto do código e automação restrita a fontes conhecidas, em vez de um SHA/metadata obrigatório para todo arquivo. [Reddit: docs internos sem owner e drift](https://www.reddit.com/r/ClaudeAI/comments/1sr6qpf/org_docs_always_drift_and_nobody_updates_them/), [Reddit: evitar mudanças de documentação automáticas sem impacto semântico](https://www.reddit.com/r/devops/comments/1wk6vpl/how_are_teams_keeping_docs_current_when_you_ship/)

## Recomendação para o Polaris

1. Tratar a comparação `886eda0` → `HEAD` como **gatilho para auditoria focalizada**, não como evidência de que todas as páginas estão erradas. Revisar primeiro páginas arquiteturais/operacionais que os commits posteriores tenham tocado ou afetado.
2. Preservar SHA e data nos relatórios de cobertura para auditoria reprodutível, mas sem usar um SHA único como selo permanente de freshness da documentação inteira.
3. Não tornar frontmatter de owner/data obrigatório em todos os arquivos. Começar pelos documentos de alta importância, com owner e `last_verified` apenas quando houver uso real da data; usar CODEOWNERS e links para código/PR quando oferecerem roteamento melhor.
4. Exigir que mudanças com impacto documental atualizem as páginas correspondentes no mesmo PR ou declarem por que não há impacto. Automatizar exemplos e contratos executáveis; manter o link checker como check separado.
5. Considerar um registro pequeno de páginas críticas e seus caminhos-fonte antes de escrever um verificador de drift. O check deve comparar fontes mapeadas e pedir revisão somente quando houver delta relevante, em vez de falhar porque o SHA global avançou.

## Limites

Freshness semântica não é decidida por um padrão de Markdown nem por um linter de links. As fontes apoiam práticas diferentes conforme tamanho e criticidade do conjunto documental: a disciplina do mesmo PR é leve, metadados/owners ajudam a gerir corpora grandes, e mapas de dependência precisam ser mantidos para continuar úteis. O modelo sugerido para Polaris é uma síntese inicial; deve ser validado conforme suas páginas e seus fluxos de mudança reais.

## Decisão após alinhamento

Em 2026-09-24, o usuário aprovou metadados de freshness somente para páginas canônicas de maior risco, não para todos os Markdown. Páginas históricas/ADRs conservam sua data e status próprios. O SHA/data global continua sendo a referência da auditoria de cobertura, não um selo de revisão de todas as páginas.

Mudanças em fontes mapeadas devem gerar aviso e pedido de revisão direcionada no PR; freshness não bloqueia CI de forma geral. Essa decisão encerra o ponto 12. O P13 avaliará as verificações automatizáveis e a divisão de comandos.
