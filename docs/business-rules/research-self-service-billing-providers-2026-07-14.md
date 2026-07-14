# Pesquisa: provedores para upgrade pago self-service

**Estado:** rascunho de descoberta, não normativo.  
**Acesso às fontes:** 14 de julho de 2026.  
**Escopo:** documentação pública oficial de Asaas e Woovi. Esta nota registra capacidades documentadas; não aprova provedor, fluxo, contrato ou regra de entitlement.

## Asaas

### Confirmado na documentação oficial

- O Asaas Checkout é uma página hospedada pelo provedor. A API cria o checkout, devolve um link para o pagador e aceita `RECURRENT` para cobrança recorrente. Nesse tipo, o objeto `subscription` é obrigatório. [Asaas Checkout](https://docs.asaas.com/docs/asaas-checkout)
- O exemplo oficial de checkout recorrente usa cartão e declara que, após a conclusão, cria uma assinatura com cobranças mensais automáticas (ou no ciclo selecionado), sem o cliente repetir o pagamento. Portanto, a documentação confirma um caminho de upgrade self-service recorrente hospedado pelo Asaas. [Checkout with Subscription (Recurring)](https://docs.asaas.com/docs/checkout-with-subscription-recurring)
- A criação do checkout não confirma o pagamento. O próprio Asaas orienta reconciliar pelo `externalReference` e usar webhooks para o estado financeiro; URLs de retorno são apenas navegação. [Asaas Checkout](https://docs.asaas.com/docs/asaas-checkout)
- Há eventos de checkout `CHECKOUT_CREATED`, `CHECKOUT_CANCELED`, `CHECKOUT_EXPIRED` e `CHECKOUT_PAID`; há também eventos próprios de assinatura. A entrega é *at least once*, logo o identificador do evento precisa ser idempotente. [Events for Checkout](https://docs.asaas.com/docs/checkout-events) [Events for subscriptions](https://docs.asaas.com/docs/subscription-events)
- Para o webhook geral, o Asaas documenta retentativas automáticas após falha, até 15 falhas consecutivas, e token configurável entregue no header `asaas-access-token`. A configuração pode escolher entrega sequencial ou não sequencial. [Webhooks FAQ](https://docs.asaas.com/docs/webhooks-faq) [Create new Webhook](https://docs.asaas.com/reference/create-new-webhook)

### Não confirmado por esta pesquisa

- Não confirma que o fluxo atual do repositório já crie checkout, registre `externalReference`, trate todos os eventos ou aplique entitlement após a confirmação. A análise de código anterior aponta o contrário.
- Não foi determinada aqui a elegibilidade comercial, tarifas, limites de conta, disponibilidade de métodos de pagamento para uma conta específica, nem a política contratual para recorrência.
- A documentação não escolhe qual evento do provedor deve significar, para o produto, “reativar pago”, “iniciar os 7 dias” ou “fazer downgrade”. Isso continua decisão de regra de negócio.

## Woovi

### Confirmado na documentação oficial

- A documentação de Checkout mostra que uma cobrança criada por checkout traz `paymentLinkID`, `paymentLinkURL`, `correlationID` e o evento `woovi:CHARGE_CREATED`; esses identificadores permitem associação com um registro interno. [Checkout: identificar cobrança por webhook](https://developers.woovi.com/docs/checkout/checkout-how-to-identify-a-charge-created-by-checkout-via-webhook)
- A documentação expõe webhooks para cobrança paga e expirada. O exemplo de integração para paga orienta usar `charge.correlationID` para localizar o registro interno e marcar seu estado como pago. [Recebendo webhooks no Laravel](https://developers.woovi.com/docs/sdk/php/frameworks/laravel/sdk-php-laravel-receiving-webhooks) [Webhook de cobrança expirada](https://developers.woovi.com/docs/charge/webhook/charge-webhook-example-charge-expired)
- Para falhas de entrega, a Woovi documenta oito tentativas, com intervalos exponenciais, e possibilidade de retentativa manual após o esgotamento. [Regras de retentativa do Webhook](https://developers.woovi.com/docs/webhook/webhook-retry)
- Há um exemplo oficial do SDK PHP para criar `subscription` com valor, cliente e `dayGenerateCharge`. Ele prova que a documentação pública expõe criação programática de assinatura nesse SDK. [SDK PHP: recursos](https://developers.woovi.com/docs/sdk/php/sdk-php-resources)

### Não confirmado por esta pesquisa

- Não foi encontrada uma página oficial que confirme checkout self-service hospedado **para assinatura recorrente**, incluindo método de pagamento, autorização inicial, renovação automática e página de retorno. Checkout/pagamento por link e criação programática de assinatura são documentados separadamente; tratá-los como um único fluxo recorrente seria inferência.
- Não foi encontrada, no escopo consultado, uma especificação oficial de eventos de ciclo de vida da assinatura (criada, renovada, vencida, cancelada) equivalente à documentação de checkout/charge.
- Não foi confirmado mecanismo de autenticação/verificação do webhook, nem semântica completa de ordenação e duplicidade. As retentativas documentadas tornam processamento idempotente necessário, mas não provam os demais aspectos.

## Consequência factual para a decisão pendente

- Asaas: a documentação pública confirma os elementos necessários para um upgrade recorrente self-service hospedado, desde que a integração própria implemente a criação, correlação e reconciliação por webhook.
- Woovi: a documentação pública confirma checkout/links e eventos de cobrança, além de criação de assinatura por SDK, mas **não confirma** neste levantamento um fluxo recorrente self-service completo. Exige confirmação específica com a Woovi ou documentação primária adicional antes de ser assumido como equivalente ao Asaas.

## Limites

- Fontes públicas podem mudar e não substituem sandbox, contrato, configuração da conta nem validação de integração.
- Nenhuma conclusão desta nota altera o comportamento atual do sistema nem autoriza implementação.
