import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_BASE_URL || "http://127.0.0.1:4000";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  try {
    const res = await fetch(`${BACKEND_URL}/api/sms?${searchParams.toString()}`, {
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }
}
