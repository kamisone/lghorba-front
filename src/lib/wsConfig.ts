function parseWs(raw: string): { host: string; path: string } {
  const u    = new URL(raw);
  const base = u.pathname.replace(/\/$/, "");
  return { host: u.origin, path: `${base}/socket.io` };
}

export const { host: WS_HOST, path: WS_PATH } = parseWs(
  process.env.API_BASE_URL_BROWSER ?? "http://localhost:4000",
);
