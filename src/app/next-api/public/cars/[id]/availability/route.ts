import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_BASE_URL_SERVER || "http://127.0.0.1:4000";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url);
  const startDateTime = searchParams.get("startDateTime");
  const endDateTime   = searchParams.get("endDateTime");

  try {
    const url = `${BACKEND_URL}/api/public/cars/${params.id}/availability?startDateTime=${encodeURIComponent(startDateTime ?? "")}&endDateTime=${encodeURIComponent(endDateTime ?? "")}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return NextResponse.json(await res.json(), { status: res.status });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }
}
