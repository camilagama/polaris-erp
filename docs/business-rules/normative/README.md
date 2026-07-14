# Regras de negócio normativas

**Versão:** 1.2.0
**Aprovada em:** 2026-07-14  
**Autoridade:** decisões DEC-BR-001 a DEC-BR-085 em [registro de decisões](../decision-register.md).
**Escopo:** lançamento brasileiro do Hub Imports/Polaris.  
**Implementação:** parcial. Este conjunto define o comportamento alvo aprovado; não afirma que o código, banco, testes ou providers já o satisfaçam.

## Autoridade e leitura

Estes documentos substituem os rascunhos como fonte normativa para comportamento aprovado. Os rascunhos de descoberta preservam evidência AS-IS, riscos e histórico, mas não vencem uma regra desta pasta. Em caso de conflito:

1. regra normativa aprovada;
2. decisão referenciada;
3. gate externo aplicável;
4. evidência AS-IS da descoberta.

Uma mudança de comportamento exige nova decisão, versão e atualização da [matriz de aderência](adherence.md). Regras substituídas devem permanecer rastreáveis no registro, sem renumeração.

## Documentos

- [Regras aprovadas](approved-rules.md): contrato de produto por domínio.
- [Estados e permissões](states-and-permissions.md): atores, autorizações e transições permitidas.
- [Aderência e gates](adherence.md): distância entre regra, implementação, teste e dependência externa.
- [Aderência individual](adherence-by-rule.md): estado de cada contrato aprovado.
- [Perfis normativos individuais](individual-rule-profiles.md): ficha completa e não agrupada por contrato.
- [Perfis normativos resumidos](rule-profiles.md): índice histórico; não substitui as fichas individuais.

## Gates de lançamento

Os gates não autorizam exceções às regras:

1. tabela de retenção validada por categoria, fundamento, prazo e destino final, DEC-BR-040 e 074;
2. mapa de papéis de tratamento, categorias, compartilhamentos, aviso e contrato, DEC-BR-042 e 072;
3. validação contratual e em sandbox dos fluxos recorrentes Asaas/Woovi, incluindo assinatura, duplicidade, ordem, recuperação e suporte, DEC-BR-028, 029, 034, 035, 044 e 064;
4. prova promovida de RLS, backup/restore, jobs, e-mail, R2/CORS/lifecycle e OAuth, DEC-BR-076 e 077;
5. Privacy Lead, Incident Commander e suplentes designados, com runbook exercitado, DEC-BR-075.

Enquanto um gate estiver aberto, a capacidade dependente não pode ser lançada como concluída.
