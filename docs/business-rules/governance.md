# Proposta de governança de regras

**Status:** proposta de descoberta, **não normativa**. Requer aprovação antes de qualquer aplicação a PRs, commits ou `AGENTS.md`.

## Política proposta

1. Qualquer pessoa pode propor uma regra com um ID do domínio e evidência de código, banco, teste, decisão ou obrigação externa.
2. Produto aprova comportamento de usuário e escopo; engenharia aprova viabilidade; segurança revisa autorização, dados pessoais, logs e operações sensíveis; finanças/contábil revisam valor monetário, settlement e fiscal; jurídico/privacidade revisa retenção e direitos de dados.
3. Regra aprovada só entra em vigor com status, versão, responsável, data, migração e critérios de aceite claros.
4. PRs de comportamento devem citar IDs de regra e testes que demonstram fluxo principal, negação, concorrência e idempotência quando aplicáveis.
5. Regras substituídas permanecem com status `deprecated` ou `superseded`; não são renumeradas.
6. Incidentes devem referenciar regra/invariante violada e registrar se a proteção faltou no app, banco, UI ou operação.
7. Um check documental deve impedir links quebrados e exigir atualização da matriz regra-versus-teste quando um domínio comportamental for alterado.

## Estados propostos para o ciclo de vida

`proposta → aprovada → implementada|parcialmente implementada → deprecated|superseded`.

`AS-IS confirmado`, `AS-IS inferido`, `TO-BE documentado`, `contradição`, `lacuna` e `bug provável` continuam classificações de descoberta, não estados normativos.

## Estrutura mínima recomendada após aprovação

Manter os documentos raiz desta pasta para mapa, governança, glossário, invariantes, estados, decisões e aderência. Criar subpastas por domínio somente para módulos confirmados e somente quando regras aprovadas justificarem a separação. Não criar documentação normativa para compras/importações/refunds enquanto esses domínios não existirem ou não forem aprovados.

## Critérios de aderência por regra aprovada

- Implementada integralmente, parcialmente, contradita ou ausente.
- Protegida no banco, aplicação, UI ou somente operação.
- Testada em unit, integração, PostgreSQL, E2E e provider/sandbox quando necessário.
- Dependente de provider, jurisdição ou validação humana.
