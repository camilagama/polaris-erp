export interface E2eDatabaseSchemaState {
  salesIdempotencyKey: boolean;
  salesOrganizationIdempotencyKeyUniqueIdx: boolean;
  sessionsIdUniqueIdx: boolean;
}

const REQUIRED_SCHEMA_OBJECTS = {
  salesIdempotencyKey: "sales.idempotency_key",
  salesOrganizationIdempotencyKeyUniqueIdx:
    "sales_organization_idempotency_key_unique_idx",
  sessionsIdUniqueIdx: "sessions_id_unique_idx",
} as const satisfies Record<keyof E2eDatabaseSchemaState, string>;

export const assertE2eDatabaseSchema = (
  state: E2eDatabaseSchemaState
): void => {
  const missingObjects = Object.entries(REQUIRED_SCHEMA_OBJECTS)
    .filter(([key]) => !state[key as keyof E2eDatabaseSchemaState])
    .map(([, label]) => label);

  if (missingObjects.length > 0) {
    throw new Error(
      `E2E database schema is outdated: ${missingObjects.join(", ")}. Apply migrations to the branch behind E2E_DATABASE_URL with a migration/owner role, then rerun bun run test:e2e.`
    );
  }
};
