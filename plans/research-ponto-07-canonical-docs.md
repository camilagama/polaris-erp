# Pesquisa do ponto 7: documentação canônica

**Consultada em:** 2026-09-24  
**Escopo:** validar a proposta de reorganizar a documentação do Polaris em torno de fontes canônicas, comparando a estrutura local do Polaris e do Hub e práticas documentais atuais. A recomendação abaixo é de organização e governança, não uma autorização para mover arquivos.

## Conclusão

O princípio do relatório procede: deve ser fácil descobrir onde cada assunto é mantido, qual fonte prevalece em caso de conflito e se um documento descreve o estado atual ou um registro histórico. Porém, a árvore sugerida deve **ser adaptada, não copiada**. O Polaris já tem uma documentação extensa e organizada por assunto; criar novamente `domain/`, `integrations/`, `archive/` e outras áreas antes de resolver autoridade e atualização aumentaria duplicação e custo de manutenção.

**Redação revisada sugerida para o ponto 7:** “Manter um mapa documental único que aponte, por assunto, para a fonte vigente, indique sua autoridade e base de verificação, e identifique snapshots históricos e afirmações externas não confirmadas. Atualizar a fonte canônica na mesma mudança que altera o comportamento correspondente; não duplicar conteúdo nem reorganizar arquivos sem uma lacuna de navegação demonstrada.”

## Evidências locais

- O Polaris tem `README.md` como entrada, `docs/README.md` como índice e **111 arquivos Markdown em `docs/`**. A estrutura existente já cobre arquitetura, banco, módulos, API, operações, segurança, testes, regras de negócio e relatórios. O plano documental também define uma árvore alvo, cobertura, manutenção e auditoria. Portanto, a necessidade não é começar uma taxonomia do zero.
- A documentação do Polaris reconhece a necessidade de um commit auditado e de distinguir código/configuração local de infraestrutura externa. Contudo, o índice ainda afirma “última verificação” em `2026-07-14` e commit `886eda0`; o `HEAD` local é `5f3f91a4`. Isso é um problema verificável de atualização/autoridade: a página de entrada declara uma base que já não é a base atual do repositório.
- `docs/documentation-plan.md` já estabelece a atualização na mesma mudança, cita fontes para o conteúdo e prevê revisão de hash/auditoria/cobertura. O script ligado a `bun run docs:check` valida apenas se links Markdown locais apontam para arquivos existentes; ele não verifica hashes, validade factual, autoridade ou frescor.
- O Hub confirma que um índice pode explicitar status, responsável funcional, commit verificado, mapa canônico, ordem de leitura e material não canônico. Isso atende diretamente à intenção do relatório. Sua organização também mantém muitas categorias e uma lista extensa; é um exemplo útil de governança, não prova de que a mesma árvore ou nível de metadados seja necessário no Polaris. O índice do Hub contém ainda a entrada ADR-0017 duplicada, um lembrete de que o próprio modelo deve ser revisado, não replicado mecanicamente.

## Pesquisa externa

### Arquitetura e forma do conteúdo

[Diátaxis](https://diataxis.fr/start-here/) separa quatro necessidades do leitor: aprender (tutorial), concluir uma tarefa (how-to), consultar fatos (referência) e entender razões/contexto (explicação). O próprio framework afirma que não impõe restrições de implementação. Para o Polaris, ele é uma lente para classificar e melhorar páginas, não uma exigência de renomear pastas: módulos e runbooks podem continuar organizados por domínio e finalidade, desde que o leitor saiba que tipo de ajuda cada página oferece.

### README, índice e escopo

O [GitHub](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes) recomenda usar README para dizer o que o projeto faz, como começar, onde obter ajuda e quem o mantém; orienta manter nele o necessário para iniciar/desenvolver e deixar a documentação longa em outro lugar. Isso sustenta preservar o README do Polaris como onboarding conciso e usá-lo para encaminhar ao índice, em vez de transformar `README.md` em um segundo índice completo.

### Fonte única e manutenção

O [guia de documentação do Google](https://google.github.io/styleguide/docguide/best_practices.html) recomenda documentação mínima, atualizada junto com o código, remoção gradual de conteúdo morto e evitar duplicação. Também distingue design docs de descrição do runtime: depois da implementação, decisões de design devem ser arquivo histórico, não uma página de estado atual parcialmente correta. A [comunidade Write the Docs](https://www.writethedocs.org/guide/docs-as-code/) descreve Docs as Code com issues, Git, texto simples, code review e checks automatizados; seu guia de princípios recomenda fontes próximas e únicas. Essas práticas apoiam docs no repositório e PRs atômicos, mas não fazem links válidos provarem que o conteúdo ainda corresponde ao sistema.

### Sinais de projetos e comunidade (evidência de prática, não de superioridade universal)

- A página do Diátaxis registra relatos de Gatsby e Cloudflare usando-o como guia de reestruturação documental. São casos práticos relatados pelos próprios participantes, não comparação controlada que demonstre que toda documentação deva adotar a taxonomia.
- O [guia de contribuição do Turborepo](https://github.com/vercel/turborepo/blob/main/CONTRIBUTING.md) separa documentação em `docs/`, explica a estrutura do repositório no guia de contribuição e pede poucos exemplos de alta qualidade porque cada exemplo gera trabalho contínuo de manutenção. É um sinal particularmente próximo do Polaris, que também usa Turborepo: criar páginas/pastas tem custo real e precisa atender a uma necessidade de descoberta.

## Recomendação para o Polaris

1. **Preservar a estrutura e os documentos úteis atuais.** Não migrar tudo para a árvore do relatório. Primeiro resolver os caminhos canônicos e os documentos que já repetem conteúdo.
2. **Fortalecer `docs/README.md` como mapa, não como repositório de explicações.** Para cada tema, apontar a fonte canônica, o público, a classe (`current`, `accepted/proposed`, `runbook` ou `historical`) e a base/data de verificação apropriada. Aplicar metadados detalhados apenas onde houver benefício; evitar exigir que cada um dos 111 arquivos carregue frontmatter redundante.
3. **Separar autoridade por tipo de afirmação:**
   - comportamento implementado => código, schema, migrations e testes no commit verificado;
   - intenção e decisão aprovada => decisão/ADR com estado explícito; quando diferir do runtime, registrar a divergência;
   - estado de serviço externo => evidência do ambiente e data da consulta, não inferência a partir de config local;
   - propostas, pesquisas, auditorias e relatórios datados => histórico/snapshot, salvo promoção explícita para uma página canônica atual.
4. **Atualizar a base declarada.** Corrigir o commit/data do índice e revisar páginas que afirmam estado atual contra o `HEAD` atual antes de chamá-las canônicas. Se toda a auditoria for um snapshot, dizer isso no título/metadata e apontar para a evidência mais recente.
5. **Tornar o fluxo de manutenção verificável.** Manter a documentação afetada no mesmo PR; usar `docs:check` para links; futuramente adicionar uma verificação simples para campos de estado/hash obrigatórios no conjunto de páginas canônicas, se o contrato escolhido os usar. Não criar checks automáticos que prometam validação factual impossível.
6. **Classificar antes de arquivar/remover.** Identificar relatórios e especificações substituídos como snapshots; eliminar conteúdo realmente morto só depois de confirmar que o conhecimento necessário foi preservado na fonte certa ou no histórico Git.

O Hub demonstra a utilidade de hierarquia e histórico explicitamente classificados. O Polaris já possui partes desse mecanismo; sua prioridade é atualizar a base de verificação e diminuir ambiguidade de autoridade, não aumentar o número de diretórios.

## Referências

- [Diátaxis: Start here](https://diataxis.fr/start-here/)
- [GitHub Docs: About README files](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes)
- [Google Style Guides: Documentation Best Practices](https://google.github.io/styleguide/docguide/best_practices.html)
- [Write the Docs: Docs as Code](https://www.writethedocs.org/guide/docs-as-code/)
- [Write the Docs: Documentation principles](https://www.writethedocs.org/guide/writing/docs-principles/)
- [Turborepo: CONTRIBUTING.md](https://github.com/vercel/turborepo/blob/main/CONTRIBUTING.md)

**Verificação:** leitura documental e inspeção local do índice, plano, script de links e organização do Hub. Nenhum código foi alterado; testes/checks não foram executados.
