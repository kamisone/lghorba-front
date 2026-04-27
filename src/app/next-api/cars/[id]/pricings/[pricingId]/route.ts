import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_BASE_URL_SERVER || "http://127.0.0.1:4000";

function bearer(req: NextRequest): Record<string, string> {
  const token = req.cookies.get("vitecamion_auth")?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; pricingId: string } },
) {
  try {
    const body = await req.json();
    const res = await fetch(
      `${BACKEND_URL}/api/cars/${params.id}/pricings/${params.pricingId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...bearer(req) },
        body: JSON.stringify(body),
      },
    );
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; pricingId: string } },
) {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/cars/${params.id}/pricings/${params.pricingId}`,
      { method: "DELETE", headers: bearer(req) },
    );
    return new NextResponse(null, { status: res.status });
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }
}
