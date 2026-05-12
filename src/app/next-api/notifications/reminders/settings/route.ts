import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest) {
  return proxyRequest(req, "GET", "/admin/reminders/settings");
}

export function PUT(req: NextRequest) {
  return proxyRequest(req, "PUT", "/admin/reminders/settings");
}
