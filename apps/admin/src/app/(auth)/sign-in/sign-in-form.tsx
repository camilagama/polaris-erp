"use client";

import { SignInLayout } from "@polaris/ui/components/shared/sign-in-layout";

export const AdminSignInForm = () => (
  <SignInLayout
    appName="Polaris Admin."
    description="Acesso exclusivo para identidades administrativas pré-aprovadas."
    footerText="O acesso ao painel admin requer que a sua identidade seja previamente autorizada."
    googleAuthHref="/api/auth/google"
    title="Entrar no admin"
  />
);
