"use server";

import { count } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
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

export async function bootstrapAdminAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const existingUsers = await db.select({ value: count() }).from(users);

  if ((existingUsers[0]?.value ?? 0) > 0) {
    return {
      error: "O bootstrap inicial ja foi concluido.",
    };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  try {
    await auth.api.signUpEmail({
      body: {
        name,
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
