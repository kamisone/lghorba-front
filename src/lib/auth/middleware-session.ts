import type { SessionResult } from "./session";

/**
 * Edge-safe session resolution for middleware. Middleware must NOT call
 * `API_BASE_URL_SERVER`-based helpers directly: Next.js inlines
 * `process.env` references in the Edge bundle at *build time*, while route
 * handlers read them at *request time* from the runtime environment. If the
 * two differ (e.g. CI build env vs. the k8s secret injected into the
 * container), middleware ends up calling the wrong/unreachable backend URL,
 * every session resolution fails, and valid sessions get wiped.
 *
 * Instead, middleware delegates to a same-origin Node route handler using
 * `request.nextUrl.origin`, which is always correct regardless of build vs.
 * runtime env wiring.
 */
export async function resolveSessionFromOrigin(
  accessToken: string | undefined,
  refreshToken: string | undefined,
  origin: string,
): Promise<SessionResult> {
  try {
    const res = await fetch(`${origin}/next-api/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }),
      cache: "no-store",
    });
    if (!res.ok) return { accessToken: null, expired: true };
    return await res.json();
  } catch {
    return { accessToken: null, expired: true };
  }
}
