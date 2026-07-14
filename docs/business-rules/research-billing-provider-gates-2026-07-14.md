# Pesquisa externa: decisões e gates de billing providers

**Status:** pesquisa técnica, não normativa.  
**Consulta:** 2026-07-14.  
**Escopo:** cartão recorrente, PIX Automático, checkout, ciclo de vida, webhooks, cancelamento, estorno e homologação de Asaas e Woovi. Não autoriza contratação, uso de credenciais, alteração de código ou lançamento.

## Conclusão executiva

O lançamento pode suportar os dois meios definidos para o produto, mas **não deve modelá-los como um único checkout ou uma única máquina de estados do provider**:

- **Cartão recorrente:** o Checkout hospedado do Asaas suporta `CREDIT_CARD` com `RECURRENT`, cria a assinatura após a jornada e requer confirmação por webhook, não pelo redirecionamento do navegador.[^asaas-checkout][^asaas-checkout-subscription]
- **PIX Automático:** a Woovi documenta assinatura `PIX_RECURRING`, autorização do pagador por QR Code, estados próprios, cancelamento e eventos próprios.[^woovi-create][^woovi-flow][^woovi-state-machine] O Asaas também oferece PIX Automático, porém é um fluxo separado do Checkout/assinatura convencional, com autorização, elegibilidade da conta e cobrança recorrente vinculada à autorização.[^asaas-pix-authorization][^asaas-pix-faq]
- O PIX incluído numa assinatura convencional do Asaas **não equivale a débito recorrente automático**: a documentação de assinaturas informa que Pix convencional gera nova cobrança a ser paga pelo cliente.[^asaas-subscription-faq]

### Recomendação para o projeto

Manter, no lançamento, **Asaas para cartão recorrente e Woovi para PIX Automático**, sobre um núcleo interno único de billing e entitlement. A decisão preserva o objetivo comercial já registrado, usa o fluxo explicitamente documentado de cada provider e evita apresentar como PIX Automático um Pix recorrente que depende de ação mensal do pagador.

Isso não significa misturar integrações: cada provider deve ter adaptador, eventos e reconciliação próprios; o domínio interno recebe apenas fatos normalizados (`checkout_started`, `authorization_active`, `payment_confirmed`, `payment_overdue`, `provider_cancelled`). A alternativa de concentrar tudo no Asaas é tecnicamente viável, mas adiciona criação periódica de cobranças PIX pela aplicação, exige elegibilidade específica de CNPJ e precisa de homologação separada. Ela deve ser uma escolha comercial/operacional explícita, não uma simplificação presumida.[^asaas-pix-faq][^asaas-pix-authorization]

## Achados que resolvem dúvidas existentes

### Viabilidade de recorrência e checkout

- O Checkout Asaas aceita o tipo `RECURRENT`, cartão de crédito e URLs de retorno; a criação do checkout não é confirmação financeira. Seu próprio guia exige registrar `id`, `link`, `status` e `externalReference` e aguardar webhook.[^asaas-checkout]
- Uma assinatura Asaas cria cobranças futuras e cartão é debitado automaticamente quando válido. Cancelar a assinatura interrompe novas cobranças, mas não elimina automaticamente cobranças já geradas.[^asaas-subscriptions]
- A Woovi cria PIX Automático via `POST /api/v1/subscriptions` com `type: PIX_RECURRING`; o fluxo exige autorização do cliente. A jornada por QR Code é um fluxo de autorização do banco, não a mesma página de checkout do cartão.[^woovi-create][^woovi-what-is]
- A Woovi expõe cancelamento da assinatura por `PUT /api/v1/subscriptions/{id}/cancel` e consulta pelo ID global ou de correlação.[^woovi-api]
- No Asaas, PIX Automático requer autorização distinta. Sua conta precisa satisfazer elegibilidade, incluindo CNPJ aprovado e ativo há pelo menos seis meses; a aplicação deve guardar a autorização e criar/acompanhar as cobranças do ciclo.[^asaas-pix-authorization][^asaas-pix-faq]

**Decisão técnica recomendada:** nenhum acesso pago é concedido por `successUrl`, QR exibido, criação de assinatura, autorização agendada ou pagamento apenas iniciado. O acesso muda apenas após fato persistido e confirmado pelo provider (`PAYMENT_CONFIRMED`/equivalente), processado idempotentemente.

### Webhooks, ordem, duplicidade e autenticação

#### Asaas

- Entrega é *at least once*; a mesma notificação pode reaparecer e seu identificador próprio se repete no reenvio. A documentação recomenda idempotência pelo ID do evento.[^asaas-webhooks]
- O token configurado no webhook deve ser validado no cabeçalho `asaas-access-token`.
- O provider tenta novamente quando não recebe `2xx`; após 15 falhas consecutivas pode interromper a fila. Eventos ficam retidos por 14 dias e, após reativação, os pendentes são reenviados cronologicamente.[^asaas-webhooks]

#### Woovi

- A assinatura recomendada é `x-webhook-signature`, validada contra a chave pública da Woovi e o corpo bruto. HMAC `X-OpenPix-Signature` existe, mas a própria documentação o classifica como método anterior.[^woovi-signature]
- A Woovi documenta oito tentativas, com backoff exponencial após falha HTTP, indisponibilidade ou erro interno; também permite reenvio manual.[^woovi-retry]
- Para cobrança, a documentação indica correlação por `charge.correlationID` ou `charge.identifier`, retorno rápido de `2xx` e processamento assíncrono/idempotente.[^woovi-webhook]

**Decisão técnica recomendada:** validar autenticidade sobre o corpo bruto antes de qualquer efeito; persistir atomica e rapidamente a entrega válida; responder `2xx` somente depois da captura durável; processar em worker separado. A chave de deduplicação não deve ser assinatura, timestamp ou payload inteiro. Deve combinar provider, tipo de evento e identidade estável documentada do recurso/evento, com uma restrição de unicidade no banco. Se o payload não trouxer uma identidade inequívoca, o worker consulta a API do provider e aplica transição condicional por versão/data antes de alterar entitlement.

**Ordem:** tratar a ordem de envio como indício, não como garantia de correção. A ordem cronológica citada pelo Asaas vale para pendências após reativação de fila, não substitui guardas contra regressão. Cada adaptação deve rejeitar estados antigos, guardar tempo/versão do fato e poder reconciliar a entidade atual pela API do provider.

### Falha de pagamento, graça e retries

- A Woovi permite `THREE_RETRIES_7_DAYS` para PIX Automático; ao esgotar as tentativas, a documentação indica cancelamento da assinatura.[^woovi-what-is][^woovi-flow]
- No PIX Automático Asaas, `ALLOW_THREE_IN_SEVEN_DAYS` permite até três novas tentativas em sete dias, mas elas são comandadas pela integração e a falha de uma cobrança não encerra, por si, a autorização.[^asaas-pix-retry]
- Em ambos os providers, uma cobrança falhada e a autorização/assinatura são objetos distintos. Não inferir downgrade de uma única transição de provider.

**Decisão técnica recomendada:** manter a regra já aprovada de sete dias de graça no domínio interno, iniciada no vencimento efetivo da cobrança. Habilitar/requisitar a política de três retentativas quando o provider a suportar, mas nunca delegar a ele o downgrade para Free. O job interno só faz downgrade quando o prazo interno vencer e não existir confirmação de pagamento válida; uma confirmação tardia aprovada reativa o pago de forma idempotente.

### Cancelamento, revogação e estorno

- O cancelamento de assinatura Asaas impede novas cobranças, mas cobranças futuras já geradas podem continuar existindo; como elas podem ser geradas com antecedência, o fluxo precisa verificar e tratar cobranças abertas antes do próximo período.[^asaas-subscriptions]
- O cancelamento de autorização PIX Automático do Asaas bloqueia novas instruções e pode cancelar agendamentos; o comportamento de corte depende do momento operacional.[^asaas-pix-cancel][^asaas-pix-retry]
- O consumidor pode revogar uma autorização PIX Automático pelo aplicativo bancário na Woovi; o provider também expõe cancelamento pela API.[^woovi-state-machine][^woovi-api]
- O Asaas possui APIs de estorno para pagamentos confirmados/recebidos por cartão e Pix. A disponibilidade da API não cria obrigação de estorno automático do produto.[^asaas-refund]

**Decisão técnica recomendada:** representar cancelamento voluntário como `cancel_at_period_end` no domínio interno, manter acesso até o fim já pago e agendar a interrupção do provider antes da próxima cobrança. O job precisa ser idempotente, registrar tentativa/resultado e auditar cancelamento; uma revogação pelo banco/provider é um fato externo que deve impedir novas cobranças, mas não apagar histórico nem conceder/retirar acesso sem aplicar a regra interna de período e graça.

**Estorno:** manter DEC-BR-032 e DEC-BR-052: nenhum estorno automático. Exceções manuais devem permanecer fora do lançamento até que jurídico/financeiro defina política, autoridade, trilha de auditoria, prazo e comunicação. Não expor endpoint ou botão de reembolso por existir API do provider.

## Gates de homologação e release

| Gate | Evidência mínima para fechar | Risco se ausente |
| --- | --- | --- |
| Asaas cartão | Conta Sandbox, checkout `RECURRENT`, cartão aprovado/recusado, callback ignorado como fonte de acesso, webhook válido/repetido/falho e cancelamento com cobranças futuras | Entitlement incorreto ou cobrança futura após cancelamento |
| Woovi PIX Automático | Sandbox com `PIX_RECURRING`, QR/autorização, eventos de aprovação, tentativa recusada, três retries, cancelamento e validação de `x-webhook-signature` | Cobrança não autorizada, acesso sem pagamento ou evento forjado |
| Produção e contrato | Conta aprovada, custos/limites/SLA confirmados, suporte de incidentes, rotação de segredo, lista de eventos contratados e responsável operacional | Feature implementada porém indisponível ou sem suporte |
| Recuperação | Simular timeout, `5xx`, duplicidade, evento fora de ordem, fila interrompida, reenvio manual e indisponibilidade de worker | Perda de evento ou transição regressiva |
| Cancelamento e cobrança antecipada | Provar em Sandbox que nenhum débito posterior ocorre quando o cancelamento foi solicitado antes do corte; registrar comportamento das cobranças já emitidas | Violação da promessa de cancelamento ao fim do período |

## Escolhas que ainda precisam do usuário

1. **Estratégia de providers.** Recomendação: Asaas apenas para cartão recorrente e Woovi apenas para PIX Automático, com adaptadores separados. Alternativa: consolidar no Asaas, aceitando homologação extra, critérios de elegibilidade e criação/acompanhamento de cobranças PIX pela aplicação.
2. **Política diante de revogação PIX pelo banco.** Recomendação: impedir a próxima renovação, manter o período já confirmado e iniciar o fluxo de cobrança/recuperação normal no vencimento, sem cortar acesso retroativamente. Alternativa: migrar imediatamente para Free, mais simples mas incompatível com acesso já pago.
3. **Plano de contingência para PIX Automático indisponível.** Recomendação: não oferecer substituto recorrente disfarçado; manter cartão e mostrar PIX Automático como indisponível até a conta estar elegível/homologada. Alternativa: permitir PIX manual mensal, que altera DEC-BR-029 e a experiência comercial.
4. **Estorno excepcional.** Recomendação: suporte manual, sem SLA prometido nem automação até validação jurídica/financeira. Alternativa: definir uma política comercial de estorno no lançamento, o que exige debate jurídico e operacional separado.

## Atualizações necessárias nos documentos de decisão

- DEC-BR-028 não deve mais afirmar que a viabilidade pública de PIX recorrente na Woovi é desconhecida: há documentação oficial de PIX Automático, QR/autorização, estados, retries e endpoint de cancelamento. O gate restante é de conta, Sandbox, contrato e prova ponta a ponta.
- DEC-BR-029 deve diferenciar claramente **PIX Automático** de Pix convencional recorrente por fatura. O segundo não satisfaz o requisito de débito automático.
- DEC-BR-034, 035 e 044 devem registrar contratos específicos: Asaas usa token e fila de até 14 dias; Woovi recomenda assinatura assimétrica e realiza oito tentativas. O domínio interno continua responsável por idempotência, ordem e recuperação.

## Fontes primárias

[^asaas-checkout]: Asaas, [Checkout Asaas](https://docs.asaas.com/docs/checkout-asaas), documentação oficial, consultada em 2026-07-14.
[^asaas-checkout-subscription]: Asaas, [Checkout com Assinatura (recorrente)](https://docs.asaas.com/docs/checkout-com-assinatura-recorrente), documentação oficial, consultada em 2026-07-14.
[^asaas-subscriptions]: Asaas, [Introdução - assinaturas](https://docs.asaas.com/docs/assinaturas), documentação oficial, consultada em 2026-07-14.
[^asaas-subscription-faq]: Asaas, [FAQ - Assinaturas](https://docs.asaas.com/docs/faq-assinaturas), documentação oficial, consultada em 2026-07-14.
[^asaas-webhooks]: Asaas, [Receba eventos do Asaas no seu endpoint de Webhook](https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook), documentação oficial, consultada em 2026-07-14.
[^asaas-pix-authorization]: Asaas, [Criar uma autorização de Pix Automático](https://docs.asaas.com/reference/criar-uma-autorizacao-pix-automatico), documentação oficial, consultada em 2026-07-14.
[^asaas-pix-faq]: Asaas, [FAQ do Pix Automático](https://docs.asaas.com/docs/faq-2), documentação oficial, consultada em 2026-07-14.
[^asaas-pix-retry]: Asaas, [Processo de retentativas (Jornada 3 API)](https://docs.asaas.com/docs/pix-autom%C3%A1tico-processo-de-retentativas-jornada-3-api), documentação oficial, consultada em 2026-07-14.
[^asaas-pix-cancel]: Asaas, [Cancelar uma autorização](https://docs.asaas.com/reference/cancelar-uma-autorizacao-pix-automatico), documentação oficial, consultada em 2026-07-14.
[^asaas-refund]: Asaas, [Estornar cobrança](https://docs.asaas.com/reference/estornar-cobranca), documentação oficial, consultada em 2026-07-14.
[^woovi-create]: Woovi, [Como criar um Pix Automático?](https://developers.woovi.com/en/docs/pix-automatic/pix-automatic-how-to-create), documentação oficial, consultada em 2026-07-14.
[^woovi-what-is]: Woovi, [O que é o Pix Automático?](https://developers.woovi.com/en/docs/pix-automatic/pix-automatic-what-is-it), documentação oficial, consultada em 2026-07-14.
[^woovi-flow]: Woovi, [Fluxograma do Pix Automático](https://developers.woovi.com/en/docs/pix-automatic/webhooks/pix-automatic-flow), documentação oficial, consultada em 2026-07-14.
[^woovi-state-machine]: Woovi, [Máquina de Estados do Pix Automático](https://developers.woovi.com/en/docs/pix-automatic/pix-automatic-state-machine), documentação oficial, consultada em 2026-07-14.
[^woovi-api]: Woovi, [Referência da API: assinaturas](https://developers.woovi.com/en/api-redoc), documentação oficial, consultada em 2026-07-14.
[^woovi-signature]: Woovi, [Validando Webhook payload usando x-webhook-signature](https://developers.woovi.com/en/docs/webhook/seguranca/webhook-signature-validation), documentação oficial, consultada em 2026-07-14.
[^woovi-retry]: Woovi, [Regras de Retentativa do Webhook](https://developers.woovi.com/docs/webhook/webhook-retry), documentação oficial, consultada em 2026-07-14.
[^woovi-webhook]: Woovi, [Webhook de Boleto pago](https://developers.woovi.com/docs/boleto/boleto-webhook), documentação oficial usada aqui somente para contrato geral de entrega, assinatura e deduplicação, consultada em 2026-07-14.
