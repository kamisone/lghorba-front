import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL    = process.env.API_BASE_URL_SERVER || "http://127.0.0.1:4000";
const ACCESS_COOKIE  = "lghorba_auth";
const REFRESH_COOKIE = "lghorba_refresh";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 5;

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

  response.cookies.set(ACCESS_COOKIE, access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  return response;
}
