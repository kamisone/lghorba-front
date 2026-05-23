import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000";
type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

function extractVendorBearer(req: NextRequest): Record<string, string> {
  const token = req.cookies.get("vitecamion_vendor_auth")?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function proxyVendorRequest(
  req: NextRequest,
  method: Method,
  path: string,
  opts: { auth?: boolean } = {},
): Promise<NextResponse> {
  const { auth = true } = opts;
  try {
    const authHeaders = auth ? extractVendorBearer(req) : {};
    let fetchBody: BodyInit | undefined;
    let contentTypeHeader: Record<string, string> = {};

    if (method !== "GET" && method !== "DELETE") {
      const body = await req.json().catch(() => undefined);
      if (body !== undefined) {
        fetchBody = JSON.stringify(body);
        contentTypeHeader = { "Content-Type": "application/json" };
      }
    }

    let url = `${BACKEND_URL}${path}`;
    if (method === "GET") {
      const qs = new URL(req.url).searchParams.toString();
      if (qs) url += `?${qs}`;
    }

    const res = await fetch(url, {
      method,
      cache: "no-store",
      headers: { ...authHeaders, ...contentTypeHeader },
      ...(fetchBody !== undefined ? { body: fetchBody } : {}),
    });

    const ct = res.headers.get("content-type") ?? "";
    if (res.status === 204 || !ct.includes("application/json")) {
      return new NextResponse(null, { status: res.status });
    }

    const data: unknown = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }
}
