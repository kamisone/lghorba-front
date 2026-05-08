import { NextRequest, NextResponse } from "next/server";
const B = process.env.API_BASE_URL_SERVER || "http://127.0.0.1:4000";
const bearer = (r: NextRequest): Record<string, string> => { const t = r.cookies.get("vitecamion_auth")?.value; return t ? { Authorization: `Bearer ${t}` } : {}; };

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const res = await fetch(`${B}/maintenance/suppliers/${params.id}`, { method: "PUT", cache: "no-store", headers: { "Content-Type": "application/json", ...bearer(req) }, body: JSON.stringify(body) });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch { return NextResponse.json({ message: "Service unavailable" }, { status: 503 }); }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${B}/maintenance/suppliers/${params.id}`, { method: "DELETE", cache: "no-store", headers: bearer(req) });
    return res.status === 204 ? new NextResponse(null, { status: 204 }) : NextResponse.json(await res.json(), { status: res.status });
  } catch { return NextResponse.json({ message: "Service unavailable" }, { status: 503 }); }
}
