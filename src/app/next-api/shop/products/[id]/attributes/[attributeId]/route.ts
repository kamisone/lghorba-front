import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

export function PATCH(req: NextRequest, { params }: { params: { id: string; attributeId: string } }) {
  return proxyRequest(req, "PATCH", `/admin/shop/products/${params.id}/attributes/${params.attributeId}`, {
    onSuccess: () => revalidateTag("products"),
  });
}

export function DELETE(req: NextRequest, { params }: { params: { id: string; attributeId: string } }) {
  return proxyRequest(req, "DELETE", `/admin/shop/products/${params.id}/attributes/${params.attributeId}`, {
    onSuccess: () => revalidateTag("products"),
  });
}
