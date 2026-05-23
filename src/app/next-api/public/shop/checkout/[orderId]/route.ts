import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export const GET = (req: NextRequest, { params }: { params: { orderId: string } }) =>
  proxyRequest(req, "GET", `/public/shop/checkout/${params.orderId}`, { auth: false });
