import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

export function PUT(req: NextRequest, { params }: { params: { id: string; optionValueId: string } }) {
  return proxyRequest(req, "PUT", `/admin/shop/products/${params.id}/option-images/${params.optionValueId}`, {
    onSuccess: () => revalidateTag("products"),
  });
}

export function DELETE(req: NextRequest, { params }: { params: { id: string; optionValueId: string } }) {
  return proxyRequest(req, "DELETE", `/admin/shop/products/${params.id}/option-images/${params.optionValueId}`, {
    onSuccess: () => revalidateTag("products"),
  });
}
