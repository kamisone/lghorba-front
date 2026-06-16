import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

export const PATCH  = (req: NextRequest, { params }: { params: { id: string } }) =>
  proxyRequest(req, "PATCH",  `/admin/shop/promotions/${params.id}`, { onSuccess: () => revalidateTag("promotions") });

export const DELETE = (req: NextRequest, { params }: { params: { id: string } }) =>
  proxyRequest(req, "DELETE", `/admin/shop/promotions/${params.id}`, { onSuccess: () => revalidateTag("promotions") });
