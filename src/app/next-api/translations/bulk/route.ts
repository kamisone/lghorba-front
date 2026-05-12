import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function PUT(req: NextRequest) {
  return proxyRequest(req, "PUT", "/translations/bulk");
}
