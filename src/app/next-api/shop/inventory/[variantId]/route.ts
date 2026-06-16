import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest, { params }: { params: { variantId: string } }) {
  return proxyRequest(req, "GET", `/admin/shop/inventory/${params.variantId}`);
}

export function PATCH(req: NextRequest, { params }: { params: { variantId: string } }) {
  return proxyRequest(req, "PATCH", `/admin/shop/inventory/${params.variantId}`, {
    onSuccess: () => revalidateTag("products"),
  });
}
