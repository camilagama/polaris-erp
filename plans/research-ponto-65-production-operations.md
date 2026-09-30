---
status: accepted
research_status: repository-and-decision-crosswalk-completed
decision_status: approved
reviewed_on: 2026-09-26
approved_on: 2026-09-26
---

# P65 — crosswalk do gate de Production Operations

## Recomendação e escopo

P65 é a síntese operacional de P43–P57. O registro vivo P43 é a fonte única para readiness; gates obrigatórios dependem da capacidade incluída no lançamento. Integrações adiadas precisam de motivo e gatilho de reabertura. Código, env schema, CI verde ou timestamps preenchidos não provam estado remoto ou entrega externa.

## Evidência por item do relatório

| Capacidade | Evidência local | Requisito para go-live |
|---|---|---|
| Vercel Web | Configuração/build/smoke HTTP versionados; app ainda não publicado conforme usuário. | Se Web for app do lançamento: projeto, domínio/variables/callbacks e deployment do SHA candidatos verificados externamente; health/redirect não provam login completo. |
| Vercel Admin | App, auth guard e smoke existem; nada prova Vercel Authentication remota. `401/403` prova perímetro, não runtime. | Se Admin for lançado: P49 `All Deployments`, login e grant in-app validados separadamente; runtime por prova autenticada apropriada. |
| Neon/PG18/RLS | P54 escolheu PG18; CI está em PG16; job PostgreSQL efêmero e RLS smoke não provam Neon. | Confirmar branch/extensões/role do Neon Production; alinhar CI/E2E/Staging/Production em PG18 e provar `NOBYPASSRLS`/policies no alvo. |
| Staging | Environment e URLs ainda não provisionados; P4/P5 condicionam sua configuração a hosting, DB/callbacks/E2E. | Staging persistente completo, com dados sintéticos e fluxo selecionado comprovado antes do go-live. |
| Google OAuth | Código e smoke de redirect inicial; callback/sessão/origem não comprovados. | Completar login/callback em Staging com conta de teste para cada cliente/origem do lançamento. |
| Cloudflare R2 | Health atual lê `HeadBucket` e CORS do bucket staging; não grava/lê objeto. | Se imagens/arquivos forem lançados: canário PUT/GET/DELETE em chave isolada Staging e recuperação de bytes coberta por P44. |
| Upstash | Código fail-closed e checker de timestamp declarado; nenhum provider consultado. | Se rate limit for gate da superfície lançada: chave isolada em Staging, provar allow/block; nunca consumir quota real de usuários. |
| Inngest | Funções/rota existem; sync, cron e execução remota não provados. | Se jobs forem necessários ao lançamento: sync no ambiente e canário sem efeito de negócio. |
| Sentry/alertas | SDK sanitizado existe; DSNs, alertas e retenção não confirmados. | Se declarado necessário no lançamento, enviar evento sintético sem PII e provar ingestão + notificação no destino responsável. |
| Resend | Código implementado; `accepted` não significa entregue e nenhum delivery externo foi provado. | Se e-mail estiver no lançamento, testar endereço de simulação/inbox interno allowlisted e conferir lifecycle; não enviar para cliente. |
| Asaas/Woovi | Dois adaptadores existem; nenhum sandbox remoto foi consultado. Checker exige ambos incondicionalmente. | Avaliar cada provider oferecido; sandbox com reconciliação em Staging. Woovi não pode ser certificada até corrigir assinatura RSA/HMAC e ping conforme o contrato oficial e passar sandbox. |
| Backup/restore | Não há backup/restore real no Polaris; checklist só valida campos declarados. | P44: Neon PITR + backup `pg_dump` cifrado em R2 privado e restore drill medido em alvo descartável antes de dados reais; sem restore sobre Production. |
| Smoke/rollback | Smoke HTTP parcial e runbook; não há deployed SHA ou rollback ensaiado evidenciado. | Executar smoke por app e prova de recuperação compatível; rollback de app não desfaz schema/dados. Registrar deployment anterior e falhas parciais em P43. |

## Sequência aprovada e limites

Definir o escopo do lançamento → provisionar Staging → provar as capacidades selecionadas em Staging → completar backup/restore/RPO/RTO → congelar e identificar o SHA candidato → replay CI/migrations e preparar deployments → validar target + prontidão de recovery → migration de Production separada (P45/P46) → promover deployment IDs exatos sem rebuild (P47) → promover Web/Admin sequencialmente após preparar todos os candidatos (P48) → smoke cada app → registrar evidência sanitizada, SHA, migrations e estado anterior no P43. Em falha parcial, parar e registrar antes de recuperar.

Não enviar pagamento ou e-mail a cliente para testar, não tratar `DATABASE_URL_DIRECT` isolada como target proof, não rodar `db:push` em remoto e não presumir que um deploy rollback reverta migration. P57 distingue smoke read-only de canário externo mutável e limita este último a alvo isolado/escopo explícito.

## Fontes internas e pesquisa já consolidada

Esta fase depende de decisões e pesquisas já aceitas: P43 readiness register, P44 recovery, P45 migration lifecycle, P46 db:push, P47 release SHA, P48 Web/Admin non-atomic, P49 Admin perimeter, P54 PG18, P57 canaries/integrações. Não consultei serviços, contas, secrets ou configurações remotas; Hub foi tratado como snapshot documental datado, não como estado atual de provider.

Nenhum teste, deployment, migration, backup ou restore foi executado nesta revisão.
