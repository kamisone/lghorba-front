import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest) {
  return proxyRequest(req, "GET", "/admin/guest-tokens");
}

export function POST(req: NextRequest) {
  return proxyRequest(req, "POST", "/admin/guest-tokens");
}
