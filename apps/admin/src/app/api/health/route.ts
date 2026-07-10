export function GET(): Response {
  return Response.json(
    {
      checks: {
        runtime: {
          ok: true,
        },
      },
      ok: true,
      service: "polaris-admin",
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    }
  );
}
