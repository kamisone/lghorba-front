import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest, { params }: { params: { token: string } }) {
  return proxyRequest(req, "GET", `/public/shop/cart/${params.token}`, { auth: false });
}
