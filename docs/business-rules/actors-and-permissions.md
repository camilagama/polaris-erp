# Atores e permissões

**Status:** rascunho de descoberta, **não normativo**.

## Matriz de acesso do tenant observada

Pré-condição comum para todas as permissões do app: sessão válida, membership, organização `active` e subscription `active`. `apps/web/src/lib/app-session.ts:126`, `:195`.

| Ação | Operator | Admin | Owner | Evidência |
| --- | --- | --- | --- | --- |
| Ler catálogo e analytics | Sim | Sim | Sim | `apps/web/src/lib/app-context.ts:1` |
| Criar/alterar/arquivar produto; entrada/baixa de estoque | Sim | Sim | Sim | `products:write` |
| Criar/cancelar venda | Sim | Sim | Sim | `sales:write` |
| Alterar categorias, markup, parcelas e metas | Não | Sim | Sim | `settings:write` |
| Exclusão de organização | Não | Não | Autorizada pelo helper, sem fluxo operacional localizado | `organization:delete` |
| Gerir memberships, convites, papéis ou troca de workspace | Não encontrado para nenhum papel | Não encontrado | Não encontrado | `packages/auth/src/workspace-management-policy.ts:3` |

## Administração interna

O administrador de plataforma não é um papel do tenant. Grant ativo não revogado/não expirado determina o maior papel efetivo: `support < operator < owner`. `packages/platform-auth/src/admin-guard.ts:35`, `:96`.

| Ação interna encontrada | Support | Operator | Owner | Controles observados |
| --- | --- | --- | --- |
| Consultar dados de plataforma compatíveis com o guard | Sim | Sim | Sim | grant ativo, RLS/policies onde aplicáveis |
| Suspender/reativar organização | Não confirmado | Sim | Sim por hierarquia | motivo e audit transacional |
| Alterar subscription entre `active` e `past_due` | Não confirmado | Sim | Sim por hierarquia | confirmação, motivo, evidência para ativação, rate limit e audit |
| Retry de outbox `failed/dead_letter` | Não confirmado | Sim | Sim por hierarquia | rate limit e audit |
| Criar/revogar grant, banir, impersonar ou excluir tenant | Não encontrado | Não encontrado | Não encontrado | lacuna de capacidade, não permissão aprovada |

## Regras visíveis ao usuário

- Sem subscription `active`, o usuário é enviado para `billing-required`; o fluxo atual é ativação manual, não checkout self-service. `apps/web/src/app/billing-required/page.tsx:43`.
- Organização suspensa não tem tela explícita confirmada; o redirecionamento atual pode encaminhar a onboarding e entrar em loop. `apps/web/src/lib/app-session.ts:148`, `apps/web/src/features/onboarding/server.ts:61`.
- Imagens exigem `products:write`; leitura é autenticada e autorizada por organização, não URL pública de bucket. `apps/web/src/app/api/product-images/presign/route.ts:POST`.

## Questões de decisão

1. `owner` deve continuar equivalente a `admin`, exceto pela permissão técnica de exclusão de organização?
2. A exclusão de organização deve existir como fluxo de produto, ficar bloqueada ou ser substituída por retenção/arquivamento?
3. Qual mensagem, dados visíveis e canal de suporte se aplicam à organização suspensa?
