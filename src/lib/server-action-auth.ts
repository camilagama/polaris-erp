import "server-only";
import { getSession } from "@/lib/session";

export const requireActionSession = async () => {
  const session = await getSession();

  if (!session?.user?.id) {
    throw new Error("Sessao invalida. Faca login novamente.");
  }

  return session;
};
