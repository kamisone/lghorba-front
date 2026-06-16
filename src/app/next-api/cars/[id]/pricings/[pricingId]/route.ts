import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

const invalidate = (id: string) => () => {
  revalidateTag(`car-${id}`);
  revalidateTag("cars");
};

export function PATCH(req: NextRequest, { params }: { params: { id: string; pricingId: string } }) {
  return proxyRequest(req, "PATCH", `/cars/${params.id}/pricings/${params.pricingId}`, { onSuccess: invalidate(params.id) });
}

export function DELETE(req: NextRequest, { params }: { params: { id: string; pricingId: string } }) {
  return proxyRequest(req, "DELETE", `/cars/${params.id}/pricings/${params.pricingId}`, { onSuccess: invalidate(params.id) });
}
