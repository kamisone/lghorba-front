import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest) {
  return proxyRequest(req, "GET", "/users");
}

export function POST(req: NextRequest) {
  return proxyRequest(req, "POST", "/users");
}
