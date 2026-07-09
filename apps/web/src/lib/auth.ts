import { createPolarisAuth } from "@polaris/auth";
import { recordAuthLoginAuditEvent } from "@/lib/auth-audit";

export const auth = createPolarisAuth({
  recordAuthLoginAuditEvent,
});
