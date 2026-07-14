# Auditoria de UX e fluxos do usuário

**Status:** descoberta, **não normativo**.  
**Escopo:** Subagent 13 da solicitação inicial, realizado por leitura de rotas, páginas, componentes e testes. Não houve inspeção visual em browser, por regra do projeto.

## Percursos confirmados

| Perfil/estado | Fluxo observado | Regra visível ou falha |
| --- | --- | --- |
| Visitante | `/sign-in` oferece somente Google; callback é restrito a caminho relativo | correto: não há senha e callback externo é negado |
| Usuário autenticado sem membership | layout/contexto direciona a `/onboarding` | onboarding cria tenant serialmente |
| Novo usuário | onboarding cria tenant e depois tenta e-mail de boas-vindas | falha de e-mail não é visível nem retentada no fluxo |
| Usuário recorrente com acesso | shell protegida mostra dashboard, produtos, estoque, vendas e configurações por papel | sidebar só é conveniência; servidor é a barreira de autorização |
| Sem assinatura ativa AS-IS | `/billing-required` orienta suporte e ativação manual | contradiz Free operacional aprovado; a mensagem não pode permanecer após DEC-BR-010 |
| Tenant suspenso | `getAppContext()` retorna nulo e a página tende a `/onboarding` | provável loop: onboarding encontra membership e volta para `/`; falta página/mensagem de suspensão |
| Papel operator | navegação omite configurações | guard de servidor deve continuar a negar ação administrativa |
| Produto arquivado | catálogo separa status; venda é bloqueada no servidor | precisa explicar archive versus soft delete após implementação |
| Erro de área/app | `error.tsx` e `global-error.tsx` oferecem retry e retorno | texto pede “revisar o último fluxo”, inadequado para usuário final; deve fornecer suporte/correlação sem vazar detalhes |
| Rota/recurso ausente | `not-found.tsx` apresenta retorno seguro | correto, mas não diferencia recurso removido por permissão de inexistente |
| Repetição de ação | venda possui chave idempotente opcional; estoque/produto não | UI deve impedir duplo envio e servidor precisa ser idempotente nos comandos aprovados |
| Conexão instável | loading/error/retry existem para rotas; não há política explícita de retry, feedback pendente ou recuperação de formulário | lacuna de UX e operação |
| Mobile | layouts usam classes responsivas, sidebar e tabelas com overflow horizontal | responsividade declarada no código, não comprovada em E2E/device real |
| Platform admin | console separado tem páginas de organizações, usuários, billing, eventos e notas | autenticação/SSO web-admin não é comprovada; PII e grants dependem de DEC-BR-060 |

## Regras que devem ser visíveis

1. Estado Free, quota atual, consequência de excedente e caminho de regularização.
2. Suspensão administrativa, com motivo/canal de suporte e sem redirecionamento para onboarding.
3. Diferença entre arquivar e soft delete; soft delete final exige estoque zero, motivo e confirmação.
4. Estado de envio/aceitação/falha de comunicações de billing, sem afirmar entrega quando há apenas aceitação pelo provider.
5. Período e timezone de cada métrica; histórico separado do intervalo selecionado conforme DEC-BR-061.
6. Resultado idempotente de criação/cancelamento/ajuste, inclusive quando a rede falha após o envio.

## Contradições e riscos

- A página `billing-required` diz que toda conta exige assinatura e ativação manual; a norma aprovada exige Free ativo no onboarding.
- Organização suspensa não tem destino de UX próprio e pode entrar em loop.
- O texto de erro apresenta orientação interna (“revise a última alteração estrutural”) em vez de orientação de suporte segura.
- A navegação filtra permissões no cliente, mas a UX não substitui resposta de autorização explicada pelo servidor.
- A lista de estoque chama cancelamento de “estorno”, embora DEC-BR-032 exclua estorno financeiro; o rótulo deve dizer “reversão de estoque por cancelamento”.

## Testes e prova ausente

Há testes de rota de login, onboarding, página de billing, guard de app context, painéis e acessibilidade básica do admin. Faltam E2E de tenant suspenso, Free/over-quota, sessão expirada/revogada, duplicidade após rede instável, dispositivos móveis reais, admin em origem distinta e leitura de PII.
