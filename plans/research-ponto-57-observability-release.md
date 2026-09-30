# Pesquisa do ponto 57 — observabilidade e integrações no release

**Data:** 2026-09-26  
**Estado:** recomendação aprovada pelo usuário em 2026-09-26; implementação ainda pendente.  
**Pergunta:** como provar sinais operacionais e integrações sem transformar todas as integrações do Polaris em gates obrigatórios nem confundir configuração local com funcionamento remoto.

## Recomendação

Refinar o ponto 57 conforme o P43 já aprovado. O registro `docs/operations/production-readiness.md` deve exigir evidência apenas para capacidades incluídas no lançamento em avaliação. Uma integração fora do escopo do lançamento recebe `N/A`/fora de escopo e uma razão curta, com condição para reabri-la; não deve bloquear o release por padrão. Saúde web/admin e autenticação necessária ao uso do aplicativo continuam gates do aplicativo correspondente.

Para cada gate aplicável, separar três evidências:

1. **Contrato no código e configuração versionada:** demonstra o comportamento pretendido, não que o provider remoto esteja configurado.
2. **Configuração externa observada:** confirma projeto/ambiente/objeto no provider, sem registrar valores secretos.
3. **Validação executada:** smoke do SHA candidato ou canário controlado contra o alvo identificado.

Usar `local`, `CI`, `Staging` e `Production` conforme o mapa aprovado. Canários com efeitos externos devem ser explícitos, isolados e executados individualmente; primeiro em Staging. Em Production, usar somente quando necessário para provar uma configuração exclusiva de Production, com escopo e confirmação próprios. Nada de pagamento, e-mail para cliente ou evento de negócio real apenas para fechar um checkbox. Registrar ambiente, SHA quando aplicável, horário UTC, ID/correlação sanitizada, resultado, responsável e próxima ação no formato P43. Não registrar secrets, PII, payload bruto, headers nem URLs de banco. Revalidar por gatilhos relacionados à configuração ou ao SHA, sem refazer todos os probes a cada commit.

Não criar outro runbook de deploy nem duplicar o registro P43. Os procedimentos por serviço ficam nos runbooks vigentes; o registro aponta para eles e para a execução observada.

## Auditoria do Polaris

| Capacidade | O que o repositório prova hoje | Validação recomendada quando aplicável ao lançamento |
| --- | --- | --- |
| Sentry | `docs/operations/observability.md` documenta inicialização condicional e sanitização. O checker de certificação exige um ID de evento e timestamp de alerta fornecidos manualmente; não consulta Sentry. | Um evento sintético único, com ambiente e SHA identificáveis, sem dados de request/usuário; confirmar chegada no projeto/ambiente corretos e que o alerta notificou o destino responsável. Como emite evento e pode disparar notificação, não rodar automaticamente em CI nem repetir para “ver se funciona”. |
| Inngest | `apps/web/src/app/api/inngest/route.ts` registra as funções. `docs/operations/jobs-and-workflows.md` distingue código local de sync, cron e retries remotos. O checker apenas valida valores de evidência preenchidos manualmente. | Confirmar sync da versão já hospedada e a lista de funções/cron no ambiente correto. Separadamente, provar recebimento e execução com um evento/function canário sem efeito de negócio. Não enviar eventos reais de billing nem chamar reconciliação de imagens só para obter evidência. |
| Resend | O serviço persiste `accepted` após aceitação pela API e atualiza lifecycle por webhooks; `accepted` não significa `delivered`. O production smoke atual não envia e-mail. | Em Staging, usar `delivered@resend.dev` e uma etiqueta/correlação de teste para conferir os eventos `email.sent` e `email.delivered` e a atualização local. Esse endereço simula eventos e não prova entrega a uma caixa externa nem SPF/DKIM/DMARC. Se o domínio real e entrega em caixa forem requisito do lançamento, usar caixa interna allowlisted e confirmar a chegada e autenticação; nunca caixa de cliente. |
| Cloudflare R2 | `/api/internal/health/r2` exige bearer e examina `HeadBucket` do bucket de staging e configuração CORS. Não escreve nem lê objeto. O smoke atual só confirma HTTP 200 do diagnóstico. | Se imagens estiverem no lançamento, usar chave sintética única no bucket de staging: PUT, GET/HEAD, conferir conteúdo e excluir exatamente a chave criada. Não usar bucket final ou imagens de organizações para teste. Credencial de objeto deve ter escopo de bucket e operar pela API S3 compatível. |
| Upstash rate limit | `checkRateLimit` usa `@upstash/ratelimit`; a política de produção falha fechada quando o provider está indisponível. O checker exige apenas timestamp fornecido, sem chamar Upstash. | Usar Redis de Staging ou namespace/identificador isolado para demonstrar uma requisição aceita e outra bloqueada, conferir `remaining/reset` e limpeza/expiração. Não consumir limites de IPs ou contas de produção. Falha controlada do provider deve ser validada em ambiente isolado ou por testes locais, não provocada em Production. |
| Saúde web | `GET /api/health` consulta banco e responde `503` sanitizado quando indisponível. O deployment smoke também verifica `/sign-in`, redirecionamento inicial ao Google e bloqueio do bootstrap de desenvolvimento. | Rodar contra o SHA/URL candidato e guardar resultados sanitizados. O redirect para `accounts.google.com` é só início de OAuth, não prova callback, sessão ou onboarding. |
| Saúde admin | `GET /api/health` informa `runtime: ok`; não consulta banco nem prova autenticação/autorização. O smoke verifica essa resposta ou a barreira de Vercel Authentication (`401/403`). | Confirmar perímetro protegido e, quando a validação exigir observar o handler, uma rota autenticada e adequada. Não declarar saúde de banco/in-app autorizada a partir do endpoint atual. |
| Google OAuth | Better Auth configura Google; o smoke confirma somente redirect de início. Há configuração separada para a aplicação admin. | Em Staging, completar login/callback com conta dedicada de teste e verificar retorno, cookie/sessão, origem e autorização esperadas. Não gravar identidade, e-mail ou tokens na evidência. Google exige correspondência exata do `redirect_uri` registrado. |
| Webhook financeiro | O código recebe Asaas e Woovi, captura evento idempotente e grava evento/outbox. O checker atual exige timestamps de sandbox Asaas e Woovi, mesmo sem expressar escopo por provider; isso deve ser alinhado ao P43. | Provar somente providers habilitados/oferecidos no lançamento, usando sandbox e banco/dados sintéticos de Staging. Um HTTP 2xx não prova reconciliação: acompanhar a captura e a projeção/outbox esperada. Não enviar evento financeiro real. **Woovi tem bloqueio técnico descrito abaixo; não certificar até corrigir e validar em sandbox.** |

O `scripts/check-production-certification.ts` valida campos/timestamps e constantes fornecidos como GitHub Variables; não faz chamadas remotas e não comprova eventos, syncs, rate limit, R2, webhooks ou alertas. O runbook `docs/runbooks/deploy-vercel.md` também descreve essa limitação. Para obedecer ao P43, o futuro contrato precisa aceitar fora-de-escopo justificado e exigir evidência somente dos gates do lançamento, em vez de transformar toda variável atual em requisito universal.

### Bloqueio observado na integração Woovi

Há incompatibilidade aparente entre a validação implementada e o contrato oficial consultado em 2026-09-26:

- `apps/web/src/integrations/woovi/webhook.ts` verifica `x-webhook-signature` como HMAC-SHA256 usando `WOOVI_WEBHOOK_SECRET`.
- A documentação oficial atual da Woovi diz que `x-webhook-signature` é assinatura RSA da chave privada da Woovi e recomenda verificação com a chave pública da Woovi. O HMAC, por sua vez, usa outro header, `X-OpenPix-Signature`.
- O webhook de teste de cadastro documentado pela Woovi contém apenas `data_criacao` e `event`. `getWooviWebhookEventId` do Polaris exige `globalID`, `paymentSubscriptionGlobalID`, `cobr.identifierId` ou `correlationID`; logo o handler atual não aceita esse ping como está.

Isso não prova se a integração em produção está ativa ou qual modo de assinatura foi configurado externamente. Prova que não se deve marcar o gate como aprovado com base no teste de cadastro ou no contrato atual antes de reconciliar header/algoritmo e evento de teste com o código. Se Woovi estiver fora do lançamento, registrar essa decisão no P43 e bloquear a integração até a correção e homologação em sandbox. Se estiver no lançamento, tratar a compatibilidade como pré-requisito, corrigir em trabalho separado e executar fluxo sandbox com Staging isolado.

Asaas usa `asaas-access-token` e sua documentação exige validar o token configurado. Eventos em sandbox também devem percorrer captura idempotente, outbox e qualquer reconciliação selecionada, em vez de aceitar apenas a resposta HTTP.

## Comparação com o Hub

Os documentos do Hub consultados são um snapshot datado de **2026-09-03**, não evidência do estado atual dos providers. Eles demonstram padrões reaproveitáveis: distinguir evento Sentry de alerta entregue; distinguir aceitação de mensagem, webhook de delivery e recebimento em caixa; usar canários controlados; atrelar evidência a ambiente/SHA; registrar somente IDs e resultados sanitizados; não repetir operações já comprovadas. O Polaris deve reaproveitar esses limites, não copiar seus workflows, providers, gates ou sequências de produção.

## Fontes oficiais atuais

- Sentry: [SDK JavaScript para Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/), [opções de coleta de dados](https://docs.sentry.io/platforms/javascript/common/configuration/options/), [API de alertas](https://docs.sentry.io/api/monitors/create-an-alert-for-an-organization/). Eventos e configuração de alerta são verificações distintas; a própria sanitização versionada do Polaris ainda precisa de confirmação no projeto/ambiente externo.
- Inngest: [sincronizar uma app após deploy](https://www.inngest.com/docs/apps/cloud), [enviar eventos](https://www.inngest.com/docs/events), [inspecionar eventos e execuções com CLI](https://www.inngest.com/docs/cli). Sync registra/configura funções; evento enviado dispara funções correspondentes, então um canário deve ser inofensivo.
- Resend: [e-mails de teste](https://resend.com/docs/dashboard/emails/send-test-emails), [tipos de eventos](https://resend.com/docs/webhooks/event-types). A documentação classifica as caixas `resend.dev` como simulação; `email.sent` é pedido aceito e `email.delivered` significa entrega ao servidor de e-mail destinatário.
- Cloudflare R2: [tokens e permissões](https://developers.cloudflare.com/r2/api/tokens/), [S3 compatível](https://developers.cloudflare.com/r2/get-started/s3/). Tokens de objeto podem ser limitados a buckets específicos e suas permissões de objeto são para a API S3 compatível.
- Upstash: [Rate Limit TypeScript](https://upstash.com/docs/redis/sdks/ratelimit-ts/gettingstarted). A API `limit(identifier)` retorna sucesso/limite restante e há prefixo configurável para evitar colisão de chaves.
- Better Auth/Google: [Google provider no Better Auth v1.6.23](https://github.com/better-auth/better-auth/blob/v1.6.23/docs/content/docs/authentication/google.mdx), [OAuth web server do Google](https://developers.google.com/identity/protocols/oauth2/web-server). A base URL constrói o callback e o redirect precisa corresponder exatamente ao cadastrado.
- Asaas: [webhooks](https://docs.asaas.com/docs/about-webhooks), [criar webhook no Sandbox](https://docs.asaas.com/reference/create-new-webhook). O header `asaas-access-token` autentica notificações; a documentação alerta para falha/interrupção da fila depois de respostas não-2xx consecutivas.
- Woovi: [assinatura recomendada e distinção do HMAC](https://developers.woovi.com/docs/webhook/seguranca/webhook-signature-validation), [webhook de teste](https://developers.woovi.com/docs/webhook/webhook-test). As páginas foram atualizadas em 2026-09-25 segundo o próprio site.
- Polaris: `docs/operations/production-readiness.md` (decisão P43), `docs/operations/observability.md`, `docs/operations/jobs-and-workflows.md`, `docs/operations/environments-and-deployment.md`, `docs/runbooks/deploy-vercel.md`, `scripts/check-production-certification.ts`, `scripts/smoke-deployment.ts`, `scripts/smoke-admin-deployment.ts` e os handlers/rotas citados na tabela.
- Hub, como referência documental datada: `docs/operations/external-readiness-checklist.md`, `docs/operations/observability-and-recovery.md` e `docs/operations/release-state.md` (snapshot de 2026-09-03).

## Context7 consultado

Resoluções oficiais/alta reputação e páginas consultadas: `/getsentry/sentry-docs`, `/inngest/website`, `/websites/resend`, `/websites/developers_cloudflare_r2`, `/upstash/docs`, Better Auth `v1.6.23`, `/websites/asaas` e `/websites/developers_woovi`. As conclusões específicas acima foram conferidas nas documentações oficiais linkadas, inclusive a diferença crítica entre a assinatura Woovi e o código atual.

## Decisão proposta para o ponto 57

1. Aprovar o registro P43 como o único lugar para status/evidência externa.
2. Tornar gates condicionais à capacidade realmente incluída no lançamento; registrar fora-de-escopo com motivo e gatilho de reabertura.
3. Separar smoke sem efeito (health, página de login, redirect, proteção) de canários externos (Sentry, evento Inngest, Resend, objeto R2, limite Upstash e sandbox de pagamento), com confirmação, isolamento e evidência individual.
4. Não tratar `accepted`, HTTP 200, configuração no `.env`, CI verde ou a execução do checker de variáveis como prova de entrega/funcionamento remoto.
5. Não aprovar a evidência Woovi até reconciliar a assinatura atual e o formato do webhook de teste com a implementação.
