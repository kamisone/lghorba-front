import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function PATCH(req: NextRequest, { params }: { params: { id: string; blockId: string } }) {
  return proxyRequest(req, "PATCH", `/cars/${params.id}/availability/${params.blockId}`);
}

export function DELETE(req: NextRequest, { params }: { params: { id: string; blockId: string } }) {
  return proxyRequest(req, "DELETE", `/cars/${params.id}/availability/${params.blockId}`);
}
