import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("vitecamion_auth")?.value;
  const qs = new URL(req.url).searchParams.toString();

  try {
    const res = await fetch(`${BACKEND_URL}/admin/newsletter/subscribers/export${qs ? `?${qs}` : ""}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });

    if (!res.ok) return NextResponse.json({ error: "export_failed" }, { status: res.status });

    const csv = await res.text();
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": res.headers.get("content-disposition") ?? 'attachment; filename="subscribers.csv"',
      },
    });
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }
}
