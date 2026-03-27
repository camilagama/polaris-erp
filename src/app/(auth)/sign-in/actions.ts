"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

interface AuthState {
  error: string | null;
}

const initialState: AuthState = { error: null };

export const authInitialState = initialState;

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "Nao foi possivel concluir a autenticacao.";
};

export async function signInAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  try {
    await auth.api.signInEmail({
      body: {
        email,
        password,
      },
      headers: await headers(),
    });
  } catch (error) {
    return {
      error: getErrorMessage(error),
    };
  }

  redirect("/");
}
