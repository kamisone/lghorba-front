import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function POST(req: NextRequest) {
  return proxyRequest(req, "POST", "/admin/shop/products/sections/social-videos-title/translate");
}
