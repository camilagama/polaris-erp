import { createSessionHelpers } from "@polaris/auth/session";
import { auth } from "@/lib/auth";

export const { getSession } = createSessionHelpers({ auth });
