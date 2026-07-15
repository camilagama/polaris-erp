import { createPolarisAuth } from "@polaris/auth";
import {
  recordAuthLoginAuditEvent,
  recordAuthSessionAuditEvent,
} from "@/lib/auth-audit";

export const auth = createPolarisAuth({
  recordAuthLoginAuditEvent,
  recordAuthSessionAuditEvent,
});
