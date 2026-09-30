# Auditoria integral do plano de fundação

**Data:** 2026-09-26  
**Escopo:** consistência interna, decisões aceitas, dependências/prioridades, gates, status e afirmações conferíveis no checkout.  
**Fonte de decisões:** `plans/fundacao-polaris-erp.md` e relatório original `C:\Users\Junior\Desktop\relatorio de fundação.md`.  
**Memória lida:** `aidd_docs/memory/project-state.md` (revisada em 2026-07-13; seu próprio texto registra gates externos pendentes).  
**Restrição:** somente auditoria; plano principal não foi alterado.

## Findings

### [P1] A priorização final omite correções de ambiente já aprovadas em P5

**Referências:** plano, linhas 91–100 (P5) e 1152–1170 (P69–P70); `.env.example`, linhas 190–208.

P5 registra como correções planejadas alinhar os exemplos locais para não apontarem Asaas/Woovi a hosts de produção e deixar explícito que `E2E_DATABASE_URL` é obrigatório. O arquivo ainda tem `WOOVI_API_BASE_URL="https://api.woovi.com"` e `ASAAS_API_BASE_URL="https://api.asaas.com/v3"`; a própria seção de Asaas lista a URL sandbox separadamente. Apesar de essas mudanças serem compromissos aceitos, P69 não as inclui nas tarefas prioritárias de configuração/documentação e Gate A em P70 também não as exige nem as marca como adiadas. Isso deixa uma divergência concreta entre o contrato Local aprovado (sandbox/dev) e os defaults versionados.

**Correção sugerida:** adicionar ao bloco de governança/configuração de P69 uma tarefa explícita para cumprir as correções P5 de `.env.example`, incluindo a obrigatoriedade de `E2E_DATABASE_URL`; declarar esse item como critério de Gate A ou registrar claramente por que foi adiado e qual proteção impede uso acidental de endpoints live em Local.

### [P2] O estado do documento e o marcador “Ponto em revisão” contradizem a conclusão declarada

**Referências:** plano, linhas 3, 40, 258–272 e 1174.

O cabeçalho diz “revisão sequencial em andamento” e a linha 40 abre “Ponto em revisão”. O único ponto marcado como “em revisão” é P18 (linha 260), mas P18 já contém “Decisão aprovada” nas linhas 270–272. P70 afirma explicitamente que o documento conclui a revisão sequencial dos 70 pontos (linha 1174). Assim, o estado operacional do plano fica ambíguo: não indica que a análise terminou, mesmo que ainda haja implementação remota/local pendente.

**Correção sugerida:** atualizar o estado do cabeçalho para revisão concluída e renomear/remover “Ponto em revisão”; em P18, substituir “em revisão” por “aceito” (preservando tarefas de implementação como pendentes, se aplicável). Diferenciar status de decisão da execução, como já ocorre em P3.

## Evidências do checkout

- `Get-Content -Raw aidd_docs/memory/project-state.md`: arquitetura e gates externos descritos; memória é anterior ao estado desta revisão.
- `Select-String .env.example`: defaults live de Woovi/Asaas permanecem nas linhas citadas; `E2E_DATABASE_URL` está na linha 65 com comentário “Never point this at production”.
- `Select-String .github/workflows/ci.yml`: o serviço de comportamento PostgreSQL permanece `postgres:16` (linha 113), coerente com o achado pendente registrado em P54 e não tratado aqui como contradição: P69/P70 já ordenam alinhamento para PG18.
- `Select-String package.json`: `verify:quick` e `verify` ainda não existem; P69/P70 os descrevem como trabalho futuro, não como implementação concluída.
- `Test-Path 'C:\Users\Junior\Desktop\relatorio de fundação.md'`: `True`; o relatório original estava disponível para consulta.
- `git status --short`: plano e pesquisas aparecem não rastreados e `.env.example` modificado antes desta auditoria; não alterei nenhum deles.

## Resultado

Não encontrei evidência no trecho final de inversão de dependências entre P61, P64, P69 e os gates de P70: o alinhamento PG18 está na fase inicial aprovada, proteção remota de `main` depende da transferência e de checks verdes, e Staging continua condicionado à escolha/configuração de infraestrutura. A auditoria não verificou estado remoto de GitHub, Vercel, Neon ou providers.
