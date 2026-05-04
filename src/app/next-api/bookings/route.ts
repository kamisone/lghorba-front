import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

const BACKEND_URL = process.env.API_BASE_URL_SERVER || "http://127.0.0.1:4000";

function bearer(req: NextRequest): Record<string, string> {
  const token = req.cookies.get("vitecamion_auth")?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND_URL}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...bearer(req) },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      // A new booking changes the car's availability display on public pages.
      revalidateTag("cars");
      if (body.carId) revalidateTag(`availability-${body.carId}`);
    }
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const qs = searchParams.toString();
    const res = await fetch(
      `${BACKEND_URL}/bookings${qs ? `?${qs}` : ""}`,
      { cache: "no-store", headers: bearer(req) },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }
}
