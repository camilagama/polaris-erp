# Auditoria de aderência à solicitação inicial

> **Nota histórica:** este retrato precede as waves de pesquisa DEC-BR-064..085 e a emissão dos perfis e da aderência individuais na norma v1.2.0. As lacunas de decisão e de documentação indicadas aqui devem ser lidas com esse recorte temporal; gates de ambiente, provider e jurídico permanecem abertos.

**Status:** auditoria de completude, **não normativa**.  
**Data:** 2026-07-14.  
**Fonte de requisitos:** `C:\Users\Junior\.codex\attachments\4b6e67e6-7e82-4199-95c8-33370f983256\pasted-text-1.txt`.  
**Método:** cada requisito foi confrontado com artefatos atuais, código rastreável e prova de ambiente disponível. Ausência de prova não foi tratada como conclusão favorável.

## Veredito

Na data desta primeira auditoria, a solicitação inicial **não estava completamente atendida**. A execução complementar posterior concluiu os 15 domínios, DEC-BR-059..063, a aderência individual e os perfis normativos v1.1.0. Este documento preserva o diagnóstico histórico; a situação final está em `final-completion-audit-2026-07-14.md`.

Há dois tipos de pendência:

1. **cobertura/metodologia:** módulos e camadas sem análise demonstrável, subagentes obrigatórios não executados, campos de regra e fluxos ponta a ponta incompletos;
2. **decisão/gate externo:** políticas adicionais de identidade, plataforma, dashboard, jobs e e-mail; ambiente promovido, provider e validações jurídicas ainda sem prova.

## Inventário verificável do repositório

- Há **461** arquivos TypeScript/TSX/SQL rastreados no repositório, conforme inventário completo de arquitetura.
- A descoberta cita módulos de domínio e serviços, mas não contém uma matriz que associe cada arquivo/módulo rastreado a uma leitura, regra ou classificação.
- Os principais domínios de negócio foram cobertos. A cobertura de UI, componentes, configuração, scripts e todos os cenários UX não é demonstrável pela documentação atual.
- Não havia conexão Neon/MCP utilizável nesta análise. Schema, migrations e testes locais não comprovam RLS, grants, roles, índices ou migrations do banco promovido.

## Requisitos explícitos versus prova atual

| Requisito da solicitação | Estado | Evidência ou lacuna decisiva |
| --- | --- | --- |
| Analisar minuciosamente todo o repositório | **Parcial** | `architecture-inventory-2026-07-14.md` mapeia 637 arquivos e 461 fontes; revisão demonstrável de componentes/UI/scripts/configuração ainda não é exaustiva. |
| Regras explícitas, implícitas, acidentais, UI-only, backend-only, DB-only e test-only | **Parcial** | `rules-inventory.md` classifica muitas regras e contradições, mas não possui cobertura por camada para todo o código e não inventaria regras exclusivas de UI/teste de forma exaustiva. |
| Regras planejadas e regras essenciais ausentes | **Parcial** | DEC-BR e `adherence.md` cobrem a maior parte; lacunas adicionais estão em `completeness-audit-2026-07-14.md`. |
| Avaliar sentido, propor, simplificar e remover regras | **Parcial** | 58 decisões possuem recomendação e escolhas; a auditoria pós-decisões identificou cinco grupos novos ainda sem alternativas/documento de decisão. |
| Avaliar impacto técnico, operacional, financeiro, segurança e UX | **Parcial** | Impactos aparecem em decisões principais; não há avaliação uniforme por regra e UX completa não foi percorrida. |
| Debater todas as decisões materiais antes de oficializar | **Não atendido** | DEC-BR-001..058 foram respondidas, porém a auditoria posterior encontrou decisões materiais de identidade, admin, dashboard, jobs e e-mail ainda não debatidas. |
| Documentação normativa somente após debate completo | **Não atendido estritamente** | `normative/` foi criada após DEC-BR-001..058, mas antes das decisões materiais posteriores. Ela deve ser tratada como versão 1.0 do escopo aprovado, não como encerramento integral. |
| Não alterar código, banco, dados, migrations, deploy ou integrações | **Atendido** | Mudanças desta iniciativa estão em `docs/business-rules/**`; não há alteração de código/configuração/migration atribuível à descoberta. |
| Usar 15 subagentes obrigatórios | **Não atendido** | Há evidência de alguns levantamentos independentes, mas não há 15 execuções, entregas e consolidação correspondentes aos Subagents 1..15. |
| Confrontar conclusões de todos os subagentes | **Não atendido** | Sem resultados dos 15 domínios, não é possível confrontar e deduplicar toda a análise pedida. |
| Ler banco em modo read-only, incluindo RLS/grants/migrations aplicadas | **Parcial/bloqueado por acesso** | Migrations e schema versionados foram lidos; banco promovido não foi acessível e não pode ser inferido. |
| Pesquisa em fontes primárias, com aplicabilidade e limites | **Parcial** | Há pesquisas de LGPD, billing, mercado, webhooks, providers operacionais e Google OAuth. Contratos/sandbox de Asaas e Woovi e a prova de ambiente permanecem gates. |
| Extração completa para cada regra com todos os campos exigidos | **Não atendido** | `rules-inventory.md` usa uma tabela curta: ID, domínio, classificação, ator/recurso/ação, regra, evidência e teste. Faltam, por regra, pré-condições, gatilho, efeitos, erros, transação, idempotência, concorrência, logs/métricas e demais campos requeridos. |
| Invariantes com imposição, camada, prova e impacto | **Parcial** | `invariants.md` cobre invariantes nucleares; não demonstra todos os invariantes solicitados, nem prova promovida de banco. |
| Máquinas de estado para todas as entidades relevantes | **Parcial** | `state-machines.md` e `entities-and-flows.md` cobrem produto, venda, meta, subscription, webhook/outbox e alguns ciclos. Usuário, account, sessão, convite, pagamento, invoice, upload, job e feature flag não têm máquina completa com todos os campos pedidos. |
| Fluxos ponta a ponta para cada caso relevante, com 27 itens | **Não atendido** | `entities-and-flows.md` detalha cinco fluxos. Não cobre todos os casos relevantes nem todos os 27 itens por fluxo. |
| 20 entregáveis de descoberta | **Parcial** | Mapa de domínio, atores, entidades, estados, fluxos, regras, invariantes, permissões, testes, decisões, providers e plano existem. Faltam inventário exaustivo de bugs, matriz de regras por módulo completa, plano de debate completo pós-auditoria e prova de cobertura integral. |
| Estrutura documental avaliada sem criar módulos inexistentes | **Parcial** | A estrutura foi adaptada de forma compacta e domínios inexistentes foram marcados N/A. Faltam `glossary.md`, `error-policy.md` e alguns documentos propostos; isso é aceitável apenas se a decisão de não criá-los for explicitada. |
| IDs estáveis por domínio e rastreio de substituição | **Parcial** | Há IDs como `AUTH-001`, `STOCK-001` e DEC-BR. Nem toda regra aprovada foi decomposta em ID único, e o vínculo DEC-BR → regra normativa é agrupado. |
| Template normativo completo para cada regra final | **Não atendido** | `normative/approved-rules.md` agrupa 18 regras e contém somente texto normativo/referências. O template pedido tem cerca de 40 campos, ausentes por regra. |
| Governança: aprovação, versionamento, migração, PR/commit/incidente/AGENTS | **Parcial** | `governance.md` propõe processo, status e PRs; não foi aprovado, não define responsáveis concretos, nem integra `AGENTS.md` como a solicitação condiciona. |
| Relatório de aderência por regra aprovada | **Parcial** | `normative/adherence.md` é agregado por domínio, não individualmente por regra/camada/teste/gate. |
| Plano de PRs 0..14 | **Parcial** | `implementation-plan.md` tem fases 0..8 coerentes, mas não o plano solicitado 0..14 nem passos verificáveis no detalhe do skill `writing-plans`. |

## Cobertura dos 15 domínios obrigatórios

| Subagent/domínio pedido | Estado | Cobertura atual e falta residual |
| --- | --- | --- |
| 1. Inventário de domínio e arquitetura | **Parcial** | Mapa de produto existe; inventário de arquivos, rotas, páginas e componentes não está consolidado. |
| 2. Identidade e autenticação | **Parcial** | Google-only e onboarding foram analisados; linking, recuperação, revogação, falhas e logout só ganharam cobertura complementar e ainda exigem decisão. |
| 3. Organizações e multi-tenancy | **Coberto com gate** | Regras e contradições documentadas; prova de RLS/runtime e migração de legado ausentes. |
| 4. Planos, billing e entitlements | **Coberto com gates** | Decisões detalhadas; provider/sandbox, lifecycle efetivo e entitlements runtime pendentes. |
| 5. Admin interno | **Parcial** | Guard, suspensão e suporte cobertos; grants em produção, PII, auditoria de leitura e dashboard mock requerem decisão. |
| 6. Catálogo, produtos e imagens | **Coberto com lacunas** | Estoque/arquivamento/imagem avaliados; galeria, 5 MiB, retenção e R2 promovido não estão implementados/provados. |
| 7. Fornecedores, compras e importações | **N/A justificado** | Não há módulo operacional localizado. Fiscal/importação não foi inventado sem jurisdição. |
| 8. Estoque | **Coberto com lacunas** | Locks, custo, saldo e cancelamento avaliados; ledger único e idempotência manual são TO-BE. |
| 9. Vendas, taxas, cancelamentos e estornos | **Coberto com lacunas** | Cálculo, snapshot e cancelamento cobertos; inexistência de refund/settlement é N/A aprovado; equação no banco e reconciliação pendem. |
| 10. Metas, métricas e relatórios | **Parcial** | Lifecycle e cálculo cobertos; timezone, escopo de período, soft delete histórico, cache e escala requerem decisão/prova. |
| 11. APIs, jobs, eventos e integrações | **Parcial** | Webhooks/outbox e image reconcile cobertos; política de retry/concurrency/DLQ/revisão ainda não está definida por domínio. |
| 12. Segurança, privacidade e auditoria | **Parcial com gates** | Auditoria, isolamento e LGPD mapeados; retenção, papéis de tratamento, RLS promovido e incident response não são comprovados. |
| 13. UX e fluxos de usuário | **Não atendido** | Não há percurso sistemático de todos os perfis, mobile, rede instável, repetição de ação, mensagens e diferenças web/admin/API/job. |
| 14. Testes e cobertura das regras | **Parcial** | Matriz por domínio existe; não há teste individual por regra nem classificação exaustiva unit/integration/E2E/concorrência/idempotência/segurança. |
| 15. Governança das regras | **Parcial** | Proposta consistente, porém não aprovada/operacionalizada e sem integração condicionada com `AGENTS.md`. |

## Pesquisa que ainda falta ou não pode substituir gate

1. **Google OAuth:** fonte oficial agora está em `research-google-oauth-2026-07-14.md`; ela reforça que e-mail não deve ser chave de linking, mas não decide política local de sessão/recuperação.
2. **Asaas e Woovi:** documentação já levantada não prova contrato comercial, capacidade de PIX recorrente, assinatura, retry e suporte da conta real. Exigem sandbox/contrato.
3. **Neon/Postgres promovido:** requer consulta read-only ao ambiente alvo, incluindo `pg_policies`, roles, grants, RLS e histórico de migrations.
4. **R2, Inngest e Resend promovidos:** documentação oficial não prova configuração, domínio, cron, retry, CORS, lifecycle ou entregas reais.
5. **LGPD/contábil/fiscal:** fontes gerais existem, mas a tabela de retenção, papéis de tratamento e qualquer impacto fiscal/importador dependem de validação competente e contexto contratual.

## Correção do significado de “completo”

Para considerar a solicitação inicial completamente atendida, ainda seria necessário: executar ou justificar formalmente os 15 domínios; registrar a cobertura de todos os módulos/camadas relevantes; completar os campos de extração e os fluxos; debater as decisões pós-auditoria; reemitir a norma por regra no template solicitado; criar aderência individual; e concluir ou registrar os gates externos sem os confundir com implementação.

Enquanto isso não ocorrer, a conclusão correta é: **descoberta substancial, decisões iniciais consolidadas, documentação normativa parcial de escopo, mas não revisão integral finalizada**.
