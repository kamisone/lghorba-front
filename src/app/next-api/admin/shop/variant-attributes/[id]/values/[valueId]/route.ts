import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

type Ctx = { params: Promise<{ id: string; valueId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id, valueId } = await ctx.params;
  return proxyRequest(req, "PATCH", `/admin/shop/variant-attributes/${id}/values/${valueId}`);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id, valueId } = await ctx.params;
  return proxyRequest(req, "DELETE", `/admin/shop/variant-attributes/${id}/values/${valueId}`);
}
