import { NextRequest, NextResponse } from "next/server";
const B = process.env.API_BASE_URL_SERVER || "http://127.0.0.1:4000";
const bearer = (r: NextRequest): Record<string, string> => {
  const t = r.cookies.get("vitecamion_auth")?.value;
  return t ? { Authorization: `Bearer ${t}` } : {};
};

export async function GET(req: NextRequest) {
  try {
    const qs = new URL(req.url).searchParams.toString();
    const res = await fetch(`${B}/analytics/overview${qs ? `?${qs}` : ""}`, {
      cache: "no-store",
      headers: bearer(req),
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }
}
