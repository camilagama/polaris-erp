# Pesquisa externa: gates legais de privacidade, retenção e incidentes

**Status:** rascunho de pesquisa, **não normativo**.  
**Consulta:** 2026-07-14.  
**Jurisdição pesquisada:** Brasil.  
**Escopo:** LGPD, ANPD e guarda empresarial/fiscal de alto nível. Não é aconselhamento jurídico ou contábil; não cria prazo de retenção, base legal, papel contratual ou regra de produto.

## Uso desta pesquisa

Este relatório aprofunda os gates já registrados em `DEC-BR-037` a `DEC-BR-042`. Ele separa fatos normativos de consequências que dependem de contrato, categoria de dado, regime tributário, estado/município e validação profissional. Nenhuma conclusão abaixo autoriza purge, resposta a titular ou comunicação à ANPD sem o procedimento aprovado.

## Fatos legais confirmados

### Papéis de tratamento

- A LGPD define **controlador** como quem toma decisões sobre o tratamento e **operador** como quem trata dados em nome do controlador.[^lgpd]
- A ANPD reforça que a classificação é contextual, por operação de tratamento; o controlador responde pelo atendimento aos direitos dos titulares e o operador deve agir conforme as instruções do controlador.[^anpd-titular][^anpd-agentes]

**Aplicação ao projeto: não decidida.** A plataforma pode ser controladora para dados da sua própria conta, segurança, cobrança e suporte, e operar dados inseridos por uma organização usuária em outro fluxo. Essa é apenas uma hipótese a validar por finalidade, meios essenciais, contrato e operação real; não deve ser presumida uma única classificação para todo o SaaS.

### Direitos de titulares e solicitações

- O art. 18 da LGPD prevê confirmação, acesso, correção, anonimização/bloqueio/eliminação quando cabível, portabilidade conforme regulamentação, informação sobre compartilhamento, revogação do consentimento e revisão de decisão exclusivamente automatizada.[^lgpd]
- A orientação oficial informa que confirmação e acesso devem ser providenciados imediatamente; a declaração completa sobre origem, inexistência de registro, critérios e finalidade deve ser fornecida em até 15 dias.[^anpd-direitos]
- A eliminação solicitada não é absoluta: a conservação permitida pelo art. 16 inclui cumprimento de obrigação legal ou regulatória.[^lgpd]

**Gate jurídico e de produto:** manter o canal de suporte verificado aprovado em `DEC-BR-038` não resolve, por si, autenticação do solicitante, escopo por controlador, SLA operacional, exportação, correção, negativa fundamentada, registro de evidência e comunicação ao titular. Cada um exige procedimento aprovado e teste.

### Término, eliminação e retenção

- O tratamento termina nas hipóteses do art. 15; após isso, a regra do art. 16 é eliminar os dados pessoais nos limites técnicos, com exceções expressas, inclusive obrigação legal/regulatória.[^lgpd]
- O Código Civil exige que empresário e sociedade empresária guardem escrituração, correspondência e papéis da atividade enquanto não ocorrer prescrição ou decadência dos atos correspondentes.[^codigo-civil]

**Conflito a resolver com assessoria jurídica e contábil:** a LGPD não impõe um prazo geral único para todos os dados, e a guarda empresarial/fiscal depende do documento, fato gerador, regime tributário, localidade e eventual processo pendente. Há orientações fiscais estaduais que usam cinco exercícios completos para determinados documentos fiscais, mas isso não autoriza aplicar “cinco anos” indistintamente a conta, logs, vendas, imagens, auditoria ou cobrança.[^receita-rs]

Portanto, uma exclusão de conta, soft delete de produto ou término de assinatura não deve causar hard delete automático. A tabela de retenção precisa decidir, por categoria: finalidade, controlador, base de conservação, norma/contrato aplicável, marco inicial, prazo, acesso restrito, anonimização/pseudonimização possível, legal hold e destino final. Até essa tabela ser validada, `DEC-BR-039` e `DEC-BR-040` continuam gates, não prazos implementáveis.

### Segurança e incidentes

- O art. 46 exige medidas técnicas e administrativas aptas a proteger dados pessoais contra acesso não autorizado e eventos acidentais ou ilícitos de destruição, perda, alteração, comunicação ou difusão; a obrigação de segurança subsiste após o término do tratamento.[^lgpd]
- Incidente confirmado com dados pessoais que possa acarretar risco ou dano relevante deve ser comunicado pelo controlador à ANPD e aos titulares. A orientação oficial descreve avaliação por contexto, categorias/quantidade de dados e titulares, danos potenciais, proteção aplicada e mitigação.[^anpd-incidentes]
- A Resolução CD/ANPD nº 15/2024, conforme procedimento oficial da ANPD, fixa comunicação à ANPD e aos titulares em três dias úteis, salvo prazo específico aplicável. Informação incompleta pode seguir em comunicação preliminar e complementar fundamentada, esta em até vinte dias úteis.[^anpd-incidentes]
- O operador não substitui o controlador na comunicação regulatória; deve informar o incidente ao controlador sem demora injustificada e fornecer as informações necessárias.[^anpd-incidentes]
- A ANPD informa que o RCIS exige registro de incidentes de segurança com dados pessoais por ao menos cinco anos.[^anpd-rcis]

**Gate operacional:** o runbook de `DEC-BR-041` deve definir quem faz a classificação inicial, quem decide a comunicação, escalonamento de suboperadores, relógio de três dias úteis, conteúdo do comunicado, trilha de decisão, preservação de evidência e comunicação aos titulares. Um webhook, log de erro ou alerta de segurança não é, isoladamente, prova de que esses deveres foram cumpridos.

## Matriz de decisões que não podem ser inferidas

| Tema | Fato externo | Decisão/gate pendente |
| --- | --- | --- |
| Controlador/operador | Papel depende de quem decide a finalidade e meios essenciais. | Mapear cada tratamento e formalizar contratos/instruções com clientes e fornecedores. |
| Solicitação de titular | Controlador deve atender direitos; há respostas imediatas e declaração completa em até 15 dias para os itens legais aplicáveis. | Definir autenticação, canal, escopo cross-tenant, responsáveis, evidência e negativa por retenção. |
| Exclusão | Art. 16 permite conservar para obrigação legal/regulatória e outras hipóteses taxativas. | Aprovar tabela de retenção e purge por categoria; aplicar legal hold. |
| Registros contábeis/fiscais | Código Civil preserva documentos enquanto não houver prescrição/decadência; regras fiscais são específicas. | Contador e advogado devem identificar obrigações por regime, UF/município, documentos emitidos e litígios. |
| Incidente | Controlador comunica incidentes qualificáveis; prazo geral do RCIS é três dias úteis. | Designar controlador por fluxo, responsável de plantão, critérios de risco, templates e teste do runbook. |
| Fornecedores | Operador deve comunicar sem demora injustificada ao controlador. | Contratos devem prever contatos, SLA de notificação, cooperação, suboperadores, retenção e eliminação/devolução. |

## Relação com o repositório

- `docs/business-rules/research-lgpd-2026-07-14.md` já registrava o escopo geral de LGPD; este relatório acrescenta o conflito concreto com guarda empresarial/fiscal e a separação entre prazo legal e escolha operacional.
- `docs/business-rules/normative/domains/goals-reporting-platform.md` menciona pedidos de titulares, retenção e incidentes. Esses textos não substituem a classificação contratual nem a validação jurídica/contábil acima.
- Não foi localizado, nesta pesquisa, um inventário aprovado de tratamentos, uma tabela de retenção por categoria, um contrato de processamento, um procedimento de DSR ou um runbook de incidente que prove conformidade operacional.

## Questões para jurídico/contábil e decisão humana

1. Para cada categoria do produto, quem é controlador, operador ou controlador conjunto em cada operação?
2. Quais documentos fiscais/contábeis o produto efetivamente armazena ou emite, sob qual regime tributário e em quais UFs/municípios?
3. Qual prazo e marco inicial são exigidos por categoria, e quais dados pessoais podem ser segregados/anonimizados sem destruir a prova contábil?
4. Qual canal, verificação de identidade e trilha de atendimento serão usados para pedidos de titulares?
5. Quem recebe alerta de incidente fora do horário comercial, quem autoriza a comunicação e quais provedores têm obrigação contratual de escalonar o incidente?

## Fontes e autoridade

[^lgpd]: Presidência da República, [Lei nº 13.709/2018, LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm), texto normativo oficial, arts. 5º, 15, 16, 18, 19, 46 e 48. Consultado em 2026-07-14.
[^anpd-titular]: ANPD, [Titular de Dados](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1), orientação oficial. Consultado em 2026-07-14.
[^anpd-agentes]: ANPD, [Guia orientativo para definições dos agentes de tratamento e do encarregado](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-para-definicoes-dos-agentes-de-tratamento-de-dados-pessoais-e-do-encarregado), orientação oficial não vinculante. Consultado em 2026-07-14.
[^anpd-direitos]: ANPD, [Direito dos Titulares](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares), orientação oficial. Consultado em 2026-07-14.
[^anpd-incidentes]: ANPD, [Comunicação de Incidente de Segurança](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis), procedimento e orientação oficial sobre a Resolução CD/ANPD nº 15/2024. Consultado em 2026-07-14.
[^anpd-rcis]: ANPD, [ANPD aprova o Regulamento de Comunicação de Incidente de Segurança](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-aprova-o-regulamento-de-comunicacao-de-incidente-de-seguranca), comunicado oficial sobre a Resolução CD/ANPD nº 15/2024. Consultado em 2026-07-14.
[^codigo-civil]: Presidência da República, [Código Civil, Lei nº 10.406/2002](https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm), texto normativo oficial, art. 1.194. Consultado em 2026-07-14.
[^receita-rs]: Receita Estadual do Rio Grande do Sul, [Período obrigatório de guarda de documentos fiscais](https://atendimento.receita.rs.gov.br/qual-e-o-periodo-obrigatorio-de-guarda-de-documentos-fiscais), orientação fiscal estadual, não aplicável automaticamente a outras UFs, regimes ou categorias. Consultado em 2026-07-14.
