import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function PATCH(req: NextRequest, { params }: { params: { category: string } }) {
  return proxyRequest(req, "PATCH", `/admin/quick-replies/categories/${params.category}`);
}

export function DELETE(req: NextRequest, { params }: { params: { category: string } }) {
  return proxyRequest(req, "DELETE", `/admin/quick-replies/categories/${params.category}`);
}
