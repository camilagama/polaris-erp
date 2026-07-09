import { createSessionHelpers } from "@polaris/auth/session";
import { auth } from "@/lib/auth";

export const { getSession, requireSession } = createSessionHelpers({ auth });
