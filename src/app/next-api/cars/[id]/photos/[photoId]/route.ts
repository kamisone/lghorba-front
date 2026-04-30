import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_BASE_URL_SERVER || "http://127.0.0.1:4000";

function bearer(req: NextRequest): Record<string, string> {
  const token = req.cookies.get("vitecamion_auth")?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function GET(req: NextRequest, { params }: { params: { id: string; photoId: string } }) {
  try {
    const res = await fetch(`${BACKEND_URL}/cars/${params.id}/photos/${params.photoId}`, {
      headers: bearer(req),
    });
    if (!res.ok) return new NextResponse(null, { status: res.status });
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    return new NextResponse(res.body, {
      headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=3600" },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; photoId: string } }) {
  try {
    const res = await fetch(`${BACKEND_URL}/cars/${params.id}/photos/${params.photoId}`, {
      method: "DELETE",
      headers: bearer(req),
    });
    if (!res.ok) return NextResponse.json({ error: "delete_failed" }, { status: res.status });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }
}
