import "server-only";

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createAdminAuth } from "@polaris/auth/admin";
import {
  admitPlatformAdminSession,
  hasActivePlatformAdminEnrollment,
} from "@polaris/platform/admin";
import { parse } from "dotenv";

const resolveAdminEnvironment = (): NodeJS.ProcessEnv => {
  const candidates = [
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), "../../.env.local"),
  ];
  const envFilePath = candidates.find((candidate) => existsSync(candidate));

  if (!envFilePath) {
    return process.env;
  }

  return {
    ...process.env,
    ...parse(readFileSync(envFilePath, "utf8")),
  };
};

export const auth = createAdminAuth({
  admitAdminSession: admitPlatformAdminSession,
  environment: resolveAdminEnvironment(),
  hasActiveEnrollment: hasActivePlatformAdminEnrollment,
});
