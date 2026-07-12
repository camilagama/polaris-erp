# SOP - Ativacao manual controlada de billing

Data: 2026-07-12

## Objetivo

Permitir operacao paga desde o primeiro acesso enquanto o checkout self-service ainda nao existe, sem liberar acesso sem pagamento confirmado e sem perder trilha de auditoria.

Este SOP e uma excecao operacional controlada. Ele nao substitui checkout/portal self-service para escala.

## Escopo

Aplica-se a novos tenants bloqueados em `/billing-required` com `billing_subscriptions.status = incomplete` ou outro status sem acesso.

Nao se aplica a:

- ativacao sem evidencia externa de pagamento;
- alteracao direta no banco para liberar acesso;
- suporte comum sem impacto de assinatura;
- reembolso/chargeback sem revisao manual do status.

## Responsabilidades

- Operador de suporte/billing: confirma pagamento fora do app, coleta referencia rastreavel e executa a acao no admin.
- Platform admin aprovador: garante que o operador tem grant ativo e revisa excecoes ou ativacoes contestadas.
- Responsavel de release: preenche evidencia de producao em `PRODUCTION_CERT_MANUAL_BILLING_SOP_AT` e `PRODUCTION_CERT_MANUAL_BILLING_SLA_HOURS`.

## SLA

SLA padrao para lancamento controlado: ate 24 horas corridas apos recebimento da evidencia externa de pagamento pelo canal configurado em `SUPPORT_EMAIL`.

Use `PRODUCTION_CERT_MANUAL_BILLING_SLA_HOURS=24` salvo decisao operacional documentada com outro valor entre `1` e `48`.

## Evidencia aceita

Registre no admin apenas uma referencia curta e rastreavel, nunca dados sensiveis completos.

Exemplos aceitos:

- id do pagamento no Asaas ou Woovi;
- id da invoice;
- protocolo de atendimento interno;
- link interno restrito para comprovante;
- referencia bancaria conciliada pelo operador.

## Procedimento de ativacao

1. Validar que o pedido veio do email do usuario/tenant ou de canal interno confiavel.
2. Confirmar pagamento no provider, banco ou controle financeiro externo.
3. Abrir `apps/admin` em `/billing`.
4. Localizar o tenant por email de billing, email de membro ou `organizationId`.
5. Informar motivo operacional objetivo.
6. Informar `paymentEvidenceReference`.
7. Confirmar a acao para alterar a assinatura para `active`.
8. Verificar que o tenant passa a ter acesso operacional.
9. Confirmar que `platform_audit_events` recebeu `billing.subscription.status_changed` com `status`, `reason` e `paymentEvidenceReference`.

## Procedimento de bloqueio/reversao

1. Se pagamento for estornado, contestado ou considerado invalido, abrir `/billing` no admin.
2. Alterar a assinatura para `past_due`.
3. Registrar motivo claro com referencia ao evento externo.
4. Verificar que o tenant perdeu acesso operacional.
5. Preservar a auditoria; nao edite ou apague eventos antigos.

## Proibido

- Ativar `active` direto no banco.
- Usar `DATABASE_URL_DIRECT` para liberar assinatura.
- Registrar numero completo de cartao, documento sensivel ou comprovante bruto em `paymentEvidenceReference`.
- Ativar assinatura sem confirmar pagamento externo.
- Usar este SOP para contornar falha de provider em lancamento amplo sem aprovacao operacional.

## Evidencia de producao

Antes de promover producao, registre:

- `PRODUCTION_CERT_MANUAL_BILLING_SOP_AT`: timestamp ISO da revisao/aprovacao deste SOP.
- `PRODUCTION_CERT_MANUAL_BILLING_SLA_HOURS`: `24`, salvo decisao operacional documentada entre `1` e `48`.

Rode:

```bash
bun run ops:production-certification:checklist
```

O checklist deve falhar se essas evidencias nao estiverem presentes.
