import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest) {
  return proxyRequest(req, "GET", "/public/shop/wishlist", { auth: false });
}

export function POST(req: NextRequest) {
  return proxyRequest(req, "POST", "/public/shop/wishlist", { auth: false });
}
