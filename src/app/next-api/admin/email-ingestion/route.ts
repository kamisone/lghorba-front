import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_BASE_URL_SERVER || "http://127.0.0.1:4000";

function bearer(req: NextRequest): Record<string, string> {
  const token = req.cookies.get("vitecamion_auth")?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    const res = await fetch(`${BACKEND_URL}/admin/email-ingestion${qs}`, {
      cache: "no-store",
      headers: bearer(req),
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const res = await fetch(`${BACKEND_URL}/admin/email-ingestion/poll`, {
      method: "POST",
      cache: "no-store",
      headers: bearer(req),
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
  }
}
