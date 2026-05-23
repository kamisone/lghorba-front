import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export const DELETE = (req: NextRequest, { params }: { params: { id: string; ruleId: string } }) =>
  proxyRequest(req, "DELETE", `/admin/shop/promotions/${params.id}/category-links/${params.ruleId}`);
