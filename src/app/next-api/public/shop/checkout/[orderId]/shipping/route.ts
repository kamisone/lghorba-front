import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export const PATCH = (req: NextRequest, { params }: { params: { orderId: string } }) =>
  proxyRequest(req, "PATCH", `/public/shop/checkout/${params.orderId}/shipping`, { auth: false });
