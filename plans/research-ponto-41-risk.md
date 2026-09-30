# Pesquisa do ponto 41 — classificar mudanças por risco

**Data da revisão:** 2026-09-25  
**Estado:** aceito em 2026-09-25. Q1–Q2 aprovadas: classificação por impacto/maior nível e verificação proporcional, sem alterar o baseline comum de CI.  
**Ponto do relatório:** adotar `low`, `medium` e `high`, com exemplos por tipo de mudança, e ligar cada nível a validações proporcionais.

## Resumo

Manter três níveis é adequado para o Polaris, mas a classificação deve representar o impacto possível da mudança, não o caminho/extensão dos arquivos. Os exemplos do relatório são um bom ponto de partida: UI/refatoração local tendem a baixo risco; lógica de negócio, endpoints, permissões e provedores tendem a médio; identidade, isolamento de organizações, billing financeiro, migrations relevantes e acesso/fluxo de produção tendem a alto.

Refino central: essas palavras são sinais, não regras mecânicas. O mesmo arquivo pode conter uma mudança visual de baixo risco ou uma alteração de autorização de alto risco; uma mudança de texto pode mudar uma promessa comercial. Classificar a intenção e o comportamento afetado, considerando impacto caso falhe, alcance, reversibilidade e incerteza. Não criar pontuação numérica, formulário de análise nem revisão humana adicional.

## Evidência no Polaris

- Ponto 20 foi aprovado para criar `verify:quick` com `docs:check`, uma varredura global do Ultracite, `typecheck:all` e `test:all`; `verify` acrescentará audits/boundaries, contrato de env, build do workspace, Knip e teste comportamental PostgreSQL em banco não produtivo. E2E web/admin permanecem jobs de CI separados. Os aliases ainda não existem no checkout e serão implementados no plano final.
- Ponto 21 aprovou chamar `verify:quick` no `pre-push`, depois de confirmar a instalação do Lefthook e medir a duração. P3 define CI/checks de PR como autoridade de integração; a proteção remota que os exigirá ainda precisa ser configurada após a transferência do repositório.
- A segurança do Polaris depende de controles encadeados: sessão, membership, organização ativa, billing/role, contexto transacional e RLS. A documentação ressalva que o estado de runtime/produção e o smoke de RLS em ambiente promovido ainda precisam de evidência. Referências locais: `docs/architecture/authorization-model.md`, `docs/architecture/rls-tenant-isolation.md`, `docs/security/application-security.md` e `docs/business-rules/invariants.md`.
- O banco tem migrations versionadas para isolamento tenant e billing, testes de comportamento PostgreSQL em banco descartável e um smoke de RLS separado. Mudar migrations, policies, contexto de tenant ou transições de billing exige evidência específica além de checks estáticos.
- P30 definiu reviewers de IA como apoio opcional; o usuário é o único revisor humano. Logo, “security review” não pode significar uma segunda aprovação obrigatória nem exigir que CodeRabbit/Copilot esteja disponível. Para `high`, significa uma revisão dirigida pelo próprio autor contra os invariantes e as fronteiras documentadas, com ferramenta assistiva opcional.
- P40 aprovou um campo de risco no template de PR, deixando escala e significado para este ponto. A classificação precisa ser curta e reproduzível para alimentar esse campo sem duplicar checklist de CI.

## Comparação com o Hub

O template atual do Hub pede que o autor teste o comportamento afetado e registre riscos ou rollback; seus runbooks têm procedimentos específicos para Staging, migrations e produção. No material auditado, não encontrei uma taxonomia geral `low/medium/high` para toda mudança. O valor transferível é registrar impacto operacional quando existe; não copiar o fluxo detalhado de staging/hotfix para todo PR do Polaris.

## O que dizem as fontes

### Fontes primárias

- O capítulo de Release Engineering do Google SRE diz que o processo deve se ajustar ao perfil de risco do serviço: desenvolvimento/pré-produção pode publicar com testes aprovados, serviços voltados a usuários podem ampliar uma implantação gradualmente, e infraestrutura sensível pode exigir rollout mais longo. Também trata configuração como possível fonte de instabilidade. Isso apoia perfis proporcionais, não uma única sequência pesada para toda mudança. [Google SRE — Release Engineering](https://sre.google/sre-book/release-engineering/)
- O Google SRE Workbook recomenda artefatos pequenos e autocontidos e explica que mudanças de software, configuração e dependências podem introduzir defeitos; canário e expansão gradual reduzem o alcance inicial e ajudam a detectar problemas. É um princípio para rollout futuro, não um requisito de staging para cada PR local. [Google SRE Workbook — Canarying Releases](https://sre.google/workbook/canarying-releases/)
- DORA descreve batches pequenos como forma de obter feedback rápido, facilitar triagem/correção e reduzir carga cognitiva de mudanças geradas com IA; também recomenda mudanças independentes e testáveis. Isso dá suporte a dividir mudanças não coesas e evitar que o nível de risco esconda um PR grande e difícil de revisar. [DORA — Working in small batches](https://dora.dev/capabilities/working-in-small-batches/) (página atualizada em 2025-12-08)
- GitHub documenta templates como meios de capturar propósito, issue relacionada e notas de teste, e CODEOWNERS como forma de encaminhar arquivos a responsáveis. Esses recursos dão contexto ou encaminham revisão; não substituem julgamento do impacto semântico nem calculam risco de uma alteração. O Polaris usa somente o campo compacto de risco aprovado em P40, sem inventar um checklist obrigatório. [GitHub — Managing and standardizing pull requests](https://docs.github.com/en/pull-requests/reference/managing-and-standardizing-pull-requests)
- NIST SP 800-128 recomenda integrar segurança à gestão de configuração e avaliar impactos de mudanças como parte da gestão de risco. O documento é voltado a sistemas federais e descreve processos formais mais pesados; aproveita-se aqui apenas o princípio de avaliar impacto em controles, sem importar CCB, segregação de funções ou burocracia institucional. [NIST SP 800-128](https://csrc.nist.gov/pubs/sp/800/128/upd1/final)

### Projetos e comunidade

- As diretrizes do projeto Matter/Connected Home over IP preferem PRs pequenos, relacionados a uma única preocupação e com testes automatizados; reconhecem que o CI completo pode ter custo significativo. É exemplo de projeto grande que separa escopo de mudança e evidência, sem uma escala universal de risco. [Project CHIP — Pull Request Guidelines](https://github.com/project-chip/connectedhomeip/blob/master/docs/contributing/pull_request_guidelines.md)
- Em uma discussão do fórum r/ExperiencedDevs, participantes descrevem profundidade de review variável conforme o risco e CI para verificações mecânicas. É uma experiência individual e há opiniões conflitantes no tópico; serve apenas como indício de que a adaptação é uma prática compreensível para equipes, não como fonte normativa. [Discussão sobre code review](https://www.reddit.com/r/ExperiencedDevs/comments/1p8v861/how_are_you_doing_code_reviews/)

Não encontrei uma escala universal padronizada de três níveis para classificar cada PR. `low/medium/high` deve ser tratado como vocabulário local e útil, não como uma medição objetiva de probabilidade.

## Avaliação dos critérios do relatório

| Exemplo do relatório | Avaliação para Polaris |
| --- | --- |
| `copy`, layout, visual | Geralmente `low` se não mudar semântica comercial/legal, acessibilidade/interação, exposição de dados ou autorização. O caminho visual não garante baixo risco. |
| Refatoração local | `low` apenas quando comportamento e contratos permanecem iguais, a alteração é localizada e há um sinal de regressão adequado. Refatoração de auth, tenancy ou billing é `high`, ainda que chamada “refactor”. |
| Lógica de negócio | `medium` por padrão, mas `high` quando afeta billing/entitlements, saldos, auditoria crítica, isolamento de organização, auth ou integridade durável. |
| Novo endpoint | `medium` quando alcance, identidade e dados retornados estão limitados por controles conhecidos; `high` se público/privilegiado, multi-tenant, interno de produção ou relacionado a auth/pagamento. |
| Permissões | `medium` para alteração local de capacidade sem mudança de fronteira; `high` se afeta acesso cross-tenant, grants de platform admin, RLS, sessão ou acesso privilegiado. |
| Comportamento de provider | `medium` para integrações sem efeito de acesso/financeiro; `high` para checkout, webhooks, reconciliação, cobrança, entitlement ou operação capaz de produzir efeitos financeiros. |
| Auth, billing, RLS, migrations | Bons gatilhos para `high` quando a mudança altera o comportamento, controle, estado ou contrato. Uma menção em docs, rename sem efeito, ou atualização visual dentro da área não deve ser escalada apenas pelo caminho. Para migration que muda schema/dados/policies ou compatibilidade, manter `high`; não presumir rollback trivial. |
| Workflow de produção, secrets | `high` se muda deploy/promoção, identidade/permissões do job, escopo/uso de credencial ou operação sobre produção. Alterar docs ou `.env.example` sem alterar o contrato externo não é automaticamente `high`. |

## Regra recomendada para classificação

Classificar a mudança pelo pior efeito plausível que o diff pode causar no sistema, considerando: (1) consequência para cliente/dados se falhar; (2) alcance — uma tela, um tenant, todos os tenants ou infraestrutura; (3) reversibilidade/compatibilidade; (4) incerteza e interação com outras mudanças. Não estimar uma probabilidade matemática e não pontuar dimensões.

- **`low`** — efeito localizado e facilmente reversível, sem mudança de regra de negócio relevante, acesso/dados, integração externa ou operação/deploy. Exemplos: layout, copy sem alteração de promessa/consentimento, documentação, refatoração local comprovadamente equivalente.
- **`medium`** — muda comportamento de usuário/regra de negócio, endpoint ou integração, mas mantém alcance e recuperação limitados, sob os guardrails existentes e sem alterar fronteira crítica de identidade, organização, financeiro ou produção.
- **`high`** — altera ou pode enfraquecer autenticação, autorização privilegiada, isolamento entre organizações/RLS, billing/estados financeiros, integridade/durabilidade dos dados/migrations, credenciais/segredos, deploy/promoção/produção; ou pode causar perda/exposição ampla e difícil de reverter.

### Arquivos e caminhos não são classificação

Use diretórios como sinal para investigar, nunca como etiqueta automática. Por exemplo, CSS em `apps/web` pode ser `low`, enquanto texto nessa tela que muda uma obrigação comercial pode ser `medium`; mudança em um handler da mesma app pode ser `high` se contorna sessão/tenant; alteração em `.github/workflows` pode ser `low/medium` para CI sem privilégios ou `high` se amplia acesso a secrets/deploy de produção. A intenção e o efeito da mudança prevalecem sobre extensão, quantidade de arquivos, título do PR e instrução dada ao agente.

### Mudanças compostas e regra do maior impacto

Para o PR, usar **o nível mais alto aplicável**: uma única mudança `high` torna o PR `high`; não tirar média entre tópicos. Porém “usar o maior impacto” não deve ser só um `max()` entre linhas avaliadas isoladamente: duas mudanças `medium` podem, combinadas, criar um modo de falha `high` (por exemplo, novo endpoint mais mudança de grant/contexto tenant que permite leitura cross-tenant). Escalar para `high` quando a interação amplia o alcance, enfraquece um controle crítico, muda estado financeiro/dados de forma difícil de reverter ou deixa o efeito combinado sem limite comprovável. Muitos itens `low` não somam automaticamente para `high`; se o volume/coupling tornar o diff difícil de entender e validar, dividir o PR ou reavaliar a classificação pelo impacto emergente. Se houver dúvida material entre dois níveis, usar o superior até conseguir delimitar o efeito.

## Verificações proporcionais propostas

Estas verificações preservam a CI uniforme aprovada: depois que P3 for configurado remotamente, todos os PRs continuarão sujeitos aos mesmos checks obrigatórios, qualquer que seja o nível. O nível orienta trabalho local e evidência extra específica; não concede bypass de CI.

| Nível | Verificação local/revisão recomendada |
| --- | --- |
| `low` | `verify:quick` conforme P20/P21; teste focal/manual apenas quando há comportamento a verificar. Para documentação isolada, `docs:check` e revisão do documento podem ser suficientes, mas `pre-push` ainda chamará `verify:quick` conforme decisão P21. |
| `medium` | `verify` conforme perfil completo do P20, mais teste focal de regra/rota/provider e conferência da documentação quando semântica ou contrato mudou. Selecionar integração/E2E direcionado se esse for o único sinal que prova o fluxo alterado. |
| `high` | `verify` mais evidência dirigida ao invariante de maior risco: por exemplo teste comportamental PostgreSQL/RLS para isolamento/migration, casos negativos para auth/permissions, ciclo/webhook controlado para billing/provider, ou validação de workflow/credenciais sem expor secret. Fazer auto-revisão de segurança contra `docs/security/application-security.md` e docs de domínio/arquitetura. Atualizar ADR/runbook somente se a decisão, contrato ou operação mudar. Smoke em staging/homologação quando existir e for relevante; antes disso, usar ambiente não produtivo local/CI e registrar limite de evidência, sem alegar teste de produção. |

O `verify` de P20 ainda será implementado e não substitui os jobs E2E/PostgreSQL separados da CI nem evidência de infra promovida. Não definir `high` como obrigação de executar toda ferramenta ou todos os testes concebíveis: a validação extra precisa ser escolhida pelo invariante e pelo efeito da mudança. Nenhum risco de cliente real deve ser testado em ambiente de produção como parte da classificação.

## Recomendação para o template P40 e a política futura

No `.github/pull_request_template.md`, usar um campo único `Risco: low | medium | high` e uma linha de instrução: “classifique pelo efeito comportamental e operacional, não só pelos arquivos; se mudanças combinadas criarem risco maior, use o nível combinado”. Não embutir todas as regras nem uma lista fixa de comandos. O autor informa o nível e, para `medium/high`, uma frase curta apontando o impacto e a evidência/teste especial; para `low`, sem explicação extra quando o motivo estiver claro no diff.

No futuro `AGENTS.md`, manter uma síntese de três níveis e apontar para fonte canônica de verificação/invariantes. P42 deve detalhar o Definition of Done específico dos níveis junto com esta política, removendo duplicações: `verify:quick`/`verify` continuam vocabulário de P20, e os testes adicionais são escolhidos conforme área afetada. Não tornar o nível um gate autodeclarado que altera checks remotos; uma etiqueta incorreta deve ser corrigida pela inspeção do diff e consequências plausíveis.

## Limites

Risco é um modelo de triagem e escolha de evidência, não prova de segurança ou qualidade. A classificação depende da compreensão dos efeitos e dos invariantes; CI verde não comprova configuração real, RLS em banco promovido, provider real ou deploy seguro. Homologação persistente e os checks de release ficam condicionados às decisões P4/P5. Não houve alteração de código/configuração, nem execução de teste.
