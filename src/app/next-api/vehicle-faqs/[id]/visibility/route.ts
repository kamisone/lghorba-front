import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

export function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "PATCH", `/admin/vehicle-faqs/${params.id}/visibility`, {
    onSuccess: (body) => {
      const carId = (body as any)?.carId ?? (body as any)?.entityId;
      if (carId) revalidateTag(`car-faqs-${carId}`);
    },
  });
}
