export const ACCESS_COOKIE = "vitecamion_auth";
export const REFRESH_COOKIE = "vitecamion_refresh";

// Refresh tokens are valid for 15 days and rotated on every use (mirrors
// the backend's REFRESH_TOKEN_TTL). Both auth cookies share this lifetime —
// the access token's own 15-minute `exp` claim is what actually governs
// request validity; the cookie just needs to outlive the rotating session.
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 15;

export interface RotatedTokens {
  access_token: string;
  refresh_token: string;
}

/**
 * The backend is the single source of truth for token validity — it owns
 * JWT_SECRET/JWT_REFRESH_SECRET and the refresh-token store. The frontend
 * never inspects or verifies tokens itself; it just asks the backend.
 */
export async function isAccessTokenValid(token: string | undefined, backendUrl: string): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetch(`${backendUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Calls the backend's refresh endpoint, which validates the refresh token,
 * rotates it (invalidating the previous one), and returns a fresh
 * access/refresh pair.
 */
export async function rotateTokens(refreshToken: string, backendUrl: string): Promise<RotatedTokens | null> {
  try {
    const res = await fetch(`${backendUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export interface SessionResult {
  /** A valid (possibly freshly-rotated) access token, or null if the session cannot be recovered. */
  accessToken: string | null;
  /** Set when the refresh flow rotated the tokens — caller must persist these as cookies and propagate to the request. */
  rotated?: RotatedTokens;
  /** Set when neither the access nor the refresh token is valid — caller should clear stale auth cookies. */
  expired?: boolean;
}

/**
 * Single source of truth for session resolution. Used by middleware, the
 * login page, and any other auth-aware entry point so that no route has to
 * make its own assumptions about authentication state — every check is
 * delegated to the backend.
 *
 * 1. Ask the backend to validate the access token.
 * 2. If it's missing/expired, attempt refresh-token recovery (with rotation).
 * 3. Only report "no session" if both checks fail.
 */
export async function resolveSession(
  accessToken: string | undefined,
  refreshToken: string | undefined,
  backendUrl: string,
): Promise<SessionResult> {
  if (await isAccessTokenValid(accessToken, backendUrl)) {
    return { accessToken: accessToken! };
  }

  if (refreshToken) {
    const rotated = await rotateTokens(refreshToken, backendUrl);
    if (rotated) return { accessToken: rotated.access_token, rotated };
  }

  return { accessToken: null, expired: true };
}
