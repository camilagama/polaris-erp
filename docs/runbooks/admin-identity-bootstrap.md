# Bootstrap de identidade administrativa

O admin e o web usam identidades, sessões, cookies e clientes OAuth diferentes. Um login no web nunca cria uma organização, membership ou identidade administrativa.

## Configuração externa

1. Crie um OAuth Client do tipo Web Application exclusivamente para o admin no Google Cloud Console.
2. Registre exatamente estes redirect URIs:
   - `http://localhost:3001/api/auth/callback/google`
   - `https://<admin-domain>/api/auth/callback/google`
3. No projeto Vercel do admin, configure `ADMIN_APP_URL`, `ADMIN_BETTER_AUTH_SECRET`, `ADMIN_GOOGLE_CLIENT_ID` e `ADMIN_GOOGLE_CLIENT_SECRET`. O segredo do admin deve ter pelo menos 32 caracteres e não pode ser o segredo do web em produção.
4. Mantenha Vercel Authentication habilitado no projeto Vercel do admin. Essa é uma barreira externa; não substitui OAuth nem o grant interno.
5. Execute a migration em uma branch Neon não produtiva e valide os testes. Só então promova para produção.

## Primeiro owner

Depois da migration, defina somente para a execução do comando:

```powershell
$env:PLATFORM_ADMIN_EMAIL = "contato@agenciasummit.com"
$env:PLATFORM_ADMIN_ROLE = "owner"
$env:PLATFORM_ADMIN_BOOTSTRAP_REASON = "Bootstrap auditado do primeiro owner da plataforma"
bun run platform-admin:bootstrap
```

O comando cria um único enrollment pré-aprovado, válido por sete dias, e um grant de owner válido por 90 dias. Não cria `users`, organização, membership ou sessão do tenant. A primeira autenticação Google no admin reivindica esse enrollment e cria a identidade administrativa.

Após o primeiro claim, owners gerenciam novos e-mails pré-aprovados e grants pelo console. Não execute novamente o script: ele falha se já houver enrollment ou platform admin.

## Validação

1. Abra `http://localhost:3001`; visitante deve ver `/sign-in`.
2. Use o e-mail pré-aprovado. A sessão deve usar o cookie `polaris_admin` e entrar no dashboard.
3. Use um e-mail não pré-aprovado. Ele não pode criar identidade, sessão utilizável, usuário tenant, organização ou membership.
4. Revogue ou deixe expirar o grant. A próxima navegação deve levar a `/access-denied`.

Sessões administrativas expiram após sete dias de inatividade, renovam diariamente enquanto usadas e têm máximo absoluto de 30 dias desde a criação. Ao exceder o máximo, o registro da sessão é removido.
