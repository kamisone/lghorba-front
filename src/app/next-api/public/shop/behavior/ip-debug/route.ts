import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

/**
 * Diagnostic twin of the backend's /public/shop/behavior/ip-debug, reached
 * through this Next.js proxy — the same path the storefront's tracking calls
 * take. Compare the two to see which hop drops the visitor's address.
 */
export function GET(req: NextRequest) {
  return proxyRequest(req, "GET", "/public/shop/behavior/ip-debug", { auth: false });
}
