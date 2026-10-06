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

## Revalidação Woovi — 2026-10-01

### Fatos atuais confirmados

- `apps/web/src/integrations/woovi/webhook.ts` lê `x-webhook-signature`, mas o
  valida como HMAC-SHA256 com `WOOVI_WEBHOOK_SECRET`, aceitando digest hex ou
  Base64. A documentação oficial atual recomenda RSA-SHA256 no
  `x-webhook-signature`, usando a chave pública da Woovi; ela recomenda obter a
  chave pela API para acompanhar rotação. O HMAC usa `X-OpenPix-Signature`, um
  header diferente, e a página de HMAC-SHA1 está marcada como depreciada. Logo,
  os testes locais provam somente que o código valida seu próprio formato de
  teste; não provam compatibilidade com o contrato recomendado. A página de
  webhook não prova qual método foi configurado na conta deste projeto.
- O webhook de configuração documentado tem apenas `data_criacao` e `event` e
  deve receber `200` com corpo vazio. O handler exige um ID de evento e devolve
  `400` quando ele falta. A documentação consultada não esclarece se o ping de
  configuração inclui assinatura; não presumir ausência. Mesmo depois de
  corrigir autenticação, deve haver tratamento explícito para o corpo de teste,
  sem criar evento de domínio.
- O adapter e seus testes tratam especificamente eventos `PIX_AUTOMATIC_*`,
  não uma integração genérica para todo Pix da Woovi. Os exemplos oficiais de
  `PIX_AUTOMATIC_APPROVED` e `PIX_AUTOMATIC_COBR_COMPLETED` trazem
  `globalID`/`correlationID` no nível superior; o extrator atual consegue ler
  esses campos. Não há evidência nas páginas consultadas de que esses dois
  eventos tenham problema de ID aninhado. Ainda é necessário homologar cada
  transição realmente consumida e seu mapeamento para billing.
- `docs/api/webhooks.md` está desalinhado com o handler atual: descreve HMAC no
  header Woovi e reconciliação síncrona, enquanto o código captura o intake e
  deixa a reconciliação para processamento durável pelo outbox. Alinhar esse
  documento quando a integração for reconciliada; não usar o texto atual como
  prova de runtime.
- A regra normativa `PAY-001` especifica Asaas para cartão recorrente e Woovi
  para Pix Automático. Ela manda ocultar Pix Automático se não estiver elegível,
  homologado ou saudável, sem trocar por Pix manual mensal. Isso mantém
  lançamento com Asaas como possibilidade, mas não prova que Asaas esteja
  homologado nem decide sozinho o escopo comercial da primeira versão.

### Consequência para o plano

O risco de autenticidade é real e bloqueia qualquer lançamento que ofereça
Woovi; assinatura inválida pode rejeitar eventos legítimos e uma verificação
mais permissiva sem contrato também seria inadequada para notificações
financeiras. Pela política P57/P65 já aprovada, este ponto só vira gate de
go-live se Pix Automático via Woovi entrar no escopo. Fora dele, marcar `N/A`
com motivo e gatilho para reabrir em P43; manter a capacidade oculta conforme
`PAY-001`. Não é necessário atrasar Gate A ou ampliar o ambiente CI para
resolver um provider ainda não selecionado.

Se incluída, a tarefa precisa abranger: verificação RSA recomendada com chave
pública obtida/rotacionada de modo seguro, decisão explícita sobre qualquer
compatibilidade HMAC legada, resposta idempotente ao ping de configuração sem
ID, parsing/mapeamento dos eventos Pix Automático necessários, documentação
API coerente, testes de assinatura válida/inválida/body alterado/ping/duplicata/
ordem e sandbox de Staging com dados sintéticos. Confirmar no ambiente Woovi
qual assinatura ele envia; a documentação pública não comprova configuração
remota da conta. Não testar pagamentos reais.

### Decisão do usuário — 2026-10-01

O usuário respondeu “prossiga” após a recomendação de adiar Woovi. Registro
Pix Automático via Woovi como fora do primeiro lançamento: P43 deve mostrar
`N/A` com motivo, sem declarar integração certificada nem bloquear Gate A; a
capacidade fica oculta conforme PAY-001. Reabrir somente quando houver demanda
confirmada e reservar a correção/homologação no plano do lançamento futuro.
Essa decisão não seleciona nem certifica Asaas ou outros providers.

### Ponto ainda pendente — Asaas e monetização no primeiro lançamento

Os documentos aprovados não estão totalmente reconciliados com o registro
operacional: `PLAN-001` define catálogo inicial Free + pago mensal de R$49,90;
`SCOPE-001` inclui billing no lançamento; `PAY-001` exige upgrade self-service
via checkout externo e confirmação confiável por webhook, atribuindo cartão
recorrente ao Asaas e Pix Automático à Woovi. Como Woovi foi adiada, Asaas é o
único provider de cartão recorrente aprovado. Em contraste, o P43 ainda diz que
a lista exata de providers incluídos no primeiro lançamento não foi registrada.
Isso não determina se o primeiro release público expõe o plano pago ou se há
um período inicial explicitamente Free-only.

### Auditoria local do caminho Asaas

- `packages/billing/src/providers/asaas.ts` envia checkout hospedado para
  `/v3/checkouts`, com `CREDIT_CARD`, `RECURRENT`, ciclo mensal, referência
  externa e callback. `apps/web/src/features/onboarding/pre-signup-checkout.ts`
  usa esse adapter; o fluxo de upgrade também possui `ASAAS_CARD_CHECKOUT_ENABLED`.
- `apps/web/src/integrations/asaas/webhook.ts` valida
  `asaas-access-token`, limita corpo, redige dados, usa ID do evento e grava
  intake/outbox. `apps/web/src/lib/inngest-functions.ts` despacha o tópico
  `asaas.webhook` para `reconcileAsaasBillingEvent` e marca resultado/revisão.
  Portanto o desenho local é captura durável seguida de reconciliação
  assíncrona, não confirmação síncrona pelo HTTP handler.
- Os testes de adapter usam `fetch` falso; os testes de route constroem
  requests sintéticas; a suíte PostgreSQL chama a reconciliação diretamente.
  Nenhum deles prova integração com Sandbox. A implementação P5 aprovada ainda
  precisa trocar o exemplo para URL Sandbox e aplicar guard de host.

### Contrato e homologação Asaas

A documentação oficial oferece Checkout hospedado com recorrência de cartão;
criar o checkout não confirma pagamento. O sistema deve esperar evento de
webhook e reconciliar por identificador externo/evento. O Sandbox suporta
simular aprovações/recusas, criar assinaturas e exercitar entrega de webhook
sem movimentar dinheiro real. O header oficial de autenticação de webhook é
`asaas-access-token`. A entrega é pelo menos uma vez, pode repetir eventos e a
fila pode ser interrompida após falhas consecutivas, com retenção limitada; o
gate deve provar idempotência, projeção de pagamento/assinatura e tratamento de
falha/retry, não apenas HTTP 200 ou link de checkout.

As referências oficiais atuais são
[Checkout de assinatura](https://docs.asaas.com/docs/checkout-with-subscription-recurring),
[criar Checkout](https://docs.asaas.com/reference/create-new-checkout),
[testar cartão no Sandbox](https://docs.asaas.com/docs/testing-credit-card-payment),
[autenticar webhooks](https://docs.asaas.com/docs/about-webhooks) e
[FAQ de webhooks/retries](https://docs.asaas.com/docs/webhooks-faq). A FAQ de
Asaas diz que somente HTTP 200 conta como sucesso; outra página de introdução
aceita 2xx. Adotar HTTP 200 no endpoint e confirmar na homologação.

### Recomendação para P43/P65

Se o primeiro lançamento público oferece o plano pago mensal já aprovado, o
Asaas deve ser gate obrigatório de go-live, não de Gate A: Checkout real de
Sandbox, confirmação via webhook, outbox/reconciliação de assinatura e
pagamento, idempotência, renewal/falha/cancelamento e retorno a Free devem
passar antes de expor o plano a clientes. Não enviar cobrança real como teste.

Se a primeira versão for explicitamente Free-only, registrar Asaas como `N/A`
temporário em P43 com gatilho “antes de ativar checkout pago”, esconder ou
desabilitar o checkout pago e reconciliar `PLAN-001`/`PAY-001` com esse limite.
Não manter um plano pago visível sem provider certificado. O escopo público
Free-only não aparece aprovado nos documentos atuais; a escolha cabe ao
responsável pelo produto.

### Decisão do usuário — Asaas, 2026-10-01

O usuário confirmou “Plano pago + Asaas”: manter o plano mensal pago no primeiro
lançamento. Asaas/cartão recorrente é, portanto, gate obrigatório de P43 antes
de expor checkout pago; isso não bloqueia Gate A. Woovi continua `N/A` e oculta
no primeiro lançamento. Não há homologação Asaas Sandbox comprovada; P5
(endpoints Sandbox/guard) e a validação ponta a ponta em Staging seguem
pendentes. Não enviar cobrança real como teste.
