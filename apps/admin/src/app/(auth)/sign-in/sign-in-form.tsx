"use client";

import { Button } from "@polaris/ui/components/ui/button";

export const AdminSignInForm = () => (
  <main className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
    <section className="w-full max-w-md rounded-lg border border-border bg-card p-6">
      <p className="font-medium text-muted-foreground text-sm">Polaris Admin</p>
      <h1 className="mt-2 font-semibold text-2xl tracking-normal">
        Entrar no admin
      </h1>
      <p className="mt-3 text-muted-foreground text-sm">
        Acesso exclusivo para identidades administrativas pre-aprovadas.
      </p>
      <Button asChild className="mt-6 w-full" variant="outline">
        <a href="/api/auth/google">Continuar com Google</a>
      </Button>
    </section>
  </main>
);
