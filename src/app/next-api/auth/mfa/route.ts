import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_BASE_URL_SERVER || "http://127.0.0.1:4000";
const ACCESS_COOKIE  = "vitecamion_auth";
const REFRESH_COOKIE = "vitecamion_refresh";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 5;

/** POST /next-api/auth/mfa  — verify OTP and set auth cookies */
export async function POST(request: NextRequest) {
  const { challengeToken, otp } = await request.json();

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/auth/mfa/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeToken, otp }),
    });
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return NextResponse.json(body, { status: res.status });
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

/** PUT /next-api/auth/mfa  — resend OTP (or switch method) */
export async function PUT(request: NextRequest) {
  const body = await request.json();

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/auth/mfa/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
