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

/**
 * Carry the caller's address and User-Agent through to the backend.
 *
 * Storefront calls do not reach the backend directly — the browser hits a
 * /next-api route and this helper makes a fresh server-to-server request. Without
 * forwarding these headers the backend sees the Next.js pod's own cluster IP for
 * every visitor, so geo-IP resolves to null (no country on behaviour events) and
 * IP rate limiting buckets everyone into one counter. Same story for User-Agent:
 * left unforwarded, the backend classifies every visitor from Node's own fetch
 * client string, which never matches the mobile pattern — every analytics event
 * came out "Device: Desktop" regardless of the real device.
 *
 * Passed through unchanged rather than appended: Next.js does not expose the
 * socket peer, and the backend's `trust proxy` already walks past private hops to
 * the first public address.
 */
function forwardedClientHeaders(req: NextRequest): Record<string, string> {
  const out: Record<string, string> = {};
  const xff = req.headers.get("x-forwarded-for");
  if (xff) out["x-forwarded-for"] = xff;
  const realIp = req.headers.get("x-real-ip");
  if (realIp) out["x-real-ip"] = realIp;
  // Set by the edge nginx and untouched by the k8s ingress, so it survives when
  // the standard X-Forwarded-* headers have been rewritten. See
  // back/src/common/utils/client-ip.util.ts.
  const originalIp = req.headers.get("x-original-client-ip");
  if (originalIp) out["x-original-client-ip"] = originalIp;
  const userAgent = req.headers.get("user-agent");
  if (userAgent) out["user-agent"] = userAgent;
  return out;
}

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

    // Forwarded for every method, not just GET: query params like ?lang=
    // are just as meaningful on a POST/PUT/DELETE mutation (e.g. the shop
    // cart's add/update/remove-item routes) as on a read, and dropping them
    // silently made those endpoints always answer in the base language
    // regardless of what the caller asked for.
    let url = `${BACKEND_URL}${path}`;
    const qs = new URL(req.url).searchParams.toString();
    if (qs) url += `?${qs}`;

    const res = await fetch(url, {
      method,
      cache: "no-store",
      // extraHeaders last so an explicit caller can still override.
      headers: { ...authHeaders, ...contentTypeHeader, ...forwardedClientHeaders(req), ...extraHeaders },
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
