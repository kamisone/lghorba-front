import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return proxyRequest(req, "POST", `/admin/shop/variant-attributes/${id}/values`, {
    onSuccess: () => revalidateTag("products"),
  });
}
