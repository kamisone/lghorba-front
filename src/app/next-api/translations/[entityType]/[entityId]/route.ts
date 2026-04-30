import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_BASE_URL_SERVER || "http://127.0.0.1:4000";

function bearer(request: NextRequest): Record<string, string> {
  const token = request.cookies.get("vitecamion_auth")?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function GET(
  request: NextRequest,
  { params }: { params: { entityType: string; entityId: string } },
) {
  try {
    const lang = request.nextUrl.searchParams.get("lang") ?? "";
    const qs = lang ? `?lang=${encodeURIComponent(lang)}` : "";
    const res = await fetch(
      `${BACKEND_URL}/translations/${params.entityType}/${params.entityId}${qs}`,
      { cache: "no-store", headers: bearer(request) },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }
}
