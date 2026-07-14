# Dependências externas, jurisdição e escopo

**Status:** rascunho de descoberta, **não normativo**.

## Dependências de provider encontradas

| Dependência | Uso observado | Regra que não pode ser assumida |
| --- | --- | --- |
| Google OAuth | Login/cadastro público | disponibilidade, linking e requisitos de consentimento |
| Asaas | reconciliação de billing/webhooks | ordem, retry, status e semântica de refund fora do contrato confirmado |
| Woovi | reconciliação de cobrança PIX/webhooks | ordem, retry, lifecycle e regras de cobrança além do payload confirmado |
| R2/S3 | staging e imagens processadas | CORS, lifecycle, retenção, quota e recuperação de falha em bucket real |
| Inngest | cron/dispatch de jobs | entrega, retry, cron e observabilidade em ambiente real |
| Resend | entrega/eventos de email | retry, retenção e tratamento de falha do provider |
| Neon/Postgres | dados e RLS | role runtime, `BYPASSRLS`, backup e operação promovida |

## Jurisdição ainda necessária

Não há jurisdição confirmada para definir regra fiscal, tributária, contábil, direito de arrependimento, chargeback, prazo de refund, retenção/eliminação de dados ou LGPD operacional. O produto atual é gerencial; vendas e cancelamentos não devem ser tratados como emissão fiscal, recebimento liquidado ou estorno financeiro sem decisão e validação competente.

## Verificação de banco promovido

O repositório declara `DATABASE_URL` e `DATABASE_URL_DIRECT`, mas nenhuma conexão estava exportada na sessão de análise e não havia ferramenta Neon MCP chamável. Por isso, schema, RLS, índices, grants e migrations foram avaliados pelo schema Drizzle, migrations versionadas e testes locais, **não** por metadados live do banco. Essa limitação impede afirmar aderência do ambiente promovido e não deve ser contornada lendo ou expondo credenciais.

## Itens explicitamente fora do escopo atual

Fornecedores, compras, importações, landed cost fiscal, documento aduaneiro, contas a receber, settlement, refund financeiro, checkout self-service e entitlements aplicados não têm módulo operacional confirmado. Eles são lacunas ou futuros domínios, não regras ausentes que possam ser inventadas nesta fase.
