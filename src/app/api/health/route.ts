import { sql } from "drizzle-orm";
import { db } from "@/db";

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    await db.execute(sql`select 1`);

    return Response.json({
      checks: {
        database: {
          ok: true,
        },
      },
      ok: true,
      timestamp,
    });
  } catch {
    return Response.json(
      {
        checks: {
          database: {
            ok: false,
          },
        },
        ok: false,
        timestamp,
      },
      { status: 503 }
    );
  }
}
