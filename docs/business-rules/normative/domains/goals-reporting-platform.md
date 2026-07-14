# Metas, relatórios, plataforma, privacidade e governança

## Regras de metas e relatórios

Meta nasce `active`; pode completar, expirar ou arquivar; só `archived` retorna a `active`. Free permite uma e pago três, uma por métrica. Job/evento DEVE resolver por CAS transacional. Métrica principal respeita filtro; histórico fica separado; datas usam `America/Sao_Paulo`. Venda cancelada não contribui. Migração exige índice por plano/métrica, job e cache-key temporal.

## Plataforma, PII e auditoria

Somente platform owner gere grants temporários. Support vê identificador por padrão; nome/e-mail exige caso, motivo e auditoria de leitura. Tokens, payload bruto e impersonation são proibidos. Mutação crítica DEVE abortar se auditoria falhar. Gravações, leitura sensível, grant e revogação exigem correlação; logs não retêm segredo.

## Privacidade, erros, gates e testes

Pedido de titular entra por suporte verificado. Encerramento corta operação; purge não ocorre sem tabela jurídica de retenção. Incidente segue runbook. Gates: retenção, mapa de tratamento, Neon/RLS promovido e provider. Testes obrigatórios: CAS de meta, timezone, PII reveal, grant TTL, audit rollback, DSR e incident runbook. Referências DEC-BR-014,031,036–042,046,048–049,057,060–061.
