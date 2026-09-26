# Pesquisa do ponto 16 — escopo e tamanho do `AGENTS.md`

**Data:** 2026-09-24  
**Questão:** encurtar o `AGENTS.md` raiz e encaminhar detalhes para fontes mais específicas, sem perder regras úteis.

## Síntese

Fontes atuais favorecem um `AGENTS.md` de alto sinal, com regras persistentes e próprias do repositório. Nenhuma fonte primária consultada estabelece um número obrigatório de linhas ou tokens. O limite padrão combinado de 32 KiB do Codex é um teto de descoberta, não uma meta de tamanho. A referência da OpenAI a cerca de 100 linhas descreve um caso interno; não deve virar um limite universal.

No checkout observado nesta pesquisa, o `AGENTS.md` raiz tem 246 linhas e cerca de 9,3 KB. Esse tamanho, por si só, não prova excesso: é preciso testar cada regra contra necessidade, duplicação e atualização. O P16 deve resultar numa edição seletiva, não numa redução numérica sem evidência.

## O que deve ficar carregado globalmente

O [guia oficial do Codex](https://developers.openai.com/codex/guides/agents-md) explica que a instrução raiz se acumula com arquivos aplicáveis mais próximos do diretório de trabalho e que o conjunto tem limite configurável, de 32 KiB por padrão. A hierarquia permite manter acordos transversais na raiz e colocar exceções duráveis nos diretórios que realmente as exigem.

O artigo recente da OpenAI sobre prompts aconselha manter `AGENTS.md` atualizado e fazer referências contextuais: usar o guia de arquitetura quando a tarefa toca fronteiras de serviço, o guia de banco em mudanças de schema e o de deploy na preparação de deploy. Ele critica exigir a leitura de todo o mapa e vários documentos antes de qualquer alteração, como uma correção pequena. A orientação permanente deve apontar **quando** a fonte entra, em vez de incorporá-la ou ordenar sua leitura universal. ([Rethinking skills and prompts for GPT-6 Astra](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra))

A experiência publicada pela equipe de engenharia da OpenAI também mudou de um arquivo monolítico para um `AGENTS.md` curto, usado como mapa de uma base de conhecimento versionada e validável em `docs/`. A equipe cita custo de contexto, orientações diluídas, apodrecimento e dificuldade de verificar um manual grande; cerca de 100 linhas é descrição do arquivo naquele projeto de grande escala, não um padrão. ([Harness engineering](https://openai.com/index/harness-engineering/))

Para o Polaris, o conteúdo da raiz deveria ser o que evita uma decisão errada em muitas tarefas: hierarquia documental, procedimento de início e navegação, workflow de branches/PR, limites para ações destrutivas e de produção, e critério de conclusão/verificação quando forem acordos específicos do projeto. A fonte aprovada para encontrar docs canônicos é `docs/README.md`; o agente deve abrir o documento relacionado à tarefa, não ler todos. Comandos só devem ser repetidos na raiz se forem necessários e difíceis de descobrir ou se houver um wrapper/ordem não óbvia; o ambiente já é fonte de verdade para scripts e configurações simples.

## Instruções gerais, locais e condicionais

O Codex acumula instruções por hierarquia de diretório. A documentação do [GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions) recomenda instruções modulares com `applyTo` para escopos de caminho e avisa que fontes aplicáveis podem ser combinadas sem uma ordem geral de precedência entre todos os tipos. Portanto, usar muitos arquivos ou convenções diferentes entre ferramentas eleva o risco de sobreposição e contradição.

Regra prática:

- **Raiz/sempre:** só políticas e instruções que realmente mudam o comportamento em ampla parte do repositório; usar frases curtas e observáveis.
- **Condicional por tarefa:** explicitar qual documentação especializada abrir para mudanças de domínio, autorização, banco, billing, integração, UI ou operação.
- **Local/aninhada:** adicionar `AGENTS.md` numa área apenas quando essa área tiver regras próprias que não se aplicam ao restante. O [Supabase](https://github.com/supabase/supabase/blob/master/AGENTS.md), por exemplo, combina contexto geral do monorepo, habilidades e referências a regras específicas de apps.
- **Não duplicar:** apontar para `docs/README.md`, `package.json`, workflows, configuração e guias existentes. Se alguma ferramenta não descobre determinada fonte automaticamente, escrever um ponteiro explícito com gatilho, em vez de copiar o conteúdo inteiro.

O [guia de documentação do Google](https://google.github.io/styleguide/docguide/best_practices.html) recomenda manter documentação mínima, atualizar junto ao código e remover conteúdo redundante ou morto. Isso apoia remover do `AGENTS.md` regras genéricas sem efeito, fatos de implementação fáceis de consultar e convenções já garantidas por ferramenta; não apoia remover um limite importante só porque ele ocupa algumas linhas.

## Redundância com tooling: quando manter a regra

Ultracite/Biome e CI conseguem aplicar formatação, lint e verificações reproduzíveis. Repetir cada regra mecânica no prompt custa contexto e permite drift entre arquivo de instruções e a configuração efetiva. A versão da regra deve estar no formatter/configuração/teste; o `AGENTS.md` pode indicar o comando relevante e os limites que a ferramenta não expressa.

Um estudo de mineração de 100 repositórios identificou 207 ocorrências de problemas de configuração; a categoria mais frequente foi “lint leakage”: instruções que repetiam verificações já automatizadas por lint/format. É uma heurística de análise de repositórios, não uma prova de que cada instrução duplicada prejudique cada tarefa. ([Configuration Smells in AGENTS.md Files](https://arxiv.org/abs/2606.15828))

Antes de remover uma regra de estilo, comparar seu sentido exato com o que Ultracite/Biome verifica. Regras como proibir `any`, ordenar imports ou remover `console.log` só são redundantes se a configuração efetivamente as impõe. Instruções de segurança, autorização e migrations podem precisar continuar explícitas mesmo que existam checks parciais: o checker costuma detectar forma, não sempre a intenção de negócio nem o fluxo seguro de operação.

## Riscos dos dois extremos e evidência

Um arquivo grande pode transformar toda preferência em obrigação para toda tarefa, consumir contexto, acionar leituras/testes irrelevantes e envelhecer. Um arquivo curto demais pode omitir comandos não óbvios, fonte de autoridade, limites operacionais e exceções de arquitetura, levando o agente a inferir convenções ausentes.

A evidência contemporânea é mista. Um estudo com 10 repositórios/124 PRs associou `AGENTS.md` a tempo mediano menor e menos tokens de saída, sem queda observada na conclusão de tarefas ([On the Impact of AGENTS.md Files on the Efficiency of AI Coding Agents](https://arxiv.org/abs/2601.20404)). Outro avaliou tarefas de SWE-bench e CTXbench em múltiplos modelos e agentes: não encontrou melhora significativa consistente em sucesso, observou aumento de custo em várias condições e mais exploração/testes; o desempenho variava pelo contexto, e arquivos de desenvolvedores superaram arquivos gerados automaticamente. O benchmark não representa todo projeto, stack ou agente atual. ([Evaluating AGENTS.md](https://arxiv.org/abs/2602.11988))

Esses estudos não determinam um tamanho ideal. Eles indicam que contexto deve conter requisitos concretos e específicos. A própria OpenAI nota que contexto de repositório pode ajudar a tornar o trabalho executável, mas recomenda voltar a avaliar instruções quando o modelo/harness muda e evitar listas de passos que não alteram o comportamento desejado.

## Recomendação para o Polaris

1. **Não adotar limite fixo de linhas.** Usar as 246 linhas/9,3 KB como convite a revisar, não como motivo automático para cortar.
2. **Preservar os acordos únicos e duráveis** de autoridade, workflow, segurança, verificação e produção. A revisão deve manter o resultado e remover apenas formulações duplicadas, genéricas ou já impostas pela tooling.
3. **Deixar na raiz uma regra de navegação**, apontando a `docs/README.md`; atrelar a leitura de PRODUCT, CONTEXT, regras, arquitetura, banco, integrações e operação aos tipos de mudança correspondentes.
4. **Comparar cada regra mecânica com a configuração real** do Ultracite/Biome, scripts, testes e workflows antes de removê-la. Manter o comando de verificação essencial se seu caminho não for óbvio; remover catálogos de regras que a ferramenta garante.
5. **Deixar detalhes específicos próximos ao trabalho** em instruções aninhadas ou em documentação alcançada por ponteiro quando forem realmente diferentes. Não criar arquivos locais para espelhar a estrutura de diretórios.
6. **Revisar instruções como documentação viva** quando stack, comandos, fluxo de release, fontes de verdade ou automações mudarem. O P15 já aborda a regra de sincronizar documentação no PR que altera um contrato; não duplicar seu texto integral aqui.

## Auditoria dos arquivos locais

- O `AGENTS.md` do Polaris tem 246 linhas e cobre startup, autoridade, operação/comunicação, memória, Next.js, Ultracite, TypeScript/JavaScript/React, frameworks adicionais, segurança, teste e conclusão. Só existe esse `AGENTS.md` no checkout; não há arquivos de instrução aninhados em `apps/` ou `packages/`.
- `package.json` declara Next.js 16/React 19 e raiz/workspaces com scripts Bun/Turbo; `biome.jsonc` estende os presets Ultracite core/Next. O `AGENTS.md` tem uma seção Solid/Svelte/Vue/Qwik sem contrapartida no manifest/config do projeto. Parte do estilo de TS/JS/React pode ser mecânica, mas deve ser removida somente depois de confirmar que Ultracite/Biome a aplica; orientação de segurança, autorização, estado e UX pode continuar necessária.
- Os scripts `bun x ultracite check`/`fix` fazem algo distinto dos wrappers `bun run check`/`check:all`; comandos de raiz e critérios de qual executar devem ser explicados por finalidade, não listados como substitutos equivalentes. `fix` tem efeito de escrita e precisa continuar condicional ao autofix/intenção.
- O `AGENTS.md` ordena ler `node_modules/next/dist/docs/` antes de escrever código Next, mas esse diretório e `node_modules/next` não existem no checkout observado. A intenção de verificar documentação específica da versão é útil; a regra precisa de fallback (Context7 ou documentação oficial pertinente) enquanto as dependências locais não estão instaladas.
- O `docs/maintenance.md` tem uma regra de atualizar a fonte canônica no mesmo PR e contém matriz de documentos por tipo de mudança; não está explicitamente ligado no `AGENTS.md` nem no mapa `docs/README.md`. Os links e caminhos da matriz existem no checkout. Para P15, a solução indicada é um ponteiro, não copiar a matriz para o `AGENTS.md`.
- O `AGENTS.md` do Hub tem 251 linhas, semelhante ao Polaris, e mantém várias regras técnicas no root. Isso mostra que tamanho sozinho não mede qualidade; sua estrutura de fontes e carregamento condicional é mais relevante. A cópia do Hub não satisfaria a meta de redução do P16.

## Limite da decisão

Esta nota propõe uma triagem regra por regra, mas não edita `AGENTS.md` nem define agora sua redução exata. O P17 deve decidir separadamente se alguma subárea do monorepo necessita de `AGENTS.md` próprio. Não se deve resolver as duas coisas criando cópias locais de regras removidas do root.

## Decisão após alinhamento

Em 2026-09-24, o usuário aprovou revisar o `AGENTS.md` regra por regra, manter instruções globais de alto valor, remover regras para tecnologias não usadas e condensar orientações que o tooling efetivamente garante. Não há uma meta numérica de linhas. A necessidade de arquivos aninhados será avaliada separadamente no P17.

## Fontes

- [OpenAI Codex — Custom instructions with AGENTS.md](https://developers.openai.com/codex/guides/agents-md)
- [OpenAI Developers — Rethinking skills and prompts for GPT-6 Astra](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra), 2026-09-11
- [OpenAI — Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering/)
- [GitHub Docs — Adding custom instructions for GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions)
- [Google Style Guides — Documentation Best Practices](https://google.github.io/styleguide/docguide/best_practices.html)
- [Supabase — monorepo `AGENTS.md`](https://github.com/supabase/supabase/blob/master/AGENTS.md)
- [On the Impact of AGENTS.md Files on the Efficiency of AI Coding Agents (2026)](https://arxiv.org/abs/2601.20404)
- [Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents? (2026)](https://arxiv.org/abs/2602.11988)
- [Configuration Smells in AGENTS.md Files (2026)](https://arxiv.org/abs/2606.15828)
