# Regras aprovadas

**Versão:** 1.0.0  
**Status:** normativa aprovada, implementação parcial.  
**Referência:** DEC-BR-001 a DEC-BR-058.

## Identidade, tenancy e acesso

### AUTH-001 — Autenticação pública

O produto DEVE oferecer login e cadastro público somente por Google OAuth. Não DEVE oferecer email/senha, convite público ou segundo método de identidade sem nova decisão. [DEC-BR-001]

### ACCOUNT-001 — Identidade Google e linking

Conta Google DEVE ser identificada por `providerAccountId = sub`, nunca somente por e-mail. Linking implícito por e-mail NÃO PODE ocorrer; colisão de e-mail usa recuperação explícita e auditada. [DEC-BR-059]

### SESSION-001 — Sessão local

Sessão local DEVE expirar após sete dias de inatividade e 30 dias absolutos. Logout encerra a sessão atual; suspensão, encerramento, recuperação de conta e revogação administrativa encerram sessões afetadas. Login, falha relevante, logout e revogação são auditados sem segredo de autenticação. [DEC-BR-059]

### ORG-001 — Organização e membership

Cada pessoa DEVE pertencer a exatamente uma organização e cada organização DEVE ter exatamente um membro `owner` no lançamento. Não há convites, troca de organização, outros papéis de tenant ou gestão de membros. Dados legados incompatíveis exigem migração antes de a restrição ser aplicada. [DEC-BR-002, 030]

### ORG-002 — Acesso operacional e suspensão

Recurso de tenant DEVE pertencer a uma única organização. Usuário só PODE operar sua própria membership. Acesso exige sessão válida, organização ativa e entitlement aplicável; papel de plataforma nunca concede papel de tenant. Suspensão administrativa é distinta de billing, bloqueia todo acesso e mutação, não redireciona para onboarding e só é alterada por ação de plataforma auditada. [DEC-BR-003, 043, 053]

### RBAC-001 — Owner e suporte de plataforma

No tenant de usuário único, `owner` não possui privilégios adicionais além do soft delete final de produto. Suporte de plataforma NÃO PODE impersonar o owner nem criar sessão de tenant; usa somente painéis administrativos necessários e audita leituras sensíveis e mutações. [DEC-BR-004, 026, 048]

### TIME-001 — Tempo operacional

`America/Sao_Paulo` DEVE definir toda data de negócio sem horário, período de meta, virada de quota e job temporal no lançamento. Timestamps de auditoria permanecem timestamps; expansão para outro timezone requer decisão nova. [DEC-BR-037, 049]

### REPORT-002 — Escopo do dashboard

Todo indicador do painel principal DEVE respeitar o intervalo selecionado. Histórico somente PODE aparecer em seção própria e rotulada. Métricas históricas usam snapshots e não dependem de produto vivo; archive/soft delete não altera histórico econômico. [DEC-BR-061]

## Planos, billing e comunicação

### PLAN-001 — Catálogo comercial

O catálogo inicial possui somente Free e um plano pago mensal de R$49,90. Não há plano anual, boleto ou PIX avulso. Nova organização inicia Free ativo, sem pagamento. [DEC-BR-005, 010, 024, 025]

### ENTITLEMENT-001 — Quotas

Free e pago mantêm os módulos operacionais, diferenciados por quota. Free permite 50 produtos cadastrados, incluindo arquivados, uma imagem por produto de até 5 MiB e uma meta ativa. Pago permite 250 produtos cadastrados, até cinco imagens por produto de até 5 MiB e até três metas ativas, no máximo uma por métrica. Arquivar não reduz quota; soft delete elegível reduz. Não há quota mensal de vendas nem quota global de storage no lançamento. [DEC-BR-006 a 009, 013, 014, 017, 018, 021, 031, 058]

### SUB-001 — Inadimplência, cancelamento e encerramento

Pagamento falho mantém acesso pago integral por sete dias; depois o tenant DEVE migrar automaticamente ao Free sem apagar dados. Se estiver acima de 50 produtos cadastrados, preserva consulta e bloqueia vendas/estoque até voltar ao limite por soft delete elegível. Pagamento confirmado reativa o pago automaticamente. Cancelamento voluntário migra ao Free ao fim do período já pago. [DEC-BR-011, 012, 015, 016, 019]

O relógio de período/tolerância DEVE ser persistido, durável e idempotente; webhook apenas reconcilia evento válido mais novo. Encerrar organização paga bloqueia acesso imediatamente e solicita cancelamento da renovação, sem refund automático; falha do provider entra em retry/suporte, sem reativar acesso. [DEC-BR-044, 052]

### PAY-001 — Checkout e providers

Upgrade é self-service após checkout e confirmação confiável. Asaas trata cartão recorrente; Woovi trata PIX automático/recorrente. Ambos são escopo de lançamento, mas PIX recorrente Woovi permanece bloqueado até validação documental, contratual e em sandbox. [DEC-BR-020, 028, 029]

### BILLING-001 — Eventos e avisos

Webhooks DEVEM recuperar falha pós-captura de modo durável até sucesso ou revisão. Eventos fora de ordem só PODEM aplicar transição válida usando data/versão persistida e nunca podem regredir estado mais novo. Lifecycle comercial DEVE enviar email transacional ao owner e expor estado no app; avisos são idempotentes, auditáveis e não definem acesso. [DEC-BR-034, 035, 050]

### EVENT-004 — Operação de jobs

Billing e webhooks DEVEM usar até cinco tentativas em 24 horas, com backoff/jitter, serialização por organização, alerta e revisão manual ao esgotar. Imagens usam até três tentativas e no máximo duas execuções por organização; falha terminal exige diagnóstico redigido e fila de revisão. [DEC-BR-062]

### EMAIL-002 — Estado de entrega de e-mail

`email_messages` DEVE refletir `pending`, `accepted`, `delivered`, `failed`, `bounced` ou `suppressed` por evento idempotente e ordenado do provider. Retry automático de mensagem transacional só é permitido antes de existir `provider_message_id`, até três vezes em 24 horas. [DEC-BR-063]

## Catálogo, imagens e estoque

### PRODUCT-001 — Produto e remoção

Preço, custo e saldo NÃO PODEM ser negativos. Produto arquivado NÃO PODE ser vendido. Entrada atualiza custo médio, saldo e pode reativar produto arquivado. Soft delete é final, exclusivo de owner, exige estoque zero, confirmação, motivo e auditoria; remove o item da operação normal sem apagar histórico/auditoria. [DEC-BR-021 a 023, 026, 027, 054]

### IMAGE-001 — Imagens

Imagens aceitam somente JPEG, PNG ou WebP, até 5 MiB por arquivo. Free permite uma e pago até cinco por produto. Ao soft delete ou encerramento, arquivos e variantes DEVEM sair da operação e só PODEM ser apagados de forma verificável conforme retenção aprovada. [DEC-BR-013, 018, 051, 058]

### STOCK-001 — Movimentos e repetição

Toda alteração de saldo, inclusive venda e cancelamento, DEVE produzir movimento no mesmo ledger rastreável. Entrada e baixa manuais são transacionais, auditadas e usam chave idempotente persistida por tenant; repetir a mesma chave devolve o resultado original, sem novo movimento. [DEC-BR-033, 036, 045, 054]

## Vendas e metas

### SALE-001 — Venda e cancelamento

Venda DEVE usar itens únicos, quantidade positiva, snapshots de preço/custo e baixa atômica de estoque. Venda concluída é snapshot econômico imutável. A única reversão é `completed → cancelled`, que recompõe somente estoque; não há edição, reativação, exclusão, refund, estorno financeiro, contas a receber ou settlement no lançamento. [DEC-BR-032, 047, 055]

### SALE-002 — Cálculo monetário

PIX NÃO PODE parcelar nem possuir taxa. Cartão aceita 1 a 12 parcelas e taxa do vendedor ou cliente. Servidor DEVE calcular subtotal de itens, frete, adicional, desconto, total e valor cobrado com precisão decimal e arredondamento monetário; total negativo é proibido. Reconciliação DEVE detectar divergência persistida. [DEC-BR-047, 056]

### GOAL-001 — Metas

Meta nasce `active`; conclui ao atingir alvo, expira ao terminar período ou pode ser arquivada. Apenas `archived` volta a `active`; `completed` e `expired` não reativam. Resolução automática DEVE usar transição condicional/transacional a partir de `active` e nunca sobrescrever mudança concorrente. [DEC-BR-014, 031, 046, 057]

## Privacidade, auditoria e encerramento

### AUDIT-001 — Auditoria obrigatória

Mutações de produto, estoque, venda, meta, plano, billing, soft delete, permissões e ações administrativas críticas DEVEM falhar se não conseguirem gravar auditoria transacional. [DEC-BR-036]

### ADMIN-002 — Grants e dados de suporte

Somente platform owner ativo PODE gerir grants temporários, sempre com motivo, expiração e auditoria. Suporte vê PII somente quando necessária a um caso, com motivo e auditoria de leitura; tokens, payloads brutos e segredos nunca são exibidos. [DEC-BR-060]

### PRIVACY-001 — Solicitações, retenção e incidentes

Solicitações de titulares entram somente por suporte, com verificação manual e trilha rastreável. Encerramento desativa acesso/operação imediatamente; não promete hard delete imediato. Não existe purge automático definitivo antes de tabela validada por categoria, fundamento, prazo, acesso em retenção e destino final. [DEC-BR-038 a 040]

Incidente confirmado de dados pessoais DEVE seguir runbook, responsável, contenção, registro e comunicação regulatória aplicável. Mapa de papéis, categorias, compartilhamentos, aviso e contrato é gate de lançamento público. [DEC-BR-041, 042]
