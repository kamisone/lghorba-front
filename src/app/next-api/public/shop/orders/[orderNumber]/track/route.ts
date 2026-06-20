import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export const GET = (req: NextRequest, { params }: { params: { orderNumber: string } }) =>
  proxyRequest(req, "GET", `/public/shop/orders/${params.orderNumber}/track`, { auth: false });
