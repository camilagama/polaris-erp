# Indice documental

**Status:** cobertura documental concluída para o commit analisado; limitações externas registradas.  
**Ultima verificacao:** 2026-07-14.  
**Commit analisado:** `886eda0` (`main`).  
**Ambiente externo:** nao verificado; referencias a Neon, Vercel e provedores descrevem configuracao ou codigo versionado, nao prova de producao.

## Ordem sugerida

1. [README principal](../README.md): entrada para qualquer pessoa que execute ou contribua.
2. [Visao arquitetural](architecture/overview.md): engenharia, produto e operacao.
3. [Estrutura do repositorio](architecture/repository-structure.md): engenharia.
4. [Ciclo de request](architecture/request-lifecycle.md): engenharia, suporte e seguranca.
5. [Integracoes externas](architecture/external-integrations.md): operacao e seguranca.
6. [Glossario](glossary.md): todos os publicos.
7. [Plano documental](documentation-plan.md): responsaveis por completar a cobertura.

## Documentos existentes relevantes

- [Ambientes de banco, E2E e RLS](architecture/database-environments.md): operacao de banco e isolamento de ambientes.
- [Prontidao de producao](operations/production-readiness.md): estado dos gates, configuracao externa observada e evidencias por ambiente.
- [Imagens de produto com Cloudflare R2](architecture/product-images-r2.md): fluxo de imagem e configuracao operacional.
- [RLS tenant isolation](architecture/rls-tenant-isolation.md): decisao e evidencia historica de RLS; requer revalidacao contra banco promovido.
- [Estrategia de testes](testing/strategy.md): camadas, limites de evidencia e classificacao de risco com verificacoes proporcionais.
- [Deploy Vercel](runbooks/deploy-vercel.md): roteiro operacional de deploy.
- [SOP de ativacao manual de billing](runbooks/manual-billing-activation-sop.md): processo manual; nao prova checkout self-service.

## Cobertura e lacunas

Cobertura concluída nesta etapa: mapa do monorepo, identidade e autorização, tenancy/RLS, schema e migrations, módulos de negócio, handlers/actions/webhooks, jobs, segurança, testes, operação, auditoria e manutenção. Consulte a [matriz de cobertura](documentation-coverage.md) para confiança e lacunas de cada área.

Perguntas abertas decisivas:

- Qual projeto/ambiente Vercel esta efetivamente promovido para cada app?
- A protecao Vercel Authentication do admin esta ativa fora do codigo?
- Quais provedores externos possuem sandbox e producao certificados?
- Qual branch Neon e qual role de runtime representam o ambiente promovido?
