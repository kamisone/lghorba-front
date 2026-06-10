import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest, { params }: { params: { variantId: string } }) {
  return proxyRequest(req, "GET", `/public/shop/variants/${params.variantId}/stock`, { auth: false });
}
