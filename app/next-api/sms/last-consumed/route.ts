import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_BASE_URL || "http://127.0.0.1:4000";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = request.cookies.get("lghorba_auth")?.value;
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/sms/last-consumed?${searchParams.toString()}`,
      {
        cache: "no-store",
        headers: (token ? { Authorization: `Bearer ${token}` } : {}) as Record<string, string>,
      }
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }
}
