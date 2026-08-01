import { NextRequest, NextResponse } from "next/server";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "@/lib/i18n";
import { ACCESS_COOKIE, REFRESH_COOKIE, type SessionResult } from "@/lib/auth/session";
import { resolveSessionFromOrigin } from "@/lib/auth/middleware-session";
import { setAuthCookies, clearAuthCookies } from "@/lib/auth/cookies";

function detectLocale(request: NextRequest): Locale {
  const saved = request.cookies.get("vitecamion_locale")?.value as Locale | undefined;
  if (saved && LOCALES.includes(saved)) return saved;
  const lang = (request.headers.get("accept-language") ?? "").toLowerCase();
  const detected = LOCALES.find((l) => l !== DEFAULT_LOCALE && (lang.startsWith(l) || lang.includes(`,${l}`)));
  return detected ?? DEFAULT_LOCALE;
}

/**
 * Resolves the admin session for this request. If refresh-token rotation
 * happened, the new tokens are written into `request.cookies` so downstream
 * handlers (server components, route handlers via `cookies()`) see the
 * fresh access token for *this* request — the response cookies are applied
 * separately via `applySessionCookies` so the browser gets them too.
 */
async function resolveAndPropagate(request: NextRequest): Promise<SessionResult> {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const session = await resolveSessionFromOrigin(accessToken, refreshToken, request.nextUrl.origin);

  if (session.rotated) {
    request.cookies.set(ACCESS_COOKIE, session.rotated.access_token);
    request.cookies.set(REFRESH_COOKIE, session.rotated.refresh_token);
  }

  return session;
}

function applySessionCookies(response: NextResponse, session: SessionResult): NextResponse {
  if (session.rotated) setAuthCookies(response, session.rotated);
  else if (session.expired) clearAuthCookies(response);
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── API routes ────────────────────────────────────────────────────────────
  if (pathname.startsWith("/next-api/")) {
    // Public API — no auth required
    if (pathname.startsWith("/next-api/public/")) return NextResponse.next();
    // Auth endpoints must stay reachable without a valid session
    if (pathname.startsWith("/next-api/auth")) return NextResponse.next();
    // Guest support chat — authenticated via its own support_token cookie, not the admin session
    if (pathname.startsWith("/next-api/support/guest/")) return NextResponse.next();

    // Every other /next-api/* route is protected: resolve (and, if needed,
    // refresh) the session so all admin endpoints share the same global
    // refresh behaviour rather than relying on an allowlist.
    const session = await resolveAndPropagate(request);
    if (!session.accessToken) {
      return applySessionCookies(NextResponse.json({ error: "unauthorized" }, { status: 401 }), session);
    }
    return applySessionCookies(NextResponse.next({ request: { headers: request.headers } }), session);
  }

  // ── Admin pages: require a session, recovering via refresh if needed ──────
  if (pathname.startsWith("/admin")) {
    const session = await resolveAndPropagate(request);
    if (!session.accessToken) {
      const locale = detectLocale(request);
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set("from", pathname);
      return applySessionCookies(NextResponse.redirect(loginUrl), session);
    }
    return applySessionCookies(NextResponse.next({ request: { headers: request.headers } }), session);
  }

  // ── Vendor portal: require vendor auth cookie ─────────────────────────────
  if (pathname.startsWith("/vendor") && !pathname.startsWith("/vendor/login") && !pathname.startsWith("/vendor/register")) {
    const token = request.cookies.get("vitecamion_vendor_auth")?.value;
    if (!token) return NextResponse.redirect(new URL("/vendor/login", request.url));
    return NextResponse.next();
  }

  // ── Guest-access pages: self-contained, handle lang via ?lang= param ──────
  if (pathname.startsWith("/guest-access/")) {
    return NextResponse.next();
  }

  // ── Public pages: locale routing ─────────────────────────────────────────
  const pathnameHasLocale = LOCALES.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );

  if (!pathnameHasLocale) {
    const locale = detectLocale(request);
    const target = new URL(`/${locale}${pathname === "/" ? "" : pathname}`, request.url);
    const res = NextResponse.redirect(target);
    res.headers.set("x-locale", locale);
    return res;
  }

  const locale = pathname.split("/")[1] as Locale;

  // ── Login page: a user with a recoverable session must never see it ──────
  if (pathname === `/${locale}/login`) {
    const session = await resolveAndPropagate(request);
    if (session.accessToken) {
      const fromParam = request.nextUrl.searchParams.get("from");
      const target = fromParam && fromParam.startsWith("/") && !fromParam.startsWith("//") ? fromParam : "/admin";
      return applySessionCookies(NextResponse.redirect(new URL(target, request.url)), session);
    }
    const res = applySessionCookies(NextResponse.next(), session);
    res.headers.set("x-locale", locale);
    return res;
  }

  const res = NextResponse.next();
  res.headers.set("x-locale", locale);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets|.*\\..*).*)"],
};
