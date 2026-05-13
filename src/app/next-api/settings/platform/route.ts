import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest) {
  return proxyRequest(req, "GET", "/public/platform-settings", { auth: false });
}

export function PUT(req: NextRequest) {
  return proxyRequest(req, "PUT", "/admin/platform-settings");
}
