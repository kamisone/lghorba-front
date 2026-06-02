import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL    = process.env.API_BASE_URL_SERVER || "http://127.0.0.1:4000";
const ACCESS_COOKIE  = "vitecamion_auth";
const REFRESH_COOKIE = "vitecamion_refresh";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 5;

const cookieOpts = (secure: boolean) => ({
  httpOnly:  true,
  secure,
  sameSite: "strict" as const,
  path:     "/",
  maxAge:   COOKIE_MAX_AGE,
});

/**
 * GET — server-side redirect flow used by the login page.
 * Attempts to refresh the access token and redirects to ?to= on success,
 * or back to /login (with the stale refresh cookie cleared) on failure.
 */
export async function GET(request: NextRequest) {
  const rawTo = request.nextUrl.searchParams.get("to") ?? "/admin";
  // Guard against open-redirect
  const to    = rawTo.startsWith("/") && !rawTo.startsWith("//") ? rawTo : "/admin";

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch {
    const r = NextResponse.redirect(new URL("/login", request.url));
    r.cookies.delete(REFRESH_COOKIE);
    return r;
  }

  if (!res.ok) {
    const r = NextResponse.redirect(new URL("/login", request.url));
    r.cookies.delete(REFRESH_COOKIE);
    return r;
  }

  const { access_token } = await res.json();
  const secure   = process.env.NODE_ENV === "production";
  const response = NextResponse.redirect(new URL(to, request.url));
  response.cookies.set(ACCESS_COOKIE, access_token, cookieOpts(secure));
  return response;
}

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: "no_refresh_token" }, { status: 401 });
  }

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json({ error: "refresh_failed" }, { status: 401 });
  }

  const { access_token } = await res.json();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCESS_COOKIE, access_token, cookieOpts(process.env.NODE_ENV === "production"));
  return response;
}
