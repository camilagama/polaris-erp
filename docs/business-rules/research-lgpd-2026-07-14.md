# Pesquisa externa: LGPD para dados de conta e registros operacionais

**Status:** rascunho de pesquisa, **não normativo**.  
**Consulta:** 2026-07-14.  
**Jurisdição:** Brasil.  
**Escopo:** leitura de alto nível da Lei nº 13.709/2018 (LGPD) e de orientações oficiais da ANPD para um SaaS que armazena dados de conta de proprietários e registros de catálogo/vendas. Não é aconselhamento jurídico, não define a base legal, os papéis de controlador/operador, os prazos de retenção ou as regras de produto deste repositório.

## Limites e enquadramento

- A LGPD protege dados pessoais de pessoas naturais identificadas ou identificáveis. Dados de conta, como nome, e-mail e identificadores de acesso, normalmente entram nessa definição; dados de catálogo ou de uma pessoa jurídica, isoladamente, podem não entrar. Registros de venda que identifiquem uma pessoa natural, porém, podem ser dados pessoais.[^lgpd]
- A classificação de cada parte envolvida como controlador ou operador depende de quem toma as decisões principais sobre o tratamento concreto. A ANPD trata a definição como contextual; esta pesquisa não conclui o papel do SaaS nem o de cada organização usuária.[^anpd-agentes]
- Regras tributárias, consumeristas, trabalhistas, contratuais ou setoriais podem impor retenção ou deveres adicionais. Elas não foram pesquisadas aqui.

## Direitos dos titulares

O art. 18 da LGPD prevê, entre outros, direitos de confirmação da existência de tratamento, acesso, correção, anonimização/bloqueio/eliminação de dados desnecessários, excessivos ou tratados em desconformidade, portabilidade conforme regulamentação, informação sobre compartilhamento, informação sobre consentimento, revogação do consentimento e revisão de decisões exclusivamente automatizadas.[^lgpd]

- A página oficial da ANPD destaca que confirmação e acesso devem ser providenciados imediatamente; pedidos sobre origem, inexistência de registro, critérios e finalidade têm o prazo legal de até 15 dias.[^anpd-direitos]
- A existência de um recurso de exportação, arquivamento ou exclusão no produto não prova, por si, que os direitos do art. 18 foram atendidos: o pedido é do titular e alcança seus dados pessoais, observado o contexto e as exceções legais.
- Dados de clientes inseridos por uma organização usuária e dados da própria conta do proprietário podem exigir fluxos distintos de atendimento. Esta é uma distinção a mapear, não uma decisão já tomada.

## Término do tratamento, eliminação e retenção

- O tratamento termina nas hipóteses do art. 15, incluindo finalidade alcançada, fim do período, comunicação do titular (inclusive revogação do consentimento) e determinação da ANPD. Ao término, a regra geral do art. 16 é a eliminação dos dados pessoais.[^lgpd]
- O mesmo art. 16 admite conservação para cumprimento de obrigação legal ou regulatória; estudo por órgão de pesquisa com anonimização quando possível; transferência a terceiro nos termos da lei; ou uso exclusivo do controlador, vedado o acesso por terceiro, desde que os dados sejam anonimizados.[^lgpd]
- Portanto, uma solicitação de eliminação, uma exclusão lógica de produto ou o encerramento de uma assinatura não permitem presumir eliminação imediata de todos os registros. A análise deve separar dados pessoais, dados anonimizados, histórico operacional e eventuais retenções obrigatórias antes de definir comportamento ou prazo.

## Segurança e incidentes

- Os agentes de tratamento devem adotar medidas técnicas e administrativas aptas a proteger dados pessoais de acesso não autorizado e de situações acidentais ou ilícitas de destruição, perda, alteração, comunicação ou difusão. O dever de segurança persiste mesmo após o término do tratamento, e os sistemas devem considerar requisitos de segurança e boas práticas desde a concepção.[^lgpd]
- Para incidentes com dados pessoais que possam acarretar risco ou dano relevante, o controlador deve comunicar a ANPD e os titulares. A comunicação deve descrever, ao menos, natureza/categoria dos dados afetados, titulares envolvidos, medidas técnicas, riscos, motivo de eventual demora e medidas de mitigação.[^lgpd]
- A Resolução CD/ANPD nº 15/2024 está listada pela ANPD como vigente. A orientação operacional atual da Autoridade informa prazo de **três dias úteis** para comunicação à ANPD e aos titulares, contado do conhecimento do incidente, salvo prazo específico em outra legislação; admite comunicação preliminar e complementar fundamentada quando faltarem informações.[^anpd-incidentes][^anpd-regulamentacoes]
- A mesma orientação ressalta que somente incidentes confirmados, envolvendo dados pessoais e capazes de gerar risco ou dano relevante devem ser comunicados. Ela também diferencia vulnerabilidade não explorada de incidente e recomenda avaliação de contexto, dados, titulares, impactos e mitigação.[^anpd-incidentes]
- A ANPD informa que o regulamento exige manter registro dos incidentes de segurança com dados pessoais por ao menos cinco anos.[^anpd-rcis]

## Pontos para a revisão de regras, sem decisão proposta

1. Quais categorias de dados pessoais existem em conta, autenticação, catálogo, venda, imagem, auditoria, billing e suporte?
2. Em cada fluxo, quem determina finalidade e meios essenciais: plataforma, organização usuária ou ambos em atividades distintas?
3. Qual inventário de retenção separa obrigação comprovada, necessidade operacional, dado anonimizável e dado eliminável?
4. Como pedidos de titulares são recebidos, autenticados, encaminhados e respondidos sem expor dados de outra organização?
5. Qual processo documenta avaliação, contenção, comunicação e registro de incidentes, inclusive quando um suboperador informa um incidente à plataforma?

## Fontes primárias e autoridade

[^lgpd]: Presidência da República, [Lei nº 13.709, de 14 de agosto de 2018 (LGPD)](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm), texto legal oficial, arts. 5º, 15, 16, 18 e 46 a 49, consultado em 2026-07-14. Jurisdição: Brasil.

[^anpd-agentes]: ANPD, [Guia Orientativo para Definições dos Agentes de Tratamento de Dados Pessoais e do Encarregado](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/2021.05.27GuiaAgentesdeTratamento_Final.pdf), orientação oficial não vinculante, consultada em 2026-07-14. Jurisdição: Brasil.

[^anpd-direitos]: ANPD, [Direito dos Titulares](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares), orientação oficial, consultada em 2026-07-14. Jurisdição: Brasil.

[^anpd-incidentes]: ANPD, [Comunicação de Incidente de Segurança](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis), orientação e procedimento oficial, consultados em 2026-07-14. Jurisdição: Brasil.

[^anpd-rcis]: ANPD, [ANPD aprova o Regulamento de Comunicação de Incidente de Segurança](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-aprova-o-regulamento-de-comunicacao-de-incidente-de-seguranca), comunicado oficial sobre a Resolução CD/ANPD nº 15/2024, consultado em 2026-07-14. Jurisdição: Brasil.

[^anpd-regulamentacoes]: ANPD, [Regulamentações da ANPD](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd), lista oficial de atos e status, consultada em 2026-07-14. Registra a Resolução CD/ANPD nº 15/2024 como vigente. Jurisdição: Brasil.
