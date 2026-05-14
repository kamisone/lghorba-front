import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest) {
  return proxyRequest(req, "GET", "/support/admin/settings");
}

export function PATCH(req: NextRequest) {
  return proxyRequest(req, "PATCH", "/support/admin/settings");
}
