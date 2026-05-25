import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest, { params }: { params: { variantId: string } }) {
  return proxyRequest(req, "GET", `/admin/shop/inventory/${params.variantId}/movements`);
}
