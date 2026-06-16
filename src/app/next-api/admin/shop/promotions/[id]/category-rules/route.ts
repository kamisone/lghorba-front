import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

export const GET  = (req: NextRequest, { params }: { params: { id: string } }) =>
  proxyRequest(req, "GET",  `/admin/shop/promotions/${params.id}/category-rules`);
export const POST = (req: NextRequest, { params }: { params: { id: string } }) =>
  proxyRequest(req, "POST", `/admin/shop/promotions/${params.id}/category-rules`, {
    onSuccess: () => revalidateTag("promotions"),
  });
