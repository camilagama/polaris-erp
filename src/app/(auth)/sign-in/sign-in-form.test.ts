// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SignInForm } from "@/app/(auth)/sign-in/sign-in-form";

const DISABLED_BUTTON_ATTRIBUTE_PATTERN = /<button[^>]*\sdisabled(?:=|>|\s)/;
const authMocks = vi.hoisted(() => ({
  oneTap: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    oneTap: authMocks.oneTap,
  },
  hasGoogleOneTapClient: true,
}));

describe("SignInForm", () => {
  afterEach(() => {
    authMocks.oneTap.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("renders Google sign-in without email or password fields", () => {
    const markup = renderToStaticMarkup(createElement(SignInForm));

    expect(markup).toContain("Continuar com Google");
    expect(markup).toContain('href="/api/auth/google?callbackUrl=%2F"');
    expect(markup).not.toMatch(DISABLED_BUTTON_ATTRIBUTE_PATTERN);
    expect(markup).not.toContain(">Email<");
    expect(markup).not.toContain("Enviar link de acesso");
    expect(markup).not.toContain(">Senha<");
    expect(markup).not.toContain("Entrar no painel");
    expect(markup).not.toContain("Criar conta");
  });

  it("starts Google One Tap and renders a real Google OAuth link", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    authMocks.oneTap.mockResolvedValue(undefined);

    const container = document.createElement("div");
    document.body.append(container);

    let root: Root | null = null;
    act(() => {
      root = createRoot(container);
      root.render(createElement(SignInForm, { callbackUrl: "/produtos" }));
    });

    expect(authMocks.oneTap).toHaveBeenCalledWith({
      callbackURL: "/produtos",
      context: "signin",
      onPromptNotification: expect.any(Function),
    });

    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe(
      "/api/auth/google?callbackUrl=%2Fprodutos"
    );

    act(() => {
      root?.unmount();
    });
  });
});
