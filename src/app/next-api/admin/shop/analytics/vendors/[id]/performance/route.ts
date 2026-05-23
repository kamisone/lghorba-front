import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return proxyRequest(req, "GET", `/admin/shop/analytics/vendors/${id}/performance`);
}
