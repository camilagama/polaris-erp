import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SignInForm } from "@/app/(auth)/sign-in/sign-in-form";

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    oneTap: vi.fn(),
    signIn: {
      social: vi.fn(),
    },
  },
  hasGoogleAuthClient: true,
}));

describe("SignInForm", () => {
  it("renders Google sign-in without email or password fields", () => {
    const markup = renderToStaticMarkup(createElement(SignInForm));

    expect(markup).toContain("Continuar com Google");
    expect(markup).not.toContain(">Email<");
    expect(markup).not.toContain("Enviar link de acesso");
    expect(markup).not.toContain(">Senha<");
    expect(markup).not.toContain("Entrar no painel");
  });
});
