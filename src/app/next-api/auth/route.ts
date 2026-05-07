import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_BASE_URL_SERVER || "http://127.0.0.1:4000";
const ACCESS_COOKIE  = "vitecamion_auth";
const REFRESH_COOKIE = "vitecamion_refresh";
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
    if (res.status === 429) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const data = await res.json();

  // MFA required — forward the challenge to the browser
  if (data.mfaRequired) {
    return NextResponse.json(data, { status: 200 });
  }

  const { access_token, refresh_token } = data;
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
