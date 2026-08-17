import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function POST(req: NextRequest) {
  return proxyRequest(req, "POST", "/public/shop/replay/sessions", { auth: false });
}
