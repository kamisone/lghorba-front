import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_BASE_URL_SERVER || "http://127.0.0.1:4000";

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } },
) {
  try {
    const res = await fetch(
      `${BACKEND_URL}/guest-access/${params.token}/car-status`,
      { cache: "no-store" },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
  }
}
