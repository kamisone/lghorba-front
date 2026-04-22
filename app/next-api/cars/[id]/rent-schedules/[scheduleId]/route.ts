import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_BASE_URL_SERVER || "http://127.0.0.1:4000";

function bearer(req: NextRequest): Record<string, string> {
  const token = req.cookies.get("lghorba_auth")?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; scheduleId: string } }) {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/cars/${params.id}/rent-schedules/${params.scheduleId}`,
      { method: "DELETE", headers: bearer(req) },
    );
    return new NextResponse(null, { status: res.status });
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }
}
