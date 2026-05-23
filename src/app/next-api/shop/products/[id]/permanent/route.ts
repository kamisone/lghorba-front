import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "DELETE", `/admin/shop/products/${params.id}/permanent`);
}
