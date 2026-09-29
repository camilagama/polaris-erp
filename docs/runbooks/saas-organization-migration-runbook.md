# Runbook de Migration SaaS e RLS

## Escopo

Este runbook cobre a promocao do Polaris como SaaS multi-tenant com:

- tabelas e constraints de organizacao/membership;
- dados de dominio escopados por `organization_id`;
- RLS obrigatorio para tabelas tenant-scoped;
- role runtime sem `BYPASSRLS`;
- storage/cache por tenant;
- onboarding self-serve;
- rate limit distribuido.

Billing e gestao multiusuario completa continuam fora deste corte.

## Preflight

1. Confirme uma branch Neon isolada para staging/preview.
2. Confirme PITR/restore habilitado para a branch de producao.
3. Confirme que o runtime usa uma role sem `BYPASSRLS`:
   - `DATABASE_URL`: role runtime nao proprietaria, por exemplo `polaris_app`;
   - `DATABASE_URL_DIRECT`: role de migration distinta da role runtime, com os privilegios DDL necessarios; nunca e uma URL de runtime.
4. Confirme que estes comandos passam localmente:
   - `bun run check`
   - `bun run test`
   - `bun run knip`
   - `bun run build`
   - `bun run db:smoke:rls`
5. Confirme envs obrigatorias:
   - `DATABASE_URL`
   - `DATABASE_URL_DIRECT`
   - `BETTER_AUTH_SECRET`
   - `BETTER_AUTH_URL`
   - `NEXT_PUBLIC_APP_URL`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
6. Configure `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` antes de trafego de producao. Em production, endpoints sensiveis falham fechado sem Upstash.

## Migration em staging

1. Aponte `DATABASE_URL_DIRECT` para a branch isolada com role de migration.
2. Aplique migrations:

```bash
bun run db:migrate
```

3. Configure `DATABASE_URL` para a role runtime sem `BYPASSRLS`.
4. Rode:

```bash
bun run db:smoke:rls
```

5. Verifique tabelas, constraints e policies:
   - `organization` e `member` existem e memberships tem role valida (`owner`, `admin`, `operator`);
   - tabelas de dominio nao tem `organization_id` nulo;
   - FKs compostas tenant-scoped existem para produto/categoria, historicos, sale items, atores e convites;
   - indices tenant-scoped existem para listagens, metas, vendas e historicos;
   - `pg_policies` tem policies RLS nas tabelas tenant-scoped;
   - 13/13 tabelas tenant-scoped estao com `ENABLE ROW LEVEL SECURITY` e `FORCE ROW LEVEL SECURITY`;
   - queries sem `app.organization_id` nao retornam `organization`, `products` ou `sales`.

## Smoke funcional em staging

1. `/api/health` retorna `200` e `checks.database.ok=true`.
2. `/sign-in` com Google inicia OAuth.
3. Usuario novo vai para `/onboarding`.
4. Onboarding cria organizacao, owner membership, categoria `Outros`, settings e auditoria.
5. Dashboard carrega para tenant novo.
6. Produto, detalhe de produto, entrada/baixa de estoque, venda e cancelamento funcionam.
7. URLs de imagem passam por `/api/product-images/{organizationId}/...`.
8. Upload staged usa chave `staging/{organizationId}/{userId}/...`.
9. Reconcile de imagens escaneia chaves `organizations/`, preserva uploads recentes e nao retorna raw object keys.
10. `audit_events` recebe eventos de auth, settings, produto, estoque, venda e imagem.

## Deploy em producao

1. Registre o timestamp/PITR ou crie restore point.
2. Aplique migrations somente pelo procedimento de [migrations de Production](production-migrations.md), após os gates P43/P44. Nao execute `bun run db:migrate` manualmente contra Production nem inclua migration no deploy Vercel.
3. Configure o runtime de producao:
   - `DATABASE_URL` com role sem `BYPASSRLS`;
   - nunca use `DATABASE_URL_DIRECT` como runtime.
4. Rode o smoke RLS contra o ambiente que sera promovido:

```bash
bun run db:smoke:rls
```

5. Faça deploy da versao RLS-aware.
6. Rode os smoke checks funcionais:
   - `/api/health`;
   - `/sign-in`;
   - login;
   - onboarding;
   - dashboard;
   - produto/upload;
   - venda/cancelamento;
   - reconcile manual com `PRODUCT_IMAGE_RECONCILE_SECRET`;
   - rate limit com Upstash configurado.
7. No GitHub Actions, acione manualmente `rls-smoke` com `RLS_DATABASE_URL` apontando para o ambiente promovido.

## Rollback

Rollback preferido: seguir o [runbook de backup e recuperação](backup-and-recovery.md) para avaliar a restauração/PITR no alvo aprovado e reverter o deploy da aplicação somente quando compatível com o schema e os dados.

Se apenas o app for revertido, nao rode codigo antigo que nao usa `set_config('app.organization_id', ..., true)` contra banco com RLS habilitado. Esse runtime antigo pode quebrar leituras/escritas tenant-scoped.

## Incidente de isolamento tenant

Para suspeita de vazamento cross-tenant:

1. Bloqueie acesso publico na borda.
2. Preserve logs, IDs de eventos Sentry e janela de tempo.
3. Rode `bun run db:smoke:rls` contra o ambiente afetado.
4. Consulte `audit_events` e tabelas de dominio por `organization_id`.
5. Verifique se o runtime estava usando role sem `BYPASSRLS`.
6. Restaure via PITR se houver duvida de integridade ou exposicao de dados.

## Estado atual do hardening

RLS ja foi aplicada no Neon main do projeto `autumn-feather-14038163`.

Estado verificado localmente:

- 14 policies RLS;
- 13/13 tabelas tenant-scoped com `ENABLE ROW LEVEL SECURITY` e `FORCE ROW LEVEL SECURITY`;
- role runtime `polaris_app` sem `BYPASSRLS`;
- `bun run db:smoke:rls` passa com rollback das escritas de smoke.

Pendencias antes de producao aberta:

- configurar `DATABASE_URL` do deploy para a role runtime sem `BYPASSRLS`;
- configurar `RLS_DATABASE_URL` no GitHub Actions;
- acionar job manual `rls-smoke`;
- rodar E2E com `E2E_DATABASE_URL` isolado;
- concluir smoke funcional no ambiente promovido.
