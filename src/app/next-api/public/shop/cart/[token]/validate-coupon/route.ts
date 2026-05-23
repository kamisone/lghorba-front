import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function POST(req: NextRequest, { params }: { params: { token: string } }) {
  return proxyRequest(req, "POST", `/public/shop/cart/${params.token}/validate-coupon`, { auth: false });
}
