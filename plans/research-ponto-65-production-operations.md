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
| Asaas/Woovi | Dois adaptadores existem; nenhum sandbox remoto foi consultado. Em 2026-10-01 o usuário confirmou Asaas para o plano pago do primeiro lançamento e adiou Woovi/Pix Automático. | Asaas: gate P43 obrigatório antes de expor o checkout pago; Sandbox em Staging com reconciliação. Woovi: `N/A`, oculto; reabrir com demanda confirmada e corrigir contrato/ping antes do sandbox. O checker não pode exigir Woovi quando a capacidade está fora do escopo. |
| Backup/restore | Não há backup/restore real no Polaris; checklist só valida campos declarados. | P44: Neon PITR + backup `pg_dump` cifrado em R2 privado e restore drill medido em alvo descartável antes de dados reais; sem restore sobre Production. |
| Smoke/rollback | Smoke HTTP parcial e runbook; não há deployed SHA ou rollback ensaiado evidenciado. | Executar smoke por app e prova de recuperação compatível; rollback de app não desfaz schema/dados. Registrar deployment anterior e falhas parciais em P43. |

### Revalidação P43 — gates por capacidade aprovada (2026-10-01)

O registro atual possui uma linha genérica para providers, mas as regras
normativas definem capacidades de lançamento e gates próprios. P43 deve manter
uma linha por capacidade/evidência, agrupando serviço apenas quando compartilha
o mesmo contrato operacional:

- **Google OAuth:** gate obrigatório. `AUTH-001` torna Google o único método
  público de login/cadastro; validar callback, sessão e origem em Staging.
- **Jobs, outbox e recuperação:** gates obrigatórios para billing e operações
  que constam do lançamento. `BILLING-001`, `EVENT-004` e `RELEASE-001` exigem
  captura durável, retry/review, jobs/cron e prova de dead-letter. Inngest é o
  runner atualmente implementado; validar sync, funções necessárias e falha
  recuperável, ou registrar antes uma substituição equivalente.
- **Email transacional:** gate obrigatório para o lifecycle de billing.
  `BILLING-001`, `EMAIL-002` e `RELEASE-001` exigem envio ao owner, estado de
  entrega e webhook/lifecycle. Resend é o provider atual; validar domínio,
  entrega e estado com destinatário de teste/inbox interno, nunca cliente.
- **Imagens e storage:** gate obrigatório no escopo normativo atual: quotas Free
  e Pago incluem imagens e `IMAGE-001`/`RELEASE-001` exigem R2/CORS/lifecycle.
  Validar PUT/GET/DELETE de objeto sintético e retenção no alvo não produtivo;
  se imagens forem removidas do lançamento, isso requer mudança explícita de
  escopo, não `N/A` por falta de configuração.
- **Asaas:** gate obrigatório porque o usuário manteve o plano mensal pago no
  primeiro lançamento. Provar Checkout recorrente, webhook, outbox,
  reconciliação, idempotência e recuperação no Sandbox de Staging antes de
  habilitar o plano pago.
- **Woovi/Pix Automático:** explicitamente fora do primeiro lançamento, `N/A`
  e oculto conforme `PAY-001`; não é gate nem pode continuar como campo
  obrigatório universal do checker.
- **Rate limit / Upstash:** Upstash não é uma escolha normativa de vendor, mas
  é dependency atual dos endpoints de login Google e presign de imagem; em
  Production, ausência/falha do provider faz o código falhar fechado. P43 deve
  exigir prova da política de rate limit se esse código for mantido, ou a
  correção e validação da alternativa antes de lançar; não exigir a marca
  Upstash quando uma alternativa aprovada assumir o contrato.
- **Observabilidade / Sentry:** `OBS-001` exige eventos/métricas redigidos e
  alertas para billing, jobs, RLS, storage e email. A capability de alerta é
  obrigatória, mas Sentry como vendor não foi escolhido como requisito
  normativo; se usado, provar evento sintético e notificação, ou registrar o
  destino substituto.

Isso não cria gates de CI para os providers nem bloqueia Gate A; são critérios
de aceite P43/Gate B. `scripts/check-production-certification.ts` deve validar
status por capacidade e permitir `N/A` justificado para Woovi e serviços
realmente fora do release, em vez de exigir Asaas, Woovi, R2, Upstash e Sentry
universalmente. A implementação do checker permanece pendente.

## Sequência aprovada e limites

Definir o escopo do lançamento → provisionar Staging → provar as capacidades selecionadas em Staging → completar backup/restore/RPO/RTO → congelar e identificar o SHA candidato → replay CI/migrations e preparar deployments → validar target + prontidão de recovery → migration de Production separada (P45/P46) → promover deployment IDs exatos sem rebuild (P47) → promover Web/Admin sequencialmente após preparar todos os candidatos (P48) → smoke cada app → registrar evidência sanitizada, SHA, migrations e estado anterior no P43. Em falha parcial, parar e registrar antes de recuperar.

Não enviar pagamento ou e-mail a cliente para testar, não tratar `DATABASE_URL_DIRECT` isolada como target proof, não rodar `db:push` em remoto e não presumir que um deploy rollback reverta migration. P57 distingue smoke read-only de canário externo mutável e limita este último a alvo isolado/escopo explícito.

## Fontes internas e pesquisa já consolidada

Esta fase depende de decisões e pesquisas já aceitas: P43 readiness register, P44 recovery, P45 migration lifecycle, P46 db:push, P47 release SHA, P48 Web/Admin non-atomic, P49 Admin perimeter, P54 PG18, P57 canaries/integrações. Não consultei serviços, contas, secrets ou configurações remotas; Hub foi tratado como snapshot documental datado, não como estado atual de provider.

Nenhum teste, deployment, migration, backup ou restore foi executado nesta revisão.

## Decisão e atualização do registro — 2026-10-01

O usuário aprovou a matriz P43 por capacidade. O registro operacional foi
atualizado para explicitar gates de OAuth, jobs/outbox/dead-letter, e-mail
transacional, imagens/storage, rate limit, alertas, Asaas e Woovi. Essa
aprovação altera documentação e classificação do plano; não configura
providers, cria secrets ou valida uma operação externa. A correção do checker
continua pendente e deve espelhar os estados P43 por capability, sem exigir
Woovi/Sentry ou outro provider apenas por estar implementado.
