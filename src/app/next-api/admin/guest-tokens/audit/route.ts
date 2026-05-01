import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_BASE_URL_SERVER || "http://127.0.0.1:4000";

function bearer(req: NextRequest): Record<string, string> {
  const token = req.cookies.get("vitecamion_auth")?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const qs = searchParams.toString();
    const res = await fetch(
      `${BACKEND_URL}/admin/guest-tokens/audit${qs ? `?${qs}` : ""}`,
      { cache: "no-store", headers: bearer(req) },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
  }
}
