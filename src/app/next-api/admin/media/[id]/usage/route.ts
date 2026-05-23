import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return proxyRequest(req, "GET", `/admin/media/${id}/usage`);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return proxyRequest(req, "POST", `/admin/media/${id}/usage`);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return proxyRequest(req, "DELETE", `/admin/media/${id}/usage`);
}
