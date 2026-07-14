# Questões abertas de regras de negócio

**Status:** rascunho de descoberta, **não normativo**.  
**Regra de uso:** uma decisão só muda para aprovada após resposta explícita do responsável por produto. Evidência e recomendação não equivalem a aprovação. A partir de 2026-07-14, decisões independentes podem ser debatidas em lote; itens com dependência material continuam identificados.

## Pacote 1: identidade, acesso e tenancy

### Contexto confirmado

- Google é o único login/cadastro público; email/senha foi desabilitado. `packages/auth/src/auth.ts:140`.
- Onboarding cria organização `active`, membership `owner`, defaults de catálogo, customer e subscription `incomplete`. `apps/web/src/features/onboarding/server.ts:48`, `:125`.
- Acesso operacional exige sessão, membership, org ativa e subscription `active`. `apps/web/src/lib/app-session.ts:126`, `:195`.
- Gestão de membership, convite, papel e troca de organização está bloqueada na política da aplicação. `packages/auth/src/workspace-management-policy.ts:3`.
- O schema admite múltiplas memberships por usuário, embora o plugin limite a uma e a aplicação escolha a primeira quando não há organização ativa. `packages/db/src/schema.ts:122`, `apps/web/src/lib/app-session.ts:63`.

### Contradições

- `docs/product/01-regras-de-negocio.md:31` menciona email/senha e Google, mas o mesmo documento depois declara Google público e o código desabilita senha.
- O documento antigo se descreve como self-serve e sem billing, enquanto o acesso atual depende de ativação manual de subscription. Isto será debatido no pacote de billing, não é decisão deste pacote.

### Lacunas e riscos

- Suspensão de organização devolve contexto nulo; o redirecionamento para onboarding pode voltar a `/` sem resolver a condição, formando loop. `apps/web/src/lib/app-session.ts:148`, `apps/web/src/features/onboarding/server.ts:61`.
- Nenhuma capacidade exclusiva de `owner` foi localizada, apesar da hierarquia no helper de permissão.
- Dados legados com mais de uma membership não têm comportamento de produto definido.

### Regras sem controvérsia a confirmar em bloco

1. O sistema não deve conceder acesso operacional sem sessão, membership, organização ativa e assinatura ativa.
2. Papéis de plataforma não concedem automaticamente papel dentro do tenant, e vice-versa.
3. Gestão de workspace não é atualmente uma capacidade de usuário do tenant.

## Decisões propostas

### DEC-BR-001 — Autenticação pública

- **Pergunta:** o login/cadastro público deve continuar exclusivamente por Google OAuth?
- **Motivo da decisão:** define recuperação de conta, suporte, superfície de credenciais e documentação do produto.
- **Comportamento atual:** email/senha está desabilitado; Google cria ou acessa conta.
- **Problema identificado:** documentação contraditória pode induzir implementação ou suporte incorretos.
- **Opção A:** oficializar Google-only e substituir a regra documental antiga.
- **Opção B:** reintroduzir email/senha como segundo método.
- **Opção C:** bloquear novos cadastros públicos e usar convite/aprovação futura.
- **Recomendação:** A. É o único fluxo implementado e não cria uma segunda superfície de recuperação/credenciais antes de haver necessidade de produto.
- **Vantagens:** menos suporte, menor superfície de ataque, sem migração de contas.
- **Desvantagens:** depende de Google e exclui usuários sem essa identidade.
- **Impacto técnico:** A exige documentação e teste de regressão; B exige verificação, reset, linking e prevenção de conflito de identidade; C exige domínio de convite ainda inexistente.
- **Impacto para o usuário:** A tem menor escolha; B amplia entrada; C restringe aquisição.
- **Impacto em dados existentes:** A não migra dados; B exige considerar e-mails de contas OAuth existentes.
- **Impacto em segurança:** B introduz senha, reset e abuso de cadastro; A concentra o risco no OAuth.
- **Impacto financeiro:** A reduz custo de suporte; C pode reduzir aquisição.
- **Migração necessária:** nenhuma para A; modelagem e migração operacional para B/C.
- **Testes necessários:** E2E de login, cadastro, account linking e rotas de erro; para B, reset/verificação/abuso.
- **Minha resposta:** Opção A: oficializar Google-only e substituir a regra documental antiga.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-002 — Modelo de workspace do usuário

- **Pergunta:** uma pessoa deve poder pertencer a mais de uma organização?
- **Motivo da decisão:** determina resolução de sessão, UI de troca, isolamento, suporte e futuras permissões.
- **Comportamento atual:** política bloqueia convites/membership/troca; app espera uma membership; banco permite várias.
- **Problema identificado:** o modelo aplicado e o modelo permitido pelo banco divergem para dados legados ou escrita privilegiada.
- **Opção A:** produto de uma organização por usuário; reforçar a restrição no banco depois de tratar dados existentes.
- **Opção B:** multi-organização; implementar seletor e troca explícita de contexto, autorização e testes cross-tenant.
- **Opção C:** manter banco permissivo, mas documentar uma membership como contrato apenas do app.
- **Recomendação:** A enquanto o produto for uma ferramenta para o negócio individual. B só quando colaboração entre organizações for requisito concreto; C preserva a ambiguidade atual.
- **Vantagens:** A simplifica UX e isolamento; B suporta contador/equipe que opera negócios distintos.
- **Desvantagens:** A bloqueia esse caso de uso; B amplia todas as superfícies tenant-scoped; C é difícil de auditar.
- **Impacto técnico:** A cria constraint/migração; B altera sessão, navegação, query context e auditoria.
- **Impacto para o usuário:** A reduz escolhas; B requer seleção explícita para evitar operar no tenant errado.
- **Impacto em dados existentes:** A exige identificar memberships múltiplas; B preserva-as e exige migração de sessão.
- **Impacto em segurança:** B aumenta risco de tenant errado; A diminui-o.
- **Impacto financeiro:** B aumenta custo de suporte/testes; A pode limitar ICP futuro.
- **Migração necessária:** A sim, se existirem múltiplas memberships; B sim, para state de sessão e UI.
- **Testes necessários:** concorrência de onboarding, resolução de contexto, autorização cross-tenant e E2E de troca se B.
- **Minha resposta:** Opção A: produto de uma organização por usuário; reforçar a restrição no banco depois de tratar dados existentes.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-003 — Organização suspensa

- **Pergunta original:** qual experiência e autorização se aplicam a membro de organização suspensa?
- **Reenquadramento:** a resposta de produto indica que o não pagamento não deve ser resolvido por suspensão administrativa. Ele deve fazer a organização migrar para um plano Free, cujos entitlements e transição ainda serão debatidos no pacote de billing.
- **Motivo da decisão:** a suspensão administrativa e a restrição comercial são estados distintos. Misturá-los faria uma falta de pagamento parecer bloqueio disciplinar/operacional e impediria uma experiência Free deliberada.
- **Comportamento atual:** contexto nulo pode redirecionar a onboarding, que retorna para `/` sem reativar a organização.
- **Problema identificado:** o modelo atual só conhece “acesso total quando `active`” ou “sem contexto”; `entitlements` do plano não participam da autorização.
- **Direção registrada:** quando o cliente não mantiver o pagamento, ele deve passar ao plano Free, com capacidades reduzidas a definir. Esta direção substitui a resposta anterior de “leitura limitada” como base para cobrança.
- **O que permanece pendente:** gatilho da migração, período de tolerância, reversão após pagamento, dados históricos acessíveis, limites e features do Free, e tratamento de suspensão administrativa real.
- **Status da decisão:** desmembrada. A experiência de não pagamento será definida por DEC-BR-005 em diante; a semântica de suspensão administrativa permanece aberta e não deve ser usada para cobrança.

### DEC-BR-004 — Papel `owner` do tenant

- **Pergunta:** `owner` deve possuir capacidades exclusivas sobre `admin`?
- **Motivo da decisão:** o papel máximo existe, porém não comunica hoje diferença operacional clara.
- **Comportamento atual:** `owner` passa no helper de `organization:delete`; nenhum fluxo de exclusão ou outra ação exclusiva foi localizado.
- **Problema identificado:** uma hierarquia sem semântica explícita gera expectativa errada e privilégio técnico sem produto correspondente.
- **Opção A:** definir owner equivalente a admin até que exista capacidade concreta.
- **Opção B:** reservar para owner ações irreversíveis ou gestão futura de acesso/workspace.
- **Opção C:** remover owner e manter dois papéis.
- **Recomendação:** A por enquanto. B exige primeiro decidir gestão de workspace; C cria migração sem benefício comprovado.
- **Vantagens:** A elimina ambiguidade sem inventar privilégio.
- **Desvantagens:** A preserva um papel com diferença apenas potencial.
- **Impacto técnico:** A é documental/guard; B envolve novas actions e auditoria; C exige migração de members e testes.
- **Impacto para o usuário:** A é simples; B explicita responsabilidade; C reduz papéis.
- **Impacto em dados existentes:** B não migra até introduzir capabilities; C reclassifica owners.
- **Impacto em segurança:** B deve usar confirmação, auditoria e menor privilégio; A não amplia acesso.
- **Impacto financeiro:** baixo em A; suporte/treinamento maior em B.
- **Migração necessária:** nenhuma em A/B inicial; sim em C.
- **Testes necessários:** matriz de permissão e E2E para qualquer ação exclusiva futura.
- **Minha resposta:** Opção A: definir owner equivalente a admin até que exista capacidade concreta.
- **Status da decisão:** aprovada em 2026-07-14.

## Pacote 2: billing, planos e entitlements

### Contexto confirmado

- O onboarding escolhe o plano ativo de menor valor e cria uma subscription `incomplete`. `apps/web/src/features/onboarding/server.ts:65` e `:121`.
- O schema já comporta planos de valor zero e uma lista tipada de entitlements, mas o guard ignora ambos: somente subscription `active` concede acesso. `packages/db/src/schema.ts:482`; `packages/billing/src/index.ts:43`.
- A migration seed cria um único plano pago global, `Polaris Start`, mensal de R$99, com `catalog.products.limit=500` e `support.priority=false`. Esses valores são dados técnicos seedados, não uma definição comercial aprovada, e não são aplicados no runtime. `packages/db/src/migrations/20260710052000_seed_initial_billing_plan.sql`; `packages/billing/src/index.ts:48`.
- Asaas e Woovi atualmente mapeiam cobrança para os estados `active`, `past_due`, `canceled` ou `incomplete`; não existe downgrade para Free, grace period, troca de plano ou decisão temporal no código. `apps/web/src/integrations/{asaas,woovi}/billing-reconciliation.ts`.
- A aplicação atual não tem colaboração/multiusuário operacional, checkout self-service, trial, upgrade, downgrade ou aplicação de entitlement por recurso.
- O roadmap já propõe que organização inadimplente não perca acesso aos dados e enumera “plano free/pago ou trial” como escopo futuro; ele não define níveis, limites ou ciclo de vida. `docs/product/roadmap.md:44`.

### Hipótese de desenho, ainda não aprovada

1. **Free:** plano permanente de continuidade, com limites e features explicitamente definidos.
2. **Plano pago:** acesso às capacidades operacionais completas existentes, enquanto houver pagamento válido.
3. **Não pagamento:** deixa de ser suspensão administrativa e aciona a política comercial de tolerância/downgrade para Free.

Esta hipótese não define quantidade final de planos, preço, limites nem quais recursos entram em cada nível.

## Decisões propostas

### DEC-BR-005 — Estrutura inicial do catálogo comercial

- **Pergunta:** o lançamento deve ter exatamente dois níveis comerciais: Free e um único plano pago com todas as capacidades operacionais atuais?
- **Motivo da decisão:** antes de definir qualquer feature reduzida, é necessário saber se há uma, duas ou mais fronteiras de valor reais. O produto atual não tem colaboração, automações, integrações ou domínios adicionais que sustentem um terceiro nível de forma observável.
- **Opção A:** Free + um plano pago único. O plano pago preserva o conjunto operacional atual; o Free é definido por uma matriz de entitlements na decisão seguinte.
- **Opção B:** Free + dois ou mais planos pagos. Cada plano adicional precisa de público, proposta de valor, limites, preço, upgrade/downgrade e suporte próprios antes de ser criado.
- **Recomendação:** A. Cria uma fronteira comercial compreensível sem inventar diferenciação antes de existir uma capacidade concreta que a justifique.
- **Vantagens:** menor superfície de autorização, cobrança e comunicação; experimento de preço mais legível.
- **Desvantagens:** não segmenta disposição a pagar de perfis futuros.
- **Impacto técnico:** A requer modelar o Free e aplicar entitlements; B exige, além disso, uma matriz por plano e migrações de plano explícitas.
- **Impacto para o usuário:** A é fácil de entender; B pode oferecer melhor encaixe, mas aumenta comparação e risco de escolha errada.
- **Impacto financeiro:** A simplifica a validação inicial; B permite packaging mais fino somente se houver valor comprovado por nível.
- **Testes necessários:** autorização por plano, limites, downgrade, retorno ao pago, deep links e APIs diretas.
- **Minha resposta:** Opção A: Free + um plano pago único. O plano pago preserva o conjunto operacional atual; o Free é definido por uma matriz de entitlements na decisão seguinte.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-006 — Papel do plano Free

- **Pergunta:** o Free deve permitir operação contínua sob limites ou apenas preservar consulta aos dados para quem saiu do pago?
- **Motivo da decisão:** o produto só possui hoje capacidades operacionais básicas: catálogo, estoque, vendas, metas e métricas. Sem decidir se o Free pode criar novos dados, qualquer limite numérico será arbitrário e a proposta de valor do plano pago ficará indefinida.
- **Opção A:** Free operacional limitado. Pode criar e alterar dados dentro de limites claros; o plano pago remove esses limites e habilita os recursos que vierem a ser diferenciados.
- **Opção B:** Free de continuidade. Mantém consulta aos dados e suporte à retomada, mas bloqueia novas operações; é um modo de retenção, não um plano de uso diário.
- **Opção C:** Free sem limites de operação enquanto o plano pago mantém o mesmo conjunto atual de recursos. Não cria fronteira de valor mensurável e não é recomendado.
- **Recomendação:** A. Faz de Free uma experiência real de aquisição/continuidade, preserva acesso a dados e permite que limites objetivos, em vez de bloqueio abrupto, expressem a diferença para o pago.
- **Vantagens:** reduz churn forçado e permite uso genuíno antes ou depois do pagamento.
- **Desvantagens:** exige contadores, guardas de limite e decisões explícitas sobre o que é limitado.
- **Impacto técnico:** A requer entitlements aplicados em mutations e leituras; B requer apenas guardas de escrita, mas contradiz a ideia de um plano Free utilizável.
- **Impacto para o usuário:** A mantém a operação em escala menor; B preserva histórico, mas interrompe o trabalho.
- **Impacto financeiro:** A cria caminho de conversão por crescimento; B reduz custo de uso, mas pode reduzir ativação e retenção.
- **Decisão posterior dependente:** se A, definir separadamente quais recursos podem existir no Free e quais limites são aplicados; se B, definir dados, exportação e prazo de retenção.
- **Minha resposta:** Opção A: Free operacional limitado. Pode criar e alterar dados dentro de limites claros; o plano pago remove esses limites e habilita os recursos que vierem a ser diferenciados.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-007 — Tipo de diferenciação do Free

- **Pergunta:** a redução do Free deve ocorrer principalmente por quotas de capacidade, mantendo os módulos operacionais atuais, ou pelo bloqueio de módulos inteiros?
- **Motivo da decisão:** catálogo, estoque, vendas, imagens, metas e métricas são o conjunto operacional atualmente implementado. Bloquear um deles muda o fluxo de trabalho; limitar capacidade preserva o fluxo, mas exige definir contadores e respostas de limite.
- **Opção A:** mesmas capacidades principais em ambos os planos; Free recebe quotas mensuráveis por recurso/capacidade e o pago remove ou eleva essas quotas.
- **Opção B:** Free recebe somente um subconjunto de módulos; o pago desbloqueia módulos inteiros, mesmo quando o uso é baixo.
- **Opção C:** combinação dos dois desde o lançamento; cada bloqueio e quota precisa de justificativa de valor/custo própria.
- **Recomendação:** A. O produto ainda não tem módulos avançados autônomos que sustentem paywall funcional claro. A fronteira por capacidade é mais honesta enquanto as operações fundamentais permanecem iguais.
- **Vantagens:** mantém a jornada completa e oferece upgrade quando a operação cresce.
- **Desvantagens:** requer contagem consistente, guardas em API/UI e mensagens de limite; uma quota mal escolhida pode frustrar cedo demais ou nunca criar conversão.
- **Impacto técnico:** A exige um contador para cada quota escolhida; B exige guards de rota/action/leitura e deixa dados existentes acessíveis quando um módulo passa a ser bloqueado.
- **Impacto para o usuário:** A permite aprender o produto inteiro; B pode tornar o Free incompleto, mas oferece uma mensagem de upgrade mais direta.
- **Decisão posterior dependente:** escolher, um por vez, quais dimensões serão limitadas e seus valores iniciais.
- **Minha resposta:** Opção A: mesmas capacidades principais em ambos os planos; Free recebe quotas mensuráveis por recurso/capacidade e o pago remove ou eleva essas quotas.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-008 — Limite de catálogo do Free

- **Pergunta:** qual deve ser o limite inicial de produtos **ativos** no Free?
- **Motivo da decisão:** é a primeira quota de capacidade que corresponde diretamente ao valor do sistema. O plano pago seedado hoje contém `catalog.products.limit=500`, mas o valor não é aplicado nem é uma decisão comercial aprovada. O limite precisa ser suficiente para cadastrar e operar, mas materialmente inferior ao pago.
- **Semântica aprovada:** contam todos os produtos cadastrados, inclusive arquivados. Arquivar não reduz a contagem; somente um novo cadastro que não ultrapasse o teto é permitido.
- **Opção A:** 50 produtos cadastrados no Free.
- **Opção B:** 100 produtos cadastrados no Free.
- **Opção C:** 25 produtos cadastrados no Free.
- **Recomendação:** A. Mantém uma proporção de 10:1 com o limite técnico seedado de 500, oferece catálogo inicial útil e deixa espaço claro para crescimento. Não há telemetria de uso no repositório que prove o número; ele deve ser tratado como hipótese comercial revisável.
- **Impacto técnico:** contador tenant-scoped aplicado em criação; arquivar/desarquivar não altera o contador. Downgrade acima de 50 cadastrados precisa de política própria, sem exclusão automática.
- **Impacto para o usuário:** pode continuar consultando e arquivando produtos existentes, mas arquivamento não cria vaga para novo cadastro.
- **Decisão posterior dependente:** política de downgrade para quem já excede o limite e quota de imagens por produto.
- **Minha resposta:** 50 produtos cadastrados no Free.
- **Status da decisão:** aprovada em 2026-07-14.

## Lote de decisões 2: quotas e ciclo de billing

**Como responder:** registre `A`, `B`, `C` ou a alternativa desejada em cada item. Os quatro itens abaixo são independentes o suficiente para decisão conjunta; a matriz final será consolidada depois.

### DEC-BR-009 — Limite mensal de vendas no Free

- **Pergunta:** o Free deve limitar a criação de vendas concluídas por mês-calendário?
- **Opção A:** 50 vendas por mês; cancelamento posterior não devolve a quota, pois a operação já ocorreu.
- **Opção B:** 100 vendas por mês; cancelamento posterior não devolve a quota.
- **Opção C:** não limitar vendas no Free; o único limite operacional inicial é catálogo.
- **Recomendação:** A. Limita uma dimensão de uso recorrente sem impedir consulta, estoque ou cancelamento. Não há telemetria local que prove o valor; é hipótese comercial revisável.
- **Minha resposta:** Opção C: não limitar vendas no Free;
- **Status da decisão:** aprovada em 2026-07-14.


### DEC-BR-010 — Entrada de nova organização

- **Pergunta:** um novo usuário deve entrar diretamente no Free ativo, sem pagamento e sem assinatura `incomplete` bloqueando o app?
- **Opção A:** sim. Onboarding cria organização e plano Free ativo; o pago é upgrade posterior.
- **Opção B:** não. Mantém o bloqueio atual até ativação manual/pagamento, embora exista plano Free.
- **Recomendação:** A. Um Free operacional não cumpre papel de aquisição se o primeiro acesso continuar bloqueado por billing.
- **Minha resposta:** sim. Onboarding cria organização e plano Free ativo;
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-011 — Tolerância antes de downgrade por inadimplência

- **Pergunta:** após cobrança vencida/rejeitada, quanto tempo o pago mantém acesso integral antes da migração para Free?
- **Opção A:** 7 dias de tolerância, depois downgrade automático para Free sem apagar dados.
- **Opção B:** downgrade imediato ao evento de inadimplência.
- **Opção C:** 30 dias de tolerância, depois downgrade automático para Free.
- **Recomendação:** A. Dá tempo para erro de pagamento sem prolongar acesso pago por período excessivo. A data efetiva deve ser persistida e não depender apenas da ordem de webhooks.
- **Minha resposta:** Opção A: 7 dias de tolerância, depois downgrade automático para Free sem apagar dados.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-012 — Organização acima do limite após downgrade

- **Pergunta:** se uma organização tiver mais de 50 produtos cadastrados ao migrar para Free, qual comportamento deve valer?
- **Opção A:** preservar todos os dados e permitir operar produtos existentes, mas bloquear novos cadastros; nenhuma exclusão automática.
- **Opção B:** preservar consulta, mas bloquear vendas e estoque enquanto permanecer acima de 50 cadastrados.
- **Opção C:** migrar somente depois de o usuário reduzir manualmente o catálogo.
- **Recomendação:** A. Honra a preservação de dados e evita paralisar operação por uma regra comercial nova, sem conceder crescimento adicional acima da quota.
- **Minha resposta:** Opção B: preservar consulta, mas bloquear vendas e estoque até voltar a 50 ou menos.
- **Resolução de consistência:** DEC-BR-021 aprovou soft delete distinto de arquivamento. Soft-deletar produto elegível reduz a contagem de cadastrados sem apagar histórico; assim, a organização pode voltar a 50 sem upgrade.
- **Status da decisão:** aprovada em 2026-07-14.

### Limites que não diferenciam o Free hoje

- **Uma imagem por produto:** já é o modelo atual para todos os planos. O schema armazena somente `imageVersion` atual no produto, sem galeria; portanto não cria uma quota Free. `packages/db/src/schema.ts:833`; `apps/web/src/features/products/image-access.ts:42`.
- **Uma meta ativa por organização:** já é invariante global, inclusive no pago. `packages/db/src/schema.ts:1249`.
- **Direção registrada:** planos pagos terão maior capacidade de imagens e de metas. Como ambos os limites são globais hoje, a diferenciação requer modelo de galeria e mudança do invariante de meta, não apenas uma configuração de plano.

## Lote de decisões 3: capacidades exclusivas do pago e retorno ao pago

### DEC-BR-013 — Galeria de imagens no plano pago

- **Pergunta:** qual capacidade de imagens por produto deve o pago receber, mantendo Free em uma imagem?
- **Contexto:** hoje todos os planos só poderiam ter uma imagem porque o produto guarda uma única `imageVersion`; transformar o pago em galeria é nova capacidade de domínio e armazenamento.
- **Opção A:** pago permite até 5 imagens por produto.
- **Opção B:** pago permite imagens ilimitadas por produto.
- **Opção C:** manter uma imagem em ambos até que exista uma necessidade comprovada de galeria.
- **Recomendação:** A. É suficiente para ângulos/variações de revenda e cria custo previsível; ilimitado exige antes quota de storage por organização.
- **Minha resposta:** Opção A: pago permite até 5 imagens por produto.
- **Status da decisão:** aprovada em 2026-07-14.


### DEC-BR-014 — Metas ativas no plano pago

- **Pergunta:** quantas metas podem estar ativas simultaneamente no pago, mantendo Free com uma?
- **Contexto:** o produto atual só suporta uma meta ativa por organização. Mais de uma exige definir como dashboard, resolução, arquivamento e métricas apresentam metas concorrentes.
- **Opção A:** até 3 metas ativas no pago.
- **Opção B:** metas ativas ilimitadas no pago.
- **Opção C:** manter uma meta ativa nos dois planos até que o domínio suporte múltiplas metas de forma explícita.
- **Recomendação:** A. Permite metas de receita, lucro e vendas ao mesmo tempo sem criar coleção ilimitada sem UX, consulta e lifecycle definidos.
- **Minha resposta:** Opção A: até 3 metas ativas no pago.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-015 — Reativação do pago após pagamento confirmado

- **Pergunta:** um pagamento confirmado após downgrade deve reativar o plano pago automaticamente?
- **Opção A:** sim, reativa imediatamente após confirmação confiável do provider; não exige suporte manual.
- **Opção B:** não, requer revisão/ativação manual da plataforma.
- **Recomendação:** A. É o complemento esperado do downgrade automático; B transforma falha normal de pagamento em ticket de suporte.
- **Minha resposta:** Opção A: sim, reativa imediatamente após confirmação confiável do provider; não exige suporte manual.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-016 — Acesso durante tolerância de inadimplência

- **Pergunta:** nos sete dias de tolerância, o usuário mantém integralmente as capacidades pagas ou já vê restrições progressivas?
- **Opção A:** acesso pago integral até o fim do sétimo dia; a transição ocorre uma única vez para Free.
- **Opção B:** bloquear novas operações imediatamente e manter apenas consulta durante a tolerância.
- **Recomendação:** A. Dá significado claro à tolerância e evita dois estados de acesso difíceis de explicar.
- **Minha resposta:** Opção A: acesso pago integral até o fim do sétimo dia; a transição ocorre uma única vez para Free.
- **Status da decisão:** aprovada em 2026-07-14.

## Lote de decisões 4: limites do pago e ciclo de cancelamento

### DEC-BR-017 — Catálogo do plano pago

- **Pergunta:** qual é o teto de produtos cadastrados no plano pago?
- **Contexto:** o único valor existente é `500` no seed técnico, sem aplicação runtime e sem aprovação comercial. O teto também limita o pior caso da galeria paga de cinco imagens.
- **Opção A:** 500 produtos cadastrados no pago.
- **Opção B:** 1.000 produtos cadastrados no pago.
- **Opção C:** sem teto de catálogo no pago.
- **Recomendação:** A. Mantém proporção 10:1 em relação ao Free e um máximo operacional conhecido para a primeira versão; pode ser revisto com telemetria.
- **Minha resposta:** 250 produtos cadastrados, não ativos.
- **Status da decisão:** aprovada em 2026-07-14.


### DEC-BR-018 — Armazenamento de imagens no pago

- **Pergunta:** além de cinco imagens por produto, o pago deve ter quota total de imagens por organização?
- **Contexto atualizado:** cada upload passará a aceitar no máximo 5 MiB e gera variantes. Com 250 produtos e cinco imagens, as fontes ficam limitadas a cerca de 6,1 GiB antes das variantes; não haverá quota global adicional.
- **Opção A:** 5 GiB totais de imagens processadas por organização paga.
- **Opção B:** 1 GiB total de imagens processadas por organização paga.
- **Opção C:** nenhuma quota total além de cinco imagens por produto.
- **Recomendação:** A. Não é uma estimativa de custo do provider, que precisa de validação operacional; evita, porém, que o limite por produto seja interpretado como orçamento de storage ilimitado.
- **Minha resposta:** **Opção C:** nenhuma quota total além de cinco imagens por produto. Alterar o limite para 5 MiB por imagem.
- **Status da decisão:** aprovada em 2026-07-14.


### DEC-BR-019 — Cancelamento voluntário do pago

- **Pergunta:** quando o cliente cancelar o plano pago, quando ocorre a migração para Free?
- **Opção A:** no fim do período já pago; mantém capacidades pagas até então, depois migra para Free.
- **Opção B:** imediatamente ao pedido de cancelamento.
- **Opção C:** não expor cancelamento ao cliente inicialmente; somente suporte/plataforma pode solicitar a transição.
- **Recomendação:** A. É consistente com assinatura recorrente e evita retirar capacidades já pagas sem reembolso definido.
- **Minha resposta:** **Opção A:** no fim do período já pago; mantém capacidades pagas até então, depois migra para Free.
- **Status da decisão:** aprovada em 2026-07-14.


### DEC-BR-020 — Canal inicial de upgrade para pago

- **Pergunta:** no primeiro lançamento comercial, o upgrade Free → pago será self-service ou atendido manualmente?
- **Opção A:** self-service com checkout/provider confirmado, pagamento e reativação automáticos.
- **Opção B:** atendimento/manual inicialmente; self-service entra somente após validar checkout, provider e recuperação de webhooks.
- **Recomendação:** B. O repositório atual não tem checkout e possui lacuna conhecida de recuperação pós-captura de webhook; prometer self-service antes de resolver ambos cria falha de acesso comercial.
- **Minha resposta:** **Opção A:** self-service com checkout/provider confirmado, pagamento e reativação automáticos.
- **Status da decisão:** aprovada em 2026-07-14. A implementação depende de checkout, contrato de provider e recuperação idempotente de falha pós-captura antes de release.

## Lote de decisões 5: consequência da quota de cadastrados

### DEC-BR-021 — Excedente de produtos cadastrados no Free

- **Pergunta:** confirma que, acima de 50 produtos cadastrados, o Free permanece somente consulta e bloqueia vendas/estoque até upgrade para pago?
- **Contexto:** essa é a consequência de contar produtos cadastrados, pois o app não tem exclusão e arquivar não reduz a quota.
- **Opção A:** confirmar o bloqueio até upgrade; o limite de cadastrados é uma fronteira definitiva do Free.
- **Opção B:** permitir que o usuário reduza a contagem por exclusão lógica/administrada de produtos sem apagar histórico; isso exige novo domínio de retenção.
- **Opção C:** voltar a contar apenas produtos ativos, para que arquivamento reduza a quota.
- **Recomendação:** A somente se a conversão por upgrade for deliberadamente mais importante que continuidade no Free. B é mais amigável, mas não existe hoje e precisa preservar vendas, preço e auditoria.
- **Minha resposta:** Opção B: permitir que o usuário reduza a contagem por "exclusão". Implementaremos um softdelete. Diferente de arquivamento.
- **Status da decisão:** aprovada em 2026-07-14. Soft delete é uma transição distinta de arquivamento e reduz a quota de produtos cadastrados sem apagar histórico.

## Lote de decisões 6: soft delete e oferta comercial

### DEC-BR-022 — Produto elegível a soft delete

- **Pergunta:** qual condição deve ser obrigatória para soft-deletar um produto?
- **Opção A:** somente produto com estoque igual a zero; vendas, preço histórico e auditoria permanecem preservados.
- **Opção B:** qualquer produto, inclusive com estoque positivo; ele some da operação sem ajuste de estoque.
- **Opção C:** qualquer produto, mas o sistema cria baixa automática de todo o estoque antes do soft delete.
- **Recomendação:** A. B torna estoque físico invisível; C cria movimento financeiro/operacional implícito. A exige que o usuário regularize o saldo de modo explícito antes de reduzir a quota.
- **Minha resposta:** **Opção A:** somente produto com estoque igual a zero; vendas, preço histórico e auditoria permanecem preservados.
- **Status da decisão:** aprovada em 2026-07-14.


### DEC-BR-023 — Restauração de produto soft-deletado

- **Pergunta:** qual regra vale ao restaurar produto soft-deletado?
- **Opção A:** restauração é permitida somente se houver quota de produtos cadastrados disponível; restaura dados, mas não recria estoque automaticamente.
- **Opção B:** restauração ignora a quota e pode deixar a organização acima do limite.
- **Opção C:** soft delete é irreversível para usuários do tenant.
- **Recomendação:** A. Mantém a quota íntegra e evita transformar soft delete em forma de burlar o limite; estoque zero já é pré-condição da exclusão proposta.
- **Minha resposta:** **Opção C:** soft delete é irreversível para usuários do tenant.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-024 — Preço mensal inicial do plano pago

- **Pergunta:** qual será o preço mensal inicial do plano pago, em BRL?
- **Contexto:** `R$99,00` existe somente no seed técnico atual e ainda não foi aprovado como preço comercial. O plano pago inclui 250 produtos cadastrados, cinco imagens de até 5 MiB por produto e três metas ativas.
- **Opção A:** R$99,00/mês.
- **Opção B:** R$79,00/mês.
- **Opção C:** outro valor, informado pelo responsável de produto.
- **Recomendação:** não há evidência local de disposição a pagar para recomendar um preço com segurança. O seed atual é R$99,00 e deve ser confirmado ou substituído explicitamente.
- **Minha resposta:** **Opção C:** 49,90/mês
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-025 — Periodicidade comercial inicial

- **Pergunta:** o lançamento terá somente assinatura mensal ou também anual?
- **Opção A:** somente mensal no lançamento.
- **Opção B:** mensal e anual, com preço/desconto anual a definir agora.
- **Recomendação:** A. O schema já suporta os dois intervalos, mas preço anual, prorrata, cancelamento e reembolso ainda não têm regra; lançar ambos sem isso abre uma segunda máquina comercial.
- **Minha resposta:** **Opção A:** Somente mensal no lançamento.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-026 — Permissão para soft delete

- **Pergunta:** qual papel do tenant pode executar soft delete de produto?
- **Opção A:** `admin` e `owner`, com confirmação e motivo obrigatórios; `operator` continua podendo arquivar.
- **Opção B:** `operator`, `admin` e `owner`, como as demais operações de produto.
- **Recomendação:** A. Soft delete altera a visibilidade e a quota de modo mais forte que arquivamento; confirmação, motivo e auditoria reduzem exclusões acidentais.
- **Minha resposta:** **Opção A:** so tera um usuario por tenant no inicio. O proprio dono da organizacao.
- **Status da decisão:** aprovada em 2026-07-14. Soft delete é exclusivo de `owner`, com confirmação, motivo e auditoria; DEC-BR-004 fica substituída neste ponto concreto.

### DEC-BR-027 — Visibilidade e restauração de soft-deletados

- **Pergunta:** quem pode listar e restaurar produtos soft-deletados?
- **Opção A:** somente `admin`/`owner`, em tela separada de itens excluídos; produtos ficam fora de catálogo, vendas, estoque e listas normais.
- **Opção B:** todo papel com leitura do catálogo pode listar; somente `admin`/`owner` restaura.
- **Recomendação:** A. Evita que itens excluídos poluam a operação diária e preserva uma trilha explícita de recuperação.
- **Minha resposta:** ninguem poderá restaurar os produtos. O soft delete é final.
- **Status da decisão:** aprovada em 2026-07-14. Nenhum papel restaura; itens ficam fora de catálogo, vendas, estoque e listas normais, preservando somente histórico/auditoria.

### DEC-BR-028 — Provider inicial do checkout recorrente self-service

- **Pergunta:** qual provider será o caminho inicial oficial para upgrade pago recorrente self-service?
- **Evidência externa:** Asaas documenta checkout hospedado `RECURRENT`, assinatura e eventos de checkout/assinatura; a documentação pública consultada da Woovi não confirmou um checkout hospedado recorrente completo. `docs/business-rules/research-self-service-billing-providers-2026-07-14.md`.
- **Opção A:** Asaas como único caminho recorrente inicial; Woovi fica fora do upgrade até validação específica.
- **Opção B:** Asaas e Woovi desde o lançamento, assumindo equivalência do fluxo recorrente.
- **Recomendação:** A. B depende de capacidade que a documentação consultada não confirmou e amplia a recuperação/idempotência antes do primeiro lançamento.
- **Minha resposta:** Asaas e woovi sempre trabalharão juntos. Asaas serve para pagamentos recorrentes no cartao, woovi para pix automatico/recorrente.
- **Status da decisão:** aprovada como direção de produto em 2026-07-14. O PIX recorrente self-service da Woovi continua gate externo: fluxo hospedado, autorização, renovação e lifecycle devem ser comprovados por documentação primária, sandbox e contrato antes de release.

### DEC-BR-029 — Meio de pagamento no checkout recorrente inicial

- **Pergunta:** o checkout recorrente inicial aceita somente cartão ou cartão e PIX recorrente?
- **Opção A:** cartão inicialmente; PIX recorrente entra após provider, contrato e sandbox comprovarem autorização/renovação e lifecycle.
- **Opção B:** cartão e PIX recorrente desde o lançamento.
- **Recomendação:** A. O fluxo Asaas recorrente hospedado documentado usa cartão; não há confirmação suficiente para declarar PIX recorrente self-service equivalente nesta fase.
- **Minha resposta:** Cartão recorrente e PIX recorrente apenas, desde o lançamento.
- **Status da decisão:** aprovada como escopo comercial em 2026-07-14, condicionada ao mesmo gate de validação da Woovi; não introduzir boleto, PIX avulso ou outro meio sem decisão posterior.

## Lote de decisões 7: tenancy, metas e integridade operacional

### DEC-BR-030 — Um membro por organização no lançamento

- **Pergunta:** confirma que, no lançamento, cada organização terá exatamente um membro `owner` e não haverá convites, outros papéis ou troca de usuário?
- **Opção A:** sim, contrato de produto de um único membro por organização; banco e onboarding devem reforçar isso.
- **Opção B:** somente a operação atual é individual, mas o banco continua permitindo múltiplos membros para ativação futura sem nova decisão.
- **Recomendação:** A. É coerente com a resposta sobre soft delete e elimina a divergência atual entre policy do app e permissividade do schema.
- **Minha resposta:** **Opção A**: sim, contrato de produto de um único membro por organização; banco e onboarding devem reforçar isso.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-031 — Semântica das três metas pagas

- **Pergunta:** as até três metas ativas do pago podem coexistir em qualquer combinação de métrica e período?
- **Opção A:** sim; cada uma escolhe independentemente receita, lucro ou quantidade de vendas e seu período.
- **Opção B:** no máximo uma meta ativa por métrica, para impedir duas metas concorrentes de receita/lucro/vendas.
- **Recomendação:** B. Dá três objetivos simultâneos compreensíveis e evita comparar metas duplicadas do mesmo indicador sem um domínio de prioridades.
- **Minha resposta:** **Opção B**: no máximo uma meta ativa por métrica, para impedir duas metas concorrentes de receita/lucro/vendas.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-032 — Cancelamento de venda e dinheiro

- **Pergunta:** no lançamento, cancelar venda continua sendo somente reversão operacional de estoque, sem refund, estorno, contas a receber ou reconciliação financeira?
- **Opção A:** sim; pagamento da venda é apenas registro operacional e cancelamento não aciona provider financeiro.
- **Opção B:** cancelamento deve disparar refund/estorno financeiro no lançamento.
- **Recomendação:** A. Nenhum fluxo de recebimento, settlement ou refund existe hoje; B exige novo domínio financeiro, regras fiscais e contrato de provider.
- **Minha resposta:** **Opção A**: sim; pagamento da venda é apenas registro operacional e cancelamento não aciona provider financeiro.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-033 — Rastreabilidade de estoque por venda

- **Pergunta:** vendas e cancelamentos devem passar a gerar registros no mesmo ledger de estoque de entradas e baixas?
- **Opção A:** sim; toda alteração de saldo precisa de movimento rastreável único, inclusive venda/cancelamento.
- **Opção B:** não; manter as fontes atuais separadas e reconciliar por consulta.
- **Recomendação:** A. Sem ledger único, auditoria e reconstrução de estoque precisam conciliar tabelas diferentes; o produto já trata estoque como dado de negócio crítico.
- **Minha resposta:** **Opção A**: sim; toda alteração de saldo precisa de movimento rastreável único, inclusive venda/cancelamento.
- **Status da decisão:** aprovada em 2026-07-14.

## Lote de decisões 8: confiabilidade, auditoria e jurisdição

### DEC-BR-034 — Recuperação de falha após captura de webhook

- **Pergunta:** se o webhook já foi capturado, mas falhar antes de reconciliar billing, como o produto recupera?
- **Opção A:** reprocessamento automático durável até sucesso ou revisão explícita; redelivery do provider não é a única recuperação.
- **Opção B:** somente suporte/admin pode reprocessar manualmente.
- **Recomendação:** A. O fluxo atual pode marcar redelivery como duplicado e nunca reconciliar; isso pode impedir upgrade/downgrade corretos.
- **Minha resposta:** **Opção A**: reprocessamento automático durável até sucesso ou revisão explícita; redelivery do provider não é a única recuperação.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-035 — Eventos de billing fora de ordem

- **Pergunta:** quando eventos de billing chegam fora de ordem, qual regra define o estado canônico?
- **Opção A:** aplicar somente transições válidas usando data/versão do provider persistida; evento mais antigo não pode regredir estado mais novo.
- **Opção B:** aplicar o último evento recebido, independentemente de data/estado anterior.
- **Recomendação:** A. O acesso pago, os sete dias de tolerância e o downgrade automático não podem depender da ordem de rede.
- **Minha resposta:** **Opção A**: aplicar somente transições válidas usando data/versão do provider persistida; evento mais antigo não pode regredir estado mais novo.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-036 — Auditoria obrigatória

- **Pergunta:** quais mudanças devem falhar se a auditoria transacional não puder ser gravada?
- **Opção A:** todas as mutações de produto, estoque, venda, meta, plano, billing, soft delete e permissões.
- **Opção B:** somente ações de billing/soft delete; demais mudanças podem seguir com audit best-effort.
- **Recomendação:** A. As regras aprovadas dependem de prova posterior de quem mudou estoque, venda, quota e cobrança; best-effort cria lacuna não auditável.
- **Minha resposta:** **Opção A**: todas as mutações de produto, estoque, venda, meta, plano, billing, soft delete e permissões.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-037 — Jurisdição inicial do produto

- **Pergunta:** o lançamento é destinado somente ao Brasil, submetendo regras de privacidade/consumo à legislação brasileira aplicável, ou também a outros países?
- **Opção A:** Brasil somente no lançamento.
- **Opção B:** Brasil e outros países desde o lançamento.
- **Recomendação:** A. Moeda BRL, Asaas, Woovi e PIX apontam para Brasil; expansão internacional sem regras fiscais, contratuais e de privacidade próprias amplia risco sem evidência de requisito.
- **Minha resposta:** **Opção A**: Brasil somente no lançamento.
- **Status da decisão:** aprovada em 2026-07-14.

## Dependências posteriores

Após DEC-BR-005, serão debatidos, nesta ordem: matriz do Free, limites mensuráveis, gatilho e tolerância para não pagamento, retorno ao pago, e só então a semântica de suspensão administrativa. Eventos, estoque, vendas, metas e privacidade serão debatidos na sequência indicada no relatório de descoberta.

### Nota de modelagem: metas

O produto já impõe uma meta `active` por organização, sem distinção de plano. Portanto, “uma meta por vez” não cria uma quota Free. Um plano futuro poderia diferenciar outro conceito mensurável, mas não deve prometer múltiplas metas ativas no pago sem decisão separada e alteração do invariante atual. `packages/db/src/schema.ts:1249`; `apps/web/src/features/goals/server.ts:271`.

## Lote de decisões 9: privacidade e ciclo de vida dos dados

**Base de pesquisa:** [pesquisa LGPD](research-lgpd-2026-07-14.md). Este lote define compromissos de produto e operação, não substitui classificação jurídica nem cria prazo de retenção sem validação competente.

### DEC-BR-038 — Canal para solicitações de titulares

- **Pergunta:** como a pessoa usuária autenticada exerce pedidos de acesso, correção, exportação ou eliminação de seus dados pessoais?
- **Opção A:** canal autenticado de privacidade, com protocolo e verificação de identidade; pedidos que exigem análise (eliminação, oposição, portabilidade e dados de terceiros) seguem para fluxo humano rastreável.
- **Opção B:** somente canal de suporte, com verificação manual para todos os pedidos.
- **Opção C:** sem fluxo definido no lançamento.
- **Recomendação:** A. A autenticação reduz risco de divulgação indevida, e o encaminhamento humano evita prometer eliminação automática onde houver retenção legítima ou dados de terceiros.
- **Impacto decisivo:** precisa registrar recebimento, identidade verificada, escopo, resposta, prazo e eventual fundamento de retenção; exportação não pode atravessar tenant.
- **Minha resposta:** **Opção B:** somente canal de suporte, com verificação manual para todos os pedidos.
- **Status da decisão:** aprovada em 2026-07-14. O lançamento usa suporte com verificação manual para todos os pedidos; não prometer fluxo self-service até nova decisão.

### DEC-BR-039 — Encerramento de organização e conta

- **Pergunta:** o que ocorre quando o único owner solicita encerrar a organização ou sua conta?
- **Opção A:** encerrar desativa imediatamente o acesso e impede novas operações; dados entram em retenção/eliminação conforme uma tabela aprovada posteriormente, sem prometer hard delete imediato.
- **Opção B:** encerrar apaga imediatamente todos os dados, inclusive histórico operacional, billing e auditoria.
- **Opção C:** não oferecer encerramento pelo produto; apenas suporte pode receber o pedido.
- **Recomendação:** A. Preserva o direito de solicitar encerramento sem confundir o pedido com eliminação imediata de dados que possam ter retenção legal, contratual ou de segurança.
- **Impacto decisivo:** exige separar desativação de acesso, dados elimináveis, dados retidos, dados anonimizáveis e o canal de retorno quando a retenção expirar.
- **Minha resposta:** **Opção A**: encerrar desativa imediatamente o acesso e impede novas operações; dados entram em retenção/eliminação conforme uma tabela aprovada posteriormente, sem prometer hard delete imediato.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-040 — Tabela de retenção antes de eliminação automática

- **Pergunta:** qual postura vale enquanto não houver validação jurídica/contábil dos prazos por categoria de dado?
- **Opção A:** nenhuma eliminação automática definitiva; antes do lançamento, aprovar tabela por categoria (conta, autenticação, venda, billing, auditoria, imagem e incidente), com fundamento, prazo, acesso durante retenção e destino final.
- **Opção B:** definir agora um prazo único arbitrário para todos os dados e apagar ao fim dele.
- **Opção C:** apagar imediatamente quando um plano acaba ou produto sofre soft delete.
- **Recomendação:** A. A pesquisa não sustenta um prazo único; o soft delete aprovado preserva histórico, e a LGPD prevê hipóteses específicas de conservação.
- **Impacto decisivo:** a tabela é gate de qualquer rotina de purge e de qualquer promessa de exclusão ao usuário. O registro de incidente com dados pessoais tem retenção regulatória mínima de cinco anos, segundo a orientação da ANPD pesquisada.
- **Minha resposta:** **Opção A**: nenhuma eliminação automática definitiva; antes do lançamento, aprovar tabela por categoria (conta, autenticação, venda, billing, auditoria, imagem e incidente), com fundamento, prazo, acesso durante retenção e destino final.
- **Status da decisão:** aprovada em 2026-07-14. A tabela validada é gate antes de qualquer purge automático ou promessa de exclusão definitiva.

### DEC-BR-041 — Resposta a incidente de dados pessoais

- **Pergunta:** qual compromisso operacional vale para incidentes confirmados de dados pessoais?
- **Opção A:** manter runbook, responsável, registro de avaliação/contenção e decisão documentada de comunicação; quando houver risco ou dano relevante, cumprir o fluxo regulatório aplicável, inclusive comunicação à ANPD e titulares dentro do prazo vigente.
- **Opção B:** tratar incidentes caso a caso, sem processo ou prazo documentado.
- **Recomendação:** A. A orientação oficial pesquisada aponta avaliação contextual e comunicação em três dias úteis para casos comunicáveis; resposta ad hoc não produz prova nem permite cumprir prazo curto.
- **Impacto decisivo:** não determina que toda vulnerabilidade seja incidente comunicável; exige registro e avaliação rastreável, inclusive de eventos de suboperadores.
- **Minha resposta:** **Opção A**: manter runbook, responsável, registro de avaliação/contenção e decisão documentada de comunicação; quando houver risco ou dano relevante, cumprir o fluxo regulatório aplicável, inclusive comunicação à ANPD e titulares dentro do prazo vigente.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-042 — Mapa de papéis e dados de clientes do tenant

- **Pergunta:** antes do lançamento público, qual rigor se aplica à definição de quem decide finalidade/meios e atende pedidos envolvendo dados de clientes cadastrados pelo tenant?
- **Opção A:** tratar o mapeamento de papéis, categorias, compartilhamentos e canal de solicitação como gate de lançamento; contrato/aviso de privacidade só afirmam papéis após essa validação.
- **Opção B:** declarar desde já que a plataforma é sempre operadora e o tenant sempre controlador.
- **Opção C:** declarar desde já que a plataforma é sempre controladora de todos os dados.
- **Recomendação:** A. A ANPD descreve essa classificação como contextual; os dados da conta do owner e os dados de clientes cadastrados pelo tenant podem exigir fluxos distintos.
- **Impacto decisivo:** evita aviso/contrato incompatível com o tratamento real; não impede o produto, mas impede promessas jurídicas não validadas.
- **Minha resposta:** **Opção A**: tratar o mapeamento de papéis, categorias, compartilhamentos e canal de solicitação como gate de lançamento; contrato/aviso de privacidade só afirmam papéis após essa validação.
- **Status da decisão:** aprovada em 2026-07-14. O lançamento público depende desse mapeamento e da validação de aviso/contrato.

## Lote de decisões 10: integridade operacional e estados excepcionais

### DEC-BR-043 — Suspensão administrativa distinta de billing

- **Pergunta:** quando a plataforma precisa suspender administrativamente uma organização por fraude, abuso, segurança ou obrigação legal, qual efeito vale?
- **Opção A:** estado administrativo separado de billing e Free; bloqueia todo acesso e mutação do tenant, apresenta motivo/canal de suporte apropriado e exige ação de plataforma auditada para suspender ou reativar.
- **Opção B:** mantém somente consulta, bloqueando mutações.
- **Opção C:** não existe suspensão administrativa; todo bloqueio deve ser tratado como Free ou cancelamento.
- **Recomendação:** A. Inadimplência já possui caminho comercial próprio para Free. Casos administrativos precisam interromper acesso de forma inequívoca sem fingir que a organização ainda pode operar normalmente.
- **Impacto decisivo:** não pode redirecionar para onboarding nem ser disparada por falta de pagamento; precisa motivo, ator, data, revisão e experiência de erro determinística.
- **Minha resposta:** **Opção A**: estado administrativo separado de billing e Free; bloqueia todo acesso e mutação do tenant, apresenta motivo/canal de suporte apropriado e exige ação de plataforma auditada para suspender ou reativar.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-044 — Expiração temporal do acesso pago

- **Pergunta:** como garantir downgrade ao Free no fim do período pago ou da tolerância de sete dias caso um webhook atrase, falhe ou nunca chegue?
- **Opção A:** persistir marcos de período/tolerância e executar transição temporal durável e idempotente; webhook apenas reconcilia ou antecipa com evento mais novo válido.
- **Opção B:** depender exclusivamente de webhook do provider para alterar acesso.
- **Opção C:** manter acesso pago até intervenção manual.
- **Recomendação:** A. O schema já possui início/fim de período e cancelamento agendado, mas o guard atual consulta somente `status = active`; rede de provider não pode ser a única fonte do relógio de acesso.
- **Impacto decisivo:** a transição deve respeitar DEC-BR-011, DEC-BR-016, DEC-BR-019 e DEC-BR-035, ser recuperável após indisponibilidade e não regredir pagamento já confirmado.
- **Minha resposta:** **Opção A**: persistir marcos de período/tolerância e executar transição temporal durável e idempotente; webhook apenas reconcilia ou antecipa com evento mais novo válido.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-045 — Idempotência de ajustes manuais de estoque

- **Pergunta:** como impedir que retry, clique repetido ou timeout duplique entrada ou baixa manual de estoque?
- **Opção A:** cada comando manual recebe chave de idempotência persistida por tenant; repetição da mesma chave devolve o resultado original sem novo movimento, e uma nova operação legítima usa nova chave.
- **Opção B:** exibir confirmação na interface, mas aceitar toda repetição recebida pelo servidor como novo movimento.
- **Opção C:** corrigir duplicações apenas por suporte/auditoria.
- **Recomendação:** A. Locks atuais evitam saldo concorrente incorreto, mas não distinguem a mesma intenção entregue duas vezes. O ledger único aprovado em DEC-BR-033 precisa conter cada intenção somente uma vez.
- **Impacto decisivo:** a chave precisa ligar comando, movimento, auditoria e resposta; não pode deduplicar apenas por produto/quantidade/data, pois operações iguais podem ser legítimas.
- **Minha resposta:** **Opção A**: cada comando manual recebe chave de idempotência persistida por tenant; repetição da mesma chave devolve o resultado original sem novo movimento, e uma nova operação legítima usa nova chave.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-046 — Concorrência na resolução de metas

- **Pergunta:** se a leitura do dashboard resolve uma meta ao mesmo tempo que alguém a arquiva, altera ou reativa, qual regra preserva o estado correto?
- **Opção A:** resolver somente por transição condicional e transacional a partir de `active`; se o estado mudou, a resolução não sobrescreve a ação posterior e deve recarregar o estado.
- **Opção B:** manter a atualização atual baseada na leitura anterior, mesmo que sobrescreva mudança concorrente.
- **Opção C:** impedir qualquer edição/arquivamento enquanto a meta estiver ativa.
- **Recomendação:** A. A resolução atual lê as metas ativas e depois atualiza somente por id/tenant; sem predicado de estado pode restaurar um estado que já foi alterado por outra operação.
- **Impacto decisivo:** preserva DEC-BR-014 e DEC-BR-031 sem bloquear a operação; cada transição resolvida também precisa auditoria obrigatória por DEC-BR-036.
- **Minha resposta:** **Opção A**: resolver somente por transição condicional e transacional a partir de `active`; se o estado mudou, a resolução não sobrescreve a ação posterior e deve recarregar o estado.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-047 — Imutabilidade econômica e reconciliação de venda

- **Pergunta:** qual garantia vale para os valores de uma venda concluída?
- **Opção A:** a venda é snapshot econômico imutável: servidor calcula totais a partir de itens, frete, adicional, desconto e regra de taxa; cancelamento muda somente estado/estoque, e reconciliação detecta qualquer divergência persistida.
- **Opção B:** permitir correção manual posterior dos totais e taxas da venda concluída.
- **Opção C:** confiar nos valores gravados sem reconciliação, desde que a criação tenha passado pela interface.
- **Recomendação:** A. Hoje o servidor calcula os valores na criação, mas o banco não prova a relação entre itens, total e valor cobrado. B destruiria a evidência comercial que a venda e a auditoria devem preservar.
- **Impacto decisivo:** não introduz refund/settlement, já excluídos por DEC-BR-032; define somente consistência e preservação do registro operacional.
- **Minha resposta:** **Opção A**: a venda é snapshot econômico imutável: servidor calcula totais a partir de itens, frete, adicional, desconto e regra de taxa; cancelamento muda somente estado/estoque, e reconciliação detecta qualquer divergência persistida.
- **Status da decisão:** aprovada em 2026-07-14.

## Lote de decisões 11: suporte, tempo, comunicação e encerramento

### DEC-BR-048 — Acesso de suporte da plataforma ao tenant

- **Pergunta:** qual acesso a equipe de plataforma pode usar para suporte no lançamento?
- **Opção A:** sem impersonation e sem sessão como owner; suporte consulta apenas painéis administrativos necessários, executa ações administrativas aprovadas e audita toda leitura sensível ou mutação.
- **Opção B:** impersonation temporária do owner após solicitação de suporte, com justificativa, prazo curto e auditoria.
- **Opção C:** administradores de plataforma podem abrir qualquer tenant sem registro adicional.
- **Recomendação:** A. As rotas administrativas atuais mostram organizações, usuários, billing, eventos e auditoria, mas não foi localizado fluxo de impersonation. Introduzir sessão delegada amplia o risco de confundir ator de plataforma e usuário do tenant.
- **Impacto decisivo:** suporte não ganha papel do tenant por herança; qualquer exceção futura precisa de nova decisão de segurança e privacidade.
- **Minha resposta:** Opção A: sem impersonation e sem sessão como owner; suporte consulta apenas painéis administrativos necessários, executa ações administrativas aprovadas e audita toda leitura sensível ou mutação.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-049 — Timezone canônico para operação brasileira

- **Pergunta:** qual timezone define datas operacionais, período de metas, virada de limite e marcos de billing no lançamento brasileiro?
- **Opção A:** `America/Sao_Paulo` como timezone canônico global do produto; toda data sem horário é interpretada e apresentada nesse timezone.
- **Opção B:** timezone configurável por organização desde o lançamento.
- **Opção C:** UTC como referência exibida diretamente ao usuário.
- **Recomendação:** A. DEC-BR-037 limita o lançamento ao Brasil e os componentes já produzem datas operacionais locais; uma timezone única evita que meta, venda e job temporal enxerguem dias diferentes.
- **Impacto decisivo:** não altera timestamps de auditoria; define apenas interpretação de datas de negócio e jobs. Expansão internacional exige nova decisão.
- **Minha resposta:** Opção A: `America/Sao_Paulo` como timezone canônico global do produto; toda data sem horário é interpretada e apresentada nesse timezone.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-050 — Comunicação de lifecycle de billing

- **Pergunta:** como o owner deve ser avisado sobre falha de pagamento, início/fim da tolerância, downgrade, reativação e cancelamento agendado?
- **Opção A:** email transacional para o email da conta, mais estado visível no app; cada aviso é idempotente, auditável e não substitui a transição temporal de DEC-BR-044.
- **Opção B:** somente estado no app; nenhum email automático de lifecycle.
- **Opção C:** email automático sem estado visível no app.
- **Recomendação:** A. O produto já tem integração de email e hoje envia o usuário sem assinatura para suporte manual; avisos claros reduzem surpresa no downgrade, mas não podem ser a fonte de verdade do acesso.
- **Impacto decisivo:** definir eventos, destinatário, idioma, deduplicação, falha de entrega e conteúdo sem dados sensíveis; marketing fica fora desse fluxo.
- **Minha resposta:** Opção A: email transacional para o email da conta, mais estado visível no app; cada aviso é idempotente, auditável e não substitui a transição temporal de DEC-BR-044.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-051 — Lifecycle físico das imagens após soft delete e encerramento

- **Pergunta:** o que ocorre com arquivos e variantes de imagens depois que o produto sofre soft delete ou a organização é encerrada?
- **Opção A:** desvincular imediatamente da operação normal, preservar os objetos enquanto a retenção aplicável não expirar e apagar de modo verificável somente conforme a tabela gateada por DEC-BR-040.
- **Opção B:** apagar fisicamente todas as imagens imediatamente no soft delete/encerramento.
- **Opção C:** reter os objetos indefinidamente, mesmo após a retenção de dados expirar.
- **Recomendação:** A. É consistente com DEC-BR-022, DEC-BR-027, DEC-BR-039 e DEC-BR-040: ocultar não significa destruir, mas também não justifica retenção sem prazo.
- **Impacto decisivo:** imagens não permanecem acessíveis por URL ou listagem após a transição; purge precisa cobrir fonte e variantes e registrar resultado.
- **Minha resposta:** Opção A: desvincular imediatamente da operação normal, preservar os objetos enquanto a retenção aplicável não expirar e apagar de modo verificável somente conforme a tabela gateada por DEC-BR-040.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-052 — Encerramento de organização com assinatura paga vigente

- **Pergunta:** quando o owner encerra uma organização com plano pago ativo, como conciliar DEC-BR-039 com cobrança recorrente?
- **Opção A:** encerrar corta o acesso imediatamente e solicita cancelamento da renovação recorrente; não cria refund automático, e o resultado do provider é reconciliado/auditado.
- **Opção B:** o owner precisa cancelar a assinatura separadamente antes de poder encerrar a organização.
- **Opção C:** encerrar só produz efeito ao fim do período já pago.
- **Recomendação:** A. B cria cobrança inesperada após o pedido de encerramento; C contradiz a desativação imediata aprovada em DEC-BR-039. A preserva a decisão de não haver refund automático em DEC-BR-032.
- **Impacto decisivo:** falha de cancelamento no provider precisa de retry e suporte, sem reativar acesso; obrigações de retenção continuam regidas por DEC-BR-040.
- **Minha resposta:** Opção A: encerrar corta o acesso imediatamente e solicita cancelamento da renovação recorrente; não cria refund automático, e o resultado do provider é reconciliado/auditado.
- **Status da decisão:** aprovada em 2026-07-14.

## Lote de decisões 12: confirmação do núcleo operacional AS-IS

**Objetivo:** estas regras são comportamentos comprovados no código e banco. Ainda não são normativas até confirmação explícita. Cada opção A aprova o conjunto descrito; se qualquer item não representar o produto desejado, indique a alteração na resposta.

### DEC-BR-053 — Isolamento e autorização operacional

- **Pergunta:** confirma o contrato-base de acesso: cada recurso de tenant pertence a uma única organização; usuário só opera sua membership; organização administrativa suspensa bloqueia tudo; o plano define capacidades, sem conceder acesso entre tenants?
- **Opção A:** confirmar integralmente.
- **Opção B:** alterar o contrato (descrever exceção).
- **Recomendação:** A. É o limite mínimo de isolamento e separa corretamente papel de plataforma, membership e entitlement.
- **Evidência:** RLS/FKs tenant-scoped, guard de sessão e DEC-BR-043. `docs/business-rules/invariants.md` (TENANT-001/002).
- **Minha resposta:** **Opção A:** confirmar integralmente.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-054 — Produto, estoque e arquivamento

- **Pergunta:** confirma que saldo/custo/preço não podem ser negativos; toda entrada/baixa é transacional e auditada; entrada recalcula custo médio e reativa produto arquivado; produto arquivado não é vendável; e remoção do catálogo segue somente o soft delete final já aprovado?
- **Opção A:** confirmar integralmente.
- **Opção B:** alterar o contrato (descrever exceção).
- **Recomendação:** A. Evita saldo impossível, preserva rastreabilidade e não conflita com DEC-BR-021 a 027, 033, 036 e 045.
- **Evidência:** `apps/web/src/features/products/server.ts`; `docs/business-rules/invariants.md` (STOCK-001/002).
- **Minha resposta:** **Opção A:** confirmar integralmente.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-055 — Venda, snapshots e cancelamento

- **Pergunta:** confirma que cada venda usa itens únicos, quantidade positiva, preço/custo em snapshot e baixa atômica de estoque; a única reversão é `completed → cancelled`, que recompõe somente o estoque e não permite edição, reativação ou exclusão da venda?
- **Opção A:** confirmar integralmente.
- **Opção B:** alterar o contrato (descrever exceção).
- **Recomendação:** A. Completa DEC-BR-032, 033 e 047 sem introduzir refund/settlement que o lançamento excluiu.
- **Evidência:** `apps/web/src/features/sales/server.ts`; `docs/business-rules/state-machines.md`.
- **Minha resposta:** **Opção A:** confirmar integralmente.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-056 — Cálculo de pagamento da venda

- **Pergunta:** confirma que PIX não parcela nem tem taxa; cartão aceita 1–12 parcelas; taxa pode ser de vendedor ou cliente; frete/adicional/desconto entram no total conforme cálculo do servidor; e o sistema usa precisão monetária decimal/arredondada, sem valores negativos?
- **Opção A:** confirmar integralmente.
- **Opção B:** alterar o contrato (descrever exceção).
- **Recomendação:** A. É o cálculo implementado e torna verificável a imutabilidade econômica aprovada em DEC-BR-047.
- **Evidência:** `apps/web/src/features/sales/calculations.ts`.
- **Minha resposta:** **Opção A:** confirmar integralmente.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-057 — Lifecycle de metas

- **Pergunta:** confirma que uma meta nasce `active`, termina em `completed` ao atingir alvo ou `expired` ao fim do período, pode ser `archived`, e somente `archived` pode voltar a `active`; metas concluídas/expiradas não reativam?
- **Opção A:** confirmar integralmente.
- **Opção B:** alterar o contrato (descrever exceção).
- **Recomendação:** A. É coerente com os limites Free/pago e com a transição concorrente aprovada em DEC-BR-046.
- **Evidência:** `apps/web/src/features/goals/server.ts`; `docs/business-rules/state-machines.md`.
- **Minha resposta:** **Opção A:** confirmar integralmente.
- **Status da decisão:** aprovada em 2026-07-14.

### DEC-BR-058 — Limite de tamanho da imagem no Free

- **Pergunta:** o limite de 5 MiB por imagem aprovado para o pago também vale para a única imagem de cada produto Free?
- **Opção A:** sim, 5 MiB nos dois planos.
- **Opção B:** definir tamanho maior ou menor para o Free (informar valor).
- **Opção C:** não limitar tamanho no Free.
- **Recomendação:** A. A diferença de valor já está na quantidade de imagens; tamanhos distintos ampliam custo e validação sem benefício evidente.
- **Impacto decisivo:** substitui o máximo AS-IS de 10 MiB para a implementação futura e completa a matriz de upload.
- **Minha resposta:** **Opção A:** confirmar integralmente.
- **Status da decisão:** aprovada em 2026-07-14. O limite é 5 MiB por imagem nos planos Free e pago.

## Consolidação posterior

Este arquivo preserva as perguntas e respostas históricas DEC-BR-001 a 058. DEC-BR-059 a 085 foram decididas após auditoria e pesquisa nas fontes primárias, e estão no [registro de decisões](decision-register.md) e em [decisões por waves](research-decision-waves-2026-07-14.md). Ele não é a fonte normativa vigente.
