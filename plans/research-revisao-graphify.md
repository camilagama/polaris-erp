# Pesquisa: Graphify para o Polaris ERP

**Consultado em:** 2026-09-26 (America/Sao_Paulo)  
**Escopo:** avaliação para a fundação e fluxo de trabalho de agentes; nenhuma instalação ou alteração de código foi feita.

## Decisão contextual

**Recomendação: testar em um branch/checkout local, sem torná-lo dependência da fundação, do CI ou fonte canônica de arquitetura por enquanto.** Se o teste demonstrar recuperação correta de referências entre apps/pacotes, schemas SQL e documentos, manter `graph.json`/`GRAPH_REPORT.md` como artefatos derivados e regeneráveis. Só avaliar commit do grafo e integração permanente depois de comparar respostas/tempo/custo e validar atualização incremental em mudanças reais do Polaris.

O Polaris já tem fronteiras e documentação deliberadas: monorepo Bun/Turborepo, `apps/web`, `apps/admin`, pacotes compartilhados e regra explícita que impede import direto admin→web. A memória de 2026-07-13 diz que `@polaris/ui` e `@polaris/domain` não foram extraídos, mas o checkout atual contém `packages/ui`; somente a ausência de `@polaris/domain` continua correta. Essa divergência já integra P37. A fundação contém pesquisa sobre contexto/glossário, workflow de agentes e verificações. Graphify pode ajudar a explorar relações existentes; não substitui essas decisões, testes de arquitetura nem os documentos canônicos. Fonte local: `aidd_docs/memory/project-state.md`, `packages/ui/package.json`; plano: `plans/fundacao-polaris-erp.md` e `plans/research-ponto-08-contexto-glossario.md`.

## O que é e como integra

Graphify-Labs/graphify é um CLI Python distribuído como pacote PyPI `graphifyy` (comando `graphify`) e skills/adaptadores para assistentes de código. A instalação recomendada upstream é isolada via `uv tool install graphifyy` ou `pipx install graphifyy`; há adaptador Codex (`graphify install --project --platform codex`, e `graphify codex install`). A saída inclui `graphify-out/graph.json`, `GRAPH_REPORT.md` e, por padrão, uma visualização HTML. O agente consulta o grafo via CLI (`graphify query`) ou MCP opcional. O README também recomenda ignorar arquivos via `.graphifyignore`; sugere versionar apenas `graph.json` e `GRAPH_REPORT.md` se a equipe quiser compartilhar o artefato e deixar caches/estado de máquina fora do Git. [README: instalação e integração Codex](https://github.com/Graphify-Labs/graphify#install) · [README: saída e compartilhamento](https://github.com/Graphify-Labs/graphify#recommended-workflow)

O código é extraído localmente por gramáticas Tree-sitter, incluindo TS/TSX/JS, JSON e SQL. A extração estrutural é anunciada como determinística e sem LLM. O grafo marca arestas como `EXTRACTED` ou `INFERRED`; esses rótulos precisam permanecer visíveis porque uma inferência não equivale a uma referência comprovada no código. Conteúdo documental e mídias podem passar por uma etapa semântica com modelo/serviço configurado. Não habilitar essa etapa em documentos internos sem decisão sobre destino dos dados e backend. [README: licenças de extração, arquivos e backends](https://github.com/Graphify-Labs/graphify#what-files-it-handles) · [README: segurança e privacidade](https://github.com/Graphify-Labs/graphify#security--privacy)

Para o Polaris, adequar exclusões antes de gerar: `node_modules`, `.next`, `dist`, saída de builds e dados locais; revisar `.gitignore` e definir `.graphifyignore` explícito. Não incluir `.env*`, dumps, fixtures com informação real, logs, backups ou conteúdo de `test-results` sem confirmar necessidade. Grafo e relatório podem expor nomes de símbolos, caminhos e relações internas mesmo sem conter o texto fonte. A documentação explica que a consulta é logada por padrão no cache do usuário, com opção de desabilitar esse log. [README: ignorar arquivos](https://github.com/Graphify-Labs/graphify#ignoring-files) · [README: query logging](https://github.com/Graphify-Labs/graphify#security--privacy)

## Estado, manutenção e maturidade

- No dia da consulta, GitHub lista `v0.9.69` como release mais recente, publicada em 26 Sep 2026. O release inclui correções para aliases TypeScript em project references e manutenção de atualização incremental, evidência de atividade e também de superfície em evolução. [Releases](https://github.com/Graphify-Labs/graphify/releases)
- README relata CI com testes em Python 3.10, 3.12, 3.13 e 3.14, mas ressalva que Pyright é advisory, Bandit e pip-audit usam `continue-on-error`, e a suite exata de CI é descrita como Linux/Ubuntu. Logo, há CI, mas não se deve tratar todo check listado como gate bloqueante. [README: desenvolvimento e CI](https://github.com/Graphify-Labs/graphify#development)
- Há volume alto de issues/PRs e releases frequentes. Issues públicas demonstram correções e participação externa, mas não substituem avaliação de regressões. Exemplo: uma correção recente para project references de TypeScript consta no release. [Releases](https://github.com/Graphify-Labs/graphify/releases) · [issues](https://github.com/Graphify-Labs/graphify/issues)
- Discussões contêm benchmark publicado pelo próprio mantenedor (ERPNext ~1M LOC; cobertura de fatos de 70,8% para 82,0% e menos tokens, segundo o autor). O autor apresenta metodologia e resultados, mas é benchmark do fornecedor, não validação independente nem prova de ganho no Polaris. [Discussão de benchmarks](https://github.com/Graphify-Labs/graphify/discussions/1677) · [arquivo de benchmark](https://github.com/Graphify-Labs/graphify/blob/main/BENCHMARKS.md)

## Licença

Os metadados de GitHub listam Apache-2.0 e MIT. O `NOTICE` upstream esclarece que o produto está sob Apache 2.0 e que porções prévias continuam sob MIT, preservando `LICENSE-MIT`. Para adotar o CLI como ferramenta de desenvolvimento, as licenças permissivas aparentam ser compatíveis em princípio, mas a auditoria deve ser feita no pacote/versão efetivamente escolhidos e nas dependências opcionais antes de distribuição ou redistribuição. Não copiar código ou incorporar saídas ao produto sem revisar notices aplicáveis. [NOTICE](https://github.com/Graphify-Labs/graphify/blob/main/NOTICE) · [LICENSE](https://github.com/Graphify-Labs/graphify/blob/main/LICENSE) · [LICENSE-MIT](https://github.com/Graphify-Labs/graphify/blob/main/LICENSE-MIT)

## Benefício plausível para o Polaris

- Navegação transversal em imports/exports, símbolos TS/TSX e relações com schema SQL, em monorepo com apps e pacotes compartilhados.
- Consultas locais por caminho e vizinhança podem reduzir leitura repetitiva quando pergunta cruza auth, DB, events e apps.
- Saída explícita sobre arestas inferidas versus extraídas dá uma pista de confiança útil para descoberta inicial.
- MCP é opcional e há suporte declarado a Codex. O modo estrutural de código não exige API/LLM.

Esses benefícios são hipóteses a medir: a documentação descreve o que o produto pretende, enquanto seu benchmark é do mantenedor; nenhuma fonte consultada mede este repositório.

## Riscos e limitações observáveis

1. **Atualização incremental e integridade:** issues reportaram atualizações que removiam ou desincronizavam nós/arestas semânticos e artefatos derivados. Ex.: issue #2053 documenta uma execução `graphify update` com queda de nós/arestas e perda de rótulos; #2386 documenta sidecar de análise desatualizado após update. Mesmo com correções/releases posteriores, isso torna obrigatória a comparação do grafo após update, não só confiar no exit code. [#2053](https://github.com/Graphify-Labs/graphify/issues/2053) · [#2386](https://github.com/Graphify-Labs/graphify/issues/2386)
2. **Fidelidade de relações:** extração estática e inferida não captura necessariamente toda semântica de runtime, configuração dinâmica, DI, aliases ou convenções de framework. Issue aberta reporta chamadas falsas em base Python/TypeScript; problemas de qualidade podem produzir relações convincentes mas erradas. Usar caminho/fonte original para confirmar antes de decidir ou editar. [#2137](https://github.com/Graphify-Labs/graphify/issues/2137)
3. **MCP com snapshot:** issue documentou que o servidor MCP carregava `graph.json` apenas na inicialização; após update, o processo podia servir grafo antigo até reiniciar. Confirmar o comportamento na versão fixada antes de integrar como serviço persistente. [#874](https://github.com/Graphify-Labs/graphify/issues/874)
4. **Dados e prompts:** etapa semântica sobre docs usa o assistente ou backend configurado. Instruções de segurança atuais reconhecem que defesas contra prompt injection reduzem risco, mas não o eliminam; conteúdo de repositório é entrada não confiável. Preferir AST-only no piloto e manter caminhos secretos/exemplos reais fora do corpus. [política de segurança](https://github.com/Graphify-Labs/graphify/security)
5. **Dependência operacional adicional:** ferramenta Python externa em projeto Bun; adiciona runtime/instalação e exige pinning explícito, cache e política de atualização. Sem benchmark local, não sabemos custo de scan do monorepo nem qualidade em aliases e fronteiras próprias do Polaris.
6. **Saída derivada pode envelhecer:** se versionada, requer update consistente com alterações de código e revisão do diff; se não versionada, cada agente precisa poder reconstruir. Evitar incorporá-la à CI como check obrigatório antes de definir uma garantia estável de determinismo e atualização.
7. **Superfície grande:** ferramenta suporta muitas plataformas/backends e recursos; isso aumenta possibilidades de instalação/configuração incorretas. O nome do pacote oficial é `graphifyy` (dois y); README alerta que outros pacotes `graphify*` não são afiliados. [README](https://github.com/Graphify-Labs/graphify#install)

## Alternativas e papel relativo

- **Busca, TypeScript server e documentação existente:** custo de adoção zero e fonte direta; suficientes para fluxos simples. Graphify só agrega se a navegação relacional repetida for melhor que abrir arquivos e símbolos diretamente.
- **Serena MCP:** alternativa focada em recuperação/edição semântica por símbolos com capacidades semelhantes a IDE; não é a mesma proposta de grafo explicável incluindo documentos e SQL. Avaliar apenas se o gargalo for navegação por símbolo/edição. [Repositório Serena](https://github.com/oraios/serena)
- **GitNexus:** alternativa de graph/impact analysis voltada a código e MCP, em runtime Node, com árvore de calls/dependências e integração mais profunda com grafo de código. Seu README informa que CLI roda localmente; também há offering comercial e o repositório upstream indica limitações/roadmap. É comparação mais pertinente se prioridade virar impacto de mudança/fluxos executáveis, menos para corpus documental. Licença e política de distribuição devem ser verificadas na versão escolhida. [GitNexus](https://github.com/abhigyanpatwari/GitNexus)

Não recomendo selecionar ferramenta apenas por estrelas ou promessa de redução de tokens. O trabalho principal do plano é firmar contratos, segurança, migrações, limites de pacote, operação e verificações; uma camada de grafo é acessória.

## Piloto sugerido para decidir depois

Executar sem editar docs canônicas nem instalar integração no perfil global:

1. Instalar versão fixada e executar apenas parsing local, num checkout dedicado, com exclusões revisadas.
2. Formular 8–12 perguntas reais sobre dependências e fronteiras: admin→web, auth compartilhado, dono do schema, outbox/events, chamadas a RLS/tenant context e localização de contratos.
3. Comparar cada resposta do grafo com leitura direta do código e testes; registrar falsos positivos/negativos e tempo/token aproximado.
4. Rodar rebuild completo e update incremental após mudança controlada; confirmar que nós/arestas removidos foram realmente removidos, alterações não corromperam outras áreas e o grafo final corresponde ao report.
5. Repetir com mudanças reais do piloto. Só então decidir se vale versionar o artefato, criar um script de atualização ou habilitar MCP por usuário.

Critério de adoção: melhora observável em localização de relações transversais, sem resposta incorreta relevante não detectada, sem leak de dados, e com custo de manutenção menor que o tempo poupado. Até essa validação, **não adicionar Graphify à fundação como requisito**.

## Comandos de documentação consultados

`npx ctx7@latest library graphify "Graphify-Labs/graphify repository, graphify CLI installation, usage, configuration and integrations"` → identificou `/graphify-labs/graphify`.  
`npx ctx7@latest docs /graphify-labs/graphify "official installation and CLI workflow, generated files, graph querying, supported languages, configuration, and integration with coding agents"` → consultou README upstream.  
Pesquisa web efetuada em 2026-09-26; URLs inline acima.
