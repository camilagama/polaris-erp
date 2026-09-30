# ADR-0001 — Isolamento de autorização tenant/plataforma com RLS

**Status:** Accepted  
**Registrada e confirmada em:** 2026-09-30  
**Data original da decisão:** desconhecida  
**Implementação observada:** parcial; código e migrations versionados, promoção externa não comprovada.

## Contexto

O Polaris atende organizações de clientes e também possui operações internas da plataforma. Uma sessão válida, por si só, não autoriza acesso a qualquer organização ou aos recursos administrativos. As regras aprovadas distinguem membership e acesso tenant das capacidades de plataforma. O banco mantém contextos transacionais separados para identidade de usuário, organização, administrador de plataforma e jobs internos.

## Decisão

Manter autorização da aplicação e isolamento de banco como camadas distintas e complementares:

1. O Web valida sessão, membership, organização ativa, entitlement e permissão antes de executar operações tenant.
2. Operações tenant definem `app.organization_id` dentro da transação; resoluções pré-tenant usam `app.user_id`. Operações de plataforma exigem sessão e grant válidos e definem `app.platform_admin_id`; jobs usam somente contextos internos enumerados.
3. Policies PostgreSQL versionadas reforçam a separação de linhas por tenant e as permissões limitadas de plataforma. RLS não substitui as verificações da aplicação.
4. Runtime tenant-facing deve usar role sem `BYPASSRLS`, separada da role privilegiada usada para migrations.

Esta ADR registra e confirma a arquitetura vigente em 2026-09-30. As fontes consultadas não preservam a data nem o rationale original da escolha.

## Alternativas

Não foi encontrada comparação histórica de alternativas. Não se afirma que autorização somente na aplicação, RLS sem autorização da aplicação ou um contexto único para tenant e plataforma tenham sido avaliados na decisão original.

## Consequências e limites

- Guards da aplicação e policies do banco precisam concordar sobre identidade, membership, grant e escopo; mudanças em qualquer camada exigem revisão das duas.
- Contextos PostgreSQL são locais à transação e devem ser definidos antes das queries protegidas.
- As migrations e testes versionados comprovam partes do contrato no checkout, mas não comprovam que as migrations estejam aplicadas no banco promovido, que o runtime remoto não tenha `BYPASSRLS` ou que todas as queries usem o contexto correto.
- A cobertura RLS varia por tabela e há exceções para autenticação, jobs e operações administrativas. Esta ADR não declara cobertura universal nem certificação de produção; acompanhe as provas externas em P43.

## Evidência

- [Modelo de autorização](../architecture/authorization-model.md) — guards, contextos e limites observados.
- [Isolamento RLS tenant](../architecture/rls-tenant-isolation.md) — migrations, cobertura e ressalvas.
- [Regras normativas aprovadas](../business-rules/normative/approved-rules.md) e [estados e permissões](../business-rules/normative/states-and-permissions.md) — autoridade de produto e domínio.
- [`tenant-context.ts`](../../packages/db/src/tenant-context.ts), [`admin-guard.ts`](../../packages/platform-auth/src/admin-guard.ts) e as migrations [`20260707205000_rls_tenant_isolation.sql`](../../packages/db/src/migrations/20260707205000_rls_tenant_isolation.sql) e [`20260713090000_platform_admin_rls_validation.sql`](../../packages/db/src/migrations/20260713090000_platform_admin_rls_validation.sql) — implementação versionada.
- [Prontidão de produção (P43)](../operations/production-readiness.md) — estado das evidências externas.
