import "server-only";

import { createPlatformAdminAuth } from "@polaris/platform-auth/admin-guard";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

const platformAdminAuth = createPlatformAdminAuth({ getSession });

export const requirePlatformAdmin = async (
  options?: Parameters<typeof platformAdminAuth.requirePlatformAdmin>[0]
) => {
  if (!(await getSession())) {
    redirect("/sign-in");
  }

  try {
    return await platformAdminAuth.requirePlatformAdmin(options);
  } catch {
    redirect("/access-denied");
  }
};
