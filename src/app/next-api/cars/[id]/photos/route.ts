import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

const BACKEND_URL = process.env.API_BASE_URL_SERVER || "http://127.0.0.1:4000";

function bearer(req: NextRequest): Record<string, string> {
  const token = req.cookies.get("vitecamion_auth")?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${BACKEND_URL}/cars/${params.id}/photos`, {
      headers: bearer(req),
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const formData = await req.formData();
    const res = await fetch(`${BACKEND_URL}/cars/${params.id}/photos`, {
      method: "POST",
      headers: bearer(req),
      body: formData,
    });
    const data = await res.json();
    if (res.ok) {
      revalidateTag(`car-photos-${params.id}`);
      revalidateTag("cars"); // landing carousel reads photo IDs via the cars tag
    }
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }
}
