import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function PATCH(req: NextRequest) {
  return proxyRequest(req, "PATCH", "/admin/vehicle-faqs/reorder");
}
