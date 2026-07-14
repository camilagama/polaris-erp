# Server Actions

As actions são a camada de mutação usada pelos formulários das aplicações. Elas aplicam contexto, validação e invalidam cache quando a operação altera telas derivadas. Não constituem uma API HTTP pública versionada.

## Web

| Domínio | Guardas e validação | Efeitos | Falhas e idempotência |
| --- | --- | --- | --- |
| Autenticação | Better Auth. | `signOutAction` encerra a sessão e redireciona para login. | Erros do provedor seguem o fluxo de autenticação. |
| Onboarding | Exige sessão; se já houver contexto de aplicação, redireciona para início. | Cria organização e tenta enviar e-mail de boas-vindas quando configurado. | O envio é opcional para o fluxo. A action não consome nome de organização diretamente: a criação usa o fluxo atualmente implementado. |
| Catálogo | `settings:write`; schemas Zod nas actions de categorias e configurações. | Cria, edita ou exclui categorias e salva configurações; invalida cache relacionado. | Rejeições de schema/permissão impedem a mutação. Não há chave de idempotência de formulário observada. |
| Metas | `settings:write`; schemas Zod para criar e editar. | Cria, atualiza, arquiva ou desarquiva; atualiza a visualização com `refresh`. | Rejeições de schema/permissão impedem a mutação. |
| Produtos e estoque | `products:write`; schemas para produto, imagem e movimentações. | Cria/edita/arquiva produtos, troca/remove imagens e adiciona/baixa estoque; invalida cache. | Criação com imagem faz compensação no R2 se a persistência no banco falhar. Troca de imagem usa versão otimista para detectar colisão. |
| Vendas | `sales:write`; schema de venda e carga das regras de cartão. | Cria venda, cancela e consulta opções de busca; invalida cache após mutação relevante. | `createSaleOnce` devolve a venda existente para a mesma chave de idempotência, evitando duplicação; nesse caso não reaplica a invalidação como se fosse venda nova. |

As guards vêm de `requireAppContext`, que centraliza sessão, organização e capacidade. A action deve manter a autorização no servidor mesmo que a interface já esconda o controle.

## Admin

| Operação | Guarda e validação | Efeito | Falhas e idempotência |
| --- | --- | --- | --- |
| Alterar status de cobrança | Papel de plataforma mínimo `operator`; formulário, confirmação e rate limit. | Define status suportado de cobrança da organização. | Sem chave de idempotência de formulário observada. |
| Reprocessar evento | Papel `operator`; entrada e confirmação validadas; rate limit. | Solicita nova tentativa para evento de billing. | A semântica efetiva depende da máquina de estados do evento. |
| Alterar status da organização | Papel `operator`; schema, confirmação e rate limit. | Ativa ou suspende organização. | Guardas no servidor impedem uso por papel inferior. |
| Nota de suporte | Papel `support`; schema e rate limit. | Persiste nota de suporte para organização. | Sem garantia de deduplicação observada. |

As actions administrativas usam `requirePlatformAdmin` e não devem confiar somente nas páginas protegidas. A confirmação de formulário reduz acionamentos acidentais, mas não substitui autorização nem auditoria.

Fontes: `apps/web/src/features/auth/actions.ts:signOutAction`, `apps/web/src/features/catalog/actions.ts:createCategoryAction`, `apps/web/src/features/goals/actions.ts:createGoalAction`, `apps/web/src/features/onboarding/actions.ts:completeOnboardingAction`, `apps/web/src/features/products/actions.ts:createProductAction`, `apps/web/src/features/sales/actions.ts:createSaleAction`, `apps/admin/src/app/billing/actions.ts:changeBillingSubscriptionStatusAction`, `apps/admin/src/app/events/actions.ts:retryOutboxEventAction`, `apps/admin/src/app/organizations/actions.ts:changeOrganizationStatusAction`, `apps/admin/src/app/support-notes/actions.ts:createSupportNoteAction`, `apps/web/src/lib/app-context.ts:requireAppContext`.
