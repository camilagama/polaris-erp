# Decisões por waves de pesquisa

**Status:** decisões aprovadas pelo responsável de produto em 2026-07-14.  
**Método:** cada wave parte de achados do repositório e de fontes primárias; a decisão local não substitui gate contratual, jurídico ou de ambiente.

## Wave 1 — Billing recorrente

### DEC-BR-064 — Estratégia de providers

**Decisão:** Asaas processa somente cartão recorrente; Woovi processa somente PIX Automático. O produto mantém um núcleo interno de assinatura, entitlement e lifecycle, com adaptadores, validação de webhook e reconciliação próprios por provider.

**Justificativa:** o Checkout recorrente do Asaas cobre cartão; a Woovi documenta autorização, estados, cancelamento e retentativas de PIX Automático. Pix convencional recorrente por fatura não é débito automático.

**Gate:** sandbox, conta/contrato, eventos autenticados, eventos duplicados/falhos/fora de ordem, cancelamento e recuperação ponta a ponta.

### DEC-BR-065 — Revogação de PIX Automático

**Decisão:** a revogação recebida do banco ou provider impede a próxima renovação, mas não reduz acesso antes do fim do período confirmado. No vencimento, o domínio interno executa cobrança, tolerância de sete dias e downgrade para Free, salvo confirmação válida posterior.

**Justificativa:** separa autorização de cobrança e preserva acesso já adquirido, sem delegar a regra de acesso ao provider.

### DEC-BR-066 — Indisponibilidade de PIX Automático

**Decisão:** enquanto PIX Automático não estiver elegível, homologado ou saudável, o checkout oculta esse meio e mantém cartão recorrente. O produto não oferece PIX manual mensal como se fosse recorrência.

**Justificativa:** preserva a promessa comercial e evita criar um segundo lifecycle de cobrança manual.

### DEC-BR-067 — Estornos excepcionais

**Decisão:** qualquer estorno de assinatura é uma exceção manual, executada por responsável de plataforma, com motivo, autoridade, resultado do provider e auditoria. Não há automação, endpoint público ou SLA comercial antes de política jurídica/financeira aprovada.

**Justificativa:** a API do provider torna o estorno possível, mas não define direito do consumidor, critério financeiro ou procedimento fiscal.

## Fontes

- [Pesquisa de providers](research-billing-provider-gates-2026-07-14.md)
- [Registro de decisões](decision-register.md)

## Wave 2 — Modelo operacional e integridade

### DEC-BR-068 — Organização individual no lançamento

**Decisão:** o lançamento atende uma pessoa por organização, que é o único `owner`. Convites, membros adicionais e papéis colaborativos não fazem parte do contrato inicial; os tipos legados não representam capacidade de produto enquanto essa decisão vigorar.

**Justificativa:** elimina o conflito entre papéis existentes e a regra de uma única pessoa, reduz superfície de autorização e adia colaboração até haver valor e fluxo de gestão completos.

### DEC-BR-069 — Excedente após downgrade para Free

**Decisão:** organização em Free com mais de 50 produtos cadastrados mantém consulta, mas não pode concluir venda nem movimentar estoque até reduzir o catálogo por remoção lógica definitiva ou reativar o plano pago.

**Justificativa:** o limite mede produtos cadastrados, incluindo arquivados. Manter operação sobre excedente invalidaria o limite aprovado; exclusão automática não é permitida.

### DEC-BR-070 — Remoção lógica definitiva

**Decisão:** a remoção lógica sai da operação diária, preserva histórico, vendas e auditoria, e não é restaurável. A UX e a documentação não devem chamá-la de lixeira ou prometer recuperação.

**Justificativa:** permite reduzir quota sem destruir evidência econômica. O armazenamento físico de imagens continua subordinado à tabela de retenção.

### DEC-BR-071 — Integridade econômica de venda

**Decisão:** o serviço transacional autorizado é o único escritor de vendas e itens. O banco aplica invariantes locais e privilégios de escrita; um reconciliador detecta divergências de totais, itens, snapshots e taxas. Não se cria trigger que recalcule toda a venda como fonte primária.

**Justificativa:** `CHECK` não valida relações entre tabelas no PostgreSQL, enquanto triggers amplas aumentam acoplamento e tornam correções operacionais opacas. Serviço transacional, mínimo privilégio e reconciliação oferecem proteção proporcional e auditável.

## Fontes adicionais

- [Documentação PostgreSQL sobre constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)

## Wave 3 — Privacidade, retenção e incidentes

### DEC-BR-072 — Papéis de tratamento por finalidade

**Decisão:** a plataforma é controladora para conta, autenticação, billing, segurança e suporte. Para dados de clientes que o tenant inserir no serviço, a posição inicial é de operadora, conforme instruções contratuais do tenant. A classificação é por tratamento e deve ser validada com jurídico antes de lançamento público.

**Justificativa:** controlador e operador dependem da finalidade e dos meios essenciais de cada operação; uma classificação única para todo o SaaS seria imprecisa.

### DEC-BR-073 — Pedidos de titulares

**Decisão:** pedidos entram em suporte manual com identidade verificada, responsável, trilha de auditoria e separação do controlador aplicável. O procedimento cobre confirmação/acesso, exportação, correção, eliminação quando cabível e negativa fundamentada por retenção, respeitando os prazos legais.

**Justificativa:** um portal self-service sem segregação por tenant e sem exceções de retenção criaria exposição indevida.

### DEC-BR-074 — Retenção e eliminação

**Decisão:** nenhum hard delete automático é permitido antes de tabela validada por categoria de dado. A plataforma aplica legal hold, mínimo acesso e minimização enquanto a tabela não estiver aprovada.

**Justificativa:** a LGPD prevê eliminação com exceções legais; prazos empresariais e fiscais dependem da categoria, regime e jurisdição aplicável.

### DEC-BR-075 — Resposta a incidentes

**Decisão:** lançamento público exige um Privacy Lead e um Incident Commander, com suplentes nomeados, runbook exercitado, evidência preservada e controle do prazo regulatório de três dias úteis para incidente qualificável.

**Justificativa:** providers podem apoiar a investigação, mas não substituem a responsabilidade do controlador.

## Fontes adicionais

- [Pesquisa de gates legais](research-lgpd-retention-legal-gates-2026-07-14.md)
- [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- [Comunicação de incidente — ANPD](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis)

## Wave 4 — Ambiente promovido, jobs, imagens e e-mail

### DEC-BR-076 — Gate de release público

**Decisão:** release público fica bloqueado até haver prova datada de RLS, backup/restore, jobs/cron, dead-letter, domínio e webhooks de e-mail, R2/CORS/lifecycle e OAuth. Preview ocorre somente em ambiente isolado, com dados sintéticos.

### DEC-BR-077 — Conexões de banco e RLS

**Decisão:** a aplicação tenant-facing usa role sem `BYPASSRLS`. Conexões privilegiadas ficam restritas a migrations e jobs explicitamente identificados. Antes de migration destrutiva ou reversão de schema, backup e restore são exercitados.

### DEC-BR-078 — Revisão de replays sensíveis

**Decisão:** suporte/operator pode investigar e solicitar retry. Replay que pode alterar billing ou entitlement requer aprovação prévia de platform owner, motivo e auditoria.

### DEC-BR-079 — Isolamento e lifecycle de objetos

**Decisão:** produção e preview usam buckets ou credenciais isolados; CORS admite somente origem exata; staging expira após 24 horas. Objetos finais seguem a tabela de retenção e legal hold aplicáveis.

### DEC-BR-080 — Reenvio após eventos de e-mail

**Decisão:** a aceitação pelo provider encerra o retry automático. Falha, bounce ou suppression não geram novo envio automático; uma correção posterior exige nova comunicação manual, com motivo e auditoria.

## Fontes adicionais

- [Pesquisa de confiabilidade operacional](research-operational-reliability-2026-07-14.md)
- [Inngest — controles de fluxo](https://www.inngest.com/docs/guides/flow-control)
- [Neon — execução de RLS](https://neon.com/docs/guides/rls-query-execution)

## Wave 5 — UX resiliente, observabilidade e fronteira de escopo

### DEC-BR-081 — Experiência de suspensão administrativa

**Decisão:** suspensão administrativa exibe tela própria de acesso restrito, sem redirecionar para onboarding. A mensagem não expõe dado sensível e indica o canal de suporte; reativação restaura o fluxo normal.

### DEC-BR-082 — Recuperação de mutação em rede instável

**Decisão:** UI não repete automaticamente comando de estoque, venda, billing, remoção ou outra mutação crítica. Ela mantém estado pendente, consulta o resultado e reusa chave idempotente persistida quando o usuário retoma o comando.

### DEC-BR-083 — Telemetria redigida

**Decisão:** observabilidade usa eventos estruturados, IDs internos de correlação e alertas para billing, jobs, RLS, storage e e-mail. Payload bruto, tokens e PII que não sejam estritamente necessários não entram em logs ou métricas.

### DEC-BR-084 — Ficha e aderência individuais

**Decisão:** toda regra normativa deve ter ficha individual, sem agrupamento substitutivo, que registre pré-condição, comportamento, negação, estados, efeitos, integridade, auditoria, UI/API/job, aderência, testes e gates.

### DEC-BR-085 — Limite do lançamento

**Decisão:** o lançamento cobre organização individual, catálogo, estoque, vendas operacionais, metas, billing e suporte. Colaboração, fornecedores/compras, importação fiscal, refund financeiro de vendas e novas integrações permanecem fora de escopo até descoberta e decisão próprias.
