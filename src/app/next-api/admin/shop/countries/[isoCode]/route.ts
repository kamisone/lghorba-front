import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

type Ctx = { params: Promise<{ isoCode: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { isoCode } = await ctx.params;
  return proxyRequest(req, "PATCH", `/admin/shop/countries/${isoCode}`);
}
