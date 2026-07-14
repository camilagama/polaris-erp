# Pesquisa externa: Google OAuth e OpenID Connect

**Status:** rascunho de pesquisa, **não normativo**.  
**Consulta:** 2026-07-14.  
**Escopo:** login Google-only, identidade persistida, linking e sessões locais. Fontes oficiais do Google consultadas via Context7.

## Achados comprovados

1. O servidor deve validar assinatura do ID token, `aud` contra client ID próprio, `iss` como `accounts.google.com` ou `https://accounts.google.com` e `exp` não expirado. No fluxo GIS por POST, também deve validar o par CSRF antes de processar o token.[^verify]
2. A identidade estável é a claim `sub`: ela não é reutilizada e não muda quando o e-mail muda. O e-mail não é único nem deve ser a chave de vínculo da conta.[^claims]
3. `email_verified` não torna igualdade de e-mail uma prova suficiente para merge automático. Para e-mail externo sem `hd`, o Google não é autoridade contínua sobre o titular atual, mesmo que o endereço tenha sido verificado.[^verify]
4. Authorization code/OIDC requerem `state` contra CSRF, `nonce` de uso único contra replay e URI de retorno exatamente autorizada.[^oidc]
5. Login necessita somente de `openid email`; `profile` é adicional quando nome/foto forem necessários. Atributos de perfil podem não existir.[^oidc]
6. A revogação de consentimento Google e o logout/auto-sign-in do GIS não encerram uma sessão local. Duração, renovação, logout, revogação e auditoria da sessão são responsabilidade da aplicação.[^revoke][^signout]

## Aplicação ao Hub Imports

- A associação persistida deve usar `(provider = google, providerAccountId = sub)` após validação completa do token.
- Uma conta local com e-mail igual, mas sem a associação Google, não deve ser vinculada silenciosamente. É necessária decisão para bloqueio temporário ou recuperação/linking explícito com suporte verificado e auditoria.
- O token Google prova login pontual; ele não substitui gestão de sessão local nem seus eventos de segurança.

## O que a documentação não decide

- duração, renovação, expiração absoluta/inatividade e máximo de sessões locais;
- retenção/campos de auditoria e eventos obrigatórios de autenticação;
- política de recuperação, alteração de e-mail, desativação/eliminação de conta e suporte;
- exigência de `hd`; ela só se aplica se o produto restringir acesso a domínios Workspace;
- equivalência entre revogação Google e revogação da sessão própria.

## Fontes primárias

[^verify]: Google for Developers, [Verify Google ID tokens](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token), documentação oficial, atualizada em 2025-12-22 e consultada em 2026-07-14.
[^claims]: Google for Developers, [OpenID Connect claims](https://developers.google.com/identity/openid-connect/openid-connect), documentação oficial, atualizada em 2026-06-15 e consultada em 2026-07-14.
[^oidc]: Google for Developers, [OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect), documentação oficial, consultada em 2026-07-14.
[^revoke]: Google for Developers, [Revoke ID tokens](https://developers.google.com/identity/gsi/web/guides/revoke), documentação oficial, atualizada em 2025-05-19 e consultada em 2026-07-14.
[^signout]: Google for Developers, [Automatic sign-in and sign-out](https://developers.google.com/identity/gsi/web/guides/automatic-sign-in-sign-out), documentação oficial, atualizada em 2025-05-23 e consultada em 2026-07-14.
