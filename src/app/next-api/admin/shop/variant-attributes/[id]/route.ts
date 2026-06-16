import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return proxyRequest(req, "PATCH", `/admin/shop/variant-attributes/${id}`, {
    onSuccess: () => revalidateTag("products"),
  });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return proxyRequest(req, "DELETE", `/admin/shop/variant-attributes/${id}`, {
    onSuccess: () => revalidateTag("products"),
  });
}
