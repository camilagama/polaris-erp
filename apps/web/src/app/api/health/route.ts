import { checkDatabaseHealth } from "@/lib/health";

export async function GET() {
  const timestamp = new Date().toISOString();
  const databaseIsHealthy = await checkDatabaseHealth();

  if (databaseIsHealthy) {
    return Response.json({
      checks: {
        database: {
          ok: true,
        },
      },
      ok: true,
      timestamp,
    });
  }

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
