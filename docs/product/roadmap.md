---
execution_status: superseded
superseded_by:
  - ../../PRODUCT.md
  - ../business-rules/normative/approved-rules.md
  - ../../plans/fundacao-polaris-erp.md
---

# Roadmap pos-MVP

> **Não executar.** As prioridades, estados e critérios abaixo pertencem a um roadmap anterior e não representam compromissos aprovados nem estado atual do produto.

## Reconciliação vigente

- A intenção do produto e os limites do lançamento estão em [`PRODUCT.md`](../../PRODUCT.md) e em [`SCOPE-001`](../business-rules/normative/approved-rules.md). A ordem de execução da fundação está no [plano atual](../../plans/fundacao-polaris-erp.md); não há uma ordem aprovada para as ideias pós-lançamento listadas abaixo.
- Convites, múltiplos membros e papéis de tenant além de `owner` não fazem parte do lançamento aprovado (`ORG-001`). Colaboração futura exige descoberta e nova decisão (`SCOPE-001`); “not-started” não deve ser interpretado como falha de implementação.
- O contrato aprovado de billing é Free e um plano pago mensal de R$ 49,90, sem trial (`PLAN-001`). Isso define o comportamento alvo, não a implementação: consulte a [aderência registrada](../business-rules/normative/adherence.md), cuja avaliação de código é um snapshot e precisa ser revalidada antes de afirmar o estado atual.
- Suporte de plataforma não pode impersonar o owner nem criar sessão de tenant (`RBAC-001`). Use os [gates de prontidão](../operations/production-readiness.md) para evidência operacional; uma menção antiga a E2E, RLS, restore ou provider não comprova progresso nem configuração atual.
- Exportação e relatórios avançados permanecem ideias sem prioridade aprovada. Contas a receber, refund financeiro e settlement de vendas estão fora do lançamento (`SALE-001`); qualquer expansão precisa de definição e validação próprias.

---

> **Conteúdo legado preservado abaixo — histórico, não executar.** As propostas podem servir como contexto, mas não estão aprovadas por aparecerem neste arquivo.

## Objetivo

Este roadmap separa funcionalidades de produto que nao devem bloquear o hardening inicial descrito em [prs.md](../reports/prs.md) e no [resumo executivo.md](../reports/resumo-executivo.md).

Antes de abrir producao self-serve, priorize PR 2, PR 3, PR 5, PR 6 e PR 7. Os itens abaixo entram depois que seguranca, integridade financeira, E2E isolado e operacao basica estiverem verificados.

## Status atual

| Item | Status | Evidência atual |
| --- | --- | --- |
| Convites e multiusuario | not-started | Fluxos permanecem deliberadamente desativados até a cobertura comportamental de grants e RLS. |
| Billing e planos | partial | Assinaturas, admin manual e intake de webhooks existem; materialização Woovi e certificação de provider continuam pendentes. |
| Exportação de dados | not-started | Nenhum fluxo de exportação foi implementado. |
| Admin e suporte interno | partial | `apps/admin` e auditoria de plataforma existem; E2E de roles e certificação RLS ainda estão em andamento. |
| LGPD, privacidade e retenção | partial | Runbooks de limpeza e restore existem; portabilidade e retenção de produto ainda não foram implementadas. |
| Relatórios avançados e recebimentos | not-started | Analytics atuais cobrem operação, não recebíveis consolidados. |

## Principios de corte

- Nao misturar features comerciais com correcoes de seguranca, dados ou multi-tenancy.
- Cada item deve virar PR proprio, com Vitest e/ou Playwright conforme risco.
- Billing, suporte/admin e convites reais exigem revisao de permissao e auditoria antes de release.
- Exportacao e LGPD precisam preservar isolamento por organizacao e deixar trilha operacional.

## Ordem recomendada

### 1. Convites e multiusuario

Objetivo: permitir que uma organizacao tenha mais de um operador sem reabrir riscos de tenant.

Escopo inicial:
- convite por email com expiracao;
- aceite autenticado;
- roles `owner`, `admin` e `operator`;
- tela simples para listar membros e revogar acesso.

Aceite:
- usuario de outra organizacao nao consegue aceitar convite indevido;
- revogacao bloqueia sessoes futuras do membro removido;
- auditoria registra convite, aceite, troca de role e revogacao.

### 2. Billing e planos

Objetivo: sustentar uso comercial sem acoplar regras de cobranca aos fluxos de estoque/venda.

Escopo inicial:
- plano free/pago ou trial;
- status de assinatura na organizacao;
- bloqueio amigavel para limites excedidos;
- webhooks idempotentes do provedor de pagamento.

Aceite:
- webhook duplicado nao altera estado duas vezes;
- organizacao inadimplente nao perde acesso aos dados;
- owner consegue ver status do plano e proxima acao.

### 3. Exportacao de dados

Objetivo: permitir saida operacional e portabilidade basica.

Escopo inicial:
- exportar produtos, estoque, vendas e categorias em CSV;
- filtro por periodo para vendas;
- job assincrono se o volume crescer.

Aceite:
- arquivo contem apenas dados da organizacao atual;
- export de vendas preserva snapshots de preco/custo;
- eventos de exportacao entram em auditoria.

### 4. Admin e suporte interno

Objetivo: dar suporte sem acesso irrestrito e invisivel aos dados de clientes.

Escopo inicial:
- painel interno separado do app operacional;
- busca por organizacao;
- impersonation somente com justificativa e expiracao;
- logs de acesso administrativo.

Aceite:
- nenhuma acao admin acontece sem auditoria;
- suporte nao consegue mutar estoque/vendas sem permissao explicita;
- acesso administrativo e separado do usuario comum.

### 5. LGPD, privacidade e retencao

Objetivo: formalizar direitos de usuario e operacao de dados pessoais.

Escopo inicial:
- politica de privacidade;
- exportacao dos dados da organizacao;
- processo de exclusao/anonimizacao;
- retencao de auditoria e backups documentada.

Aceite:
- exclusao nao quebra integridade financeira;
- dados pessoais sao removidos ou anonimizados conforme politica;
- operacao de exclusao tem checklist e aprovacao.

### 6. Relatorios avancados e recebimentos

Objetivo: evoluir analytics sem comprometer as regras financeiras ja validadas.

Escopo inicial:
- recebiveis por forma de pagamento;
- lucro por periodo/categoria/produto;
- relatorio de giro de estoque;
- exportacao dos relatorios.

Aceite:
- numeros batem com snapshots de venda e estoque;
- cancelamentos sao tratados explicitamente;
- relatorios grandes nao bloqueiam a UI.

## Fora de escopo ate o MVP estabilizar

- marketplace publico;
- integracao com ERP externo;
- importacao em massa sem rollback;
- permissoes customizadas por campo;
- automacao fiscal.

Esses itens podem entrar depois, mas exigem specs proprias e validacao de risco separada.
