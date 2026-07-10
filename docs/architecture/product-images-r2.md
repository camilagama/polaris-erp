# Imagens de Produto com Cloudflare R2

## Variaveis de ambiente

Configure estas variaveis no ambiente do app:

```bash
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_STAGING=product-images-staging
R2_BUCKET_PUBLIC=product-images-public
PRODUCT_IMAGE_RECONCILE_SECRET=
```

`R2_PUBLIC_BASE_URL` pode existir em ambientes antigos, mas o app SaaS nao usa URL publica direta para imagens de produto. A entrega passa pela rota autenticada do Next.js para validar sessao, tenant e produto antes de retornar bytes.

## Modelo de entrega SaaS

- O bucket final continua armazenando variantes `detail.webp` e `table.webp`.
- A UI usa `/api/product-images/{organizationId}/{productId}/{version}/{variant}`.
- A rota valida sessao, membership na organizacao da URL, produto pertencente a mesma organizacao e versao da imagem igual ao banco.
- A resposta usa cache privado (`Cache-Control: private`) e `Vary: Cookie`.

Esse modelo evita que uma URL de CDN/R2 exponha imagem de outro tenant para alguem sem membership.

## Buckets

- `product-images-staging`: bucket privado para upload temporario.
- `product-images-public`: bucket final para as variantes processadas. Apesar do nome historico, os bytes sao servidos pelo app.

## CORS do bucket de staging

Use uma politica equivalente a esta no bucket de staging:

```json
[
  {
    "AllowedOrigins": [
      "http://127.0.0.1:3000",
      "http://localhost:3000",
      "https://seu-app.com"
    ],
    "AllowedMethods": ["PUT", "HEAD"],
    "AllowedHeaders": ["Content-Type", "Content-Length"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 300
  }
]
```

O browser envia o upload direto para o bucket de staging com URL pre-assinada. A policy deve estar no bucket de staging, nao no Next.js.

## Lifecycle recomendado

No bucket de staging:

- apagar objetos com prefixo `staging/` apos `1 dia`
- abortar uploads incompletos apos `1 dia`

No bucket final:

- nao aplicar expiracao automatica
- limpeza por substituicao/remocao no app e reconciliacao diaria

## Reconciliacao agendada

O projeto registra a funcao agendada `reconcile-product-images` no Inngest com cron `0 4 * * *` para:

- listar variantes finais em `organizations/`
- comparar com produtos e `image_version` no banco
- apagar variantes orfas

Teste manual:

```bash
curl -X POST https://seu-app.com/api/internal/product-images/reconcile \
  -H "Authorization: Bearer $PRODUCT_IMAGE_RECONCILE_SECRET"
```

O payload retorna contagens (`deletedCount`, `orphanedCount`, `scannedCount`) e nao retorna as chaves completas dos objetos, para reduzir exposicao operacional entre tenants.
