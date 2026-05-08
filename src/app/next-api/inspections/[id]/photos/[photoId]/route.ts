import { NextRequest, NextResponse } from "next/server";
const B = process.env.API_BASE_URL_SERVER || "http://127.0.0.1:4000";
const bearer = (r: NextRequest): Record<string, string> => { const t = r.cookies.get("vitecamion_auth")?.value; return t ? { Authorization: `Bearer ${t}` } : {}; };

export async function GET(req: NextRequest, { params }: { params: { id: string; photoId: string } }) {
  try {
    const res = await fetch(`${B}/inspections/${params.id}/photos/${params.photoId}`, { cache: "no-store", headers: bearer(req), redirect: "manual" });
    const location = res.headers.get("location");
    if (location) return NextResponse.redirect(location, 302);
    return NextResponse.json(await res.json(), { status: res.status });
  } catch { return NextResponse.json({ message: "Service unavailable" }, { status: 503 }); }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; photoId: string } }) {
  try {
    const res = await fetch(`${B}/inspections/${params.id}/photos/${params.photoId}`, { method: "DELETE", cache: "no-store", headers: bearer(req) });
    return res.status === 204 ? new NextResponse(null, { status: 204 }) : NextResponse.json(await res.json(), { status: res.status });
  } catch { return NextResponse.json({ message: "Service unavailable" }, { status: 503 }); }
}
