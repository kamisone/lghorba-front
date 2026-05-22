import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "PATCH", `/admin/blog/categories/${params.id}`);
}

export function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "DELETE", `/admin/blog/categories/${params.id}`);
}
