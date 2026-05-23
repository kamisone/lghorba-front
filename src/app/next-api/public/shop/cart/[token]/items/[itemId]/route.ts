import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function PUT(req: NextRequest, { params }: { params: { token: string; itemId: string } }) {
  return proxyRequest(req, "PUT", `/public/shop/cart/${params.token}/items/${params.itemId}`, { auth: false });
}

export function DELETE(req: NextRequest, { params }: { params: { token: string; itemId: string } }) {
  return proxyRequest(req, "DELETE", `/public/shop/cart/${params.token}/items/${params.itemId}`, { auth: false });
}
