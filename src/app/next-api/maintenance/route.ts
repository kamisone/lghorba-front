import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest) {
  return proxyRequest(req, "GET", "/maintenance");
}

export function POST(req: NextRequest) {
  return proxyRequest(req, "POST", "/maintenance");
}
