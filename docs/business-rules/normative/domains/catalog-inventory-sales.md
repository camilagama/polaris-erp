# Catálogo, estoque e vendas

## Escopo, atores e objetivos

Owner/operator opera produto, estoque e venda; owner é exclusivo do soft delete. Não há SKU, variantes, compras, refund, settlement ou contas a receber no lançamento.

## Regras, estados e invariantes

- Produto ativo pode arquivar/desarquivar; soft delete final exige estoque zero, motivo, confirmação e auditoria.
- Custo, preço e saldo NÃO PODEM ser negativos. Arquivado NÃO PODE vender.
- Toda alteração de saldo DEVE gerar ledger append-only, inclusive venda/cancelamento. Ajuste com mesma chave retorna resultado original.
- Venda usa itens únicos, snapshots e precisão decimal; `completed → cancelled` é a única reversão e repõe somente estoque.

## Fluxos, bordas, concorrência e erros

Lock do produto e ledger transacional protegem saldo. Quota conta ativo+arquivado; Free/Pago permitem 1/5 imagens e 50/250 produtos. JPEG/PNG/WebP até 5 MiB; imagens exigem tenant autorizado. Cancelamento repetido, saldo insuficiente, produto soft-deletado e quota excedida são negados sem efeito parcial.

## Auditoria, privacidade, aderência e migração

Audit registra ator, motivo, correlação e efeito. Imagem retirada só sofre purge conforme retenção. Migrações: `product_images`, soft delete, contador/entitlement, ledger e proteção contra cascade. Testes: quota, gallery, retry, reconstrução de saldo, arredondamento e cancelamento concorrente. Referências DEC-BR-008,013,017,018,021–023,026–027,032–033,045,047,051,054–056,058.
