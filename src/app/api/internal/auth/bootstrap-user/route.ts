import { z } from "zod";
import { auth } from "@/lib/auth";
import { serverEnv } from "@/lib/env";

export const runtime = "nodejs";

const bootstrapUserSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1),
  password: z.string().min(8),
});

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "Nao foi possivel preparar o usuario interno.";
};

export async function POST(request: Request) {
  const isBootstrapEnabled =
    ["development", "test"].includes(serverEnv.NODE_ENV) ||
    serverEnv.ENABLE_INTERNAL_BOOTSTRAP === "true";
  const expectedAuthorization = serverEnv.INTERNAL_BOOTSTRAP_SECRET
    ? `Bearer ${serverEnv.INTERNAL_BOOTSTRAP_SECRET}`
    : null;
  const authorization = request.headers.get("authorization");

  if (!isBootstrapEnabled) {
    return Response.json(
      {
        error: "Bootstrap interno disponivel apenas fora de producao.",
      },
      { status: 403 }
    );
  }

  if (!expectedAuthorization) {
    return Response.json(
      {
        error: "Bootstrap interno indisponivel neste ambiente.",
      },
      { status: 503 }
    );
  }

  if (authorization !== expectedAuthorization) {
    return Response.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    const body = bootstrapUserSchema.parse(await request.json());

    await auth.api.signUpEmail({
      body,
    });

    return Response.json({ created: true });
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    const isConflict =
      errorMessage.includes("already exists") ||
      errorMessage.includes("already been taken") ||
      errorMessage.includes("duplicate key");

    return Response.json(
      {
        error: errorMessage,
      },
      {
        status: isConflict ? 409 : 400,
      }
    );
  }
}
