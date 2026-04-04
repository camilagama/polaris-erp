# Deploy na Vercel (guia iniciante)

Este projeto usa **Next.js 16**, **Bun** no repositório e **PostgreSQL (Neon)**. O deploy mais simples é conectar o GitHub à Vercel e deixar cada push gerar um deployment.

## 1. Pré-requisitos

- Conta Vercel com acesso ao time (no Cursor, o plugin da Vercel já pode listar times e projetos).
- Repositório Git remoto (GitHub/GitLab/Bitbucket) com este código.
- Projeto **Neon** com branch de **produção** e, idealmente, branch separada para **preview/E2E** (ver [database-environments.md](./database-environments.md)).
- OAuth Google configurado para a URL real do app.
- Buckets **Cloudflare R2** (staging + público) e CORS do staging alinhado ao domínio do app (ver [product-images-r2.md](./product-images-r2.md)).

## 2. Criar o projeto na Vercel

1. Em [vercel.com/new](https://vercel.com/new), **Import** o repositório `dgimports`.
2. **Framework Preset**: Next.js (detectado automaticamente).
3. **Root Directory**: raiz do repo (padrão).
4. **Build & Install**:
   - Se a Vercel oferecer escolha de gerenciador, prefira alinhar com o repo (**Bun**), já que o `bun.lock` existe.
   - Comandos típicos: **Build** `bun run build` ou deixar o default do Next; **Install** `bun install` (ou equivalente na UI).

## 3. Variáveis de ambiente (Production)

Configure em **Project → Settings → Environment Variables**, escopo **Production** (e depois replique/adapte para **Preview**).

| Variável | Onde usar | Notas |
|----------|-----------|--------|
| `DATABASE_URL` | Runtime | Connection string **pooler** da branch Neon de produção. |
| `DATABASE_URL_DIRECT` | Apenas ferramentas locais/CI de migração | Opcional na Vercel se você só migra fora da plataforma. |
| `BETTER_AUTH_SECRET` | Runtime | Segredo forte (32+ caracteres). |
| `BETTER_AUTH_URL` | Runtime | URL canônica do site, ex. `https://seu-dominio.com` (sem barra final). |
| `NEXT_PUBLIC_APP_URL` | Build + runtime | Mesma origem pública, URL válida. |
| `GOOGLE_CLIENT_ID` | Runtime | Obrigatório em produção (`auth.ts` valida). |
| `GOOGLE_CLIENT_SECRET` | Runtime | Idem. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Build + runtime | Idem. |
| `R2_*` + `CRON_SECRET` | Runtime / cron | Ver [product-images-r2.md](./product-images-r2.md). **`CRON_SECRET`** deve existir para o reconcile diário autenticar. |
| `SENTRY_DSN` | Runtime | DSN do projeto (server). |
| `NEXT_PUBLIC_SENTRY_DSN` | Build + runtime | Mesmo projeto (browser); necessário para erros no cliente. |
| `SENTRY_ORG` | Build | Slug da org (upload de source maps). |
| `SENTRY_PROJECT` | Build | Slug do projeto. |
| `SENTRY_AUTH_TOKEN` | Build | Token com permissão de release/upload (CI ou Vercel build). Opcional: sem ele, o build continua, mas **source maps não sobem**. |
| `ALLOW_PLAYWRIGHT_BOOTSTRAP` | Nunca em produção real | Só E2E com banco isolado. |

**Preview**: use **outra** `DATABASE_URL` (branch Neon de preview/dev). Se Preview herdar a URL de produção, qualquer teste na preview **escreve em produção**.

Referência de validação no código: [`src/lib/env.ts`](../src/lib/env.ts).

## 4. Domínio e Google OAuth

1. Em **Vercel → Domains**, associe o domínio de produção (e opcionalmente subdomínio de preview).
2. No **Google Cloud Console**, em credenciais OAuth:
   - **Authorized JavaScript origins**: `https://seu-dominio.com`, `https://*.vercel.app` (se usar login em preview).
   - **Authorized redirect URIs**: inclua o callback do Better Auth (normalmente `https://seu-dominio.com/api/auth/callback/google` e equivalente em preview se aplicável).

`BETTER_AUTH_URL` e `NEXT_PUBLIC_APP_URL` devem refletir exatamente a origem usada no navegador.

## 5. Migrações do banco

As migrações **não** rodam automaticamente no deploy por padrão. Antes do primeiro tráfego real:

1. Aponte `DATABASE_URL` localmente para a branch de produção (ou use `DATABASE_URL_DIRECT` no Drizzle).
2. Execute: `bun run db:migrate`

## 6. Cron (reconcile de imagens)

O [`vercel.json`](../vercel.json) agenda o path `/api/internal/product-images/reconcile` contra o deployment de **produção**. O **Cron da Vercel chama esse URL com GET**; a rota aceita **GET e POST** com a mesma checagem de `Authorization`.

- Defina `CRON_SECRET` na Vercel (a plataforma envia `Authorization: Bearer <CRON_SECRET>` nas invocações agendadas, quando a variável existe).

Teste manual (POST ou GET):

```bash
curl -X POST "https://SEU_DOMINIO/api/internal/product-images/reconcile" \
  -H "Authorization: Bearer $CRON_SECRET"

curl -X GET "https://SEU_DOMINIO/api/internal/product-images/reconcile" \
  -H "Authorization: Bearer $CRON_SECRET"
```

## 7. Sentry + Vercel

- No Sentry: integração **Vercel** (releases e, se desejar, upload de source maps alinhado ao deploy).
- Em produção, defina `SENTRY_DSN` e `NEXT_PUBLIC_SENTRY_DSN`.
- Para stack traces legíveis: configure `SENTRY_ORG`, `SENTRY_PROJECT` e `SENTRY_AUTH_TOKEN` no ambiente de **build** (Vercel).

## 8. Smoke checks pós-deploy

1. `GET /api/health` → `{ "ok": true, ... }`
2. Login Google com usuário já provisionado na tabela `users`.
3. Upload de imagem de produto (valida R2 + CORS).
4. No dashboard Vercel: **Logs** do último deployment e execução do cron.

## 9. Ajuda via plugin da Vercel (Cursor)

Com o plugin autenticado, dá para:

- **`list_teams`**: descobrir o `teamId` / slug.
- **`list_projects`** / **`get_project`**: inspecionar projeto após o import.
- **`list_deployments`** / **`get_deployment`** / **`get_deployment_build_logs`** / **`get_runtime_logs`**: depurar build e runtime.
- **`deploy_to_vercel`**: disparar deploy do contexto atual (útil após o projeto existir e estar linkado).

Se **`list_projects`** vier vazio, ainda não há projeto no time: complete o passo **Import** no site da Vercel primeiro.

## 10. CI (GitHub Actions)

O workflow [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) roda `check`, `test` e `build` com env mínima. Para **subir source maps no CI**, adicione secrets `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` e repasse no step de `build` (opcional).
