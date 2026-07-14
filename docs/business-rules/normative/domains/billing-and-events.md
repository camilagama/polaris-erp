# Planos, billing, eventos e e-mail

## Visão, objetivos e escopo

Free e pago mensal operam o mesmo produto por quotas. Cobre PLAN-001, ENTITLEMENT-001, SUB-001, PAY-001, BILLING-001, EVENT-004 e EMAIL-002.

## Regras, estados e permissões

- Onboarding DEVE criar Free ativo. Pago custa R$49,90/mês; não há anual, boleto ou PIX avulso.
- Falha inicia tolerância de 7 dias; depois migra para Free. Pagamento confirmado reativa pago. Cancelamento voluntário ocorre ao fim do período.
- Webhook DEVE ser capturado atomicamente, ordenado por data/versão, idempotente e nunca regredir estado. Billing/webhook usa 5 tentativas; imagem usa 3; terminal vai a revisão e alerta.
- E-mail transicional segue `pending → accepted → delivered` ou terminal; retry automático só antes de provider id, 3 vezes/24h.

## Fluxos de erro, transação, concorrência e auditoria

Entitlement, transição e auditoria ocorrem na mesma transação. Partição por organização evita corrida; chave provider/evento impede duplicidade. Erro de quota, provider ou transição inválida nega efeito e registra correlação. Owner vê estado no app; suporte não usa e-mail como fonte de acesso.

## Segurança, privacidade, migrações e aderência

Migrações: plano Free, entitlements versionados, relógio, event outbox processável e lifecycle de email. Gates: sandbox/contrato Asaas-Woovi, Resend/Inngest promovidos. Testes: grace, downgrade, replay, ordem, crash pós-captura, DLQ, bounce e suppression. Referências DEC-BR-003,005–020,024–025,028–029,034–035,044,050,052,062–063.
