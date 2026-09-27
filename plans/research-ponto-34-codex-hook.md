# Pesquisa do ponto 34 — Hook Codex portátil

**Data da revisão:** 2026-09-25  
**Estado:** decisão aprovada em 2026-09-25, com integração de Impeccable planejada.  
**Ponto do relatório:** revisar `.codex/hooks.json` e garantir que um clone limpo execute o contrato sem depender silenciosamente de uma skill instalada localmente.

## Estado observado

### Polaris

- `.codex/hooks.json` está versionado. Registra um evento `PostToolUse`, matcher `Edit|Write|apply_patch`, timeout de 5 segundos e comando `node ".agents/skills/impeccable/scripts/hook.mjs"`.
- O alvo `.agents/skills/impeccable/scripts/hook.mjs` não existe no checkout nem aparece em `git ls-files`.
- A skill Impeccable instalada em `C:\Users\Junior\.agents\skills\impeccable` também não tem `scripts/hook.mjs`; ela contém um CLI `scripts/impeccable` e documentação para administrar hooks, mas isso não satisfaz o comando atualmente versionado.
- O caminho do comando é relativo ao diretório de sessão. Codex pode iniciar em subdiretório, tornando a resolução frágil mesmo que o script passe a existir.

### Hub

- O Hub também versiona `.codex/hooks.json` com a mesma referência a `.agents/skills/impeccable/scripts/hook.mjs`.
- O Hub não versiona o arquivo alvo. Logo, o hook do Hub também não é um precedente funcional/portável a copiar.

## Documentação OpenAI atual

- Hooks no repositório ficam em `<repo>/.codex/hooks.json`, mas só são carregados quando a camada `.codex/` do projeto está marcada como confiável.
- Hooks não gerenciados precisam ser revisados e confiados para a definição exata; mudanças no hash ficam pendentes de nova revisão. Instalar um hook não o confia automaticamente.
- Scripts precisam existir no ambiente de execução. Comandos usam o `cwd` da sessão; para hooks de repositório, a documentação recomenda resolver o caminho a partir da raiz Git em vez de assumir um cwd.
- O evento e matcher atuais são suportados; o defeito comprovado é ausência/portabilidade do script e não sintaxe de `PostToolUse`.

Fonte: [OpenAI Docs — Hooks](https://learn.chatgpt.com/docs/hooks).

## Decisão aprovada em 2026-09-25

1. Não manter `.codex/hooks.json` atual, pois seu script alvo não existe. Remover a entrada obsoleta enquanto a instalação de Impeccable ainda não tiver gerado uma configuração funcional.
2. Introduzir Impeccable no Polaris em escopo de projeto durante a fundação, conforme a clarificação do usuário. Usar a instalação oficial; habilitar hooks e gerar novamente a configuração com o CLI de Impeccable, em vez de copiar o hook antigo.
3. Comitar/distribuir todos os artefatos necessários ao hook para que um clone limpo tenha o script. Resolver paths pela raiz Git; se o instalador não gerar uma integração versionável, decidir por distribuição compartilhada via submodule ou manter só uso manual/local sem hook de projeto.
4. Hooks de projeto continuam sujeitos ao trust explícito do Codex (`/hooks` ou Settings → Hooks). O hook de design é assistivo; não bloqueia CI nem release. Validar um clone limpo: se Impeccable estiver ausente, a instalação/edição não falha silenciosamente; com a integração instalada, detector `PostToolUse`/`Stop` funciona.
5. Não copiar a configuração atual do Hub, que tem o mesmo target ausente.

**Q1 aprovada com clarificação:** seguir a recomendação de retirar a referência quebrada e reintroduzir a automação somente com Impeccable instalado para o Polaris e os scripts necessários disponíveis no repo/ambiente de execução. Impeccable será introduzido neste projeto, não tratado como uma dependência pessoal invisível.

## Trade-offs

- Remover a configuração elimina um erro/integração inexistente e mantém clones previsíveis, mas deixa de tentar uma revisão visual automática após cada edição.
- Torná-lo portátil preserva automação visual, mas exige adicionar e manter um script versionado, cobrir ausência do detector e revalidar a confiança de hooks em Codex.
- Como o hook atual não roda por falta do target, remover o JSON não retira uma verificação funcional comprovada.

## Execução parcial — 2026-09-26

Na worktree `codex/foundation-hook`, removi `.codex/hooks.json` após confirmar que o único comando apontava a `.agents/skills/impeccable/scripts/hook.mjs`, inexistente e sob uma pasta ignorada pelo Git. Assim, a referência quebrada deixou de ser distribuída. A integração Impeccable em escopo de projeto e sua validação de clone limpo continuam pendentes; esta alteração não as declara concluídas.
