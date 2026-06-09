import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return proxyRequest(req, "PATCH", `/admin/media/folders/${id}`);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return proxyRequest(req, "DELETE", `/admin/media/folders/${id}`);
}
