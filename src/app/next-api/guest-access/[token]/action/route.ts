import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_BASE_URL_SERVER || "http://127.0.0.1:4000";

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  try {
    const body = await req.json();
    const res = await fetch(
      `${BACKEND_URL}/guest-access/${params.token}/action`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": req.headers.get("x-forwarded-for") ?? "",
          "user-agent": req.headers.get("user-agent") ?? "",
        },
        body: JSON.stringify(body),
      },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
  }
}
