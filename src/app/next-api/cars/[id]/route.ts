import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

const BACKEND_URL = process.env.API_BASE_URL_SERVER || "http://127.0.0.1:4000";

function bearer(request: NextRequest): Record<string, string> {
  const token = request.cookies.get("vitecamion_auth")?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${BACKEND_URL}/cars/${params.id}`, {
      cache: "no-store",
      headers: bearer(request),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/cars/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...bearer(request) },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      revalidateTag("cars");
      revalidateTag(`car-${params.id}`);
    }
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${BACKEND_URL}/cars/${params.id}`, {
      method: "DELETE",
      headers: bearer(request),
    });
    if (res.ok) {
      revalidateTag("cars");
      revalidateTag(`car-${params.id}`);
    }
    return new NextResponse(null, { status: res.status });
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }
}
