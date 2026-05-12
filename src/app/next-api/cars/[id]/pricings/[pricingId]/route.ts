import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function PATCH(req: NextRequest, { params }: { params: { id: string; pricingId: string } }) {
  return proxyRequest(req, "PATCH", `/cars/${params.id}/pricings/${params.pricingId}`);
}

export function DELETE(req: NextRequest, { params }: { params: { id: string; pricingId: string } }) {
  return proxyRequest(req, "DELETE", `/cars/${params.id}/pricings/${params.pricingId}`);
}
