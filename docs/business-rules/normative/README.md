# Regras de negócio normativas

**Versão:** 1.0.0  
**Aprovada em:** 2026-07-14  
**Autoridade:** decisões DEC-BR-001 a DEC-BR-058 em [registro de decisões](../decision-register.md).  
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

## Gates de lançamento

Os gates não autorizam exceções às regras:

1. tabela de retenção validada por categoria, fundamento, prazo e destino final, DEC-BR-040;
2. mapa de papéis de tratamento, categorias, compartilhamentos, aviso e contrato, DEC-BR-042;
3. validação contratual e em sandbox dos fluxos recorrentes Asaas/Woovi, incluindo assinatura, duplicidade, ordem, recuperação e suporte, DEC-BR-028, 029, 034, 035 e 044.

Enquanto um gate estiver aberto, a capacidade dependente não pode ser lançada como concluída.
