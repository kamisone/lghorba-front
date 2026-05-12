import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest) {
  return proxyRequest(req, "GET", "/rent-sessions");
}

export function POST(req: NextRequest) {
  return proxyRequest(req, "POST", "/rent-sessions");
}
