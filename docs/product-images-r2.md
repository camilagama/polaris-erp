# Imagens de Produto com Cloudflare R2

## Variáveis de ambiente

Configure estas variáveis no ambiente do app:

```bash
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_STAGING=product-images-staging
R2_BUCKET_PUBLIC=product-images-public
R2_PUBLIC_BASE_URL=https://media.seu-dominio.com
CRON_SECRET=
```

## Buckets

- `product-images-staging`: bucket privado para upload temporário.
- `product-images-public`: bucket público para servir as variantes finais `detail.webp` e `table.webp`.

## CORS do bucket de staging

Use uma política equivalente a esta no bucket de staging:

```json
[
  {
    "AllowedOrigins": [
      "http://127.0.0.1:3000",
      "http://localhost:3000",
      "https://seu-app.com"
    ],
    "AllowedMethods": ["PUT", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 300
  }
]
```

## Lifecycle recomendado

No bucket de staging:

- apagar objetos com prefixo `staging/` após `1 dia`
- abortar uploads incompletos após `1 dia`

No bucket público:

- não aplicar expiração automática
- a limpeza é feita pelo app na substituição/remoção e pela reconciliação diária

## Cron de reconciliação

O projeto inclui `vercel.json` com um cron diário para:

- apagar variantes órfãs em `products/`
- manter o bucket público consistente com o banco

Se não usar Vercel Cron, chame manualmente:

```bash
curl -X POST https://seu-app.com/api/internal/product-images/reconcile \
  -H "Authorization: Bearer $CRON_SECRET"
```
