# Atores normativos

| Ator | Escopo | Capacidades aprovadas | Proibições |
| --- | --- | --- | --- |
| Visitante | Público | iniciar Google OAuth | acessar tenant |
| Owner | Tenant único | operar catálogo, estoque, vendas, metas e soft delete elegível | trocar tenant, convidar membro, restaurar soft delete |
| Platform support | Plataforma | suporte mínimo e PII revelada somente por caso/motivo auditado | impersonar, gerir grants, mutar billing/tenant |
| Platform operator | Plataforma | ações operacionais permitidas por política | conceder grants ou acessar PII sem necessidade |
| Platform owner | Plataforma | conceder/estender/revogar grants temporários | grant permanente, impersonation |
| Provider/job | Integração | processar transição idempotente autorizada | conceder acesso ou regredir estado |
