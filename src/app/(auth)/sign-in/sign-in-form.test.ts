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
  it("renders only the Google CTA and omits credential fields", () => {
    const markup = renderToStaticMarkup(createElement(SignInForm));

    expect(markup).toContain("Continuar com Google");
    expect(markup).not.toContain(">Email<");
    expect(markup).not.toContain(">Senha<");
    expect(markup).not.toContain("Entrar no painel");
  });
});
