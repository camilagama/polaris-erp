# Decisões pós-auditoria

**Status:** aprovadas por delegação explícita do responsável de produto em 2026-07-14.  
**Escopo:** resolve as cinco decisões materiais abertas pela auditoria de completude. Não afirma implementação no código atual.

## DEC-BR-059 — Identidade, linking e sessões

**Decisão:** o produto identifica uma conta Google por `(provider = google, providerAccountId = sub)`. Linking implícito por igualdade de e-mail fica desabilitado, inclusive quando `email_verified` é verdadeiro. Uma colisão com conta legada entra em recuperação explícita por suporte verificado, com auditoria; não cria merge silencioso.

Sessão local usa expiração deslizante de sete dias de inatividade e máximo absoluto de 30 dias. Logout encerra a sessão atual. Suspensão/encerramento do tenant, recuperação de conta, conflito de identidade e revogação administrativa encerram todas as sessões afetadas. A aplicação audita sucesso de login, falha relevante de autenticação/linking, logout e revogação, sem tokens, cookies, IP completo ou conteúdo OAuth. Renovação rotineira não gera evento de auditoria.

**Justificativa:** o `sub` é o identificador estável declarado pelo Google; e-mail é atributo mutável e não é prova suficiente para merge. A duração mantém operação B2B fluida sem tornar uma sessão esquecida indefinida. [Pesquisa Google OAuth](research-google-oauth-2026-07-14.md).

**Impacto:** alterar configuração Better Auth e schema/serviço de sessão; registrar auditoria de logout/revogação; criar fluxo de recuperação; testar colisão, expiração, revogação e ausência de tokens na auditoria.

## DEC-BR-060 — Grants e PII de plataforma

**Decisão:** somente `platform owner` ativo pode conceder, estender ou revogar grants. Todo grant precisa de motivo, auditoria transacional, expiração obrigatória e revisão ao expirar; o máximo é 90 dias para `owner`, 30 para `operator` e 14 para `support`. Não há grant permanente. A criação do primeiro owner é bootstrap controlado, fora do console público, com trilha de auditoria.

Suporte vê identificadores e estado operacional por padrão. Nome e e-mail só são revelados na tela de caso quando necessários para atendimento, com motivo selecionado e auditoria de leitura. Tokens, payloads brutos, segredos, metadados internos e conteúdo não redigido nunca são exibidos. Não há impersonation.

**Justificativa:** reduz privilégio duradouro e exposição de PII sem impedir suporte legítimo. [Auditoria de completude](completeness-audit-2026-07-14.md).

**Impacto:** criar gestão de grant, expiração/revisão, projeções redigidas e eventos de acesso sensível; substituir dashboard mock por estado `indisponível` até haver métrica real.

## DEC-BR-061 — Escopo e tempo do dashboard

**Decisão:** toda métrica exibida no painel principal respeita o intervalo selecionado. Métrica histórica só pode aparecer em seção separada, nomeada “Todo o período”, sem compartilhar o rótulo do filtro atual. Todo cálculo, agrupamento, preset, cache-key, corte de dia/mês e apresentação usa `America/Sao_Paulo` explicitamente.

Rankings e métricas históricas usam snapshots de venda e não dependem de produto vivo; archive ou soft delete não altera histórico econômico. Inventário operacional exclui soft-deletados; o tratamento de arquivados é rotulado e documentado pela consulta que o usa.

**Justificativa:** elimina comparação semântica enganosa e torna o resultado repetível entre ambientes.

**Impacto:** separar queries globais das filtradas, versionar cache por intervalo/timezone, preservar referência de imagem/snapshot adequada e testar bordas de dia/mês/DST.

## DEC-BR-062 — Retry, concorrência e revisão manual

**Decisão:** processamento de webhook e billing tem até cinco tentativas automáticas com backoff exponencial e jitter, concluídas em até 24 horas. Após isso, entra em `manual_review` e gera alerta operacional obrigatório. Processamento de imagem tem até três tentativas; falha terminal preserva o diagnóstico redigido, remove staging órfão conforme retenção e entra em fila de revisão/retry manual, com alerta de prioridade normal.

O limite por organização é um para billing/webhooks e dois para processamento de imagens. Todo comando mantém idempotência no banco; concorrência de worker nunca substitui guardas de estado, versão ou chave idempotente. Alerta de billing/webhook é prioritário e não pode depender somente do dashboard.

**Justificativa:** fatos financeiros e de acesso exigem serialização e recuperação mais forte; imagens são isoladas e podem usar paralelismo limitado. Cinco tentativas já é o limiar existente no outbox, e Inngest oferece controle explícito de retries/concurrency. [Pesquisa de providers operacionais](research-operational-platforms-2026-07-14.md).

**Impacto:** declarar política no Inngest, persistir tentativa/causa/next run, criar transição de revisão e alertas; testar duplicidade, exaustão, ordem e concorrência por tenant.

## DEC-BR-063 — Lifecycle e retry de e-mail

**Decisão:** eventos Resend atualizam `email_messages` por `provider_message_id`, de forma idempotente e ordenada por horário do provider: `pending → accepted → delivered`, ou terminal `failed`, `bounced` e `suppressed`. Evento atrasado não regride estado terminal nem `delivered`. O status `accepted` significa aceitação pela API, não entrega.

Só mensagens transacionais podem receber retry automático, e somente quando a chamada falha antes de existir `provider_message_id`: até três tentativas em 24 horas, por chave idempotente. Após aceitação, falha, bounce ou suppression, não há reenvio automático, para evitar duplicidade ou insistência em destinatário inválido/suprimido. Reenvio manual exige novo evento de comunicação, motivo e auditoria; billing lifecycle usa estado no app como caminho alternativo.

**Justificativa:** separa aceitação de entrega e evita reenvio de mensagem possivelmente entregue. Resend expõe eventos de falha/supressão e recomenda chave de idempotência. [Pesquisa de providers operacionais](research-operational-platforms-2026-07-14.md).

**Impacto:** ampliar enum/schema, reconciliar eventos, manter timestamp do provider, implementar outbox de e-mail e testes de ordem, duplicidade, bounce e suppression.
