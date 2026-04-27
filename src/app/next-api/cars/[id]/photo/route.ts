import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_BASE_URL_SERVER || "http://127.0.0.1:4000";

function bearer(request: NextRequest): Record<string, string> {
  const token = request.cookies.get("vitecamion_auth")?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/cars/${params.id}/photo`, {
      headers: bearer(request),
    });
    if (!res.ok) return new NextResponse(null, { status: res.status });
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    return new NextResponse(res.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const formData = await request.formData();
    const res = await fetch(`${BACKEND_URL}/api/cars/${params.id}/photo`, {
      method: "POST",
      headers: bearer(request),
      body: formData,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/cars/${params.id}/photo`, {
      method: "DELETE",
      headers: bearer(request),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }
}
