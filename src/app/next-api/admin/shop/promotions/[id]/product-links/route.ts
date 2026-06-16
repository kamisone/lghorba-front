import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

export const GET  = (req: NextRequest, { params }: { params: { id: string } }) =>
  proxyRequest(req, "GET",  `/admin/shop/promotions/${params.id}/product-links`);
export const POST = (req: NextRequest, { params }: { params: { id: string } }) =>
  proxyRequest(req, "POST", `/admin/shop/promotions/${params.id}/product-links`, {
    onSuccess: () => { revalidateTag("promotions"); revalidateTag("products"); },
  });
