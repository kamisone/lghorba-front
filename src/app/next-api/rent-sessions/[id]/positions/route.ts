import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_BASE_URL_SERVER || "http://127.0.0.1:4000";

function bearer(request: NextRequest): Record<string, string> {
  const token = request.cookies.get("vitecamion_auth")?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/rent-sessions/${params.id}/positions`, {
      cache: "no-store",
      headers: bearer(request),
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/rent-sessions/${params.id}/positions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...bearer(request) },
      body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }
}
