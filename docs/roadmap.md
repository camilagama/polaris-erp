# Roadmap pos-MVP

## Objetivo

Este roadmap separa funcionalidades de produto que nao devem bloquear o hardening inicial descrito em [prs.md](./prs.md) e no [Resumo executivo.md](./Resumo%20executivo.md).

Antes de abrir producao self-serve, priorize PR 2, PR 3, PR 5, PR 6 e PR 7. Os itens abaixo entram depois que seguranca, integridade financeira, E2E isolado e operacao basica estiverem verificados.

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
