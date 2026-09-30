# Pesquisa — validação docs-as-code (`docs:check`)

**Ponto avaliado:** o relatório afirma que o `docs:check` atual verifica principalmente links locais; por isso, a checagem pode passar mesmo com conteúdo arquitetural antigo. A recomendação de expandir validações procede, mas os checks devem cobrir classes diferentes de erro com custos e níveis de confiança distintos.

## Síntese

Um só comando de entrada é conveniente; um único job que mistura Markdown local, rede externa, snippets e freshness pode ser lento, ruidoso e difícil de diagnosticar. Recomenda-se que `docs:check` rode as validações locais, rápidas e determinísticas como bloqueadoras. Checks de rede, geração pesada ou cobertura documental podem ter comandos/jobs próprios. A CI pode executar ambos, cada qual com seu resultado visível.

## Práticas first-party e de projetos

- **GitHub Docs** mantém um content linter próprio sobre `markdownlint`, com regras específicas de conteúdo. Diferencia `warning` de `error`: ambos aparecem localmente, mas somente errors bloqueiam commit/CI. As regras de exemplo incluem frontmatter contra schema, paths de conteúdo existentes, IDs únicos de trilhas, sintaxe/versionamento, links internos e referências de dados resolvíveis. Isso é específico de um corpus grande; o padrão útil é classificar regra por severidade e falhar em invariantes mecânicas. [GitHub Docs: content linter](https://docs.github.com/en/contributing/collaborating-on-github-docs/using-the-content-linter)
- **Microsoft Learn** valida metadados de artigos no build e define campos obrigatórios como autor/owner, título e `ms.date`. O exemplo mostra que schema de frontmatter pode ser bloqueador quando os consumidores dependem desses campos; não prova que cada Markdown de um monorepo precise de metadados de publicação. [Microsoft Learn: metadata](https://learn.microsoft.com/en-us/contribute/content/metadata)
- **Kubernetes Website** gera páginas de referência de API a partir do Swagger/OpenAPI e documenta um fluxo para atualizar a fonte e regerar páginas. Conteúdo determinístico que pode vir de schema deve ser gerado/verificado contra a fonte, em vez de tentar inferir sua atualidade por um link ou data. [Kubernetes Website: repositório e API reference](https://github.com/kubernetes/website)
- **Lychee** verifica URLs e links em arquivos Markdown/HTML; fragmentos podem ser habilitados, mas o próprio projeto informa que não consegue verificar anchors que só aparecem após execução de JavaScript. O GitHub Action permite escolher se falha o workflow (`fail`) e oferece opções de token, timeout, cache e ignores. [lychee](https://github.com/lycheeverse/lychee), [lychee anchors](https://lychee.cli.rs/recipes/anchors/), [lychee-action](https://github.com/lycheeverse/lychee-action)
- **HashiCorp `web-unified-docs`** publica uma configuração de build/PR com verificador externo que comenta o relatório, mas declara que PRs não falham por links quebrados. É um exemplo real de separar sinal de link externo do gate de merge; outros repositórios podem decidir diferentemente conforme estabilidade e criticidade de suas referências. [HashiCorp: workflow de preview e link check](https://github.com/hashicorp/web-unified-docs/blob/main/.github/workflows/build-pr-preview.yml)

## Classes de verificação e severidade

| Classe | O que pode verificar | Postura inicial recomendada |
| --- | --- | --- |
| Parse, Markdown/MDX e schema de frontmatter | YAML inválido; campos/enums exigidos para páginas canônicas; estrutura impossível de publicar | Bloquear quando impede renderização ou invalida contrato de conteúdo |
| Links internos, arquivos, imagens e anchors locais | Caminho inexistente, âncora local inválida, imagem ausente | Bloquear; determinístico e reproduzível localmente |
| IDs e referências estruturadas | IDs duplicados; `sources`/`related_docs`/links internos sem destino; referência a doc ou schema inexistente | Bloquear se esses campos dirigem navegação, geração ou ownership; avisar durante adoção gradual |
| Lint editorial/acessibilidade | Cabeçalhos, links genéricos, alt text, idioma de fenced code | Erros objetivos podem bloquear; preferências estilísticas podem começar como aviso e ser promovidas depois de corrigir o baseline |
| Snippets, comandos e schemas executáveis | Código de exemplo que não compila/roda; exemplo contradiz contrato | Bloquear para exemplos apresentados como executáveis; manter fixtures/ambiente enxutos e rodar por arquivo afetado quando possível |
| Links externos e fragmentos remotos | DNS/HTTP/timeout/404, link externo acessível no instante do check | Job separado e geralmente aviso inicialmente; retry/caching, token, allowlist e relatório antes de tornar gate |
| Freshness/source map | Mudança nos arquivos de origem após a revisão do documento | Sinalizar como `review-needed`; bloquear só áreas críticas depois de validar o mapa e oferecer exceção explícita de “sem impacto” |

Não comece promovendo tudo a erro. O guia de Kubernetes mantém uma discussão pública sobre o risco de introduzir lints em um corpus existente: erros antigos, diferenças de renderer e regras arbitrárias podem gerar diffs grandes e frustrar contribuições. É uma conversa do projeto, não uma especificação oficial, mas serve como alerta de rollout: medir o baseline, corrigir incrementalmente e ativar regras restritas. [Kubernetes SIG Docs: Markdown checks](https://github.com/kubernetes/website/discussions/54833)

## Um comando ou vários

`docs:check` deve ser a porta de entrada previsível para o desenvolvedor. Pode chamar subcomandos locais, mas deve permanecer rápido, sem depender da disponibilidade de sites externos:

- **`docs:check` (offline, blocker):** parsing, lint de erros objetivos, frontmatter/schema necessário, links locais e anchors, paths/IDs/referências estruturadas, validação de snippets locais determinísticos.
- **`docs:check:links` (rede, separado):** URLs externas e anchors remotos. Na CI pode rodar como job distinto e publicar artefato/comentário; considerar agendamento periódico para encontrar link rot sem tornar uma falha transitória um bloqueio de PR.
- **`docs:check:examples` (ambiente/teste):** exemplos que exigem banco, serviços ou runtime. Executar em lane de testes da documentação, de preferência apenas nos exemplos alterados ou em uma matriz controlada.
- **`docs:check:freshness` (delta):** comparar fontes mapeadas com a revisão registrada; indicar documentos para revisar. No começo, relatório/warning; depois, gate direcionado às páginas de alto risco e às fontes efetivamente alteradas.

Pode existir um `docs:check:all` que agregue todas as lanes para auditoria, enquanto `docs:check` segue barato para uso cotidiano. Em CI, jobs separados dão diagnósticos e status mais claros e permitem retry de rede sem repetir o build inteiro. Uma checagem deve bloquear merge somente se falhar uma propriedade sob controle do projeto e com remediation clara.

## Frontmatter, IDs e mapas de origem

O frontmatter `status`, `owner`, `last_verified_commit` e `sources` do relatório pode habilitar validações úteis, mas não deve ser exigido automaticamente em todo arquivo:

- `status` deveria ser um enum com significado definido (`canonical`, `historical`, `draft` ou equivalente); isso permite distinguir fonte atual de relatório ou material arquivado.
- `owner` precisa apontar para uma pessoa/time realmente responsável. Se o mesmo objetivo já é coberto por `CODEOWNERS`, evitar duplicar ownership divergente.
- `sources` deve apontar para paths estreitos que sustentam conteúdo vivo. Um mapa amplo (por exemplo, todo `packages/db/**`) transforma quase qualquer alteração em alerta.
- `last_verified_commit` registra o código contra o qual houve revisão, não uma prova de correção. Se algum path em `sources` mudou após esse SHA, o resultado correto é “revisão necessária”; o checker não sabe se o comportamento documentado mudou.
- IDs só são úteis se houver consumidor (índice, referências cruzadas, geração, automação). Nesse caso, checar unicidade/formato e existência do destino é determinístico; títulos e posição de seção não são identificadores estáveis.

O SHA global do relatório de cobertura é útil como evidência de uma auditoria pontual. Para documentos individuais, SHA + source map pode dar rastreabilidade mais fina, mas sua manutenção tem custo e o mapa é incompleto por natureza. Comece com esse nível apenas para páginas cuja obsolescência tenha consequência real; não chame o documento automaticamente de “stale” só porque um arquivo listado mudou.

## Links externos e falsos positivos

Um verificador externo consulta uma rede que o repositório não controla. `429` (rate limit), `403`/login, `5xx`, timeout, DNS e hosts que bloqueiam robôs podem falhar sem que o link esteja definitivamente morto. Lychee recomenda token para reduzir rate-limiting do GitHub e expõe timeouts/cache/status exclusions; HashiCorp escolhe não falhar PR por link externo. Assim:

1. Links relativos e arquivos locais: blocker.
2. Falha externa transitória ou não verificável: aviso com URL/erro, retry e artifact; não mascarar silenciosamente.
3. `404` persistente ou domínio migrado: abrir correção/issue e atualizar a referência; promover a blocker para destinos críticos quando houver um processo confiável.
4. Configurar exceções com justificativa/dono e revisar a lista; um ignore permanente sem contexto vira um novo ponto cego.

Liveness não é freshness: URL que retorna `200` pode apontar para versão antiga, conteúdo movido semanticamente ou página sem a afirmação citada. Checker de links mede resolução, não verdade ou compatibilidade do texto.

## Recomendação para Polaris

Expandir `docs:check` além de links locais é correto. Faça o check padrão cobrir regras locais e determinísticas: frontmatter/schema das páginas que realmente usam metadados, referências locais, IDs declarados, Markdown e snippets leves. Mantenha links externos e revisões por source map em lanes separados, inicialmente informativas. Gerar API/schema docs de fontes canônicas quando possível; para o restante, usar atualizações documentais no mesmo PR e “review-needed” direcionado pelas fontes.

O mapa `sources` + `last_verified_commit` deve ser opcional por tipo/página e ter um checker que relata delta de origem, nunca um selo genérico de que o corpus está fresco. Não copie a configuração do Hub literalmente: valide quais campos do Hub são consumidos por tooling e se dão sinal útil para o Polaris.

## Limites

Não existe um validador genérico que detecte toda contradição entre prosa e código. Schemas, IDs, referências, snippets executáveis e geração cobrem partes objetivas; freshness semântica ainda exige uma mudança contextualizada, owner/reviewer e evidência sobre o comportamento documentado. A postura de warning/blocker aqui é recomendação inicial, não imposição de norma ou de ferramenta específica.

## Decisão após alinhamento

Em 2026-09-24, o usuário aprovou `docs:check` como gate para erros estruturais determinísticos dos documentos mantidos: links/âncoras locais e estrutura de metadados/IDs onde adotados. O escopo deve incluir documentos canônicos da raiz e `docs/`, não todos os planos e snapshots históricos.

Freshness de fontes mapeadas e liveness de links externos ficam em lanes separadas, informativas e não bloqueadoras. Essa decisão encerra o ponto 13; os detalhes técnicos de parser, configuração e comando serão escolhidos na implementação consolidada.
