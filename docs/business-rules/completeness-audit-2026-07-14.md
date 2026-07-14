# Auditoria de completude pós-decisões

> **Nota histórica:** este relatório precede as waves DEC-BR-064..085. As decisões posteriores estão consolidadas em [research-decision-waves-2026-07-14.md](research-decision-waves-2026-07-14.md); gates externos continuam válidos.

**Status:** descoberta complementar, **não normativo**.  
**Data:** 2026-07-14.  
**Escopo:** módulos e dependências que não receberam cobertura suficiente antes de DEC-BR-001 a DEC-BR-058. Não altera essas decisões nem afirma aderência do ambiente promovido.

## Conclusão

O levantamento original ganhou cobertura material, mas não estava literalmente completo. Esta auditoria fecha a descoberta AS-IS dos módulos abaixo, registra provas indisponíveis e abre cinco decisões agrupadas. As regras normativas atuais continuam válidas somente no escopo que DEC-BR-001 a DEC-BR-058 cobrem.

## Evidência nova por domínio

### Identidade e sessão

- Google é o único provider público, mas account linking implícito por e-mail permanece ativo.
- A sessão possui expiração, token, IP e user-agent; não existe estado próprio de revogação nem gestão de dispositivos.
- `auth.login` só é auditado quando a sessão já possui organização ativa. Logout e falhas relevantes não deixam a mesma trilha.
- O contexto operacional reavalia membership, organização ativa e acesso faturável; portanto a suspensão bloqueia operações sem revogar explicitamente a sessão.
- Há fallback silencioso para a membership mais antiga, incompatível com dados legados que violem a futura regra de uma organização por pessoa.
- `hasBillableAccess` bloqueia o plano Free, contradizendo DEC-BR-006 e DEC-BR-010.

### Administração de plataforma

- Guard de admin usa grants ativos, não revogados e não expirados; suporte, operador e owner possuem capacidades distintas.
- Diretório reduz e-mail/tokens/metadata, mas ainda apresenta nomes e IDs. Não há política de necessidade, retenção ou auditoria de leitura desses dados.
- Suspender/reativar exige operador, confirmação, motivo, rate limit e auditoria. Não há fluxo de produção para conceder/revogar grants privilegiados.
- Notas internas exigem suporte e são auditadas, mas não têm classificação, tamanho máximo, retenção, paginação ou regra de edição.
- Dashboard interno mostra billing fixo em zero e gráfico mock; não pode ser tratado como telemetria operacional.

### Dashboard e relatórios

- A página combina período selecionado, total histórico e últimos 18 meses. Margem/retorno usam total histórico mesmo quando a tela está filtrada.
- Datas e formatação dependem do timezone do runtime, em desacordo com DEC-BR-049.
- Ranking depende de produto vivo para imagem, embora vendas preservem snapshots; soft delete pode retirar uma venda histórica do ranking.
- Estoque por categoria ignora saldo zero, mas a regra para arquivado/soft-deletado não está explícita.
- O gráfico de contribuição agrega até 18 meses na aplicação; não há limite/retenção de escala formal nem prova completa de invalidação de cache em cada mutação.

### APIs, jobs, imagens e e-mail

- APIs internas de R2 e reconcile requerem bearer secret e rate limit. O endpoint público de presign exige sessão/contexto, limita tentativas e audita a emissão.
- Imagens são privadas e a leitura revalida usuário/tenant; staging usa prefixo por organização/usuário, tamanho e content type conferidos antes do processamento.
- Reconcile de imagens remove órfãos com mais de 15 minutos por cron diário. Não há contrato explícito de retries, concorrência, esgotamento ou revisão humana no Inngest.
- E-mail de boas-vindas pode falhar sem bloquear onboarding. A tabela local marca `sent` após a resposta da API; eventos Resend são somente registrados, não aplicados ao lifecycle da mensagem.
- Health público verifica banco. Health de R2 pode consultar bucket/CORS quando configurado, mas não havia ambiente/segredo para provar conectividade nesta análise.

## Provas indisponíveis, sem inferência

1. Neon promovido: migrations aplicadas, RLS, grants, roles sem `BYPASSRLS`, índices e dados legados.
2. Google OAuth e Better Auth em produção: consentimento, linking, expiração/renovação e revogação efetivos.
3. R2 promovido: credenciais, buckets, CORS, lifecycle, retenção e leitura/escrita reais.
4. Inngest promovido: cron sincronizado, retries, alertas, concorrência e eventos recuperáveis.
5. Resend promovido: domínio verificado, assinatura de webhook, retry/replay e entrega dos eventos.

## Decisões humanas agrupadas necessárias

| Grupo | Decisão faltante | Risco se indefinida |
| --- | --- | --- |
| IDN | linking, recuperação, duração, revogação e auditoria de sessão | acesso indevido, suporte sem procedimento e inconsistência após suspensão |
| ADM | PII mínima por papel, gestão de grants, notas e auditoria de leitura | exposição excessiva e privilégio sem governança |
| DSH | escopo temporal, timezone explícito, histórico após soft delete e escala | métrica enganosa ou histórico inconsistente |
| OPS | retries, concorrência, exaustão e revisão humana de Inngest/R2 | perda silenciosa ou repetição de efeito |
| COM | lifecycle de e-mail, reenvio, supressão e retenção | comunicação declarada como entregue sem prova |

## Impacto na documentação normativa

As regras aprovadas não devem ser ampliadas por inferência. Depois das decisões acima, cada regra adicional precisa ganhar ID estável, ator, gatilho, pré-condições, entrada, saída, estados, efeitos em banco, idempotência, concorrência, auditoria, erros, mensagens e testes, conforme o critério de promoção do repositório.

## Referências

- [Pesquisa de provedores operacionais](research-operational-platforms-2026-07-14.md)
- [Dependências externas](external-dependencies.md)
- [Matriz de aderência](normative/adherence.md)
