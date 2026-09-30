import { NextResponse } from "next/server";

/**
 * GET /api/traces
 * Proxies the AGY sidecar's /traces endpoint for the observability dashboard.
 * Returns an empty traces array when the sidecar is offline (graceful degradation).
 */
export async function GET(req: Request): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const n = searchParams.get("n") ?? "50";

  const agySvcUrl = process.env.AGY_SERVICE_URL ?? "http://localhost:8765";

  try {
    const res = await fetch(`${agySvcUrl}/traces?n=${n}`, {
      // Short timeout — this is a UI polling endpoint, not a critical path
      signal: AbortSignal.timeout(3_000),
    });
    if (!res.ok) {
      return NextResponse.json({ traces: [], error: `sidecar ${res.status}` });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    // Sidecar offline — return empty traces, don't break the UI
    return NextResponse.json({ traces: [], error: "sidecar_offline" });
  }
}
