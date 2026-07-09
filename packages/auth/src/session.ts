import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

interface SessionAuth<TSession> {
  api: {
    getSession: (input: { headers: Headers }) => Promise<TSession | null>;
  };
}

export const createSessionHelpers = <TSession>({
  auth,
  signInPath = "/sign-in",
}: {
  auth: SessionAuth<TSession>;
  signInPath?: string;
}) => {
  const getSession = async () =>
    auth.api.getSession({
      headers: await headers(),
    });

  const requireSession = async () => {
    const session = await getSession();

    if (!session) {
      redirect(signInPath);
    }

    return session;
  };

  return {
    getSession,
    requireSession,
  };
};
