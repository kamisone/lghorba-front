import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export const POST = (req: NextRequest, { params }: { params: { orderId: string } }) =>
  proxyRequest(req, "POST", `/public/shop/checkout/${params.orderId}/payment-intent`, { auth: false });
