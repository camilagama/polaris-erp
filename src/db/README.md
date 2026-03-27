# Setup Neon + Drizzle ORM - dgimports

## 📋 Configuração Inicial

### 1. Obter Connection String do Neon

1. Acesse: https://console.neon.tech/app/projects/morning-forest-50221523
2. Clique em "Connection string" no dashboard
3. Copie a URL (deve parecer com: `postgresql://neondb_owner:...@...neon.tech/neondb?sslmode=require`)
4. Cole em `.env.local`:

```bash
DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-young-water-a5e4e8a2-pool.sa-east-1.aws.neon.tech/neondb?sslmode=require"
```

### 2. Gerar Migrações

```bash
# Esta comando cria arquivos de migração baseado no schema
bun run db:generate
```

### 3. Aplicar Migrações

```bash
# Opção 1: Push direto (recomendado para desenvolvimento)
bun run db:push

# Opção 2: Executar migrações geradas
bun run db:migrate
```

## 🗄️ Estrutura do Banco

- **users**: Armazenar usuários do sistema
- **imports**: Registros de importação de dados
- **import_logs**: Logs detalhados de cada importação

## 💻 Usando no App

### Exemplo em Server Component (Next.js)

```typescript
import { db } from '@/db';
import { users } from '@/db/schema';

export default async function Page() {
  const allUsers = await db.select().from(users);
  return <div>{/* Render users */}</div>;
}
```

### Exemplo em API Route

```typescript
// app/api/users/route.ts
import { db } from '@/db';
import { users } from '@/db/schema';

export async function GET() {
  const allUsers = await db.select().from(users);
  return Response.json(allUsers);
}

export async function POST(req: Request) {
  const { name, email } = await req.json();
  
  const newUser = await db
    .insert(users)
    .values({ name, email })
    .returning();
  
  return Response.json(newUser);
}
```

## 🛠️ Drizzle Kit Commands

```bash
# Ver schema em interface visual
bun run db:studio

# Gerar migrações (após mudanças no schema)
bun run db:generate

# Aplicar migrações via arquivo SQL
bun run db:migrate

# Push direto ao banco (dev only)
bun run db:push
```

## 📖 RepositóriosDrizzle Schema

Edite `src/db/schema.ts` para adicionar/modificar tabelas. Sempre rode `db:generate` após mudanças.

## 🔒 Segurança

- ✅ `.env.local` é ignorado no Git
- ✅ Use variáveis de ambiente para secrets
- ✅ Neon requer SSL (já configurado)

## 📞 Próximos Passos

1. Atualize `.env.local` com a connection string real
2. Execute `bun run db:push` para criar as tabelas
3. Comece a usar `db` no seu código!

---

**Documentação**: https://orm.drizzle.team/ | https://neon.com/docs
