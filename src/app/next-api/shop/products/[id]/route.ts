import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "GET", `/admin/shop/products/${params.id}`);
}

export function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "PATCH", `/admin/shop/products/${params.id}`, {
    onSuccess: (body) => {
      revalidateTag("products");
      const slug = (body as any)?.slug;
      if (slug) revalidateTag(`product-${slug}`);
    },
  });
}

export function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "DELETE", `/admin/shop/products/${params.id}`, {
    onSuccess: (body) => {
      revalidateTag("products");
      const slug = (body as any)?.slug;
      if (slug) revalidateTag(`product-${slug}`);
    },
  });
}
