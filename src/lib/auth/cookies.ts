import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, REFRESH_TOKEN_MAX_AGE, type RotatedTokens } from "./session";

function baseOpts() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE,
  };
}

/** Sets both auth cookies after a login or a refresh-token rotation. */
export function setAuthCookies(response: NextResponse, tokens: RotatedTokens): void {
  response.cookies.set(ACCESS_COOKIE, tokens.access_token, baseOpts());
  response.cookies.set(REFRESH_COOKIE, tokens.refresh_token, baseOpts());
}

/** Clears both auth cookies (logout, or an unrecoverable session). */
export function clearAuthCookies(response: NextResponse): void {
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
}
