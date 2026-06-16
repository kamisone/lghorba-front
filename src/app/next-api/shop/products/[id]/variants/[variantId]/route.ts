import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

const invalidate = (body: unknown) => {
  revalidateTag("products");
  const slug = (body as any)?.productSlug ?? (body as any)?.slug;
  if (slug) revalidateTag(`product-${slug}`);
};

export const PATCH = (req: NextRequest, { params }: { params: { id: string; variantId: string } }) =>
  proxyRequest(req, "PATCH", `/admin/shop/products/${params.id}/variants/${params.variantId}`, {
    onSuccess: invalidate,
  });

export const DELETE = (req: NextRequest, { params }: { params: { id: string; variantId: string } }) =>
  proxyRequest(req, "DELETE", `/admin/shop/products/${params.id}/variants/${params.variantId}`, {
    onSuccess: invalidate,
  });
