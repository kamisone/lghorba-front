import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

const invalidate = (id: string) => () => {
  revalidateTag(`car-${id}`);
  revalidateTag(`availability-${id}`);
  revalidateTag("cars");
};

export function PATCH(req: NextRequest, { params }: { params: { id: string; blockId: string } }) {
  return proxyRequest(req, "PATCH", `/cars/${params.id}/availability/${params.blockId}`, { onSuccess: invalidate(params.id) });
}

export function DELETE(req: NextRequest, { params }: { params: { id: string; blockId: string } }) {
  return proxyRequest(req, "DELETE", `/cars/${params.id}/availability/${params.blockId}`, { onSuccess: invalidate(params.id) });
}
