import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function POST(req: NextRequest, { params }: { params: { variantId: string } }) {
  return proxyRequest(req, "POST", `/admin/shop/inventory/${params.variantId}/adjust`);
}
