import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_BASE_URL_SERVER || "http://127.0.0.1:4000";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  try {
    const res = await fetch(
      `${BACKEND_URL}/guest-access/${params.token}/info`,
      { cache: "no-store", headers: { "x-forwarded-for": req.headers.get("x-forwarded-for") ?? "" } },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
  }
}
