# Metas

**Status:** fluxo local e schema confirmados. **Commit:** `886eda0`.

## Objetivo e acesso

Metas acompanham receita, lucro ou quantidade de vendas por período. Criar, alterar, arquivar e reativar exige `settings:write`, portanto `admin` ou `owner`, dentro de organização ativa e com billing liberado. Fonte: `apps/web/src/features/goals/actions.ts`, `apps/web/src/lib/app-context.ts:canRolePerform`.

## Modelo e estados

`goals` contém nome, `metric`, `display_mode`, alvo, período, valor/data de resolução e autor. Os estados são `active`, `completed`, `expired` e `archived`.

| Transição | Condição confirmada |
| --- | --- |
| criar → `active` | período não terminou antes de hoje; alvo positivo; `sales_count` inteiro |
| `active` → `completed` | o cálculo de dashboard atinge o alvo |
| `active` → `expired` | período terminou sem atingir alvo |
| `active` → `archived` | action administrativa |
| `archived` → `active` | não há outra meta ativa |

O índice parcial `goals_one_active_per_organization_idx` e verificações de período/alvo reforçam no banco o limite de uma meta ativa por tenant. Fonte: `packages/db/src/schema.ts:goals`.

## Fluxos e concorrência

As actions validam Zod e executam escrita/auditoria em `withTenantContext`. `resolveActiveGoalTransitions` calcula métricas pelo dashboard e registra resolução; create/unarchive contam metas ativas, e a constraint parcial trata a corrida restante. Updates/archives verificam o número de linhas retornadas para não tratar perda de corrida ou outro tenant como sucesso.

As actions de criar, alterar, arquivar e reativar gravam, respectivamente, `goal.created`, `goal.updated`, `goal.archived` ou `goal.unarchived` em `audit_events`. `resolveActiveGoalTransitions` atualiza a resolução automática, mas não grava audit event nesse código. Não foi encontrado job independente de agendamento: a resolução ocorre ao carregar dados de metas/dashboard. Fonte: `apps/web/src/features/goals/server.ts`.

## Testes e lacunas

`apps/web/src/features/goals/{schema,progress,server,actions}.test.ts` cobre data, métricas, limites, autorização e corridas de update/archive/unarchive. Não há evidência de teste que simule diariamente a transição automática em ambiente promovido.

## Referências

- `apps/web/src/features/goals/server.ts`
- `apps/web/src/features/goals/schema.ts`
- `apps/web/src/features/goals/progress.ts`
- `packages/db/src/schema.ts:goals`
