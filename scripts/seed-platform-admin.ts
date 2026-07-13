/**
 * Script para promover um usuario existente a platform admin (owner).
 *
 * Uso:
 *   bun scripts/seed-platform-admin.ts [email]
 *
 * Se nenhum email for passado, lista os usuarios existentes para escolha.
 */

import "dotenv/config";
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL nao definida.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });

const targetEmail = process.argv[2];

try {
  if (!targetEmail) {
    const { rows } = await pool.query(
      "SELECT id, name, email FROM users ORDER BY created_at DESC LIMIT 20"
    );

    if (rows.length === 0) {
      console.log("Nenhum usuario encontrado. Faca login na app primeiro.");
      process.exit(0);
    }

    console.log("\nUsuarios disponiveis:\n");
    for (const row of rows) {
      console.log(`  ${row.email}  (id: ${row.id}, nome: ${row.name})`);
    }
    console.log(
      "\nRe-execute com o email:\n  bun scripts/seed-platform-admin.ts <email>\n"
    );
    process.exit(0);
  }

  // Buscar usuario pelo email
  const { rows: userRows } = await pool.query(
    "SELECT id, name, email FROM users WHERE email = $1",
    [targetEmail]
  );

  if (userRows.length === 0) {
    console.error(`Usuario com email "${targetEmail}" nao encontrado.`);
    process.exit(1);
  }

  const user = userRows[0];
  console.log(`\nUsuario encontrado: ${user.name} (${user.id})`);

  // Inserir ou buscar platform_admin
  const { rows: existingAdmin } = await pool.query(
    "SELECT id, status FROM platform_admins WHERE user_id = $1",
    [user.id]
  );

  let platformAdminId: string;

  if (existingAdmin.length > 0) {
    platformAdminId = existingAdmin[0].id;
    console.log(
      `Platform admin ja existe: ${platformAdminId} (status: ${existingAdmin[0].status})`
    );

    // Garantir que esta ativo
    if (existingAdmin[0].status !== "active") {
      await pool.query(
        "UPDATE platform_admins SET status = 'active', updated_at = now() WHERE id = $1",
        [platformAdminId]
      );
      console.log("Status atualizado para 'active'.");
    }
  } else {
    const { rows: inserted } = await pool.query(
      "INSERT INTO platform_admins (user_id, status) VALUES ($1, 'active') RETURNING id",
      [user.id]
    );
    platformAdminId = inserted[0].id;
    console.log(`Platform admin criado: ${platformAdminId}`);
  }

  // Inserir grant de owner (se nao existir um ativo)
  const { rows: existingGrant } = await pool.query(
    `SELECT id, role FROM platform_admin_grants
     WHERE platform_admin_id = $1
       AND revoked_at IS NULL
       AND (expires_at IS NULL OR expires_at > now())`,
    [platformAdminId]
  );

  if (existingGrant.length > 0) {
    console.log(
      `Grant ativo ja existe: ${existingGrant[0].id} (role: ${existingGrant[0].role})`
    );
  } else {
    const { rows: grantRows } = await pool.query(
      `INSERT INTO platform_admin_grants (platform_admin_id, role, reason)
       VALUES ($1, 'owner', 'Seed local dev')
       RETURNING id`,
      [platformAdminId]
    );
    console.log(`Grant criado: ${grantRows[0].id} (role: owner)`);
  }

  console.log("\nPronto. Recarregue a pagina admin.\n");
} finally {
  await pool.end();
}
