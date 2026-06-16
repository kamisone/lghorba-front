import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

const invalidate = (body: unknown) => {
  revalidateTag("collections");
  const slug = (body as any)?.slug;
  if (slug) revalidateTag(`collection-${slug}`);
};

export const PATCH  = (req: NextRequest, { params }: { params: { id: string } }) =>
  proxyRequest(req, "PATCH",  `/admin/shop/collections/${params.id}`, { onSuccess: invalidate });

export const DELETE = (req: NextRequest, { params }: { params: { id: string } }) =>
  proxyRequest(req, "DELETE", `/admin/shop/collections/${params.id}`, { onSuccess: invalidate });
