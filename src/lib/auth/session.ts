export const ACCESS_COOKIE  = "vitecamion_auth";
export const REFRESH_COOKIE = "vitecamion_refresh";

// Cookie lifetime mirrors the intended refresh-token TTL (15 days).
// The access token's own `exp` JWT claim governs per-request validity;
// the cookie just needs to outlive the rotating session.
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 15;

export interface RotatedTokens {
  access_token:  string;
  refresh_token: string;
}

export interface SessionResult {
  /** A valid (possibly freshly-rotated) access token, or null. */
  accessToken: string | null;
  /** Set when the refresh flow produced new tokens — caller must persist and forward these. */
  rotated?: RotatedTokens;
  /**
   * Backend explicitly rejected both tokens — safe to clear auth cookies.
   * Only set when the backend responded (not when it was unreachable).
   */
  expired?: boolean;
  /**
   * Backend was unreachable (network error / timeout).
   * Caller must NOT clear cookies — the tokens may still be valid once
   * the backend recovers. The user is blocked for this request but will
   * be able to resume their session automatically.
   */
  networkError?: boolean;
}

// ── Token validation (backend is the single source of truth) ─────────────────

type CheckResult = "valid" | "invalid" | "network_error";

/**
 * Asks the backend whether the access token is still valid.
 * Returns "network_error" on any fetch failure so callers can distinguish
 * a transient outage from an explicitly rejected token.
 */
async function checkAccessToken(token: string, backendUrl: string): Promise<CheckResult> {
  try {
    const res = await fetch(`${backendUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache:   "no-store",
    });
    return res.ok ? "valid" : "invalid";
  } catch {
    return "network_error";
  }
}

export interface RotateResult {
  tokens:       RotatedTokens | null;
  networkError: boolean;
}

/**
 * Calls the backend's refresh endpoint (rotating the token on success).
 * Returns { networkError: true } on any fetch failure so callers can
 * distinguish a transient outage from an explicitly rejected refresh token.
 */
export async function rotateTokens(
  refreshToken: string,
  backendUrl:   string,
): Promise<RotateResult> {
  try {
    const res = await fetch(`${backendUrl}/auth/refresh`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ refresh_token: refreshToken }),
      cache:   "no-store",
    });
    if (!res.ok) return { tokens: null, networkError: false };
    return { tokens: await res.json(), networkError: false };
  } catch {
    return { tokens: null, networkError: true };
  }
}

// ── Session resolution ────────────────────────────────────────────────────────

/**
 * Single source of truth for session resolution — every check is delegated
 * to the backend, which owns JWT_SECRET and the refresh-token store.
 *
 * 1. Ask the backend to validate the access token.
 * 2. If invalid (not expired), attempt refresh-token recovery with rotation.
 * 3. A network error at either step sets `networkError` so the caller does
 *    NOT clear cookies — cookies must only be wiped when the backend
 *    explicitly rejects the refresh token (expired/revoked).
 */
export async function resolveSession(
  accessToken:  string | undefined,
  refreshToken: string | undefined,
  backendUrl:   string,
): Promise<SessionResult> {
  if (accessToken) {
    const check = await checkAccessToken(accessToken, backendUrl);
    if (check === "valid")         return { accessToken };
    if (check === "network_error") return { accessToken: null, networkError: true };
    // "invalid" → fall through to refresh
  }

  if (refreshToken) {
    const { tokens, networkError } = await rotateTokens(refreshToken, backendUrl);
    if (tokens)       return { accessToken: tokens.access_token, rotated: tokens };
    if (networkError) return { accessToken: null, networkError: true };
  }

  // Backend explicitly rejected both tokens.
  return { accessToken: null, expired: true };
}
