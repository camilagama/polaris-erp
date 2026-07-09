import "server-only";

import { createPlatformAdminAuth } from "@polaris/platform-auth/admin-guard";
import { getSession } from "@/lib/session";

const platformAdminAuth = createPlatformAdminAuth({ getSession });

export const requirePlatformAdmin = platformAdminAuth.requirePlatformAdmin;
