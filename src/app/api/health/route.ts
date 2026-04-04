export const runtime = "nodejs";

export function GET() {
  return Response.json({
    ok: true,
    timestamp: new Date().toISOString(),
  });
}
