import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_BASE_URL_SERVER || "http://127.0.0.1:4000";
const ACCESS_COOKIE  = "lghorba_auth";
const REFRESH_COOKIE = "lghorba_refresh";
// Browser cookie lifetime = refresh token lifetime (5 days).
// The JWT itself expires after 15 min; TokenRefresher rotates it silently.
const COOKIE_MAX_AGE = 60 * 60 * 24 * 5;

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const { access_token, refresh_token } = await res.json();
  const response = NextResponse.json({ ok: true });

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };

  response.cookies.set(ACCESS_COOKIE,  access_token,  cookieOpts);
  response.cookies.set(REFRESH_COOKIE, refresh_token, cookieOpts);

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  return response;
}
