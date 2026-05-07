import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_BASE_URL_SERVER || "http://127.0.0.1:4000";

function bearer(req: NextRequest): Record<string, string> {
  const token = req.cookies.get("vitecamion_auth")?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; blockId: string } },
) {
  try {
    const body = await req.json();
    const res = await fetch(
      `${BACKEND_URL}/cars/${params.id}/availability/${params.blockId}`,
      { method: "PATCH", headers: { "Content-Type": "application/json", ...bearer(req) }, body: JSON.stringify(body) },
    );
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; blockId: string } },
) {
  try {
    const res = await fetch(
      `${BACKEND_URL}/cars/${params.id}/availability/${params.blockId}`,
      { method: "DELETE", headers: bearer(req) },
    );
    if (res.status === 204) return new NextResponse(null, { status: 204 });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }
}
