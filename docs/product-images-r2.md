# Imagens de Produto com Cloudflare R2

## Variaveis de ambiente

Configure estas variaveis no ambiente do app:

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

- `product-images-staging`: bucket privado para upload temporario.
- `product-images-public`: bucket publico para servir as variantes finais `detail.webp` e `table.webp`.

## CORS do bucket de staging

Use uma politica equivalente a esta no bucket de staging:

```json
[
  {
    "AllowedOrigins": [
      "http://127.0.0.1:3000",
      "http://localhost:3000",
      "https://dgimports-1yer-1cyy8sh3u-summit-studios-projects.vercel.app",
      "https://tiagogama.vercel.app",
      "https://seu-app.com"
    ],
    "AllowedMethods": ["PUT", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 300
  }
]
```

### Script local (`scripts/configure-r2-staging-cors.mjs`)

Com variaveis `R2_*` em `.env.local`, rode:

```bash
node scripts/configure-r2-staging-cors.mjs
```

O script aplica `PUT` + `HEAD`, `Content-Type`, `ETag` e inclui por padrao `localhost`, `127.0.0.1`, `https://dgimports-1yer-1cyy8sh3u-summit-studios-projects.vercel.app` e `https://tiagogama.vercel.app`. Para outras origens (ex.: outra preview), defina `R2_STAGING_CORS_EXTRA_ORIGINS` com URLs separadas por virgula.

### Diagnostico (`/api/internal/health/r2`)

Com `CRON_SECRET` configurado, o servidor pode reler o CORS atual do bucket de staging (sem expor chaves):

```bash
curl -sS "https://SEU_DOMINIO/api/internal/health/r2" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Se o navegador bloquear o `PUT` com erro de preflight:

- confirme que o origin exato do app esta em `AllowedOrigins`
- configure o CORS no bucket `product-images-staging`, nao no Next.js
- lembre que a URL pre-assinada aponta direto para o host do bucket, entao sem essa policy o navegador bloqueia antes de enviar o arquivo

## Lifecycle recomendado

No bucket de staging:

- apagar objetos com prefixo `staging/` apos `1 dia`
- abortar uploads incompletos apos `1 dia`

No bucket publico:

- nao aplicar expiracao automatica
- a limpeza e feita pelo app na substituicao/remocao e pela reconciliacao diaria

## Cron de reconciliacao

O projeto inclui `vercel.json` com um cron diario para:

- apagar variantes orfas em `products/`
- manter o bucket publico consistente com o banco

Se nao usar Vercel Cron, chame manualmente:

```bash
curl -X POST https://seu-app.com/api/internal/product-images/reconcile \
  -H "Authorization: Bearer $CRON_SECRET"
```
