"use client";

import { Button } from "../ui/button";
import { Google } from "../ui/svgs/google";
import { DGImportsLogo } from "../ui/svgs/logo";

export interface SignInLayoutProps {
  appName: string;
  description: string;
  footerText: string;
  googleAuthHref: string;
  imageUrl?: string;
  title: string;
}

export function SignInLayout({
  appName,
  title,
  description,
  footerText,
  googleAuthHref,
  imageUrl,
}: SignInLayoutProps) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[0.8fr_2fr]">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-medium uppercase tracking-[0.24em]">
            <DGImportsLogo className="size-6 shrink-0" />
            {appName}
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs sm:max-w-sm">
            <div className="mb-8 flex flex-col items-center text-center">
              <h1 className="font-heading text-3xl tracking-tight">{title}</h1>
              <p className="mt-2 text-muted-foreground text-sm">
                {description}
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <Button
                asChild
                className="relative h-11 w-full gap-3 transition-transform active:scale-[0.98]"
                variant="outline"
              >
                <a href={googleAuthHref}>
                  <Google className="size-4" />
                  Continuar com Google
                </a>
              </Button>

              <p className="mt-8 text-center text-muted-foreground/70 text-xs leading-relaxed">
                {footerText}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        {imageUrl ? (
          <div
            className="absolute inset-0 h-full w-full bg-center bg-cover brightness-[0.3] grayscale"
            style={{
              backgroundImage: `url("${imageUrl}")`,
            }}
          />
        ) : (
          <div className="absolute inset-0 h-full w-full bg-gradient-to-br from-zinc-800 to-zinc-950" />
        )}
      </div>
    </div>
  );
}
