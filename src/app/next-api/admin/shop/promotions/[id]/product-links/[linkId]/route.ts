import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

export const DELETE = (req: NextRequest, { params }: { params: { id: string; linkId: string } }) =>
  proxyRequest(req, "DELETE", `/admin/shop/promotions/${params.id}/product-links/${params.linkId}`, {
    onSuccess: () => { revalidateTag("promotions"); revalidateTag("products"); },
  });
