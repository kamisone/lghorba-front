import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

export const DELETE = (req: NextRequest, { params }: { params: { id: string; ruleId: string } }) =>
  proxyRequest(req, "DELETE", `/admin/shop/promotions/${params.id}/category-rules/${params.ruleId}`, {
    onSuccess: () => revalidateTag("promotions"),
  });
