import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "lghorba_auth";

export function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    if (request.nextUrl.pathname.startsWith("/next-api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/cars/:path*", "/next-api/sms/:path*", "/next-api/cars/:path*"],
};
