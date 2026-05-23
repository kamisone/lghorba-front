import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

type Ctx = { params: Promise<{ customerId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { customerId } = await ctx.params;
  return proxyRequest(req, "GET", `/admin/shop/payment-methods/customer/${customerId}`);
}
