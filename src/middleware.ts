import { NextRequest, NextResponse } from "next/server";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "@/lib/i18n";

const COOKIE_NAME = "lghorba_auth";

function detectLocale(request: NextRequest): Locale {
  const saved = request.cookies.get("vitecamion_locale")?.value as Locale | undefined;
  if (saved && LOCALES.includes(saved)) return saved;
  const lang = (request.headers.get("accept-language") ?? "").toLowerCase();
  if (lang.startsWith("fr") || lang.includes(",fr")) return "fr";
  if (lang.startsWith("ar") || lang.includes(",ar")) return "ar";
  return DEFAULT_LOCALE;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── API routes ────────────────────────────────────────────────────────────
  if (pathname.startsWith("/next-api/")) {
    // Public API — no auth required
    if (pathname.startsWith("/next-api/public/")) return NextResponse.next();
    // Protected API
    const isProtected =
      pathname.startsWith("/next-api/sms/") ||
      pathname.startsWith("/next-api/cars/") ||
      pathname.startsWith("/next-api/rent-sessions/") ||
      pathname.startsWith("/next-api/users/") ||
      pathname === "/next-api/users" ||
      pathname.startsWith("/next-api/admins/") ||
      pathname === "/next-api/admins" ||
      pathname.startsWith("/next-api/contacts/") ||
      (pathname === "/next-api/contacts" && request.method !== "POST");
    if (!isProtected) return NextResponse.next();
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.next();
  }

  // ── Admin pages: require auth cookie ─────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      const locale = detectLocale(request);
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
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
  const res = NextResponse.next();
  res.headers.set("x-locale", locale);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets|.*\\..*).*)"],
};
