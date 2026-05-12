import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ProxyOptions = {
  /** Inject vitecamion_auth cookie as Bearer. Default: true */
  auth?: boolean;
  /** Additional headers forwarded verbatim (e.g. x-forwarded-for) */
  extraHeaders?: Record<string, string>;
  /**
   * Called after a 2xx response. Receives (responseBody, requestBody).
   * Use for revalidateTag or other post-mutation side-effects.
   */
  onSuccess?: (resBody: unknown, reqBody?: unknown) => void | Promise<void>;
  /** Body returned on network error (502). Default: { error: "backend_unreachable" } */
  errorBody?: Record<string, unknown>;
  /**
   * Set true when the backend may redirect (e.g. signed-URL photo fetch).
   * The redirect is forwarded to the browser instead of being followed.
   */
  passRedirect?: boolean;
};

function extractBearer(req: NextRequest): Record<string, string> {
  const token = req.cookies.get("vitecamion_auth")?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function proxyRequest(
  req: NextRequest,
  method: Method,
  path: string,
  opts: ProxyOptions = {},
): Promise<NextResponse> {
  const {
    auth = true,
    extraHeaders = {},
    onSuccess,
    errorBody = { error: "backend_unreachable" },
    passRedirect = false,
  } = opts;

  try {
    const authHeaders = auth ? extractBearer(req) : {};
    let fetchBody: BodyInit | undefined;
    let contentTypeHeader: Record<string, string> = {};
    let reqBody: unknown;

    if (method !== "GET" && method !== "DELETE") {
      const ct = req.headers.get("content-type") ?? "";
      if (ct.includes("multipart/form-data") || ct.includes("application/x-www-form-urlencoded")) {
        fetchBody = await req.formData();
      } else {
        reqBody = await req.json().catch(() => undefined);
        if (reqBody !== undefined) {
          fetchBody = JSON.stringify(reqBody);
          contentTypeHeader = { "Content-Type": "application/json" };
        }
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
      headers: { ...authHeaders, ...contentTypeHeader, ...extraHeaders },
      ...(fetchBody !== undefined ? { body: fetchBody } : {}),
      ...(passRedirect ? { redirect: "manual" } : {}),
    });

    if (passRedirect) {
      const location = res.headers.get("location");
      if (location) return NextResponse.redirect(location, 302);
    }

    const resCt = res.headers.get("content-type") ?? "";
    if (res.status === 204 || !resCt.includes("application/json")) {
      if (res.ok && onSuccess) await onSuccess(undefined, reqBody);
      return new NextResponse(null, { status: res.status });
    }

    const data: unknown = await res.json();
    if (res.ok && onSuccess) await onSuccess(data, reqBody);
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(errorBody, { status: 502 });
  }
}
