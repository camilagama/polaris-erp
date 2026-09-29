# Ambientes e deploy

O repositório define aplicações `web` e `admin`, cada uma com build e smoke test próprios. A promoção real, os projetos ativos na plataforma e os valores de ambiente não podem ser inferidos apenas da configuração versionada.

O estado atual dos gates e das evidências por ambiente está em [Prontidão de produção](production-readiness.md). Este guia e os runbooks continuam sendo as fontes dos procedimentos; o registro aponta para eles e não substitui suas instruções.

## Configuração e preflight

O script de preflight de produção valida, entre outros pontos, presença e força de segredos exigidos, ambiente de produção, separação de URLs/origens e papel proprietário. Ele valida configuração antes da promoção, mas não testa credenciais contra serviços remotos.

O CI executa instalação congelada, baseline de segurança e boundaries, checks e typecheck por aplicação, testes, Knip, verificação da documentação, validação de ambiente e builds. O workflow também fornece execuções manuais para smoke de RLS, restore drill, certificação de produção, preflight e smoke de deploy.

## Smokes

O smoke do web consulta saúde pública, tela de login e redirecionamento OAuth. Também verifica que o endpoint de bootstrap de desenvolvimento seja negado em produção e pode incluir diagnóstico R2 quando credencial operacional é fornecida. O smoke do admin espera sua saúde pública ou, quando configurado como protegido, uma negação `401`/`403` aceitável.

Esses testes verificam contrato HTTP básico. Não provam entrega de e-mail, cobrança, assinatura de webhook, execução de Inngest ou persistência R2 em produção.

## Banco, rollback e recuperação

Migrações e comportamentos PostgreSQL são verificados em job dedicado com banco efêmero. As instruções de mudança organizacional e deploy estão em `docs/runbooks/`; devem ser usadas para planejar backup, rollback e restore drill.

Não foi encontrada automação versionada que realize backup ou restore de produção. O workflow manual de restore drill demonstra intenção operacional, não evidência de execução bem-sucedida. Antes de uma mudança irreversível, confirme no provedor o backup recuperável, o responsável e o caminho de rollback.

Fontes: `.github/workflows/ci.yml:verify`, `.github/workflows/ci.yml:postgres-behavior`, `apps/web/src/ops/production-preflight.ts:validateProductionPreflight`, `apps/web/src/ops/deployment-smoke.ts:runDeploymentSmoke`, `apps/admin/src/lib/deployment-smoke.ts:runAdminDeploymentSmoke`, `docs/runbooks/deploy-vercel.md` e `docs/runbooks/saas-organization-migration-runbook.md`.
