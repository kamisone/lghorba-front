import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

export const PATCH  = (req: NextRequest, { params }: { params: { id: string } }) =>
  proxyRequest(req, "PATCH",  `/admin/shop/categories/${params.id}`, {
    onSuccess: () => revalidateTag("products"),
  });

export const DELETE = (req: NextRequest, { params }: { params: { id: string } }) =>
  proxyRequest(req, "DELETE", `/admin/shop/categories/${params.id}`, {
    onSuccess: () => revalidateTag("products"),
  });
