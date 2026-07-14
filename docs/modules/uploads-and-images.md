# Uploads e imagens de produto

**Status:** implementação local e testes confirmados; buckets, CORS, lifecycle e credenciais reais não foram verificados. **Commit:** `886eda0`.

## Escopo e autorização

O fluxo usa R2 compatível com S3 em dois buckets configurados: staging recebe upload direto temporário; final recebe variantes processadas. A rota de presign exige sessão, `products:write`, rate limit de IP (60/min) e de usuário (120/min). Fonte: `apps/web/src/app/api/product-images/presign/route.ts:POST`.

| Cenário | Resultado confirmado |
| --- | --- |
| MIME diferente de JPEG/PNG/WebP | rejeitado pelo schema |
| tamanho vazio ou acima de 10 MiB | rejeitado pelo schema |
| presign sem sessão | `401` |
| excesso de tentativas | `429` com `Retry-After` |
| key staged de outro usuário/tenant | rejeitada por prefixo esperado |
| leitura sem sessão | `401` |
| leitura sem acesso, variante/version inválida ou objeto ausente | `404` |

O staging usa `staging/{organizationId}/{userId}/{uuid}`; o final usa `organizations/{organizationId}/products/{productId}/v{version}/{variant}.webp`. URLs de leitura são rotas autenticadas, não URLs públicas de R2. Fonte: `apps/web/src/features/products/{image-schema,image-storage,image-urls}.ts`.

## Processamento e substituição

Depois de confirmar prefixo, MIME declarado e tamanho do objeto staged, `sharp` processa bytes e gera `detail` e `table` WebP; dimensão máxima é 1600. O workflow sobe ambas variantes finais, devolve metadados e sempre tenta apagar staging. Falha após novo upload apaga a nova versão de forma best-effort.

Substituição incrementa a versão e troca metadados com comparação da versão anterior; se perder a corrida, remove a nova versão e não apaga a versão de outro escritor. Remoção limpa metadados apenas se ainda apontam para a versão observada; depois remove os objetos. Presign, substituição, remoção e leitura registram os audit events encontrados; a reconciliação de órfãs não grava audit event neste código.

## Órfãs, jobs e limites

O cron Inngest diário `0 4 * * *` compara chaves finais com metadados de produtos e remove órfãs com pelo menos 15 minutos. Também há endpoint interno GET/POST protegido por bearer e rate limit de 10/min. Não há quota por organização, limite de quantidade, validação antivírus nem lifecycle de bucket versionado encontrado.

RLS de `products` permite select ao job `product_image_reconcile`; o restante do acesso passa por tenant e membership. A configuração CORS real deve permitir PUT/HEAD, `Content-Type` e expor `ETag`, mas só o diagnóstico local foi encontrado, não a configuração do bucket.

## Testes e lacunas

`apps/web/src/features/products/image-{access,processing,storage,urls,reconcile-inngest}.test.ts` e `apps/web/tests/e2e/product-images-api.e2e.ts` cobrem autorização, processamento, namespace, CORS diagnosticável e agendamento. Falta teste contra R2 real para CORS, lifecycle, falhas parciais de rede, quotas e conteúdo malicioso além do decode/processamento Sharp.

## Referências

- `apps/web/src/features/products/image-workflow.ts:storeProductImageFromStage`
- `apps/web/src/features/products/image-access.ts:canReadProductImage`
- `apps/web/src/features/products/image-reconcile-inngest.ts`
- `apps/web/src/app/api/internal/product-images/reconcile/route.ts`
